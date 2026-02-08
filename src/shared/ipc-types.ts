export const IPC_CHANNELS = {
  // Legacy terminal channels (kept for compatibility)
  TERMINAL_INPUT: 'terminal:input',
  TERMINAL_OUTPUT: 'terminal:output',
  TERMINAL_RESIZE: 'terminal:resize',
  TERMINAL_READY: 'terminal:ready',

  // Window management
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_CLOSE: 'window:close',

  // Session management (renderer -> main, invoke)
  SESSION_CREATE: 'session:create',
  SESSION_CLOSE: 'session:close',
  SESSION_SWITCH: 'session:switch',
  SESSION_RENAME: 'session:rename',
  SESSION_LIST: 'session:list',
  SESSION_RESTART: 'session:restart',
  SESSION_GET_ACTIVE: 'session:getActive',

  // Session I/O (renderer -> main, send)
  SESSION_INPUT: 'session:input',
  SESSION_RESIZE: 'session:resize',
  SESSION_READY: 'session:ready',

  // Session events (main -> renderer, send)
  SESSION_CREATED: 'session:created',
  SESSION_CLOSED: 'session:closed',
  SESSION_SWITCHED: 'session:switched',
  SESSION_UPDATED: 'session:updated',
  SESSION_OUTPUT: 'session:output',
  SESSION_EXITED: 'session:exited',

  // Directory picker
  BROWSE_DIRECTORY: 'dialog:browseDirectory',
  SHOW_SAVE_DIALOG: 'dialog:showSaveDialog',
  WRITE_FILE: 'fs:writeFile',
  LIST_SUBDIRECTORIES: 'fs:listSubdirectories',

  // Settings and Workspaces
  SETTINGS_GET: 'settings:get',
  WORKSPACE_LIST: 'workspace:list',
  WORKSPACE_ADD: 'workspace:add',
  WORKSPACE_UPDATE: 'workspace:update',
  WORKSPACE_DELETE: 'workspace:delete',
  WORKSPACE_VALIDATE: 'workspace:validate',

  // Quota/Budget
  QUOTA_GET: 'quota:get',
  QUOTA_REFRESH: 'quota:refresh',
  BURN_RATE_GET: 'burnRate:get',

  // Prompt Templates
  TEMPLATE_LIST_ALL: 'template:listAll',
  TEMPLATE_LIST_USER: 'template:listUser',
  TEMPLATE_GET: 'template:get',
  TEMPLATE_ADD: 'template:add',
  TEMPLATE_UPDATE: 'template:update',
  TEMPLATE_DELETE: 'template:delete',

  // File Drag-and-Drop
  DRAGDROP_GET_FILE_INFO: 'dragdrop:getFileInfo',
  DRAGDROP_READ_FILE: 'dragdrop:readFile',

  // Session History
  HISTORY_LIST: 'history:list',
  HISTORY_GET: 'history:get',
  HISTORY_SEARCH: 'history:search',
  HISTORY_DELETE: 'history:delete',
  HISTORY_DELETE_ALL: 'history:deleteAll',
  HISTORY_EXPORT_MARKDOWN: 'history:exportMarkdown',
  HISTORY_EXPORT_JSON: 'history:exportJson',
  HISTORY_GET_SETTINGS: 'history:getSettings',
  HISTORY_UPDATE_SETTINGS: 'history:updateSettings',
  HISTORY_GET_STATS: 'history:getStats',

  // Split View State
  SETTINGS_UPDATE_SPLIT_VIEW: 'settings:updateSplitView',

  // Checkpoints
  CHECKPOINT_CREATE: 'checkpoint:create',
  CHECKPOINT_LIST: 'checkpoint:list',
  CHECKPOINT_GET: 'checkpoint:get',
  CHECKPOINT_DELETE: 'checkpoint:delete',
  CHECKPOINT_UPDATE: 'checkpoint:update',
  CHECKPOINT_EXPORT: 'checkpoint:export',
  CHECKPOINT_CLEANUP_SESSION: 'checkpoint:cleanupSession',
  CHECKPOINT_GET_COUNT: 'checkpoint:getCount',

  // Checkpoint events (main -> renderer)
  CHECKPOINT_CREATED: 'checkpoint:created',
  CHECKPOINT_DELETED: 'checkpoint:deleted',

  // App info
  APP_GET_VERSION_INFO: 'app:getVersionInfo',
} as const;

