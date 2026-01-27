import { execSync } from 'child_process';
import { writeFileSync, mkdirSync, existsSync, unlinkSync, readdirSync, statSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';

// Windows reserved device names that cannot be used as filenames
// These cause git add to fail on Windows
const WINDOWS_RESERVED_NAMES = new Set([
  'con', 'prn', 'aux', 'nul',
  'com1', 'com2', 'com3', 'com4', 'com5', 'com6', 'com7', 'com8', 'com9',
  'lpt1', 'lpt2', 'lpt3', 'lpt4', 'lpt5', 'lpt6', 'lpt7', 'lpt8', 'lpt9',
]);

/**
 * Remove Windows reserved device name files from a directory (recursively)
 * These files cannot be added to git on Windows
 */
function removeWindowsReservedFiles(dirPath: string): void {
  if (!existsSync(dirPath)) return;

  try {
    const entries = readdirSync(dirPath);
    for (const entry of entries) {
      const fullPath = join(dirPath, entry);

      // Check if this is a reserved name (case-insensitive, with or without extension)
      const baseName = entry.split('.')[0].toLowerCase();
      if (WINDOWS_RESERVED_NAMES.has(baseName)) {
        console.log(`[GitSandbox] Removing Windows reserved file: ${fullPath}`);
        try {
          unlinkSync(fullPath);
        } catch (e) {
          console.warn(`[GitSandbox] Could not remove ${fullPath}: ${e instanceof Error ? e.message : e}`);
        }
        continue;
      }

      // Recurse into directories (but skip .git)
      try {
        const stat = statSync(fullPath);
        if (stat.isDirectory() && entry !== '.git') {
          removeWindowsReservedFiles(fullPath);
        }
      } catch {
        // statSync might fail on special files, skip them
      }
    }
  } catch (e) {
    console.warn(`[GitSandbox] Could not scan directory ${dirPath}: ${e instanceof Error ? e.message : e}`);
  }
}

export interface SandboxResult {
  branch: string;
  previousBranch: string;
  clean: boolean;
}

export interface WorktreeResult {
  worktreePath: string;
  branch: string;
  repoPath: string;
}

export interface DiffResult {
  patch: string;
  changedFiles: string[];
}

export interface BranchOptions {
  prefix?: string;      // e.g., "cadap", "wkst" - short identifier
  summary?: string;     // e.g., "Add login feature" - will be slugified
  jobId: string;        // fallback identifier
}

// Common filler words to remove for more concise branch names
const FILLER_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
  'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need',
  'that', 'this', 'these', 'those', 'i', 'you', 'we', 'they', 'it',
  'please', 'make', 'sure', 'also', 'just', 'only', 'into', 'onto',
]);

/**
 * Generate a slug from text for use in branch names
 * e.g., "Add a login feature to the app" -> "add-login-feature-app"
 * Removes filler words and limits to ~30 chars / 5 words max
 */
function slugify(text: string, maxWords: number = 5, maxLength: number = 30): string {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')   // Remove special chars
    .split(/\s+/)                   // Split into words
    .filter(word => word.length > 0 && !FILLER_WORDS.has(word));

  // Take first N meaningful words
  const slug = words
    .slice(0, maxWords)
    .join('-');

  // Limit total length and clean up
  return slug
    .slice(0, maxLength)
    .replace(/-$/, '');             // Remove trailing dash after slice
}

/**
 * Generate a branch name based on options
 * Format: <prefix>/<summary> (e.g., claudedesk/fix-login-error)
 * Falls back to <prefix>/<jobId-short> if no summary provided
 */
export function generateBranchName(options: BranchOptions): string {
  const { prefix, summary, jobId } = options;

  // Generate summary slug or use short job ID as fallback
  const summarySlug = summary ? slugify(summary) : jobId.slice(0, 8);

  // Use configured prefix, or default to 'claudedesk'
  const branchPrefix = prefix || 'claudedesk';

  return `${branchPrefix}/${summarySlug}`;
}

export class GitSandbox {
  private exec(command: string, cwd: string, timeoutMs: number = 30000): string {
    try {
      return execSync(command, {
        cwd,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: timeoutMs,
      }).trim();
    } catch (error: unknown) {
      const err = error as { stderr?: Buffer | string; message?: string; killed?: boolean };
      if (err.killed) {
        throw new Error(`Git command timed out: ${command}`);
      }
      throw new Error(`Git command failed: ${command}\n${err.stderr?.toString() || err.message}`);
    }
  }

