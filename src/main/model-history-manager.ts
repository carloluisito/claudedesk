import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import { ClaudeModel, ModelSwitchEvent } from '../shared/ipc-types';

export interface ModelSwitchHistoryEntry {
  id: string;
  sessionId: string;
  timestamp: number;
  fromModel: ClaudeModel | null;
  toModel: ClaudeModel;
  durationMs?: number; // Time spent in previous model
}

interface ModelHistoryIndex {
  version: 1;
  entries: Record<string, ModelSwitchHistoryEntry>; // id -> entry
  bySession: Record<string, string[]>; // sessionId -> entry ids (chronological)
}

export class ModelHistoryManager {
  private indexPath: string;
  private index: ModelHistoryIndex;
  private pendingWrite: NodeJS.Timeout | null = null;
  private lastSwitchBySession: Map<string, { timestamp: number; model: ClaudeModel }> = new Map();

  constructor() {
    const userDataPath = app.getPath('userData');
    const historyDir = path.join(userDataPath, 'model-history');

    // Ensure directory exists
    if (!fs.existsSync(historyDir)) {
      fs.mkdirSync(historyDir, { recursive: true });
    }

    this.indexPath = path.join(historyDir, 'index.json');
    this.index = this.loadIndex();
  }

  private loadIndex(): ModelHistoryIndex {
    try {
      if (fs.existsSync(this.indexPath)) {
        const data = fs.readFileSync(this.indexPath, 'utf-8');
        const loaded = JSON.parse(data) as ModelHistoryIndex;

        // Validate structure
        if (loaded.version === 1 && loaded.entries && loaded.bySession) {
          return loaded;
        }
      }
    } catch (err) {
      console.error('[ModelHistoryManager] Failed to load index:', err);
    }

    // Return empty index if file doesn't exist or is invalid
    return {
      version: 1,
      entries: {},
      bySession: {},
    };
  }

  private scheduleWrite(): void {
    if (this.pendingWrite) {
      clearTimeout(this.pendingWrite);
    }

    // Debounce writes (1 second)
    this.pendingWrite = setTimeout(() => {
      this.flushToDisk();
      this.pendingWrite = null;
    }, 1000);
  }

  private flushToDisk(): void {
    try {
      const tmpPath = `${this.indexPath}.tmp`;
      const data = JSON.stringify(this.index, null, 2);

      // Atomic write: write to temp file, then rename
      fs.writeFileSync(tmpPath, data, 'utf-8');
      fs.renameSync(tmpPath, this.indexPath);
    } catch (err) {
      console.error('[ModelHistoryManager] Failed to write index:', err);
    }
  }

  /**
   * Log a model switch event
   */
  logSwitch(event: ModelSwitchEvent): void {
    const { sessionId, model, previousModel, detectedAt } = event;

    // Calculate duration if we have a previous switch for this session
    let durationMs: number | undefined;
    const lastSwitch = this.lastSwitchBySession.get(sessionId);
    if (lastSwitch) {
      durationMs = detectedAt - lastSwitch.timestamp;
    }

    // Create entry
    const entry: ModelSwitchHistoryEntry = {
      id: uuidv4(),
      sessionId,
      timestamp: detectedAt,
      fromModel: previousModel,
      toModel: model,
      durationMs,
    };

    // Add to index
    this.index.entries[entry.id] = entry;

    // Add to session's chronological list
    if (!this.index.bySession[sessionId]) {
      this.index.bySession[sessionId] = [];
    }
    this.index.bySession[sessionId].push(entry.id);

    // Update last switch tracker
    this.lastSwitchBySession.set(sessionId, {
      timestamp: detectedAt,
      model,
    });

    // Schedule write
    this.scheduleWrite();
  }

  /**
   * Get all model switch history for a session (chronological order)
   */
  getHistory(sessionId: string): ModelSwitchHistoryEntry[] {
    const entryIds = this.index.bySession[sessionId] || [];
    return entryIds
      .map(id => this.index.entries[id])
      .filter(entry => entry !== undefined)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Clear history for a specific session
   */
  clearHistory(sessionId: string): void {
    const entryIds = this.index.bySession[sessionId] || [];

    // Remove entries
    for (const id of entryIds) {
      delete this.index.entries[id];
    }

    // Remove session list
    delete this.index.bySession[sessionId];

    // Remove from last switch tracker
    this.lastSwitchBySession.delete(sessionId);

    // Schedule write
    this.scheduleWrite();
  }

  /**
   * Get statistics for a session
   */
  getStats(sessionId: string): { switchCount: number; avgDurationMs: number | null } {
    const history = this.getHistory(sessionId);
    const switchCount = history.length;

    if (switchCount === 0) {
      return { switchCount: 0, avgDurationMs: null };
    }

    // Calculate average duration (excluding entries without duration)
    const durations = history
      .map(entry => entry.durationMs)
      .filter((d): d is number => d !== undefined);

    const avgDurationMs = durations.length > 0
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length
      : null;

    return { switchCount, avgDurationMs };
  }

  /**
   * Force flush to disk (for graceful shutdown)
   */
  shutdown(): void {
    if (this.pendingWrite) {
      clearTimeout(this.pendingWrite);
      this.pendingWrite = null;
    }
    this.flushToDisk();
  }
}
