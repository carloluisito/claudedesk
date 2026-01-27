import { spawn, ChildProcess } from 'child_process';
import { createWriteStream, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import treeKill from 'tree-kill';

export interface RunOptions {
  cwd: string;
  timeout?: number;
  logFile?: string;
  env?: Record<string, string>;
}

export interface RunResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  killed: boolean;
  error?: string;
}

export class ProcessRunner {
  private runningProcesses: Map<string, ChildProcess> = new Map();

  async run(command: string, options: RunOptions): Promise<RunResult> {
    const { cwd, timeout = 120000, logFile, env } = options;
    console.log(`[ProcessRunner] Starting: "${command}" in ${cwd}`);

    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';
      let killed = false;

      // On Windows, use cmd.exe to run commands
      const isWindows = process.platform === 'win32';
      const shell = isWindows ? 'cmd.exe' : '/bin/sh';
      const shellArgs = isWindows ? ['/c', command] : ['-c', command];
      console.log(`[ProcessRunner] Shell: ${shell}, args: ${JSON.stringify(shellArgs)}`);

      const proc = spawn(shell, shellArgs, {
        cwd,
        env: { ...process.env, ...env },
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      const processId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      this.runningProcesses.set(processId, proc);
      console.log(`[ProcessRunner] Process spawned, PID: ${proc.pid}, processId: ${processId}`);

      // Set up log file if specified
      let logStream: ReturnType<typeof createWriteStream> | null = null;
      if (logFile) {
        const logDir = join(cwd, 'logs');
        if (!existsSync(logDir)) {
          mkdirSync(logDir, { recursive: true });
        }
        logStream = createWriteStream(join(logDir, logFile));
        logStream.write(`$ ${command}\n\n`);
      }

      proc.stdout?.on('data', (data: Buffer) => {
        const text = data.toString();
        stdout += text;
        logStream?.write(text);
      });

      proc.stderr?.on('data', (data: Buffer) => {
        const text = data.toString();
        stderr += text;
        logStream?.write(`[stderr] ${text}`);
      });

      const timer = setTimeout(() => {
        killed = true;
        this.killProcess(processId);
      }, timeout);

      proc.on('close', (code) => {
        console.log(`[ProcessRunner] Process ${processId} closed with code ${code}`);
        clearTimeout(timer);
        this.runningProcesses.delete(processId);
        logStream?.end();

        resolve({
          exitCode: code,
          stdout,
          stderr,
          killed,
          error: killed ? `Process timed out after ${timeout}ms` : undefined,
        });
      });

      proc.on('error', (err) => {
        console.log(`[ProcessRunner] Process ${processId} error: ${err.message}`);
        clearTimeout(timer);
        this.runningProcesses.delete(processId);
        logStream?.end();

        resolve({
          exitCode: null,
          stdout,
          stderr,
          killed: false,
          error: err.message,
        });
      });
    });
  }

  // Start a long-running process (like a dev server)
  startServer(command: string, options: RunOptions): { processId: string; process: ChildProcess } {
    const { cwd, env, logFile } = options;

    const isWindows = process.platform === 'win32';
    const shell = isWindows ? 'cmd.exe' : '/bin/sh';
    const shellArgs = isWindows ? ['/c', command] : ['-c', command];

    const proc = spawn(shell, shellArgs, {
      cwd,
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: !isWindows, // On Unix, create process group
    });

    const processId = `server-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    this.runningProcesses.set(processId, proc);

    // Set up log file if specified
    if (logFile) {
      const logDir = join(cwd, 'logs');
      if (!existsSync(logDir)) {
        mkdirSync(logDir, { recursive: true });
      }
      const logStream = createWriteStream(join(logDir, logFile));
      logStream.write(`$ ${command}\n\n`);

      proc.stdout?.on('data', (data: Buffer) => {
        logStream.write(data.toString());
      });

      proc.stderr?.on('data', (data: Buffer) => {
        logStream.write(`[stderr] ${data.toString()}`);
      });

      proc.on('close', () => {
        logStream.end();
      });
    }

    return { processId, process: proc };
  }

  killProcess(processId: string): Promise<void> {
    return new Promise((resolve) => {
      const proc = this.runningProcesses.get(processId);
      if (!proc || !proc.pid) {
        this.runningProcesses.delete(processId);
        resolve();
        return;
      }

      // Use tree-kill to kill the entire process tree on Windows
      treeKill(proc.pid, 'SIGTERM', (err) => {
        if (err) {
          console.error(`Failed to kill process ${processId}:`, err);
          // Force kill
          treeKill(proc.pid!, 'SIGKILL', () => {
            this.runningProcesses.delete(processId);
            resolve();
          });
        } else {
          this.runningProcesses.delete(processId);
          resolve();
        }
      });
    });
  }

  killAllProcesses(): Promise<void[]> {
    const killPromises = Array.from(this.runningProcesses.keys()).map(id =>
      this.killProcess(id)
    );
    return Promise.all(killPromises);
  }

  getRunningProcessIds(): string[] {
    return Array.from(this.runningProcesses.keys());
  }
}

export const processRunner = new ProcessRunner();