  // Check if working directory is clean (ignoring claudedesk-specific files)
  isClean(repoPath: string): boolean {
    const status = this.exec('git status --porcelain', repoPath);
    if (status.length === 0) return true;

    // Files that ClaudeDesk can safely ignore
    const ignoredFiles = ['CLAUDE.md', 'claude.md', '.claude', '.claudedesk'];

    const lines = status.split('\n').filter(Boolean);
    const significantChanges = lines.filter((line) => {
      // Extract filename from status line (format: "XY filename" or "XY -> filename")
      const filename = line.slice(3).split(' -> ').pop()?.trim() || '';
      return !ignoredFiles.some((ignored) =>
        filename === ignored || filename.endsWith(`/${ignored}`)
      );
    });

    return significantChanges.length === 0;
  }

  // Get current branch name
  getCurrentBranch(repoPath: string): string {
    return this.exec('git branch --show-current', repoPath);
  }

  // Create a sandbox branch for the job
  // skipCleanCheck: set to true for retries to preserve partial work from failed jobs
  createSandbox(repoPath: string, branchName: string, skipCleanCheck: boolean = false): SandboxResult {
    console.log(`[GitSandbox] Creating sandbox branch "${branchName}" in ${repoPath}`);

    // Check if repo is clean (ignoring claudedesk files like CLAUDE.md)
    // Skip this check for retries to preserve partial work
    if (!skipCleanCheck) {
      console.log('[GitSandbox] Checking if repo is clean...');
      if (!this.isClean(repoPath)) {
        throw new Error(
          'Working directory is not clean. Please commit or stash changes before running a job.'
        );
      }
      console.log('[GitSandbox] Repo is clean');
    } else {
      console.log('[GitSandbox] Skipping clean check (retry mode - preserving partial work)');
    }

    console.log('[GitSandbox] Getting current branch...');
    const previousBranch = this.getCurrentBranch(repoPath);

    // Checkout main/master branch first
    let mainBranch = 'main';
    console.log('[GitSandbox] Checking out main branch...');
    try {
      this.exec('git checkout main', repoPath);
      console.log('[GitSandbox] Checked out main');
    } catch {
      // Try master if main doesn't exist
      console.log('[GitSandbox] main not found, trying master...');
      try {
        this.exec('git checkout master', repoPath);
        mainBranch = 'master';
        console.log('[GitSandbox] Checked out master');
      } catch {
        // Stay on current branch if neither exists
        mainBranch = previousBranch;
        console.log(`[GitSandbox] Staying on ${previousBranch}`);
      }
    }

    // Pull latest changes from remote (if remote exists)
    // Use short timeout - if it hangs (e.g., waiting for credentials), skip it
    console.log(`[GitSandbox] Pulling from origin ${mainBranch} (10s timeout)...`);
    try {
      this.exec(`git pull origin ${mainBranch}`, repoPath, 10000);
      console.log('[GitSandbox] Pull completed');
    } catch (e) {
      // Ignore pull errors (might not have remote, or timed out waiting for credentials)
      console.log(`[GitSandbox] Pull skipped: ${e instanceof Error ? e.message : e}`);
    }

    // Create new sandbox branch
    console.log(`[GitSandbox] Creating branch ${branchName}...`);
    this.exec(`git checkout -b ${branchName}`, repoPath);
    console.log(`[GitSandbox] Branch created`);

    return {
      branch: branchName,
      previousBranch,
      clean: true,
    };
  }

  // Checkout an existing branch (for job retry - doesn't create new or pull from main)
  checkoutExistingBranch(repoPath: string, branch: string): void {
    console.log(`[GitSandbox] Checking out existing branch "${branch}" in ${repoPath}`);
    this.exec(`git checkout ${branch}`, repoPath);
    console.log(`[GitSandbox] Checked out ${branch}`);
  }

  // Check if a branch exists in the repo
  branchExists(repoPath: string, branch: string): boolean {
    try {
      this.exec(`git rev-parse --verify ${branch}`, repoPath);
      return true;
    } catch {
      return false;
    }
  }

