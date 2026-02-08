import * as pty from 'node-pty';
import { TerminalSize, PermissionMode } from '../shared/ipc-types';

export interface CLIManagerOptions {
  workingDirectory: string;
  permissionMode: PermissionMode;
}

export class CLIManager {
  private ptyProcess: pty.IPty | null = null;
  private outputCallback: ((data: string) => void) | null = null;
  private exitCallback: ((exitCode: number) => void) | null = null;
  private outputBuffer: string = '';
  private flushTimeout: NodeJS.Timeout | null = null;
  private readonly FLUSH_INTERVAL = 16; // ~60fps, prevents IPC flooding
  private options: CLIManagerOptions;
  private _isRunning: boolean = false;

  constructor(options: CLIManagerOptions) {
    this.options = options;
  }

  get isRunning(): boolean {
    return this._isRunning;
  }

  spawn(): void {
    const shell = process.platform === 'win32' ? 'powershell.exe' : process.env.SHELL || '/bin/bash';

    this.ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
      cwd: this.options.workingDirectory,
      env: {
        ...process.env,
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor',
        CLAUDEDESK_LOCKED_DIR: this.options.workingDirectory,
      } as { [key: string]: string },
    });

    this._isRunning = true;

    this.ptyProcess.onData((data: string) => {
      this.bufferOutput(data);
    });

    this.ptyProcess.onExit(({ exitCode }) => {
      this._isRunning = false;
      this.flushOutput(); // Flush any remaining output
      if (this.exitCallback) {
        this.exitCallback(exitCode);
      }
    });

    // Small delay to let shell initialize, then inject directory lock and launch Claude
    setTimeout(() => {
      this.injectDirectoryLock();
      this.launchClaudeCommand();
    }, 150);
  }

  private injectDirectoryLock(): void {
    const lockedDir = this.options.workingDirectory;

    if (process.platform === 'win32') {
      // PowerShell: Simple prompt hook (will be visible but minimal)
      // Note: PowerShell echoes all commands in interactive mode - this is unavoidable
      const escapedDir = lockedDir.replace(/\\/g, '\\\\');
      this.write(`$env:CLAUDEDESK_LOCKED_DIR="${escapedDir}"\r`);
      this.write(`function global:prompt{if($PWD.Path -ne $env:CLAUDEDESK_LOCKED_DIR){sl $env:CLAUDEDESK_LOCKED_DIR -EA silent;Write-Host "Directory locked to: $env:CLAUDEDESK_LOCKED_DIR" -F Red}"PS $($PWD.Path)> "}\r`);
      this.write(`clear\r`);
    } else {
      // Bash/Zsh: Override cd, pushd, popd + PROMPT_COMMAND hook
      const bashInit = `
export CLAUDEDESK_LOCKED_DIR="${lockedDir}"
PROMPT_COMMAND='if [ "$PWD" != "$CLAUDEDESK_LOCKED_DIR" ]; then cd "$CLAUDEDESK_LOCKED_DIR" 2>/dev/null; echo -e "\\033[0;31mError: Directory change blocked. Locked to: $CLAUDEDESK_LOCKED_DIR\\033[0m" >&2; fi'
cd() { echo -e "\\033[0;31mError: cd disabled. Locked to: $CLAUDEDESK_LOCKED_DIR\\033[0m" >&2; return 1; }
pushd() { echo -e "\\033[0;31mError: pushd disabled. Locked to: $CLAUDEDESK_LOCKED_DIR\\033[0m" >&2; return 1; }
popd() { echo -e "\\033[0;31mError: popd disabled. Locked to: $CLAUDEDESK_LOCKED_DIR\\033[0m" >&2; return 1; }
`.replace(/\n/g, '\r');
      this.write(bashInit);
    }
  }

  private launchClaudeCommand(): void {
    const claudeCommand = this.options.permissionMode === 'skip-permissions'
      ? 'claude --dangerously-skip-permissions'
      : 'claude';

    setTimeout(() => {
      this.write(`${claudeCommand}\r`);
    }, 200);
  }

  private bufferOutput(data: string): void {
    this.outputBuffer += data;

    if (this.flushTimeout === null) {
      this.flushTimeout = setTimeout(() => {
        this.flushOutput();
      }, this.FLUSH_INTERVAL);
    }
  }

  private flushOutput(): void {
    if (this.outputBuffer && this.outputCallback) {
      this.outputCallback(this.outputBuffer);
    }
    this.outputBuffer = '';
    this.flushTimeout = null;
  }

  onOutput(callback: (data: string) => void): void {
    this.outputCallback = callback;
  }

  onExit(callback: (exitCode: number) => void): void {
    this.exitCallback = callback;
  }

  write(data: string): void {
    if (this.ptyProcess && this._isRunning) {
      this.ptyProcess.write(data);
    }
  }

  resize(size: TerminalSize): void {
    if (this.ptyProcess && this._isRunning) {
      this.ptyProcess.resize(size.cols, size.rows);
    }
  }

  destroy(): void {
    this._isRunning = false;
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
      this.flushTimeout = null;
    }
    if (this.ptyProcess) {
      this.ptyProcess.kill();
      this.ptyProcess = null;
    }
  }
}
