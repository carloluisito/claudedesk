/**
 * Checkpoint Types - Named snapshots of session conversation state
 */

/**
 * A checkpoint represents a named snapshot at a specific point in conversation history
 */
export interface Checkpoint {
  /** Unique identifier */
  id: string;
  /** Parent session ID */
  sessionId: string;
  /** User-provided label (max 50 chars) */
  name: string;
  /** Optional notes (max 500 chars) */
  description?: string;
  /** Creation timestamp (Unix ms) */
  createdAt: number;
  /** Byte offset in history file */
  historyPosition: number;
  /** Segment number (for restart tracking) */
  historySegment: number;
  /** Last 5 lines for preview */
  conversationSummary?: string;
  /** Parent checkpoint ID (for future branch tracking) */
  parentCheckpointId?: string;
  /** User tags for organization */
  tags?: string[];
  /** Template flag */
  isTemplate?: boolean;
}

/**
 * Checkpoint index structure
 */
export interface CheckpointIndex {
  /** Schema version */
  version: 1;
  /** All checkpoints by ID */
  checkpoints: Record<string, Checkpoint>;
  /** Checkpoints grouped by session */
  bySession: Record<string, string[]>;
}

/**
 * Checkpoint creation request
 */
export interface CheckpointCreateRequest {
  sessionId: string;
  name: string;
  description?: string;
  tags?: string[];
}

/**
 * Checkpoint export format
 */
export type CheckpointExportFormat = 'markdown' | 'json';

/**
 * Checkpoint export request
 */
export interface CheckpointExportRequest {
  checkpointId: string;
  format: CheckpointExportFormat;
  outputPath?: string; // If not provided, returns content
}

/**
 * Checkpoint export JSON structure
 */
export interface CheckpointExportJson {
  version: 1;
  exportedAt: string;
  checkpoint: Checkpoint;
  history: string;
}

/**
 * Grouped checkpoints for timeline view
 */
export interface CheckpointGroup {
  sessionId: string;
  sessionName: string;
  checkpoints: Checkpoint[];
}