// Permission mode for sessions
export type PermissionMode = 'standard' | 'skip-permissions';

// Session status
export type SessionStatus = 'starting' | 'running' | 'exited' | 'error';

// Session creation request
export interface SessionCreateRequest {
  name?: string;
  workingDirectory: string;
  permissionMode: PermissionMode;
}

// Session metadata
export interface SessionMetadata {
  id: string;
  name: string;
  workingDirectory: string;
  permissionMode: PermissionMode;
  status: SessionStatus;
  createdAt: number;
  exitCode?: number;
}

// Session list response
export interface SessionListResponse {
  sessions: SessionMetadata[];
  activeSessionId: string | null;
}

// Session input
export interface SessionInput {
  sessionId: string;
  data: string;
}

// Session output
export interface SessionOutput {
  sessionId: string;
  data: string;
}

// Session resize request
export interface SessionResizeRequest {
  sessionId: string;
  cols: number;
  rows: number;
}

// Session exit event
export interface SessionExitEvent {
  sessionId: string;
  exitCode: number;
}

// Persisted session state
export interface PersistedSessionState {
  version: 1;
  sessions: SessionMetadata[];
  activeSessionId: string | null;
  lastModified: number;
}

// Terminal size
export interface TerminalSize {
  cols: number;
  rows: number;
}

// Workspace definition
export interface Workspace {
  id: string;
  name: string;
  path: string;
  defaultPermissionMode: PermissionMode;
  createdAt: number;
  updatedAt: number;
}

// File categories for drag-drop
export type FileCategory = 'code' | 'markup' | 'document' | 'image' | 'binary' | 'other';

// Drag-drop insert mode
export type DragDropInsertMode = 'path' | 'content' | 'ask';

// Path format for drag-drop
export type PathFormat = 'quoted' | 'unquoted' | 'escaped';

// Multi-file separator
export type MultiFileSeparator = 'space' | 'newline';

// Per-category drag-drop settings
export interface CategoryDragDropSettings {
  insertMode?: DragDropInsertMode;
  maxSizeKB?: number;
}

// Drag-drop settings
export interface DragDropSettings {
  defaultInsertMode: DragDropInsertMode;
  pathFormat: PathFormat;
  multiFileSeparator: MultiFileSeparator;
  maxContentSizeKB: number;
  categoryOverrides: Partial<Record<FileCategory, CategoryDragDropSettings>>;
}

// Split view types
export type SplitDirection = 'horizontal' | 'vertical';

export interface LayoutLeaf {
  type: 'leaf';
  paneId: string;
  sessionId: string | null;
}

export interface LayoutBranch {
  type: 'branch';
  direction: SplitDirection;
  ratio: number; // 0.0-1.0, first child's proportion
  children: [LayoutNode, LayoutNode];
}

export type LayoutNode = LayoutLeaf | LayoutBranch;

export interface SplitViewState {
  layout: LayoutNode;
  focusedPaneId: string;
}

// App settings
export interface AppSettings {
  version: 1;
  workspaces: Workspace[];
  dragDropSettings?: DragDropSettings;
  splitViewState?: SplitViewState | null;
}

// Workspace create request
export interface WorkspaceCreateRequest {
  name: string;
  path: string;
  defaultPermissionMode: PermissionMode;
}

// Workspace update request
export interface WorkspaceUpdateRequest {
  id: string;
  name?: string;
  path?: string;
  defaultPermissionMode?: PermissionMode;
}

