/**
 * Type definitions for session history feature
 */

/**
 * Metadata for a recorded session in the history index
 */
export interface HistorySessionEntry {
  /** Unique session identifier */
  id: string;
  /** Session display name */
  name: string;
  /** Working directory where session was created */
  workingDirectory: string;
  /** Unix timestamp (ms) when session was created */
  createdAt: number;
  /** Unix timestamp (ms) of last recorded output */
  lastUpdatedAt: number;
  /** Size of session history file in bytes */
  sizeBytes: number;
  /** Number of restart segments (starts at 0) */
  segmentCount: number;
}

/**
 * Master index of all recorded sessions
 */
export interface HistoryIndex {
  /** Index file format version */
  version: number;
  /** Map of session ID to metadata */
  sessions: Record<string, HistorySessionEntry>;
}

/**
 * History retention and storage settings
 */
export interface HistorySettings {
  /** Maximum age in days (0 = unlimited) */
  maxAgeDays: number;
  /** Maximum total size in MB (0 = unlimited) */
  maxSizeMB: number;
  /** Enable automatic cleanup on startup */
  autoCleanup: boolean;
}

/**
 * Search result with context
 */
export interface HistorySearchResult {
  /** Session metadata */
  session: HistorySessionEntry;
  /** Number of matches found in this session */
  matchCount: number;
  /** Preview snippets (up to 3) with surrounding context */
  previews: HistorySearchPreview[];
}

/**
 * Search result preview snippet
 */
export interface HistorySearchPreview {
  /** Line number where match was found */
  lineNumber: number;
  /** Text before match (up to 50 chars) */
  before: string;
  /** Matched text */
  match: string;
  /** Text after match (up to 50 chars) */
  after: string;
}

/**
 * Statistics for history storage
 */
export interface HistoryStats {
  /** Total number of recorded sessions */
  totalSessions: number;
  /** Total storage size in bytes */
  totalSizeBytes: number;
  /** Oldest session timestamp (ms) */
  oldestSessionDate: number | null;
  /** Newest session timestamp (ms) */
  newestSessionDate: number | null;
}

/**
 * JSON export format
 */
export interface HistoryExportJson {
  /** Export format version */
  version: number;
  /** Export timestamp (ISO-8601) */
  exportedAt: string;
  /** Session metadata */
  session: {
    id: string;
    name: string;
    workingDirectory: string;
    createdAt: number;
    lastUpdatedAt: number;
    sizeBytes: number;
  };
  /** Full session output */
  output: string;
}
