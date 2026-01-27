/**
 * GitLab OAuth Device Flow Implementation
 *
 * The device flow allows CLI/desktop apps to authenticate without a callback URL:
 * 1. Request a device code from GitLab
 * 2. User goes to gitlab.com/-/profile/device and enters the code
 * 3. App polls GitLab until user completes authorization
 * 4. GitLab returns access token
 *
 * See: https://docs.gitlab.com/ee/api/oauth2.html#device-authorization-grant
 */

export interface DeviceCodeResponse {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  expiresIn: number;
  interval: number;
}

export interface TokenResponse {
  accessToken: string;
  tokenType: string;
  scope: string;
  refreshToken?: string;
  expiresIn?: number;
}

export interface GitLabUser {
  username: string;
  name: string | null;
  avatarUrl: string;
}

// Polling states
export type PollStatus = 'pending' | 'success' | 'expired' | 'error';

export interface PollResult {
  status: PollStatus;
  token?: TokenResponse;
  error?: string;
}

// Store active device flow sessions (device_code -> pending state)
const activeSessions = new Map<string, {
  deviceCode: string;
  interval: number;
  expiresAt: number;
  clientId: string;
}>();

export class GitLabDeviceAuth {
  private clientId: string;

  constructor(clientId: string) {
    this.clientId = clientId;
  }