// Workspace validation result
export interface WorkspaceValidationResult {
  valid: boolean;
  error?: 'NOT_FOUND' | 'NOT_DIRECTORY' | 'NO_ACCESS' | 'DUPLICATE_PATH';
  normalizedPath?: string;
}

// Subdirectory entry
export interface SubdirectoryEntry {
  name: string;
  path: string;
}

// Window state
export interface WindowState {
  x: number;
  y: number;
  width: number;
  height: number;
  isMaximized: boolean;
}

// Quota bucket
export interface QuotaBucket {
  utilization: number; // 0-1
  resets_at: string;
}

// Claude usage quota
export interface ClaudeUsageQuota {
  five_hour: QuotaBucket;
  seven_day: QuotaBucket;
  lastUpdated: string;
}

// Burn rate data
export interface BurnRateData {
  ratePerHour5h: number | null;   // %/hr of 5h quota
  ratePerHour7d: number | null;   // %/hr of 7d quota
  trend: 'increasing' | 'decreasing' | 'stable' | 'unknown';
  projectedTimeToLimit5h: number | null; // minutes until 100%
  projectedTimeToLimit7d: number | null;
  label: 'on-track' | 'elevated' | 'critical' | 'unknown';
  dataPoints: number;
}

// File info from drag-drop
export interface FileInfo {
  path: string;
  name: string;
  extension: string;
  sizeBytes: number;
  category: FileCategory;
  isBinary: boolean;
  mimeType?: string;
}

// File read result
export interface FileReadResult {
  content: string;
  truncated: boolean;
}

// App version info
export interface AppVersionInfo {
  appVersion: string;
  electronVersion: string;
  nodeVersion: string;
  claudeVersion?: string;
}

// Import prompt template types
import type {
  PromptTemplate,
  TemplateCreateRequest,
  TemplateUpdateRequest,
} from './types/prompt-templates';

// Import history types
import type {
  HistorySessionEntry,
  HistorySearchResult,
  HistorySettings,
  HistoryStats,
} from './types/history-types';

// Import checkpoint types
import type {
  Checkpoint,
  CheckpointCreateRequest,
  CheckpointExportFormat,
} from './types/checkpoint-types';

// Re-export for external use
export type {
  HistorySessionEntry,
  HistorySearchResult,
  HistorySettings,
  HistoryStats,
  Checkpoint,
  CheckpointCreateRequest,
  CheckpointExportFormat,
};

// Electron API exposed to renderer
export interface ElectronAPI {
  // Session management
  createSession: (request: SessionCreateRequest) => Promise<SessionMetadata>;
  closeSession: (sessionId: string) => Promise<boolean>;
  switchSession: (sessionId: string) => Promise<boolean>;
  renameSession: (sessionId: string, newName: string) => Promise<SessionMetadata>;
  listSessions: () => Promise<SessionListResponse>;
  restartSession: (sessionId: string) => Promise<boolean>;
  getActiveSession: () => Promise<string | null>;

  // Session I/O
  sendSessionInput: (sessionId: string, data: string) => void;
  resizeSession: (sessionId: string, cols: number, rows: number) => void;
  sessionReady: (sessionId: string) => void;

  // Session event listeners
  onSessionCreated: (callback: (metadata: SessionMetadata) => void) => () => void;
  onSessionClosed: (callback: (sessionId: string) => void) => () => void;
  onSessionSwitched: (callback: (sessionId: string) => void) => () => void;
  onSessionUpdated: (callback: (metadata: SessionMetadata) => void) => () => void;
  onSessionOutput: (callback: (output: SessionOutput) => void) => () => void;
  onSessionExited: (callback: (event: SessionExitEvent) => void) => () => void;

