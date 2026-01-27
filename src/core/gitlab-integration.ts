import { execSync } from 'child_process';
import https from 'https';
import { workspaceManager } from '../config/workspaces.js';
import { GitLabAPI } from './gitlab-oauth.js';

/**
 * Helper to make HTTPS requests using native Node.js https module.
 * Avoids embedding tokens in shell commands (SEC-01 fix).
 */
function httpsRequest(options: https.RequestOptions, data?: string): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => resolve({ statusCode: res.statusCode || 0, body }));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

export interface MRResult {
  success: boolean;
  mrUrl?: string;
  error?: string;
}

/**
 * Parse project path from a GitLab remote URL.
 * Supports both SSH and HTTPS formats.
 * Returns URL-encoded project path for API calls.
 */
function parseGitLabRemote(remoteUrl: string): { projectPath: string; projectPathEncoded: string } | null {
  // SSH format: git@gitlab.com:owner/repo.git or git@gitlab.com:group/subgroup/repo.git
  // HTTPS format: https://gitlab.com/owner/repo.git
  const match = remoteUrl.match(/gitlab\.com[:/](.+?)(?:\.git)?$/);
  if (match) {
    const projectPath = match[1].replace(/\.git$/, '');
    return {
      projectPath,
      projectPathEncoded: encodeURIComponent(projectPath),
    };
  }
  return null;
}

