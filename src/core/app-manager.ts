import { ChildProcess } from 'child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { ProcessRunner } from './process-runner.js';
import { tunnelManager } from './tunnel-manager.js';
import { repoRegistry } from '../config/repos.js';
import type { RunningApp, AppStatus, DetectedService } from '../types.js';

// Max log lines to buffer per app
const MAX_LOG_LINES = 10000;

// Port detection patterns
const PORT_PATTERNS = [
  /listening on port\s+(\d+)/i,
  /server running at http:\/\/localhost:(\d+)/i,
  /ready on port\s+(\d+)/i,
  /started server on .+:(\d+)/i,
  /local:\s+http:\/\/localhost:(\d+)/i,
  /http:\/\/localhost:(\d+)/,
  /http:\/\/127\.0\.0\.1:(\d+)/,
  /port\s+(\d+)/i,
];

export interface StartAppOptions {
  repoId: string;
  port?: number;
  command?: string;
  env?: Record<string, string>;
  tunnel?: { enabled: boolean };
  docker?: {
    enabled: boolean;
    imageName?: string;
    memoryLimit?: string;
    cpuLimit?: number;
  };
}

export interface MonorepoInfo {
  isMonorepo: boolean;
  services: DetectedService[];
  primaryServiceId?: string;
}

export interface DockerInfo {
  hasDockerfile: boolean;
  hasDockerCompose: boolean;
  needsRebuild: boolean | null;
}

interface ManagedApp {
  app: RunningApp;
  process?: ChildProcess;
  processId?: string;
  logBuffer: string[];
}

export class AppManager {
  private apps: Map<string, ManagedApp> = new Map();
  private processRunner: ProcessRunner;

  constructor() {
    this.processRunner = new ProcessRunner();
  }

