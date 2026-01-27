/**
 * OPS-01: Simple structured logger for better observability.
 * Provides consistent log formatting with timestamps and levels.
 *
 * Usage:
 *   import { logger } from './logger.js';
 *   logger.info('Server started', { port: 8787 });
 *   logger.error('Failed to connect', { error: err.message });
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  data?: Record<string, unknown>;
}

// Log level priority (lower = more verbose)
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Current log level from environment (default: info)
const currentLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
const currentLevelPriority = LOG_LEVELS[currentLevel] ?? LOG_LEVELS.info;

// Output format: 'json' for structured, 'text' for human-readable
const outputFormat = process.env.LOG_FORMAT || 'text';

function formatLogEntry(entry: LogEntry): string {
  if (outputFormat === 'json') {
    return JSON.stringify(entry);
  }

  // Text format: [timestamp] [LEVEL] [module] message {data}
  const levelStr = entry.level.toUpperCase().padEnd(5);
  const dataStr = entry.data ? ` ${JSON.stringify(entry.data)}` : '';
  return `[${entry.timestamp}] [${levelStr}] [${entry.module}] ${entry.message}${dataStr}`;
}

function log(level: LogLevel, module: string, message: string, data?: Record<string, unknown>): void {
  // Skip if below current log level
  if (LOG_LEVELS[level] < currentLevelPriority) {
    return;
  }

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    module,
    message,
    ...(data && { data }),
  };

  const formatted = formatLogEntry(entry);

  // Use appropriate console method
  switch (level) {
    case 'error':
      console.error(formatted);
      break;
    case 'warn':
      console.warn(formatted);
      break;
    default:
      console.log(formatted);
  }
}

/**
 * Create a logger instance for a specific module.
 * This provides consistent logging with the module name automatically included.
 */
export function createLogger(module: string) {
  return {
    debug: (message: string, data?: Record<string, unknown>) => log('debug', module, message, data),
    info: (message: string, data?: Record<string, unknown>) => log('info', module, message, data),
    warn: (message: string, data?: Record<string, unknown>) => log('warn', module, message, data),
    error: (message: string, data?: Record<string, unknown>) => log('error', module, message, data),
  };
}

// Default logger for quick usage
export const logger = createLogger('app');