  // Reset working directory and remove untracked files
  resetAndClean(repoPath: string): void {
    console.log(`[GitSandbox] Resetting and cleaning working directory`);
    this.exec('git reset --hard', repoPath);
    try {
      this.exec('git clean -fd', repoPath);
    } catch (e) {
      // git clean can fail on Windows with reserved device names (nul, con, prn, etc.)
      console.warn(`[GitSandbox] git clean failed (non-fatal): ${e instanceof Error ? e.message : e}`);
    }
  }

  // Check if there are any uncommitted changes (for detecting if Claude made changes)
  hasChanges(repoPath: string): boolean {
    const status = this.exec('git status --porcelain', repoPath);
    return status.length > 0;
  }

  // Get list of changed files
  getChangedFiles(repoPath: string): string[] {
    const status = this.exec('git status --porcelain', repoPath);
    if (!status) return [];

    return status.split('\n').filter(Boolean).map(line => {
      // Extract filename from status line (format: "XY filename" or "XY -> filename")
      return line.slice(3).split(' -> ').pop()?.trim() || '';
    }).filter(Boolean);
  }

  // Capture diff and changed files
  captureDiff(repoPath: string, artifactsPath: string): DiffResult {
    const patch = this.exec('git diff', repoPath);
    const stagedPatch = this.exec('git diff --cached', repoPath);
    const fullPatch = patch + (stagedPatch ? '\n' + stagedPatch : '');

    const changedFilesOutput = this.exec('git diff --name-only', repoPath);
    const stagedFilesOutput = this.exec('git diff --cached --name-only', repoPath);
    const changedFiles = [...new Set([
      ...changedFilesOutput.split('\n').filter(Boolean),
      ...stagedFilesOutput.split('\n').filter(Boolean),
    ])];

    // Save to artifacts
    const gitDir = join(artifactsPath, 'git');
    if (!existsSync(gitDir)) {
      mkdirSync(gitDir, { recursive: true });
    }

    writeFileSync(join(gitDir, 'diff.patch'), fullPatch);
    writeFileSync(join(gitDir, 'changed-files.json'), JSON.stringify(changedFiles, null, 2));

    return { patch: fullPatch, changedFiles };
  }

  /**
   * Generate a patch file for all changes on a branch compared to main
   * This includes both committed and uncommitted changes
   */
  generatePatch(repoPath: string, branch?: string): string {
    const mainBranch = this.getMainBranch(repoPath);
    const targetBranch = branch || this.getCurrentBranch(repoPath);

    // Get all committed changes on the branch compared to main
    let patch = '';
    try {
      patch = this.exec(`git diff ${mainBranch}...${targetBranch}`, repoPath);
    } catch {
      // If branch comparison fails, just get the current diff
      patch = this.exec('git diff HEAD', repoPath);
    }

    // Also include any uncommitted changes
    const uncommitted = this.exec('git diff', repoPath);
    const staged = this.exec('git diff --cached', repoPath);

    if (uncommitted) {
      patch += '\n# Uncommitted changes:\n' + uncommitted;
    }
    if (staged) {
      patch += '\n# Staged changes:\n' + staged;
    }

    return patch;
  }

  // Check if a remote exists
  hasRemote(repoPath: string, remoteName: string = 'origin'): boolean {
    try {
      const remotes = this.exec('git remote', repoPath);
      return remotes.split('\n').includes(remoteName);
    } catch {
      return false;
    }
  }

  // Get the main branch name (main or master)
  getMainBranch(repoPath: string): string {
    try {
      this.exec('git rev-parse --verify main', repoPath);
      return 'main';
    } catch {
      return 'master';
    }
  }

  // Check if a branch can be merged cleanly into main (no conflicts)
  canMergeCleanly(repoPath: string, branch: string): { canMerge: boolean; conflictFiles?: string[] } {
    const mainBranch = this.getMainBranch(repoPath);
    const currentBranch = this.getCurrentBranch(repoPath);

    try {
      // Make sure we're on main branch
      if (currentBranch !== mainBranch) {
        this.exec(`git checkout ${mainBranch}`, repoPath);
      }

      // Try a dry-run merge
      this.exec(`git merge --no-commit --no-ff ${branch}`, repoPath);
      // If we get here, merge is clean - abort it
      this.exec('git merge --abort', repoPath);
      return { canMerge: true };
    } catch (e) {
      // Merge failed - there are conflicts
      // Try to get the list of conflicting files
      let conflictFiles: string[] = [];
      try {
        const status = this.exec('git diff --name-only --diff-filter=U', repoPath);
        conflictFiles = status.split('\n').filter(Boolean);
      } catch {
        // Ignore - we already know there's a conflict
      }

      // Abort the failed merge
      try {
        this.exec('git merge --abort', repoPath);
      } catch {
        // Reset if abort fails
        try {
          this.exec('git reset --hard HEAD', repoPath);
        } catch {
          // Ignore
        }
      }

      // Restore original branch
      if (currentBranch !== mainBranch) {
        try {
          this.exec(`git checkout ${currentBranch}`, repoPath);
        } catch {
          // Ignore
        }
      }

      return { canMerge: false, conflictFiles };
    }
  }

