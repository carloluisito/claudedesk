import { contextBridge, ipcRenderer } from 'electron';
import {
  IPC_CHANNELS,
  SessionCreateRequest,
  SessionMetadata,
  SessionListResponse,
  SessionOutput,
  SessionExitEvent,
  TerminalSize,
  ElectronAPI,
  AppSettings,
  Workspace,
  WorkspaceCreateRequest,
  WorkspaceUpdateRequest,
  WorkspaceValidationResult,
  SubdirectoryEntry,
  ClaudeUsageQuota,
  BurnRateData,
  FileInfo,
  FileReadResult,
  HistorySessionEntry,
  HistorySearchResult,
  HistorySettings,
  HistoryStats,
  SplitViewState,
  Checkpoint,
  CheckpointCreateRequest,
  CheckpointExportFormat,
  AppVersionInfo,
} from '../shared/ipc-types';
import type {
  PromptTemplate,
  TemplateCreateRequest,
  TemplateUpdateRequest,
} from '../shared/types/prompt-templates';

const electronAPI: ElectronAPI = {
  // Session management
  createSession: (request: SessionCreateRequest): Promise<SessionMetadata> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SESSION_CREATE, request);
  },

  closeSession: (sessionId: string): Promise<boolean> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SESSION_CLOSE, sessionId);
  },

  switchSession: (sessionId: string): Promise<boolean> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SESSION_SWITCH, sessionId);
  },

  renameSession: (sessionId: string, newName: string): Promise<SessionMetadata> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SESSION_RENAME, sessionId, newName);
  },

  listSessions: (): Promise<SessionListResponse> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SESSION_LIST);
  },

  restartSession: (sessionId: string): Promise<boolean> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SESSION_RESTART, sessionId);
  },

  getActiveSession: (): Promise<string | null> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SESSION_GET_ACTIVE);
  },

  // Session I/O
  sendSessionInput: (sessionId: string, data: string): void => {
    ipcRenderer.send(IPC_CHANNELS.SESSION_INPUT, { sessionId, data });
  },

  resizeSession: (sessionId: string, cols: number, rows: number): void => {
    ipcRenderer.send(IPC_CHANNELS.SESSION_RESIZE, { sessionId, cols, rows });
  },

  sessionReady: (sessionId: string): void => {
    ipcRenderer.send(IPC_CHANNELS.SESSION_READY, sessionId);
  },

  // Session event listeners
  onSessionCreated: (callback: (metadata: SessionMetadata) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, metadata: SessionMetadata) => {
      callback(metadata);
    };
    ipcRenderer.on(IPC_CHANNELS.SESSION_CREATED, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.SESSION_CREATED, handler);
  },

  onSessionClosed: (callback: (sessionId: string) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, sessionId: string) => {
      callback(sessionId);
    };
    ipcRenderer.on(IPC_CHANNELS.SESSION_CLOSED, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.SESSION_CLOSED, handler);
  },

  onSessionSwitched: (callback: (sessionId: string) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, sessionId: string) => {
      callback(sessionId);
    };
    ipcRenderer.on(IPC_CHANNELS.SESSION_SWITCHED, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.SESSION_SWITCHED, handler);
  },

  onSessionUpdated: (callback: (metadata: SessionMetadata) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, metadata: SessionMetadata) => {
      callback(metadata);
    };
    ipcRenderer.on(IPC_CHANNELS.SESSION_UPDATED, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.SESSION_UPDATED, handler);
  },

  onSessionOutput: (callback: (output: SessionOutput) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, output: SessionOutput) => {
      callback(output);
    };
    ipcRenderer.on(IPC_CHANNELS.SESSION_OUTPUT, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.SESSION_OUTPUT, handler);
  },

  onSessionExited: (callback: (event: SessionExitEvent) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, exitEvent: SessionExitEvent) => {
      callback(exitEvent);
    };
    ipcRenderer.on(IPC_CHANNELS.SESSION_EXITED, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.SESSION_EXITED, handler);
  },

  // Directory and file pickers
  browseDirectory: (): Promise<string | null> => {
    return ipcRenderer.invoke(IPC_CHANNELS.BROWSE_DIRECTORY);
  },

  showSaveDialog: (options: {
    defaultPath?: string;
    filters?: Array<{ name: string; extensions: string[] }>;
  }): Promise<string | null> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SHOW_SAVE_DIALOG, options);
  },

  writeFile: (filePath: string, content: string): Promise<boolean> => {
    return ipcRenderer.invoke(IPC_CHANNELS.WRITE_FILE, filePath, content);
  },

  listSubdirectories: (parentPath: string): Promise<SubdirectoryEntry[]> => {
    return ipcRenderer.invoke(IPC_CHANNELS.LIST_SUBDIRECTORIES, parentPath);
  },

  // Settings and Workspaces
  getSettings: (): Promise<AppSettings> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET);
  },

  listWorkspaces: (): Promise<Workspace[]> => {
    return ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_LIST);
  },

  addWorkspace: (request: WorkspaceCreateRequest): Promise<Workspace> => {
    return ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_ADD, request);
  },

  updateWorkspace: (request: WorkspaceUpdateRequest): Promise<Workspace> => {
    return ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_UPDATE, request);
  },

  deleteWorkspace: (workspaceId: string): Promise<boolean> => {
    return ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_DELETE, workspaceId);
  },

  validateWorkspacePath: (path: string, excludeId?: string): Promise<WorkspaceValidationResult> => {
    return ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_VALIDATE, path, excludeId);
  },

  // Split View State
  updateSplitViewState: (state: SplitViewState | null): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_UPDATE_SPLIT_VIEW, state);
  },

  // Window management
  minimizeWindow: (): void => {
    ipcRenderer.send(IPC_CHANNELS.WINDOW_MINIMIZE);
  },

  maximizeWindow: (): void => {
    ipcRenderer.send(IPC_CHANNELS.WINDOW_MAXIMIZE);
  },

  closeWindow: (): void => {
    ipcRenderer.send(IPC_CHANNELS.WINDOW_CLOSE);
  },

  // Quota/Budget
  getQuota: (forceRefresh?: boolean): Promise<ClaudeUsageQuota | null> => {
    return ipcRenderer.invoke(IPC_CHANNELS.QUOTA_GET, forceRefresh);
  },

  refreshQuota: (): Promise<ClaudeUsageQuota | null> => {
    return ipcRenderer.invoke(IPC_CHANNELS.QUOTA_REFRESH);
  },

  getBurnRate: (): Promise<BurnRateData> => {
    return ipcRenderer.invoke(IPC_CHANNELS.BURN_RATE_GET);
  },

  // Prompt Templates
  listAllTemplates: (): Promise<PromptTemplate[]> => {
    return ipcRenderer.invoke(IPC_CHANNELS.TEMPLATE_LIST_ALL);
  },

  listUserTemplates: (): Promise<PromptTemplate[]> => {
    return ipcRenderer.invoke(IPC_CHANNELS.TEMPLATE_LIST_USER);
  },

  getTemplate: (id: string): Promise<PromptTemplate | null> => {
    return ipcRenderer.invoke(IPC_CHANNELS.TEMPLATE_GET, id);
  },

  addTemplate: (request: TemplateCreateRequest): Promise<PromptTemplate> => {
    return ipcRenderer.invoke(IPC_CHANNELS.TEMPLATE_ADD, request);
  },

  updateTemplate: (request: TemplateUpdateRequest): Promise<PromptTemplate> => {
    return ipcRenderer.invoke(IPC_CHANNELS.TEMPLATE_UPDATE, request);
  },

  deleteTemplate: (id: string): Promise<boolean> => {
    return ipcRenderer.invoke(IPC_CHANNELS.TEMPLATE_DELETE, id);
  },

  // File Drag-and-Drop
  getFileInfo: (filePaths: string[]): Promise<FileInfo[]> => {
    return ipcRenderer.invoke(IPC_CHANNELS.DRAGDROP_GET_FILE_INFO, filePaths);
  },

  readFileContent: (filePath: string, maxSizeKB: number): Promise<FileReadResult> => {
    return ipcRenderer.invoke(IPC_CHANNELS.DRAGDROP_READ_FILE, filePath, maxSizeKB);
  },

  // Session History
  listHistory: (): Promise<HistorySessionEntry[]> => {
    return ipcRenderer.invoke(IPC_CHANNELS.HISTORY_LIST);
  },

  getHistory: (sessionId: string): Promise<string> => {
    return ipcRenderer.invoke(IPC_CHANNELS.HISTORY_GET, sessionId);
  },

  searchHistory: (query: string, useRegex?: boolean): Promise<HistorySearchResult[]> => {
    return ipcRenderer.invoke(IPC_CHANNELS.HISTORY_SEARCH, query, useRegex);
  },

  deleteHistory: (sessionId: string): Promise<boolean> => {
    return ipcRenderer.invoke(IPC_CHANNELS.HISTORY_DELETE, sessionId);
  },

  deleteAllHistory: (): Promise<boolean> => {
    return ipcRenderer.invoke(IPC_CHANNELS.HISTORY_DELETE_ALL);
  },

  exportHistoryMarkdown: (sessionId: string, outputPath: string): Promise<boolean> => {
    return ipcRenderer.invoke(IPC_CHANNELS.HISTORY_EXPORT_MARKDOWN, sessionId, outputPath);
  },

  exportHistoryJson: (sessionId: string, outputPath: string): Promise<boolean> => {
    return ipcRenderer.invoke(IPC_CHANNELS.HISTORY_EXPORT_JSON, sessionId, outputPath);
  },

  getHistorySettings: (): Promise<HistorySettings> => {
    return ipcRenderer.invoke(IPC_CHANNELS.HISTORY_GET_SETTINGS);
  },

  updateHistorySettings: (settings: Partial<HistorySettings>): Promise<boolean> => {
    return ipcRenderer.invoke(IPC_CHANNELS.HISTORY_UPDATE_SETTINGS, settings);
  },

  getHistoryStats: (): Promise<HistoryStats> => {
    return ipcRenderer.invoke(IPC_CHANNELS.HISTORY_GET_STATS);
  },

  // Checkpoints
  createCheckpoint: (request: CheckpointCreateRequest): Promise<Checkpoint> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CHECKPOINT_CREATE, request);
  },

  listCheckpoints: (sessionId?: string): Promise<Checkpoint[]> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CHECKPOINT_LIST, sessionId);
  },

  getCheckpoint: (checkpointId: string): Promise<Checkpoint | null> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CHECKPOINT_GET, checkpointId);
  },

  deleteCheckpoint: (checkpointId: string): Promise<boolean> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CHECKPOINT_DELETE, checkpointId);
  },

  updateCheckpoint: (
    checkpointId: string,
    updates: Partial<Pick<Checkpoint, 'name' | 'description' | 'tags' | 'isTemplate'>>
  ): Promise<Checkpoint | null> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CHECKPOINT_UPDATE, checkpointId, updates);
  },

  exportCheckpoint: (checkpointId: string, format: CheckpointExportFormat): Promise<string> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CHECKPOINT_EXPORT, checkpointId, format);
  },

  getCheckpointCount: (sessionId: string): Promise<number> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CHECKPOINT_GET_COUNT, sessionId);
  },

  // Checkpoint event listeners
  onCheckpointCreated: (callback: (checkpoint: Checkpoint) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, checkpoint: Checkpoint) => {
      callback(checkpoint);
    };
    ipcRenderer.on(IPC_CHANNELS.CHECKPOINT_CREATED, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.CHECKPOINT_CREATED, handler);
  },

  onCheckpointDeleted: (callback: (checkpointId: string) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, checkpointId: string) => {
      callback(checkpointId);
    };
    ipcRenderer.on(IPC_CHANNELS.CHECKPOINT_DELETED, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.CHECKPOINT_DELETED, handler);
  },

  // App info
  getVersionInfo: (): Promise<AppVersionInfo> => {
    return ipcRenderer.invoke(IPC_CHANNELS.APP_GET_VERSION_INFO);
  },

  // Legacy terminal API (deprecated - for backwards compatibility)
  sendTerminalInput: (data: string): void => {
    ipcRenderer.send(IPC_CHANNELS.TERMINAL_INPUT, data);
  },

  onTerminalOutput: (callback: (data: string) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: string) => {
      callback(data);
    };
    ipcRenderer.on(IPC_CHANNELS.TERMINAL_OUTPUT, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.TERMINAL_OUTPUT, handler);
  },

  resizeTerminal: (size: TerminalSize): void => {
    ipcRenderer.send(IPC_CHANNELS.TERMINAL_RESIZE, size);
  },

  terminalReady: (): void => {
    ipcRenderer.send(IPC_CHANNELS.TERMINAL_READY);
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