  // Directory and file pickers
  browseDirectory: () => Promise<string | null>;
  showSaveDialog: (options: {
    defaultPath?: string;
    filters?: Array<{ name: string; extensions: string[] }>;
  }) => Promise<string | null>;
  writeFile: (filePath: string, content: string) => Promise<boolean>;
  listSubdirectories: (parentPath: string) => Promise<SubdirectoryEntry[]>;

  // Settings and Workspaces
  getSettings: () => Promise<AppSettings>;
  listWorkspaces: () => Promise<Workspace[]>;
  addWorkspace: (request: WorkspaceCreateRequest) => Promise<Workspace>;
  updateWorkspace: (request: WorkspaceUpdateRequest) => Promise<Workspace>;
  deleteWorkspace: (workspaceId: string) => Promise<boolean>;
  validateWorkspacePath: (path: string, excludeId?: string) => Promise<WorkspaceValidationResult>;

  // Window management
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;

  // Quota/Budget
  getQuota: (forceRefresh?: boolean) => Promise<ClaudeUsageQuota | null>;
  refreshQuota: () => Promise<ClaudeUsageQuota | null>;
  getBurnRate: () => Promise<BurnRateData>;

  // Prompt Templates
  listAllTemplates: () => Promise<PromptTemplate[]>;
  listUserTemplates: () => Promise<PromptTemplate[]>;
  getTemplate: (id: string) => Promise<PromptTemplate | null>;
  addTemplate: (request: TemplateCreateRequest) => Promise<PromptTemplate>;
  updateTemplate: (request: TemplateUpdateRequest) => Promise<PromptTemplate>;
  deleteTemplate: (id: string) => Promise<boolean>;

  // File Drag-and-Drop
  getFileInfo: (filePaths: string[]) => Promise<FileInfo[]>;
  readFileContent: (filePath: string, maxSizeKB: number) => Promise<FileReadResult>;

  // Split View State
  updateSplitViewState: (state: SplitViewState | null) => Promise<void>;

  // Session History
  listHistory: () => Promise<HistorySessionEntry[]>;
  getHistory: (sessionId: string) => Promise<string>;
  searchHistory: (query: string, useRegex?: boolean) => Promise<HistorySearchResult[]>;
  deleteHistory: (sessionId: string) => Promise<boolean>;
  deleteAllHistory: () => Promise<boolean>;
  exportHistoryMarkdown: (sessionId: string, outputPath: string) => Promise<boolean>;
  exportHistoryJson: (sessionId: string, outputPath: string) => Promise<boolean>;
  getHistorySettings: () => Promise<HistorySettings>;
  updateHistorySettings: (settings: Partial<HistorySettings>) => Promise<boolean>;
  getHistoryStats: () => Promise<HistoryStats>;

  // Checkpoints
  createCheckpoint: (request: CheckpointCreateRequest) => Promise<Checkpoint>;
  listCheckpoints: (sessionId?: string) => Promise<Checkpoint[]>;
  getCheckpoint: (checkpointId: string) => Promise<Checkpoint | null>;
  deleteCheckpoint: (checkpointId: string) => Promise<boolean>;
  updateCheckpoint: (
    checkpointId: string,
    updates: Partial<Pick<Checkpoint, 'name' | 'description' | 'tags' | 'isTemplate'>>
  ) => Promise<Checkpoint | null>;
  exportCheckpoint: (checkpointId: string, format: CheckpointExportFormat) => Promise<string>;
  getCheckpointCount: (sessionId: string) => Promise<number>;

  // Checkpoint event listeners
  onCheckpointCreated: (callback: (checkpoint: Checkpoint) => void) => () => void;
  onCheckpointDeleted: (callback: (checkpointId: string) => void) => () => void;

  // App info
  getVersionInfo: () => Promise<AppVersionInfo>;

  // Legacy terminal API (deprecated, use session API)
  sendTerminalInput: (data: string) => void;
  onTerminalOutput: (callback: (data: string) => void) => () => void;
  resizeTerminal: (size: TerminalSize) => void;
  terminalReady: () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