  // Finalize the sandbox branch - commit changes and optionally push to origin
  // Returns { pushed: boolean } indicating whether changes were pushed to remote
  push(repoPath: string, branch: string, commitMessage?: string): { pushed: boolean } {
    const currentBranch = this.getCurrentBranch(repoPath);

    // Check if target branch exists - for create-repo workflows, the branch may not exist
    // In that case, push the current branch instead
    let branchToPush = branch;
    if (currentBranch !== branch) {
      if (this.branchExists(repoPath, branch)) {
        this.exec(`git checkout ${branch}`, repoPath);
      } else {
        console.log(`[GitSandbox] Branch ${branch} does not exist, pushing current branch ${currentBranch} instead`);
        branchToPush = currentBranch;
      }
    }

    // Remove Windows reserved device name files before staging (they cause git add to fail)
    removeWindowsReservedFiles(repoPath);

    // Stage all changes
    this.exec('git add -A', repoPath);

    // Check if there are changes to commit
    if (!this.isClean(repoPath)) {
      const message = commitMessage || 'ClaudeDesk: automated changes';
      // Escape double quotes in commit message
      const escapedMessage = message.replace(/"/g, '\\"');
      this.exec(`git commit -m "${escapedMessage}"`, repoPath);
      console.log(`[GitSandbox] Changes committed to branch ${branchToPush}`);
    }

    // Check if origin remote exists before pushing
    if (this.hasRemote(repoPath, 'origin')) {
      console.log(`[GitSandbox] Pushing branch ${branchToPush} to origin...`);
      this.exec(`git push -u origin ${branchToPush}`, repoPath, 60000); // 60s timeout for push
      console.log(`[GitSandbox] Branch pushed successfully`);
      return { pushed: true };
    } else {
      console.log(`[GitSandbox] No origin remote configured, skipping push`);
      return { pushed: false };
    }
  }

  // Discard the sandbox branch
  discard(repoPath: string, branch: string, previousBranch: string): void {
    // Reset any changes
    this.exec('git reset --hard', repoPath);
    try {
      this.exec('git clean -fd', repoPath);
    } catch (e) {
      // git clean can fail on Windows with reserved device names (nul, con, prn, etc.)
      console.warn(`[GitSandbox] git clean failed (non-fatal): ${e instanceof Error ? e.message : e}`);
    }

    // Checkout previous branch (non-fatal - just need to not be on the branch we're deleting)
    try {
      if (previousBranch && previousBranch !== branch) {
        this.exec(`git checkout ${previousBranch}`, repoPath);
      } else {
        try {
          this.exec('git checkout main', repoPath);
        } catch {
          this.exec('git checkout master', repoPath);
        }
      }
    } catch (e) {
      // If we can't checkout another branch, that's okay - branch deletion might still work
      console.warn(`[GitSandbox] checkout failed (non-fatal): ${e instanceof Error ? e.message : e}`);
    }

    // Delete the sandbox branch
    try {
      this.exec(`git branch -D ${branch}`, repoPath);
    } catch {
      // Branch might not exist, ignore
    }
  }

  // Initialize a new repo
  init(repoPath: string): void {
    if (!existsSync(repoPath)) {
      mkdirSync(repoPath, { recursive: true });
    }

    this.exec('git init', repoPath);
    this.exec('git checkout -b main', repoPath);
  }

  // =========== WORKTREE METHODS ===========

  /**
   * Create a new worktree for isolated job execution
   * @param repoPath - Path to the main repository
   * @param worktreePath - Path where the worktree should be created
   * @param branchName - Name of the branch to create
   * @returns WorktreeResult with paths and branch info
   */
  createWorktree(repoPath: string, worktreePath: string, branchName: string): WorktreeResult {
    console.log(`[GitSandbox] Creating worktree at "${worktreePath}" from ${repoPath}`);

    // First, ensure we're on main/master and up to date in the main repo
    let mainBranch = 'main';
    try {
      this.exec('git checkout main', repoPath);
    } catch {
      try {
        this.exec('git checkout master', repoPath);
        mainBranch = 'master';
      } catch {
        // Stay on current branch if neither exists
        mainBranch = this.getCurrentBranch(repoPath);
      }
    }

    // Pull latest changes from remote (if remote exists)
    // Use short timeout - if it hangs (e.g., waiting for credentials), skip it
    console.log(`[GitSandbox] Pulling from origin ${mainBranch} (10s timeout)...`);
    try {
      this.exec(`git pull origin ${mainBranch}`, repoPath, 10000);
      console.log('[GitSandbox] Pull completed');
    } catch (e) {
      console.log(`[GitSandbox] Pull skipped: ${e instanceof Error ? e.message : e}`);
    }

    // Clean up stale worktree entries (directories that no longer exist)
    // This is necessary before deleting branches that were checked out in those worktrees
    try {
      this.exec('git worktree prune', repoPath);
    } catch (e) {
      console.warn(`[GitSandbox] Worktree prune failed: ${e instanceof Error ? e.message : e}`);
    }

    // Check if worktree directory already exists and remove it
    if (existsSync(worktreePath)) {
      console.log(`[GitSandbox] Worktree path ${worktreePath} already exists, removing...`);
      try {
        this.exec(`git worktree remove "${worktreePath}" --force`, repoPath);
      } catch (e) {
        console.warn(`[GitSandbox] Failed to remove existing worktree via git: ${e instanceof Error ? e.message : e}`);
      }
      // Prune again after removal
      try {
        this.exec('git worktree prune', repoPath);
      } catch (e) {
        console.warn(`[GitSandbox] Worktree prune failed: ${e instanceof Error ? e.message : e}`);
      }
      // If directory still exists, force remove it manually
      if (existsSync(worktreePath)) {
        console.log(`[GitSandbox] Directory still exists, removing manually...`);
        try {
          rmSync(worktreePath, { recursive: true, force: true });
        } catch (e) {
          console.warn(`[GitSandbox] Manual removal failed: ${e instanceof Error ? e.message : e}`);
        }
      }
    }

    // Clean up orphaned branch from previous failed attempt if it exists
    if (this.branchExists(repoPath, branchName)) {
      console.log(`[GitSandbox] Branch ${branchName} already exists (orphaned from previous attempt), deleting it`);
      try {
        this.exec(`git branch -D "${branchName}"`, repoPath);
      } catch (e) {
        // If branch deletion fails, it might still be locked by a worktree reference
        // Try a more aggressive cleanup
        console.warn(`[GitSandbox] Failed to delete orphaned branch, trying aggressive cleanup: ${e instanceof Error ? e.message : e}`);
        try {
          // Force prune all worktrees
          this.exec('git worktree prune --verbose', repoPath);
          // Try deletion again
          this.exec(`git branch -D "${branchName}"`, repoPath);
          console.log(`[GitSandbox] Branch ${branchName} deleted after aggressive cleanup`);
        } catch (e2) {
          console.warn(`[GitSandbox] Aggressive cleanup failed: ${e2 instanceof Error ? e2.message : e2}`);
          // As a last resort, create worktree without -b flag if branch exists
          // This will use the existing branch instead of creating a new one
          console.log(`[GitSandbox] Will attempt to use existing branch...`);
        }
      }
    }

    // Create worktree with new branch
    // git worktree add -b <branch> <path>
    console.log(`[GitSandbox] Creating worktree with branch ${branchName}...`);

    // Check if branch still exists (cleanup might have failed)
    if (this.branchExists(repoPath, branchName)) {
      // Branch exists, create worktree using existing branch (without -b flag)
      console.log(`[GitSandbox] Branch ${branchName} still exists, creating worktree with existing branch`);
      this.exec(`git worktree add "${worktreePath}" "${branchName}"`, repoPath);
    } else {
      // Normal case: create worktree with new branch
      this.exec(`git worktree add -b "${branchName}" "${worktreePath}"`, repoPath);
    }
    console.log(`[GitSandbox] Worktree created at ${worktreePath}`);

    return {
      worktreePath,
      branch: branchName,
      repoPath,
    };
  }

  /**
   * Remove a worktree and optionally its branch
   * @param repoPath - Path to the main repository
   * @param worktreePath - Path to the worktree to remove
   * @param deleteBranch - Branch name to delete (optional)
   */
  removeWorktree(repoPath: string, worktreePath: string, deleteBranch?: string): void {
    console.log(`[GitSandbox] Removing worktree at "${worktreePath}"`);

    // Remove the worktree
    try {
      this.exec(`git worktree remove "${worktreePath}" --force`, repoPath);
      console.log('[GitSandbox] Worktree removed');
    } catch (e) {
      // If worktree remove fails, try manual cleanup with prune
      console.log(`[GitSandbox] Worktree remove failed, pruning: ${e instanceof Error ? e.message : e}`);
      try {
        this.exec('git worktree prune', repoPath);
      } catch {
        // Prune might fail too, that's okay
      }
    }

    // Delete the branch if requested
    if (deleteBranch) {
      console.log(`[GitSandbox] Deleting branch ${deleteBranch}`);
      try {
        this.exec(`git branch -D "${deleteBranch}"`, repoPath);
        console.log('[GitSandbox] Branch deleted');
      } catch {
        // Branch might not exist, that's okay
        console.log('[GitSandbox] Branch deletion skipped (may not exist)');
      }
    }
  }

  /**
   * Check if a worktree exists at the given path
   */
  worktreeExists(repoPath: string, worktreePath: string): boolean {
    try {
      const output = this.exec('git worktree list --porcelain', repoPath);
      // Normalize path separators for comparison
      const normalizedWorktreePath = worktreePath.replace(/\\/g, '/');
      return output.split('\n').some(line => {
        if (line.startsWith('worktree ')) {
          const path = line.substring(9).replace(/\\/g, '/');
          return path === normalizedWorktreePath;
        }
        return false;
      });
    } catch {
      return false;
    }
  }

  /**
   * Check if a directory is a valid git worktree
   * A valid worktree has a .git file (not directory) that points to the main repo's .git
   * This is useful for detecting corrupted worktrees that exist as directories but aren't valid
   */
  isValidWorktree(worktreePath: string): boolean {
    try {
      // Worktrees have a .git FILE (not directory) that contains "gitdir: ..."
      const gitPath = join(worktreePath, '.git');
      if (!existsSync(gitPath)) {
        return false;
      }

      // Check if .git is a file (worktree) not a directory (regular repo)
      const stat = statSync(gitPath);
      if (stat.isDirectory()) {
        // This is a regular git repo, not a worktree
        return false;
      }

      // Verify it's a valid git worktree by running a git command
      this.exec('git rev-parse --git-dir', worktreePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * List all worktrees for a repository
   */
  listWorktrees(repoPath: string): string[] {
    try {
      const output = this.exec('git worktree list --porcelain', repoPath);
      const paths: string[] = [];
      for (const line of output.split('\n')) {
        if (line.startsWith('worktree ')) {
          paths.push(line.substring(9));
        }
      }
      return paths;
    } catch {
      return [];
    }
  }

  /**
   * Push changes from a worktree
   * @param worktreePath - Path to the worktree
   * @param repoPath - Path to the main repository (for remote check)
   * @param branch - Branch name to push
   * @param commitMessage - Commit message
   * @returns Object indicating what action was taken and any conflicts
   */
  pushWorktree(worktreePath: string, repoPath: string, branch: string, commitMessage?: string): {
    pushed: boolean;
    merged: boolean;
    conflict: boolean;
    conflictFiles?: string[];
  } {
    console.log(`[GitSandbox] Pushing from worktree at ${worktreePath}`);

    // Remove Windows reserved device name files before staging (they cause git add to fail)
    removeWindowsReservedFiles(worktreePath);

    // Stage all changes
    this.exec('git add -A', worktreePath);

    // Check if there are changes to commit
    if (!this.isClean(worktreePath)) {
      const message = commitMessage || 'ClaudeDesk: automated changes';
      const escapedMessage = message.replace(/"/g, '\\"');
      this.exec(`git commit -m "${escapedMessage}"`, worktreePath);
      console.log(`[GitSandbox] Changes committed to branch ${branch}`);
    }

    // Check if origin remote exists
    if (this.hasRemote(repoPath, 'origin')) {
      // HAS REMOTE: Push feature branch to origin (for PR workflow)
      console.log(`[GitSandbox] Pushing branch ${branch} to origin...`);
      try {
        this.exec(`git push -u origin ${branch}`, worktreePath, 60000); // 60s timeout for push
        console.log(`[GitSandbox] Branch pushed successfully`);
        return { pushed: true, merged: false, conflict: false };
      } catch (e) {
        console.log(`[GitSandbox] Push failed: ${e instanceof Error ? e.message : e}`);
        return { pushed: false, merged: false, conflict: false };
      }
    } else {
      // NO REMOTE: Merge feature branch into main locally
      console.log(`[GitSandbox] No origin remote configured, merging to main locally...`);

      // First, check if merge will be clean
      console.log(`[GitSandbox] Checking for merge conflicts...`);
      const mergeCheck = this.canMergeCleanly(repoPath, branch);
      if (!mergeCheck.canMerge) {
        console.log(`[GitSandbox] Merge would have conflicts: ${mergeCheck.conflictFiles?.join(', ')}`);
        return {
          pushed: false,
          merged: false,
          conflict: true,
          conflictFiles: mergeCheck.conflictFiles,
        };
      }

      try {
        const mainBranch = this.getMainBranch(repoPath);
        console.log(`[GitSandbox] Checking out ${mainBranch} in main repo...`);
        this.exec(`git checkout ${mainBranch}`, repoPath);
        console.log(`[GitSandbox] Merging ${branch} into ${mainBranch}...`);
        this.exec(`git merge ${branch}`, repoPath);
        console.log(`[GitSandbox] Successfully merged ${branch} into ${mainBranch}`);
        return { pushed: false, merged: true, conflict: false };
      } catch (e) {
        console.log(`[GitSandbox] Merge failed: ${e instanceof Error ? e.message : e}`);
        return { pushed: false, merged: false, conflict: false };
      }
    }
  }

  // =========== CONFLICT RESOLUTION METHODS ===========

  /**
   * Check if the worktree is currently in a merge conflict state
   */
  isInMergeConflict(worktreePath: string): boolean {
    try {
      // Check for MERGE_HEAD which indicates an ongoing merge
      const mergeHead = join(worktreePath, '.git', 'MERGE_HEAD');
      if (existsSync(mergeHead)) {
        return true;
      }
      // For worktrees, check in the git dir reference
      const gitFile = join(worktreePath, '.git');
      if (existsSync(gitFile)) {
        const content = readFileSync(gitFile, 'utf-8').trim();
        if (content.startsWith('gitdir: ')) {
          const gitDir = content.substring(8);
          if (existsSync(join(gitDir, 'MERGE_HEAD'))) {
            return true;
          }
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Get list of files that have unresolved conflicts
   */
  getConflictingFiles(worktreePath: string): string[] {
    try {
      // --diff-filter=U shows only unmerged (conflicted) files
      const output = this.exec('git diff --name-only --diff-filter=U', worktreePath);
      return output.split('\n').filter(Boolean);
    } catch {
      return [];
    }
  }

  /**
   * Start a merge in the worktree to get into conflict state for resolution
   * This is used when we know there will be conflicts and want to let user resolve them
   */
  startMergeForResolution(worktreePath: string, repoPath: string): { success: boolean; conflictFiles: string[] } {
    const mainBranch = this.getMainBranch(repoPath);

    try {
      // Try to merge main into the worktree's branch
      // This will leave files in conflict state for resolution
      this.exec(`git merge ${mainBranch}`, worktreePath);
      // If merge succeeded, no conflicts
      return { success: true, conflictFiles: [] };
    } catch {
      // Merge failed - get the conflicting files
      const conflictFiles = this.getConflictingFiles(worktreePath);
      return { success: false, conflictFiles };
    }
  }

  /**
   * Get detailed information about conflicting files
   * Must be called when worktree is in merge conflict state
   */
  getConflictDetails(worktreePath: string): import('../types.js').ConflictInfo[] {
    const conflictFiles = this.getConflictingFiles(worktreePath);
    const results: import('../types.js').ConflictInfo[] = [];

    // Get the branch labels from MERGE_MSG or default names
    let oursLabel = 'HEAD (current)';
    let theirsLabel = 'incoming';

    try {
      const mergeMsgPath = join(worktreePath, '.git', 'MERGE_MSG');
      const mergeMsg = existsSync(mergeMsgPath) ? readFileSync(mergeMsgPath, 'utf-8') : '';
      const match = mergeMsg.match(/Merge branch '([^']+)'/);
      if (match) {
        theirsLabel = match[1];
      }
    } catch {
      // Use defaults
    }

    for (const filePath of conflictFiles) {
      try {
        const fullPath = join(worktreePath, filePath);
        if (!existsSync(fullPath)) continue;

        // Read file content to get conflict preview
        const content = readFileSync(fullPath, 'utf-8');
        const lines = content.split('\n');

        // Find first conflict marker and extract preview
        let preview = '';
        let conflictCount = 0;
        let inConflict = false;
        let previewLines: string[] = [];

        for (let i = 0; i < lines.length && previewLines.length < 30; i++) {
          const line = lines[i];
          if (line.startsWith('<<<<<<<')) {
            conflictCount++;
            inConflict = true;
            if (conflictCount === 1) {
              // Start capturing preview from first conflict
              previewLines.push(line);
            }
          } else if (line.startsWith('>>>>>>>')) {
            inConflict = false;
            if (conflictCount === 1) {
              previewLines.push(line);
            }
          } else if (inConflict && conflictCount === 1) {
            previewLines.push(line);
          }
        }

        preview = previewLines.join('\n');
        if (conflictCount > 1) {
          preview += `\n\n... and ${conflictCount - 1} more conflict(s)`;
        }

        results.push({
          filePath,
          preview,
          oursLabel,
          theirsLabel,
          conflictCount,
        });
      } catch (e) {
        // Skip files we can't read
        console.warn(`[GitSandbox] Could not read conflict file ${filePath}: ${e}`);
      }
    }

    return results;
  }

  /**
   * Resolve a single conflicting file using specified strategy
   */
  resolveConflict(worktreePath: string, filePath: string, strategy: 'ours' | 'theirs'): void {
    console.log(`[GitSandbox] Resolving conflict for ${filePath} using ${strategy}`);

    // Use git checkout with --ours or --theirs to pick one side
    this.exec(`git checkout --${strategy} -- "${filePath}"`, worktreePath);

    // Stage the resolved file
    this.exec(`git add "${filePath}"`, worktreePath);

    console.log(`[GitSandbox] Resolved ${filePath} using ${strategy} strategy`);
  }

  /**
   * Resolve all conflicting files using specified strategy
   */
  resolveAllConflicts(worktreePath: string, strategy: 'ours' | 'theirs'): void {
    const conflictFiles = this.getConflictingFiles(worktreePath);
    console.log(`[GitSandbox] Resolving ${conflictFiles.length} conflicts using ${strategy}`);

    for (const filePath of conflictFiles) {
      this.resolveConflict(worktreePath, filePath, strategy);
    }
  }

  /**
   * Abort an ongoing merge and reset to pre-merge state
   */
  abortMerge(worktreePath: string): void {
    console.log(`[GitSandbox] Aborting merge in ${worktreePath}`);

    try {
      this.exec('git merge --abort', worktreePath);
      console.log('[GitSandbox] Merge aborted successfully');
    } catch (e) {
      // If merge abort fails, try hard reset
      console.warn(`[GitSandbox] Merge abort failed, trying reset: ${e}`);
      this.exec('git reset --hard HEAD', worktreePath);
    }
  }

  /**
   * Complete a merge after all conflicts are resolved
   */
  completeMerge(worktreePath: string, commitMessage?: string): void {
    // Check if there are still unresolved conflicts
    const conflictFiles = this.getConflictingFiles(worktreePath);
    if (conflictFiles.length > 0) {
      throw new Error(`Cannot complete merge - ${conflictFiles.length} files still have conflicts: ${conflictFiles.join(', ')}`);
    }

    // Commit the merge
    const message = commitMessage || 'Merge conflict resolved';
    const escapedMessage = message.replace(/"/g, '\\"');

    try {
      this.exec(`git commit -m "${escapedMessage}"`, worktreePath);
      console.log('[GitSandbox] Merge completed successfully');
    } catch (e) {
      // Might already be committed
      console.warn(`[GitSandbox] Commit failed (may already be committed): ${e}`);
    }
  }
}

export const gitSandbox = new GitSandbox();