export class GitLabIntegration {
  /**
   * Check if GitLab CLI (glab) is installed and authenticated
   */
  isAvailable(): boolean {
    try {
      execSync('glab auth status', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create a merge request using GitLab API with OAuth token.
   * This method is preferred over CLI as it doesn't require `glab` to be installed.
   *
   * @param repoPath - Path to the repository (to get remote URL)
   * @param branch - Branch to create MR from (source branch)
   * @param title - MR title
   * @param description - MR description
   * @param token - OAuth access token
   * @param targetBranch - Target branch for the MR (optional, defaults to main/master)
   * @returns MRResult with success status and MR URL
   */
  async createMRWithToken(
    repoPath: string,
    branch: string,
    title: string,
    description: string,
    token: string,
    targetBranch?: string
  ): Promise<MRResult> {
    try {
      // Get the remote URL to determine project path
      const remoteUrl = execSync('git remote get-url origin', {
        cwd: repoPath,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      }).trim();

      const parsed = parseGitLabRemote(remoteUrl);
      if (!parsed) {
        return { success: false, error: 'Could not parse GitLab remote URL' };
      }

      const { projectPathEncoded } = parsed;

      // Determine target branch if not provided
      if (!targetBranch) {
        try {
          // Try to detect main branch
          const branches = execSync('git branch -a', {
            cwd: repoPath,
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe'],
          });
          targetBranch = branches.includes('remotes/origin/main') ? 'main' : 'master';
        } catch {
          targetBranch = 'main';
        }
      }

      // Create MR via GitLab API using native https module (SEC-01 fix: no token in shell/temp files)
      const requestBody = JSON.stringify({
        title,
        description,
        source_branch: branch,
        target_branch: targetBranch,
      });

      console.log(`[GitLabIntegration] Calling GitLab API: POST /api/v4/projects/${projectPathEncoded}/merge_requests`);

      const response = await httpsRequest(
        {
          hostname: 'gitlab.com',
          path: `/api/v4/projects/${projectPathEncoded}/merge_requests`,
          method: 'POST',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(requestBody),
          },
        },
        requestBody
      );

      console.log(`[GitLabIntegration] API response status: ${response.statusCode}`);

      if (response.statusCode >= 200 && response.statusCode < 300) {
        const mr = JSON.parse(response.body);
        console.log(`[GitLabIntegration] MR created via API: ${mr.web_url}`);
        return { success: true, mrUrl: mr.web_url };
      } else {
        let errorMsg = response.body;
        try {
          const err = JSON.parse(response.body);
          errorMsg = err.message || err.error || JSON.stringify(err);
        } catch {
          errorMsg = `HTTP ${response.statusCode}: ${response.body.substring(0, 200)}`;
        }
        console.error(`[GitLabIntegration] API error creating MR: ${errorMsg}`);
        return { success: false, error: errorMsg };
      }
    } catch (error: unknown) {
      const err = error as { stderr?: Buffer | string; message?: string };
      const errorMsg = err.stderr?.toString() || err.message || 'Unknown error';
      console.error(`[GitLabIntegration] Failed to create MR via API: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Create a merge request.
   * First tries OAuth API if workspace has a token, then falls back to glab CLI.
   *
   * @param repoPath - Path to the repository (working directory for git commands)
   * @param branch - Branch to create MR from
   * @param title - MR title
   * @param body - MR body/description
   * @param workspaceLookupPath - Optional path used for workspace token lookup (for worktree support)
   * @returns MRResult with success status and MR URL
   */
  async createMR(repoPath: string, branch: string, title: string, body: string, workspaceLookupPath?: string, targetBranch?: string): Promise<MRResult> {
    // First, check if this repo belongs to a workspace with GitLab token
    // Use workspaceLookupPath if provided (for worktree mode), otherwise use repoPath
    const lookupPath = workspaceLookupPath || repoPath;
    console.log(`[GitLabIntegration] Looking up workspace for path: ${lookupPath}`);
    const workspace = workspaceManager.getWorkspaceForRepo(lookupPath);
    console.log(`[GitLabIntegration] Found workspace: ${workspace ? workspace.name + ' (id: ' + workspace.id + ', scanPath: ' + workspace.scanPath + ')' : 'null'}`);
    const tokenData = workspace ? workspaceManager.getGitLabToken(workspace.id) : null;
    console.log(`[GitLabIntegration] Token data exists: ${!!tokenData}`);

    if (tokenData) {
      console.log(`[GitLabIntegration] Using OAuth token for MR creation`);
      const result = await this.createMRWithToken(repoPath, branch, title, body, tokenData.accessToken, targetBranch);
      if (result.success) {
        return result;
      }
      // If API fails, fall through to CLI
      console.log(`[GitLabIntegration] OAuth MR creation failed, trying CLI fallback: ${result.error}`);
    }

    // Fall back to glab CLI
    return this.createMRWithCLI(repoPath, branch, title, body, targetBranch);
  }

  /**
   * Create a merge request using GitLab CLI (glab).
   * Fallback method when OAuth is not available.
   */
  private createMRWithCLI(repoPath: string, branch: string, title: string, body: string, targetBranch?: string): MRResult {
    if (!this.isAvailable()) {
      return {
        success: false,
        error: 'GitLab CLI (glab) is not installed or not authenticated. Install from https://gitlab.com/gitlab-org/cli, or connect GitLab OAuth in workspace settings.',
      };
    }

    try {
      // Escape special characters in title and body for shell
      const escapedTitle = title.replace(/"/g, '\\"').replace(/`/g, '\\`');
      const escapedBody = body.replace(/"/g, '\\"').replace(/`/g, '\\`');

      // Build command with optional target branch
      let cmd = `glab mr create --title "${escapedTitle}" --description "${escapedBody}" --source-branch "${branch}"`;
      if (targetBranch) {
        cmd += ` --target-branch "${targetBranch}"`;
      }

      const result = execSync(
        cmd,
        {
          cwd: repoPath,
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'],
          timeout: 60000, // 60s timeout
        }
      ).trim();

      // glab mr create outputs the MR URL on success
      const mrUrl = result.match(/https:\/\/gitlab\.com\/.+\/merge_requests\/\d+/)?.[0] || result;

      console.log(`[GitLabIntegration] MR created via CLI: ${mrUrl}`);
      return { success: true, mrUrl };
    } catch (error: unknown) {
      const err = error as { stderr?: Buffer | string; message?: string };
      const errorMsg = err.stderr?.toString() || err.message || 'Unknown error';
      console.error(`[GitLabIntegration] Failed to create MR via CLI: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Create a new project on GitLab and push local code
   * First checks if workspace has a GitLab token, otherwise falls back to glab CLI
   * @param repoPath - Path to the local repository
   * @param projectName - Name for the GitLab project
   * @param visibility - Project visibility (default: 'private')
   * @returns Result with success status and remote URL
   */
  async createProject(repoPath: string, projectName: string, visibility: 'private' | 'public' = 'private'): Promise<MRResult> {
    // First, check if this repo belongs to a workspace with GitLab token
    const workspace = workspaceManager.getWorkspaceForRepo(repoPath);
    const tokenData = workspace ? workspaceManager.getGitLabToken(workspace.id) : null;

    if (tokenData) {
      // Use GitLab API with workspace token
      return this.createProjectWithToken(repoPath, projectName, visibility, tokenData.accessToken);
    }

    // Fall back to glab CLI
    return this.createProjectWithCLI(repoPath, projectName, visibility);
  }

  /**
   * Create project using GitLab API with OAuth token
   */
  private async createProjectWithToken(
    repoPath: string,
    projectName: string,
    visibility: 'private' | 'public',
    token: string
  ): Promise<MRResult> {
    try {
      // Create project via GitLab API using native https module (SEC-01 fix: no token in shell)
      const projectData = JSON.stringify({
        name: projectName,
        visibility,
        initialize_with_readme: false,
      });

      const response = await httpsRequest(
        {
          hostname: 'gitlab.com',
          path: '/api/v4/projects',
          method: 'POST',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(projectData),
          },
        },
        projectData
      );

      if (response.statusCode < 200 || response.statusCode >= 300) {
        console.error(`[GitLabIntegration] API error: ${response.body}`);
        return { success: false, error: response.body };
      }

      const project = JSON.parse(response.body);
      const webUrl = project.web_url;
      const httpUrlToRepo = project.http_url_to_repo;

      // Now add remote and push using git commands with credential helper
      const { createCredentialHelperScript, removeCredentialHelperScript } = await import('./git-credential-helper.js');
      const scriptPath = createCredentialHelperScript(token, 'gitlab');

      try {
        // Add remote (without token in URL)
        execSync(`git remote add origin "${httpUrlToRepo}"`, {
          cwd: repoPath,
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        // Push with credential helper
        const pushCmd = process.platform === 'win32'
          ? 'cmd /c "git push -u origin main || git push -u origin master"'
          : 'git push -u origin main || git push -u origin master';

        execSync(pushCmd, {
          cwd: repoPath,
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'],
          timeout: 120000,
          env: {
            ...process.env,
            GIT_ASKPASS: scriptPath,
            GIT_TERMINAL_PROMPT: '0',
          },
        });
      } finally {
        // Always clean up credential helper script
        removeCredentialHelperScript(scriptPath);
      }

      console.log(`[GitLabIntegration] Project created via API: ${webUrl}`);
      return { success: true, mrUrl: webUrl };
    } catch (error: unknown) {
      const err = error as { stderr?: Buffer | string; message?: string };
      const errorMsg = err.stderr?.toString() || err.message || 'Unknown error';
      console.error(`[GitLabIntegration] Failed to create project via API: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Create project using GitLab CLI (glab)
   */
  private createProjectWithCLI(repoPath: string, projectName: string, visibility: 'private' | 'public'): MRResult {
    if (!this.isAvailable()) {
      return {
        success: false,
        error: 'GitLab CLI (glab) is not installed or not authenticated. Install from https://gitlab.com/gitlab-org/cli',
      };
    }

    try {
      // glab repo create will create the project and set up remote origin
      const result = execSync(
        `glab repo create ${projectName} --${visibility} --source=. --remote=origin --push`,
        {
          cwd: repoPath,
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'],
          timeout: 120000, // 2 min timeout for push
        }
      ).trim();

      // Extract the project URL from output
      const projectUrl = result.match(/https:\/\/gitlab\.com\/[^\s]+/)?.[0] || result;

      console.log(`[GitLabIntegration] Project created via CLI: ${projectUrl}`);
      return { success: true, mrUrl: projectUrl };
    } catch (error: unknown) {
      const err = error as { stderr?: Buffer | string; message?: string };
      const errorMsg = err.stderr?.toString() || err.message || 'Unknown error';
      console.error(`[GitLabIntegration] Failed to create project via CLI: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Get the URL to create an MR manually in the browser
   * @param repoPath - Path to the repository
   * @param branch - Branch to create MR from
   */
  getMRCreateUrl(repoPath: string, branch: string): string | null {
    try {
      // Get the remote URL
      const remoteUrl = execSync('git remote get-url origin', {
        cwd: repoPath,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      }).trim();

      // Parse GitLab URL from remote
      // Supports: git@gitlab.com:user/repo.git, https://gitlab.com/user/repo.git
      let match = remoteUrl.match(/gitlab\.com[:/]([^/]+\/[^/.]+)/);
      if (!match) return null;

      const pathWithNamespace = match[1].replace(/\.git$/, '');
      return `https://gitlab.com/${pathWithNamespace}/-/merge_requests/new?merge_request%5Bsource_branch%5D=${branch}`;
    } catch {
      return null;
    }
  }
}

// Singleton instance
export const gitlabIntegration = new GitLabIntegration();
