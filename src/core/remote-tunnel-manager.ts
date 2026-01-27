import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { settingsManager } from '../config/settings.js';
import { randomBytes } from 'crypto';

export type TunnelStatus = 'stopped' | 'starting' | 'running' | 'error';

interface TunnelState {
  status: TunnelStatus;
  url: string | null;
  startedAt: string | null;
  error: string | null;
  reconnectAttempt: number;
}

/**
 * Manages Cloudflare Tunnel (cloudflared) lifecycle for remote access
 * Implements Quick Tunnels (no account required) with reconnection logic
 */
export class RemoteTunnelManager extends EventEmitter {
  private process: ChildProcess | null = null;
  private state: TunnelState = {
    status: 'stopped',
    url: null,
    startedAt: null,
    error: null,
    reconnectAttempt: 0,
  };
  private reconnectTimer: NodeJS.Timeout | null = null;
  private maxReconnectAttempts = 3;
  private reconnectDelays = [5000, 10000, 30000]; // 5s, 10s, 30s

  constructor() {
    super();
  }

  /**
   * Get current tunnel status
   */
  getStatus(): TunnelState {
    return { ...this.state };
  }

  /**
   * Check if cloudflared is installed
   */
  async isCloudflaredInstalled(): Promise<{ installed: boolean; version: string | null }> {
    return new Promise((resolve) => {
      const proc = spawn('cloudflared', ['--version']);
      let output = '';

      proc.stdout?.on('data', (data) => {
        output += data.toString();
      });

      proc.stderr?.on('data', (data) => {
        output += data.toString();
      });

      proc.on('close', (code) => {
        if (code === 0) {
          // Extract version from output (e.g., "cloudflared version 2023.10.0")
          const match = output.match(/cloudflared version ([\d.]+)/i);
          resolve({ installed: true, version: match ? match[1] : null });
        } else {
          resolve({ installed: false, version: null });
        }
      });

      proc.on('error', () => {
        resolve({ installed: false, version: null });
      });
    });
  }

  /**
   * Start the tunnel
   */
  async start(): Promise<{ success: boolean; url?: string; error?: string }> {
    // Check if already running
    if (this.state.status === 'running') {
      return { success: true, url: this.state.url! };
    }

    // Check if cloudflared is installed
    const { installed } = await this.isCloudflaredInstalled();
    if (!installed) {
      const error = 'cloudflared is not installed. Please install it from https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/';
      this.updateState({ status: 'error', error });
      return { success: false, error };
    }

    this.updateState({ status: 'starting', error: null });

    return new Promise((resolve) => {
      // Get the port from environment or default
      const port = process.env.CLAUDEDESK_PORT ? parseInt(process.env.CLAUDEDESK_PORT, 10) : 8787;

      // Start cloudflared tunnel (Quick Tunnel - no account required)
      // This creates a temporary tunnel with a random subdomain
      this.process = spawn('cloudflared', ['tunnel', '--url', `http://localhost:${port}`]);

      let resolved = false;

      // Helper to parse URL from cloudflared output
      const parseUrl = (output: string, source: string) => {
        console.log(`[Tunnel ${source}]`, output.trim());

        // Look for the tunnel URL in the output
        // Example: "https://moderators-spirit-chi-person.trycloudflare.com"
        const urlMatch = output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
        if (urlMatch && !resolved) {
          const url = urlMatch[0];
          this.updateState({
            status: 'running',
            url,
            startedAt: new Date().toISOString(),
            error: null,
            reconnectAttempt: 0,
          });

          // Save the last tunnel URL
          settingsManager.updateTunnel({ lastTunnelUrl: url });

          resolved = true;
          resolve({ success: true, url });
        }
      };

      // Parse stdout for tunnel URL
      this.process.stdout?.on('data', (data) => {
        parseUrl(data.toString(), 'stdout');
      });

      // Parse stderr for tunnel URL (cloudflared outputs URL to stderr on Windows)
      this.process.stderr?.on('data', (data) => {
        parseUrl(data.toString(), 'stderr');
      });

      // Handle process exit
      this.process.on('close', (code) => {
        console.log(`[Tunnel] Process exited with code ${code}`);

        // If we haven't resolved yet, this is an error
        if (!resolved) {
          const error = `cloudflared exited with code ${code}. Check if cloudflared is installed correctly.`;
          this.updateState({ status: 'error', error });
          resolved = true;
          resolve({ success: false, error });
        } else {
          // Process exited after running - attempt reconnect if enabled
          this.handleDisconnect();
        }
      });

      this.process.on('error', (err) => {
        const error = `Failed to start cloudflared: ${err.message}`;
        console.error('[Tunnel]', error);

        if (!resolved) {
          this.updateState({ status: 'error', error });
          resolved = true;
          resolve({ success: false, error });
        }
      });

      // Timeout after 30 seconds if we don't get a URL
      setTimeout(() => {
        if (!resolved) {
          this.stop();
          const error = 'Timeout waiting for tunnel URL. Check cloudflared logs.';
          this.updateState({ status: 'error', error });
          resolved = true;
          resolve({ success: false, error });
        }
      }, 30000);
    });
  }

  /**
   * Stop the tunnel
   */
  async stop(): Promise<void> {
    // Clear reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.process) {
      this.process.kill('SIGTERM');

      // Wait for process to exit gracefully (max 5 seconds)
      await new Promise<void>((resolve) => {
        if (!this.process) {
          resolve();
          return;
        }

        const timeout = setTimeout(() => {
          if (this.process) {
            this.process.kill('SIGKILL');
          }
          resolve();
        }, 5000);

        this.process.on('close', () => {
          clearTimeout(timeout);
          resolve();
        });
      });

      this.process = null;
    }

    this.updateState({
      status: 'stopped',
      url: null,
      startedAt: null,
      error: null,
      reconnectAttempt: 0,
    });
  }

  /**
   * Handle unexpected disconnect and attempt reconnection
   */
  private handleDisconnect(): void {
    const settings = settingsManager.getTunnel();

    // Don't reconnect if tunnel is disabled
    if (!settings.enabled) {
      this.updateState({ status: 'stopped', url: null, startedAt: null });
      return;
    }

    // Check if we've exceeded max reconnect attempts
    if (this.state.reconnectAttempt >= this.maxReconnectAttempts) {
      const error = `Tunnel disconnected and failed to reconnect after ${this.maxReconnectAttempts} attempts`;
      console.error('[Tunnel]', error);
      this.updateState({ status: 'error', error });
      return;
    }

    // Calculate delay for this attempt
    const delay = this.reconnectDelays[Math.min(this.state.reconnectAttempt, this.reconnectDelays.length - 1)];
    const attemptNum = this.state.reconnectAttempt + 1;

    console.log(`[Tunnel] Attempting reconnect ${attemptNum}/${this.maxReconnectAttempts} in ${delay}ms...`);

    this.updateState({
      status: 'starting',
      url: null,
      startedAt: null,
      reconnectAttempt: attemptNum,
    });

    // Schedule reconnect
    this.reconnectTimer = setTimeout(async () => {
      const result = await this.start();
      if (!result.success) {
        // Reconnect failed, handleDisconnect will be called again by process exit handler
        console.error('[Tunnel] Reconnect attempt failed:', result.error);
      }
    }, delay);
  }

  /**
   * Update state and emit event
   */
  private updateState(updates: Partial<TunnelState>): void {
    this.state = { ...this.state, ...updates };
    this.emit('statusChange', this.state);
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    await this.stop();
  }
}

// Singleton instance
export const remoteTunnelManager = new RemoteTunnelManager();
