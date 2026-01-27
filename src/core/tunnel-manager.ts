import { spawn, ChildProcess } from 'child_process';
import { platform } from 'os';
import treeKill from 'tree-kill';

export interface TunnelResult {
  success: boolean;
  url?: string;
  error?: string;
}

export class TunnelManager {
  private tunnelProcesses: Map<string, ChildProcess> = new Map();

  /**
   * Check if cloudflared CLI is installed and available
   */
  async isCloudflaredAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const proc = spawn('cloudflared', ['--version'], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      proc.on('error', () => resolve(false));
      proc.on('close', (code) => resolve(code === 0));

      // Timeout after 5 seconds
      setTimeout(() => {
        proc.kill();
        resolve(false);
      }, 5000);
    });
  }

  /**
   * Start a Cloudflare Quick Tunnel for a given port
   */
  async startTunnel(port: number, jobId: string): Promise<TunnelResult> {
    console.log(`[TunnelManager] Starting tunnel for port ${port}, job ${jobId}`);

    // Check if cloudflared is available
    const available = await this.isCloudflaredAvailable();
    if (!available) {
      return {
        success: false,
        error: 'cloudflared not installed. Install from https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/',
      };
    }

    return new Promise((resolve) => {
      const isWindows = platform() === 'win32';

      // Spawn cloudflared tunnel process
      const proc = spawn('cloudflared', ['tunnel', '--url', `http://localhost:${port}`], {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: !isWindows,
      });

      let resolved = false;
      let output = '';

      const handleOutput = (data: Buffer) => {
        const text = data.toString();
        output += text;
        console.log(`[TunnelManager] cloudflared: ${text.trim()}`);

        // Look for the tunnel URL in output
        const url = this.parseTunnelUrl(output);
        if (url && !resolved) {
          resolved = true;
          this.tunnelProcesses.set(jobId, proc);
          console.log(`[TunnelManager] Tunnel created: ${url}`);
          resolve({ success: true, url });
        }
      };

      proc.stdout?.on('data', handleOutput);
      proc.stderr?.on('data', handleOutput);

      proc.on('error', (err) => {
        if (!resolved) {
          resolved = true;
          console.error(`[TunnelManager] Process error:`, err);
          resolve({ success: false, error: err.message });
        }
      });

      proc.on('close', (code) => {
        if (!resolved) {
          resolved = true;
          console.log(`[TunnelManager] Process closed with code ${code}`);
          resolve({ success: false, error: `cloudflared exited with code ${code}` });
        }
      });

      // Timeout after 30 seconds if URL not detected
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          console.warn(`[TunnelManager] Timeout waiting for tunnel URL`);
          proc.kill();
          resolve({ success: false, error: 'Timeout waiting for tunnel URL' });
        }
      }, 30000);
    });
  }

  /**
   * Stop a tunnel for a given job
   */
  async stopTunnel(jobId: string): Promise<void> {
    const proc = this.tunnelProcesses.get(jobId);
    if (!proc) {
      return;
    }

    console.log(`[TunnelManager] Stopping tunnel for job ${jobId}`);

    return new Promise((resolve) => {
      const pid = proc.pid;
      if (!pid) {
        this.tunnelProcesses.delete(jobId);
        resolve();
        return;
      }

      // Kill the entire process tree
      treeKill(pid, 'SIGTERM', (err) => {
        if (err) {
          console.warn(`[TunnelManager] Error killing tunnel:`, err);
          // Try SIGKILL as fallback
          treeKill(pid, 'SIGKILL', () => {});
        }
        this.tunnelProcesses.delete(jobId);
        resolve();
      });
    });
  }

  /**
   * Parse tunnel URL from cloudflared output
   * Looks for patterns like: https://random-words.trycloudflare.com
   */
  private parseTunnelUrl(output: string): string | null {
    // Match Cloudflare Quick Tunnel URL pattern
    const match = output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
    return match ? match[0] : null;
  }

  /**
   * Check if a tunnel is active for a job
   */
  hasTunnel(jobId: string): boolean {
    return this.tunnelProcesses.has(jobId);
  }

  /**
   * Stop all active tunnels (for cleanup)
   */
  async stopAllTunnels(): Promise<void> {
    const jobIds = Array.from(this.tunnelProcesses.keys());
    await Promise.all(jobIds.map(id => this.stopTunnel(id)));
  }
}

export const tunnelManager = new TunnelManager();