  /**
   * Generate a unique app ID
   */
  private generateAppId(): string {
    return `app-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  /**
   * Start an application
   */
  async startApp(options: StartAppOptions): Promise<RunningApp> {
    const { repoId, port, command, env, tunnel, docker } = options;

    // Get repo config
    const repoConfig = repoRegistry.get(repoId);
    if (!repoConfig) {
      throw new Error(`Repository not found: ${repoId}`);
    }

    // Check if already running
    const existing = this.getAppByRepoId(repoId);
    if (existing && (existing.status === 'RUNNING' || existing.status === 'STARTING')) {
      throw new Error(`App for ${repoId} is already running`);
    }

    const appId = this.generateAppId();
    const configuredPort = port || repoConfig.port || 3000;

    // Determine the run command
    let runCommand = command;
    if (!runCommand) {
      runCommand = repoConfig.commands.run || 'npm run dev';
    }

    // Create the app record
    const app: RunningApp = {
      id: appId,
      repoId,
      status: 'STARTING',
      runConfig: {
        port: configuredPort,
        env,
        docker,
        tunnel,
        command: runCommand,
      },
      startedAt: new Date().toISOString(),
      logs: [],
    };

    const managedApp: ManagedApp = {
      app,
      logBuffer: [],
    };

    this.apps.set(appId, managedApp);

    try {
      // Start the process
      const { processId, process: proc } = this.processRunner.startServer(runCommand, {
        cwd: repoConfig.path,
        env: {
          ...env,
          PORT: String(configuredPort),
        },
      });

      managedApp.processId = processId;
      managedApp.process = proc;
      app.processId = processId;

      // Set up log capture and port detection
      let portDetected = false;

      const handleOutput = (data: Buffer) => {
        const text = data.toString();
        this.appendLog(appId, text);

        // Try to detect port from output
        if (!portDetected) {
          for (const pattern of PORT_PATTERNS) {
            const match = text.match(pattern);
            if (match && match[1]) {
              const detectedPort = parseInt(match[1], 10);
              if (detectedPort > 0 && detectedPort < 65536) {
                app.detectedPort = detectedPort;
                app.localUrl = `http://localhost:${detectedPort}`;
                portDetected = true;
                console.log(`[AppManager] Detected port ${detectedPort} for app ${appId}`);
                break;
              }
            }
          }
        }

        // Check for startup indicators
        if (app.status === 'STARTING') {
          const lowerText = text.toLowerCase();
          if (
            lowerText.includes('ready') ||
            lowerText.includes('listening') ||
            lowerText.includes('started') ||
            lowerText.includes('compiled') ||
            portDetected
          ) {
            app.status = 'RUNNING';
            console.log(`[AppManager] App ${appId} is now RUNNING`);
          }
        }
      };

      proc.stdout?.on('data', handleOutput);
      proc.stderr?.on('data', handleOutput);

      proc.on('close', (code) => {
        console.log(`[AppManager] App ${appId} process closed with code ${code}`);
        if (app.status !== 'STOPPING' && app.status !== 'STOPPED') {
          app.status = code === 0 ? 'STOPPED' : 'FAILED';
          if (code !== 0) {
            app.error = `Process exited with code ${code}`;
          }
        }
      });

      proc.on('error', (err) => {
        console.error(`[AppManager] App ${appId} process error:`, err);
        app.status = 'FAILED';
        app.error = err.message;
      });

      // If tunnel is enabled, start it after a short delay to allow port detection
      if (tunnel?.enabled) {
        setTimeout(async () => {
          const portToTunnel = app.detectedPort || configuredPort;
          console.log(`[AppManager] Starting tunnel for app ${appId} on port ${portToTunnel}`);
          const result = await tunnelManager.startTunnel(portToTunnel, appId);
          if (result.success && result.url) {
            app.tunnelUrl = result.url;
            console.log(`[AppManager] Tunnel created: ${result.url}`);
          } else {
            console.warn(`[AppManager] Failed to create tunnel: ${result.error}`);
            this.appendLog(appId, `[Tunnel] Failed: ${result.error}\n`);
          }
        }, 3000);
      }

      // Set default local URL if not detected
      if (!app.localUrl) {
        app.localUrl = `http://localhost:${configuredPort}`;
      }

      return app;
    } catch (error) {
      app.status = 'FAILED';
      app.error = error instanceof Error ? error.message : String(error);
      throw error;
    }
  }

  /**
   * Stop an application
   */
  async stopApp(appId: string): Promise<void> {
    const managedApp = this.apps.get(appId);
    if (!managedApp) {
      throw new Error(`App not found: ${appId}`);
    }

    managedApp.app.status = 'STOPPING';

    // Stop tunnel if active
    if (tunnelManager.hasTunnel(appId)) {
      await tunnelManager.stopTunnel(appId);
      managedApp.app.tunnelUrl = undefined;
    }

    // Kill the process
    if (managedApp.processId) {
      await this.processRunner.killProcess(managedApp.processId);
    }

    managedApp.app.status = 'STOPPED';
    console.log(`[AppManager] App ${appId} stopped`);
  }

  /**
   * Restart an application
   */
  async restartApp(appId: string): Promise<RunningApp> {
    const managedApp = this.apps.get(appId);
    if (!managedApp) {
      throw new Error(`App not found: ${appId}`);
    }

    const { repoId } = managedApp.app;
    const options: StartAppOptions = {
      repoId,
      port: managedApp.app.runConfig.port,
      command: managedApp.app.runConfig.command,
      env: managedApp.app.runConfig.env,
      tunnel: managedApp.app.runConfig.tunnel,
      docker: managedApp.app.runConfig.docker,
    };

    // Stop the current app
    await this.stopApp(appId);

    // Remove from registry
    this.apps.delete(appId);

    // Start fresh
    return this.startApp(options);
  }

  /**
   * Get all running apps
   */
  getApps(): RunningApp[] {
    return Array.from(this.apps.values()).map((m) => ({
      ...m.app,
      logs: m.logBuffer.slice(-100), // Return last 100 lines in list
    }));
  }

  /**
   * Get a specific app by ID
   */
  getApp(appId: string): RunningApp | undefined {
    const managedApp = this.apps.get(appId);
    if (!managedApp) return undefined;
    return {
      ...managedApp.app,
      logs: managedApp.logBuffer.slice(-100),
    };
  }

  /**
   * Get app by repo ID
   */
  getAppByRepoId(repoId: string): RunningApp | undefined {
    for (const managed of this.apps.values()) {
      if (managed.app.repoId === repoId) {
        return {
          ...managed.app,
          logs: managed.logBuffer.slice(-100),
        };
      }
    }
    return undefined;
  }

  /**
   * Get logs for an app
   */
  getAppLogs(appId: string): string {
    const managedApp = this.apps.get(appId);
    if (!managedApp) {
      throw new Error(`App not found: ${appId}`);
    }
    return managedApp.logBuffer.join('');
  }

  /**
   * Append log content for an app
   */
  private appendLog(appId: string, content: string): void {
    const managedApp = this.apps.get(appId);
    if (!managedApp) return;

    // Split into lines and append
    const lines = content.split('\n');
    for (const line of lines) {
      if (line) {
        managedApp.logBuffer.push(line + '\n');
      }
    }

    // Trim if over limit
    if (managedApp.logBuffer.length > MAX_LOG_LINES) {
      managedApp.logBuffer = managedApp.logBuffer.slice(-MAX_LOG_LINES);
    }
  }

  /**
   * Detect monorepo services for a repository
   */
  async detectMonorepoServices(repoId: string): Promise<MonorepoInfo> {
    const repoConfig = repoRegistry.get(repoId);
    if (!repoConfig) {
      throw new Error(`Repository not found: ${repoId}`);
    }

    const repoPath = repoConfig.path;
    const services: DetectedService[] = [];

    // Check for pnpm-workspace.yaml or packages/apps directories
    const workspaceYaml = join(repoPath, 'pnpm-workspace.yaml');
    const packagesDir = join(repoPath, 'packages');
    const appsDir = join(repoPath, 'apps');

    let isMonorepo = false;

    // Check pnpm workspace
    if (existsSync(workspaceYaml)) {
      isMonorepo = true;
    }

    // Check for packages directory
    if (existsSync(packagesDir)) {
      const packageServices = this.scanDirectoryForServices(packagesDir, 'packages');
      services.push(...packageServices);
      if (packageServices.length > 0) {
        isMonorepo = true;
      }
    }

    // Check for apps directory
    if (existsSync(appsDir)) {
      const appServices = this.scanDirectoryForServices(appsDir, 'apps');
      services.push(...appServices);
      if (appServices.length > 0) {
        isMonorepo = true;
      }
    }

    // Check root package.json for workspaces
    const rootPkgPath = join(repoPath, 'package.json');
    if (existsSync(rootPkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(rootPkgPath, 'utf-8'));
        if (pkg.workspaces) {
          isMonorepo = true;
        }
      } catch {
        // Ignore parse errors
      }
    }

    // If repo config has services defined, use those
    if (repoConfig.services && repoConfig.services.length > 0) {
      isMonorepo = true;
      return {
        isMonorepo,
        services: repoConfig.services,
        primaryServiceId: repoConfig.primaryService || repoConfig.services[0]?.id,
      };
    }

    // Determine primary service (first web-facing one)
    const primaryServiceId = services.find((s) =>
      ['Next.js', 'Vite', 'React', 'Vue', 'Svelte'].includes(s.framework || '')
    )?.id || services[0]?.id;

    return {
      isMonorepo,
      services,
      primaryServiceId,
    };
  }

  /**
   * Scan a directory for service packages
   */
  private scanDirectoryForServices(dirPath: string, prefix: string): DetectedService[] {
    const services: DetectedService[] = [];

    if (!existsSync(dirPath)) return services;

    try {
      const entries = readdirSync(dirPath);

      for (const entry of entries) {
        const fullPath = join(dirPath, entry);
        if (!statSync(fullPath).isDirectory()) continue;

        const pkgPath = join(fullPath, 'package.json');
        if (!existsSync(pkgPath)) continue;

        try {
          const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
          const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

          // Detect framework
          let framework: string | undefined;
          let suggestedPort = 3000;
          let runScript: 'dev' | 'start' = 'dev';

          if (allDeps['next']) {
            framework = 'Next.js';
            suggestedPort = 3000;
          } else if (allDeps['vite']) {
            framework = 'Vite';
            suggestedPort = 5173;
          } else if (allDeps['@angular/core']) {
            framework = 'Angular';
            suggestedPort = 4200;
          } else if (allDeps['vue']) {
            framework = 'Vue';
            suggestedPort = 5173;
          } else if (allDeps['svelte']) {
            framework = 'Svelte';
            suggestedPort = 5173;
          } else if (allDeps['express']) {
            framework = 'Express';
            suggestedPort = 3001;
          } else if (allDeps['@nestjs/core']) {
            framework = 'NestJS';
            suggestedPort = 3001;
          } else if (allDeps['fastify']) {
            framework = 'Fastify';
            suggestedPort = 3001;
          }

          // Check for start script
          if (!pkg.scripts?.dev && pkg.scripts?.start) {
            runScript = 'start';
          }

          services.push({
            id: pkg.name || entry,
            name: entry,
            path: `${prefix}/${entry}`,
            framework,
            runScript,
            suggestedPort,
          });
        } catch {
          // Skip packages with invalid package.json
        }
      }
    } catch (err) {
      console.error(`[AppManager] Failed to scan ${dirPath}:`, err);
    }

    return services;
  }

  /**
   * Get Docker configuration info for a repository
   */
  async getDockerInfo(repoId: string): Promise<DockerInfo> {
    const repoConfig = repoRegistry.get(repoId);
    if (!repoConfig) {
      throw new Error(`Repository not found: ${repoId}`);
    }

    const repoPath = repoConfig.path;

    const hasDockerfile = existsSync(join(repoPath, 'Dockerfile'));
    const hasDockerCompose =
      existsSync(join(repoPath, 'docker-compose.yml')) ||
      existsSync(join(repoPath, 'docker-compose.yaml')) ||
      existsSync(join(repoPath, 'compose.yml')) ||
      existsSync(join(repoPath, 'compose.yaml'));

    // For needsRebuild, we would need to track image build times
    // For now, return null (unknown)
    const needsRebuild: boolean | null = null;

    return {
      hasDockerfile,
      hasDockerCompose,
      needsRebuild,
    };
  }

  /**
   * Stop all running apps (for cleanup)
   */
  async stopAllApps(): Promise<void> {
    const appIds = Array.from(this.apps.keys());
    await Promise.all(appIds.map((id) => this.stopApp(id).catch(() => {})));
  }
}

export const appManager = new AppManager();