  /**
   * Step 1: Request a device code from GitLab
   * User will need to visit the verification URI and enter the user code
   */
  async requestDeviceCode(scope: string = 'api read_user'): Promise<DeviceCodeResponse> {
    const response = await fetch('https://gitlab.com/oauth/authorize_device', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        scope,
      }).toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to request device code: ${error}`);
    }

    const data = await response.json();

    const result: DeviceCodeResponse = {
      deviceCode: data.device_code,
      userCode: data.user_code,
      verificationUri: data.verification_uri || 'https://gitlab.com/-/profile/device',
      expiresIn: data.expires_in,
      interval: data.interval || 5,
    };

    // Store session for polling
    activeSessions.set(result.deviceCode, {
      deviceCode: result.deviceCode,
      interval: result.interval,
      expiresAt: Date.now() + (result.expiresIn * 1000),
      clientId: this.clientId,
    });

    return result;
  }

  /**
   * Step 2: Poll for access token
   * Call this periodically (respecting the interval) until authorization completes
   */
  async pollForToken(deviceCode: string): Promise<PollResult> {
    const session = activeSessions.get(deviceCode);

    if (!session) {
      return { status: 'error', error: 'Device code session not found' };
    }

    // Check if expired
    if (Date.now() > session.expiresAt) {
      activeSessions.delete(deviceCode);
      return { status: 'expired', error: 'Device code has expired' };
    }

    try {
      const response = await fetch('https://gitlab.com/oauth/token', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: session.clientId,
          device_code: deviceCode,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        }).toString(),
      });

      const data = await response.json();

      // Check for errors
      if (data.error) {
        switch (data.error) {
          case 'authorization_pending':
            // User hasn't completed authorization yet - keep polling
            return { status: 'pending' };

          case 'slow_down':
            // Too many requests - increase interval
            session.interval += 5;
            return { status: 'pending' };

          case 'expired_token':
            activeSessions.delete(deviceCode);
            return { status: 'expired', error: 'Device code has expired' };

          case 'access_denied':
            activeSessions.delete(deviceCode);
            return { status: 'error', error: 'User denied authorization' };

          default:
            return { status: 'error', error: data.error_description || data.error };
        }
      }

      // Success! We got the token
      if (data.access_token) {
        activeSessions.delete(deviceCode);
        return {
          status: 'success',
          token: {
            accessToken: data.access_token,
            tokenType: data.token_type,
            scope: data.scope,
            refreshToken: data.refresh_token,
            expiresIn: data.expires_in,
          },
        };
      }

      return { status: 'error', error: 'Unexpected response from GitLab' };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return { status: 'error', error: errorMsg };
    }
  }

  /**
   * Get the polling interval for a device code session
   */
  getPollingInterval(deviceCode: string): number {
    const session = activeSessions.get(deviceCode);
    return session?.interval || 5;
  }

  /**
   * Cancel an active device code session
   */
  cancelSession(deviceCode: string): void {
    activeSessions.delete(deviceCode);
  }

  /**
   * Get user info using an access token
   */
  async getUser(accessToken: string): Promise<GitLabUser> {
    const response = await fetch('https://gitlab.com/api/v4/user', {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get user info: ${error}`);
    }

    const data = await response.json();

    return {
      username: data.username,
      name: data.name,
      avatarUrl: data.avatar_url,
    };
  }

  /**
   * Verify that an access token is still valid
   */
  async verifyToken(accessToken: string): Promise<boolean> {
    try {
      const response = await fetch('https://gitlab.com/api/v4/user', {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Refresh an expired access token using a refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<TokenResponse | null> {
    try {
      const response = await fetch('https://gitlab.com/oauth/token', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.clientId,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }).toString(),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error(`[GitLabDeviceAuth] Failed to refresh token: ${error}`);
        return null;
      }

      const data = await response.json();

      if (data.access_token) {
        return {
          accessToken: data.access_token,
          tokenType: data.token_type,
          scope: data.scope,
          refreshToken: data.refresh_token,
          expiresIn: data.expires_in,
        };
      }

      return null;
    } catch (error) {
      console.error(`[GitLabDeviceAuth] Error refreshing token:`, error);
      return null;
    }
  }
}

/**
 * Synchronous wrapper for refreshing GitLab token using temp script approach
 */
export function refreshGitLabTokenSync(clientId: string, refreshToken: string): TokenResponse | null {
  const { execSync } = require('child_process');
  const { writeFileSync, readFileSync, unlinkSync } = require('fs');
  const { tmpdir } = require('os');
  const { join } = require('path');
  const { randomUUID } = require('crypto');

  const tempScriptPath = join(tmpdir(), `gitlab-refresh-${randomUUID()}.mjs`);
  const tempResultPath = join(tmpdir(), `gitlab-refresh-result-${randomUUID()}.json`);

  const scriptContent = `
import { writeFileSync } from 'fs';
try {
  const response = await fetch('https://gitlab.com/oauth/token', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: ${JSON.stringify(clientId)},
      refresh_token: ${JSON.stringify(refreshToken)},
      grant_type: 'refresh_token',
    }).toString(),
  });

  const text = await response.text();

  if (!response.ok) {
    writeFileSync(${JSON.stringify(tempResultPath)}, JSON.stringify({ success: false, error: text }));
  } else {
    const data = JSON.parse(text);
    if (data.access_token) {
      writeFileSync(${JSON.stringify(tempResultPath)}, JSON.stringify({
        success: true,
        accessToken: data.access_token,
        tokenType: data.token_type,
        scope: data.scope,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in
      }));
    } else {
      writeFileSync(${JSON.stringify(tempResultPath)}, JSON.stringify({ success: false, error: 'No access_token in response' }));
    }
  }
} catch (e) {
  writeFileSync(${JSON.stringify(tempResultPath)}, JSON.stringify({ success: false, error: e.message }));
}
`;

  try {
    writeFileSync(tempScriptPath, scriptContent);
    execSync(`node "${tempScriptPath}"`, { encoding: 'utf-8', timeout: 15000 });

    const resultJson = readFileSync(tempResultPath, 'utf-8');
    const result = JSON.parse(resultJson);

    if (result.success) {
      return {
        accessToken: result.accessToken,
        tokenType: result.tokenType,
        scope: result.scope,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn,
      };
    }

    console.error(`[GitLab] Token refresh failed: ${result.error}`);
    return null;
  } catch (error) {
    console.error(`[GitLab] Token refresh error:`, error);
    return null;
  } finally {
    try { unlinkSync(tempScriptPath); } catch {}
    try { unlinkSync(tempResultPath); } catch {}
  }
}

/**
 * Create a new GitLab API client with an access token
 * For making authenticated GitLab API calls
 */
export class GitLabAPI {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = endpoint.startsWith('https://')
      ? endpoint
      : `https://gitlab.com/api/v4${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${this.accessToken}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GitLab API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async getUser(): Promise<GitLabUser> {
    const data = await this.request('/user');
    return {
      username: data.username,
      name: data.name,
      avatarUrl: data.avatar_url,
    };
  }

  async createProject(name: string, visibility: 'private' | 'public' | 'internal' = 'private', description?: string): Promise<{
    id: number;
    name: string;
    pathWithNamespace: string;
    webUrl: string;
    httpUrlToRepo: string;
    sshUrlToRepo: string;
  }> {
    const data = await this.request('/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        visibility,
        description,
        initialize_with_readme: false,
      }),
    });

    return {
      id: data.id,
      name: data.name,
      pathWithNamespace: data.path_with_namespace,
      webUrl: data.web_url,
      httpUrlToRepo: data.http_url_to_repo,
      sshUrlToRepo: data.ssh_url_to_repo,
    };
  }

  async listProjects(page: number = 1, perPage: number = 30): Promise<Array<{
    id: number;
    name: string;
    pathWithNamespace: string;
    webUrl: string;
    visibility: string;
  }>> {
    const data = await this.request(`/projects?owned=true&page=${page}&per_page=${perPage}&order_by=updated_at`);
    return data.map((project: any) => ({
      id: project.id,
      name: project.name,
      pathWithNamespace: project.path_with_namespace,
      webUrl: project.web_url,
      visibility: project.visibility,
    }));
  }
}
