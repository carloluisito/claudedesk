import { ipcMain, BrowserWindow, dialog } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import {
  IPC_CHANNELS,
  SessionCreateRequest,
  SessionInput,
  SessionResizeRequest,
  WorkspaceCreateRequest,
  WorkspaceUpdateRequest,
  SubdirectoryEntry,
  SplitViewState,
  CheckpointCreateRequest,
  CheckpointExportFormat,
  Checkpoint,
} from '../shared/ipc-types';
import type { TemplateCreateRequest, TemplateUpdateRequest } from '../shared/types/prompt-templates';
import { SessionManager } from './session-manager';
import { SettingsManager } from './settings-persistence';
import { PromptTemplatesManager } from './prompt-templates-manager';
import { HistoryManager } from './history-manager';
import { CheckpointManager } from './checkpoint-manager';
import { queryClaudeQuota, clearQuotaCache, getBurnRate } from './quota-service';
import { getFileInfo, readFileContent } from './file-dragdrop-handler';

export function setupIPCHandlers(
  mainWindow: BrowserWindow,
  sessionManager: SessionManager,
  settingsManager: SettingsManager,
  templatesManager: PromptTemplatesManager,
  historyManager: HistoryManager,
  checkpointManager: CheckpointManager
): void {
  // Connect managers to window
  sessionManager.setMainWindow(mainWindow);
  checkpointManager.setMainWindow(mainWindow);

  // Session management handlers (invoke)
  ipcMain.handle(IPC_CHANNELS.SESSION_CREATE, async (_event, request: SessionCreateRequest) => {
    try {
      return await sessionManager.createSession(request);
    } catch (err) {
      console.error('Failed to create session:', err);
      throw err;
    }
  });

  ipcMain.handle(IPC_CHANNELS.SESSION_CLOSE, async (_event, sessionId: string) => {
    return sessionManager.closeSession(sessionId);
  });

  ipcMain.handle(IPC_CHANNELS.SESSION_SWITCH, async (_event, sessionId: string) => {
    return sessionManager.switchSession(sessionId);
  });

  ipcMain.handle(IPC_CHANNELS.SESSION_RENAME, async (_event, sessionId: string, newName: string) => {
    try {
      return await sessionManager.renameSession(sessionId, newName);
    } catch (err) {
      console.error('Failed to rename session:', err);
      throw err;
    }
  });

  ipcMain.handle(IPC_CHANNELS.SESSION_LIST, async () => {
    return sessionManager.listSessions();
  });

  ipcMain.handle(IPC_CHANNELS.SESSION_RESTART, async (_event, sessionId: string) => {
    return sessionManager.restartSession(sessionId);
  });

  ipcMain.handle(IPC_CHANNELS.SESSION_GET_ACTIVE, async () => {
    return sessionManager.getActiveSessionId();
  });

  // Directory browser
  ipcMain.handle(IPC_CHANNELS.BROWSE_DIRECTORY, async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Select Working Directory',
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  });

  // Save file dialog
  ipcMain.handle(IPC_CHANNELS.SHOW_SAVE_DIALOG, async (_event, options: {
    defaultPath?: string;
    filters?: Array<{ name: string; extensions: string[] }>;
  }) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Save File',
      defaultPath: options.defaultPath,
      filters: options.filters,
    });

    if (result.canceled || !result.filePath) {
      return null;
    }

    return result.filePath;
  });

  // Write file
  ipcMain.handle(IPC_CHANNELS.WRITE_FILE, async (_event, filePath: string, content: string) => {
    try {
      await fs.promises.writeFile(filePath, content, 'utf-8');
      return true;
    } catch (err) {
      console.error('Failed to write file:', err);
      return false;
    }
  });

  // List subdirectories in a parent directory
  ipcMain.handle(IPC_CHANNELS.LIST_SUBDIRECTORIES, async (_event, parentPath: string): Promise<SubdirectoryEntry[]> => {
    try {
      const entries = fs.readdirSync(parentPath, { withFileTypes: true });
      const subdirs: SubdirectoryEntry[] = [];

      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          subdirs.push({
            name: entry.name,
            path: path.join(parentPath, entry.name),
          });
        }
      }

      // Sort alphabetically
      subdirs.sort((a, b) => a.name.localeCompare(b.name));
      return subdirs;
    } catch (err) {
      console.error('Failed to list subdirectories:', err);
      return [];
    }
  });

  // Settings and Workspace handlers
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, async () => {
    return settingsManager.getSettings();
  });

  ipcMain.handle(IPC_CHANNELS.WORKSPACE_LIST, async () => {
    return settingsManager.getWorkspaces();
  });

  ipcMain.handle(IPC_CHANNELS.WORKSPACE_ADD, async (_event, request: WorkspaceCreateRequest) => {
    try {
      return settingsManager.addWorkspace(request);
    } catch (err) {
      console.error('Failed to add workspace:', err);
      throw err;
    }
  });

  ipcMain.handle(IPC_CHANNELS.WORKSPACE_UPDATE, async (_event, request: WorkspaceUpdateRequest) => {
    try {
      return settingsManager.updateWorkspace(request);
    } catch (err) {
      console.error('Failed to update workspace:', err);
      throw err;
    }
  });

  ipcMain.handle(IPC_CHANNELS.WORKSPACE_DELETE, async (_event, workspaceId: string) => {
    return settingsManager.deleteWorkspace(workspaceId);
  });

  ipcMain.handle(IPC_CHANNELS.WORKSPACE_VALIDATE, async (_event, path: string, excludeId?: string) => {
    return settingsManager.validatePath(path, excludeId);
  });

  // Split View State handler
  ipcMain.handle(IPC_CHANNELS.SETTINGS_UPDATE_SPLIT_VIEW, async (_event, state: SplitViewState | null) => {
    try {
      settingsManager.updateSplitViewState(state);
    } catch (err) {
      console.error('Failed to update split view state:', err);
      throw err;
    }
  });

  // Quota handlers
  ipcMain.handle(IPC_CHANNELS.QUOTA_GET, async (_event, forceRefresh?: boolean) => {
    try {
      return await queryClaudeQuota(forceRefresh);
    } catch (err) {
      console.error('Failed to get quota:', err);
      return null;
    }
  });

  ipcMain.handle(IPC_CHANNELS.QUOTA_REFRESH, async () => {
    try {
      clearQuotaCache();
      return await queryClaudeQuota(true);
    } catch (err) {
      console.error('Failed to refresh quota:', err);
      return null;
    }
  });

  ipcMain.handle(IPC_CHANNELS.BURN_RATE_GET, async () => {
    return getBurnRate();
  });

  // Prompt Templates handlers
  ipcMain.handle(IPC_CHANNELS.TEMPLATE_LIST_ALL, async () => {
    return templatesManager.getAllTemplates();
  });

  ipcMain.handle(IPC_CHANNELS.TEMPLATE_LIST_USER, async () => {
    return templatesManager.getUserTemplates();
  });

  ipcMain.handle(IPC_CHANNELS.TEMPLATE_GET, async (_event, id: string) => {
    return templatesManager.getTemplateById(id);
  });

  ipcMain.handle(IPC_CHANNELS.TEMPLATE_ADD, async (_event, request: TemplateCreateRequest) => {
    try {
      return templatesManager.addTemplate(request);
    } catch (err) {
      console.error('Failed to add template:', err);
      throw err;
    }
  });

  ipcMain.handle(IPC_CHANNELS.TEMPLATE_UPDATE, async (_event, request: TemplateUpdateRequest) => {
    try {
      return templatesManager.updateTemplate(request);
    } catch (err) {
      console.error('Failed to update template:', err);
      throw err;
    }
  });

  ipcMain.handle(IPC_CHANNELS.TEMPLATE_DELETE, async (_event, id: string) => {
    try {
      return templatesManager.deleteTemplate(id);
    } catch (err) {
      console.error('Failed to delete template:', err);
      throw err;
    }
  });

  // File drag-and-drop handlers
  ipcMain.handle(IPC_CHANNELS.DRAGDROP_GET_FILE_INFO, async (_event, filePaths: string[]) => {
    try {
      return await getFileInfo(filePaths);
    } catch (err) {
      console.error('Failed to get file info:', err);
      throw err;
    }
  });

  ipcMain.handle(IPC_CHANNELS.DRAGDROP_READ_FILE, async (_event, filePath: string, maxSizeKB: number) => {
    try {
      return await readFileContent(filePath, maxSizeKB);
    } catch (err) {
      console.error('Failed to read file content:', err);
      throw err;
    }
  });

  // Session History handlers
  ipcMain.handle(IPC_CHANNELS.HISTORY_LIST, async () => {
    try {
      return await historyManager.listSessions();
    } catch (err) {
      console.error('Failed to list history:', err);
      throw err;
    }
  });

  ipcMain.handle(IPC_CHANNELS.HISTORY_GET, async (_event, sessionId: string) => {
    try {
      return await historyManager.getSessionContent(sessionId);
    } catch (err) {
      console.error('Failed to get history:', err);
      throw err;
    }
  });

  ipcMain.handle(IPC_CHANNELS.HISTORY_SEARCH, async (_event, query: string, useRegex?: boolean) => {
    try {
      return await historyManager.search(query, useRegex);
    } catch (err) {
      console.error('Failed to search history:', err);
      throw err;
    }
  });

  ipcMain.handle(IPC_CHANNELS.HISTORY_DELETE, async (_event, sessionId: string) => {
    try {
      return await historyManager.deleteSession(sessionId);
    } catch (err) {
      console.error('Failed to delete history:', err);
      return false;
    }
  });

  ipcMain.handle(IPC_CHANNELS.HISTORY_DELETE_ALL, async () => {
    try {
      return await historyManager.deleteAllSessions();
    } catch (err) {
      console.error('Failed to delete all history:', err);
      return false;
    }
  });

  ipcMain.handle(IPC_CHANNELS.HISTORY_EXPORT_MARKDOWN, async (_event, sessionId: string, outputPath: string) => {
    try {
      return await historyManager.exportMarkdown(sessionId, outputPath);
    } catch (err) {
      console.error('Failed to export markdown:', err);
      return false;
    }
  });

  ipcMain.handle(IPC_CHANNELS.HISTORY_EXPORT_JSON, async (_event, sessionId: string, outputPath: string) => {
    try {
      return await historyManager.exportJson(sessionId, outputPath);
    } catch (err) {
      console.error('Failed to export JSON:', err);
      return false;
    }
  });

  ipcMain.handle(IPC_CHANNELS.HISTORY_GET_SETTINGS, async () => {
    return historyManager.getSettings();
  });

  ipcMain.handle(IPC_CHANNELS.HISTORY_UPDATE_SETTINGS, async (_event, settings: any) => {
    try {
      return await historyManager.updateSettings(settings);
    } catch (err) {
      console.error('Failed to update history settings:', err);
      return false;
    }
  });

  ipcMain.handle(IPC_CHANNELS.HISTORY_GET_STATS, async () => {
    try {
      return await historyManager.getStats();
    } catch (err) {
      console.error('Failed to get history stats:', err);
      throw err;
    }
  });

  // Checkpoint handlers
  ipcMain.handle(IPC_CHANNELS.CHECKPOINT_CREATE, async (_event, request: CheckpointCreateRequest) => {
    try {
      return await checkpointManager.createCheckpoint(request);
    } catch (err) {
      console.error('Failed to create checkpoint:', err);
      throw err;
    }
  });

  ipcMain.handle(IPC_CHANNELS.CHECKPOINT_LIST, async (_event, sessionId?: string) => {
    try {
      return await checkpointManager.listCheckpoints(sessionId);
    } catch (err) {
      console.error('Failed to list checkpoints:', err);
      throw err;
    }
  });

  ipcMain.handle(IPC_CHANNELS.CHECKPOINT_GET, async (_event, checkpointId: string) => {
    try {
      return await checkpointManager.getCheckpoint(checkpointId);
    } catch (err) {
      console.error('Failed to get checkpoint:', err);
      throw err;
    }
  });

  ipcMain.handle(IPC_CHANNELS.CHECKPOINT_DELETE, async (_event, checkpointId: string) => {
    try {
      return await checkpointManager.deleteCheckpoint(checkpointId);
    } catch (err) {
      console.error('Failed to delete checkpoint:', err);
      return false;
    }
  });

  ipcMain.handle(IPC_CHANNELS.CHECKPOINT_UPDATE, async (
    _event,
    checkpointId: string,
    updates: Partial<Pick<Checkpoint, 'name' | 'description' | 'tags' | 'isTemplate'>>
  ) => {
    try {
      return await checkpointManager.updateCheckpoint(checkpointId, updates);
    } catch (err) {
      console.error('Failed to update checkpoint:', err);
      throw err;
    }
  });

  ipcMain.handle(IPC_CHANNELS.CHECKPOINT_EXPORT, async (
    _event,
    checkpointId: string,
    format: CheckpointExportFormat
  ) => {
    try {
      return await checkpointManager.exportCheckpointHistory(checkpointId, format);
    } catch (err) {
      console.error('Failed to export checkpoint:', err);
      throw err;
    }
  });

  ipcMain.handle(IPC_CHANNELS.CHECKPOINT_GET_COUNT, async (_event, sessionId: string) => {
    try {
      return checkpointManager.getCheckpointCount(sessionId);
    } catch (err) {
      console.error('Failed to get checkpoint count:', err);
      return 0;
    }
  });

  // App info handlers
  ipcMain.handle(IPC_CHANNELS.APP_GET_VERSION_INFO, async () => {
    const { app } = require('electron');
    const { execSync } = require('child_process');

    let claudeVersion: string | undefined;
    try {
      claudeVersion = execSync('claude --version', { encoding: 'utf-8' }).trim();
    } catch (err) {
      // Claude CLI not found or doesn't support --version
      claudeVersion = undefined;
    }

    return {
      appVersion: app.getVersion(),
      electronVersion: process.versions.electron,
      nodeVersion: process.versions.node,
      claudeVersion,
    };
  });

  // Session I/O handlers (send - fire and forget)
  ipcMain.on(IPC_CHANNELS.SESSION_INPUT, (_event, input: SessionInput) => {
    sessionManager.sendInput(input.sessionId, input.data);
  });

  ipcMain.on(IPC_CHANNELS.SESSION_RESIZE, (_event, request: SessionResizeRequest) => {
    sessionManager.resizeSession(request.sessionId, request.cols, request.rows);
  });

  ipcMain.on(IPC_CHANNELS.SESSION_READY, (_event, sessionId: string) => {
    console.log(`Session ${sessionId} ready`);
  });

  // Window controls
  ipcMain.on(IPC_CHANNELS.WINDOW_MINIMIZE, () => {
    mainWindow.minimize();
  });

  ipcMain.on(IPC_CHANNELS.WINDOW_MAXIMIZE, () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });

  ipcMain.on(IPC_CHANNELS.WINDOW_CLOSE, () => {
    mainWindow.close();
  });

  // Legacy terminal handlers (for backwards compatibility during migration)
  ipcMain.on(IPC_CHANNELS.TERMINAL_INPUT, (_event, data: string) => {
    const activeId = sessionManager.getActiveSessionId();
    if (activeId) {
      sessionManager.sendInput(activeId, data);
    }
  });

  ipcMain.on(IPC_CHANNELS.TERMINAL_RESIZE, (_event, size: { cols: number; rows: number }) => {
    const activeId = sessionManager.getActiveSessionId();
    if (activeId) {
      sessionManager.resizeSession(activeId, size.cols, size.rows);
    }
  });

  ipcMain.on(IPC_CHANNELS.TERMINAL_READY, () => {
    console.log('Terminal ready (legacy)');
  });
}

export function removeIPCHandlers(): void {
  // Remove session handlers
  ipcMain.removeHandler(IPC_CHANNELS.SESSION_CREATE);
  ipcMain.removeHandler(IPC_CHANNELS.SESSION_CLOSE);
  ipcMain.removeHandler(IPC_CHANNELS.SESSION_SWITCH);
  ipcMain.removeHandler(IPC_CHANNELS.SESSION_RENAME);
  ipcMain.removeHandler(IPC_CHANNELS.SESSION_LIST);
  ipcMain.removeHandler(IPC_CHANNELS.SESSION_RESTART);
  ipcMain.removeHandler(IPC_CHANNELS.SESSION_GET_ACTIVE);
  ipcMain.removeHandler(IPC_CHANNELS.BROWSE_DIRECTORY);
  ipcMain.removeHandler(IPC_CHANNELS.SHOW_SAVE_DIALOG);
  ipcMain.removeHandler(IPC_CHANNELS.WRITE_FILE);
  ipcMain.removeHandler(IPC_CHANNELS.LIST_SUBDIRECTORIES);

  // Remove settings/workspace handlers
  ipcMain.removeHandler(IPC_CHANNELS.SETTINGS_GET);
  ipcMain.removeHandler(IPC_CHANNELS.WORKSPACE_LIST);
  ipcMain.removeHandler(IPC_CHANNELS.WORKSPACE_ADD);
  ipcMain.removeHandler(IPC_CHANNELS.WORKSPACE_UPDATE);
  ipcMain.removeHandler(IPC_CHANNELS.WORKSPACE_DELETE);
  ipcMain.removeHandler(IPC_CHANNELS.WORKSPACE_VALIDATE);
  ipcMain.removeHandler(IPC_CHANNELS.SETTINGS_UPDATE_SPLIT_VIEW);

  // Remove quota handlers
  ipcMain.removeHandler(IPC_CHANNELS.QUOTA_GET);
  ipcMain.removeHandler(IPC_CHANNELS.QUOTA_REFRESH);
  ipcMain.removeHandler(IPC_CHANNELS.BURN_RATE_GET);

  // Remove template handlers
  ipcMain.removeHandler(IPC_CHANNELS.TEMPLATE_LIST_ALL);
  ipcMain.removeHandler(IPC_CHANNELS.TEMPLATE_LIST_USER);
  ipcMain.removeHandler(IPC_CHANNELS.TEMPLATE_GET);
  ipcMain.removeHandler(IPC_CHANNELS.TEMPLATE_ADD);
  ipcMain.removeHandler(IPC_CHANNELS.TEMPLATE_UPDATE);
  ipcMain.removeHandler(IPC_CHANNELS.TEMPLATE_DELETE);

  // Remove drag-drop handlers
  ipcMain.removeHandler(IPC_CHANNELS.DRAGDROP_GET_FILE_INFO);
  ipcMain.removeHandler(IPC_CHANNELS.DRAGDROP_READ_FILE);

  // Remove history handlers
  ipcMain.removeHandler(IPC_CHANNELS.HISTORY_LIST);
  ipcMain.removeHandler(IPC_CHANNELS.HISTORY_GET);
  ipcMain.removeHandler(IPC_CHANNELS.HISTORY_SEARCH);
  ipcMain.removeHandler(IPC_CHANNELS.HISTORY_DELETE);
  ipcMain.removeHandler(IPC_CHANNELS.HISTORY_DELETE_ALL);
  ipcMain.removeHandler(IPC_CHANNELS.HISTORY_EXPORT_MARKDOWN);
  ipcMain.removeHandler(IPC_CHANNELS.HISTORY_EXPORT_JSON);
  ipcMain.removeHandler(IPC_CHANNELS.HISTORY_GET_SETTINGS);
  ipcMain.removeHandler(IPC_CHANNELS.HISTORY_UPDATE_SETTINGS);
  ipcMain.removeHandler(IPC_CHANNELS.HISTORY_GET_STATS);

  // Remove checkpoint handlers
  ipcMain.removeHandler(IPC_CHANNELS.CHECKPOINT_CREATE);
  ipcMain.removeHandler(IPC_CHANNELS.CHECKPOINT_LIST);
  ipcMain.removeHandler(IPC_CHANNELS.CHECKPOINT_GET);
  ipcMain.removeHandler(IPC_CHANNELS.CHECKPOINT_DELETE);
  ipcMain.removeHandler(IPC_CHANNELS.CHECKPOINT_UPDATE);
  ipcMain.removeHandler(IPC_CHANNELS.CHECKPOINT_EXPORT);
  ipcMain.removeHandler(IPC_CHANNELS.CHECKPOINT_GET_COUNT);

  // Remove session I/O listeners
  ipcMain.removeAllListeners(IPC_CHANNELS.SESSION_INPUT);
  ipcMain.removeAllListeners(IPC_CHANNELS.SESSION_RESIZE);
  ipcMain.removeAllListeners(IPC_CHANNELS.SESSION_READY);

  // Remove window listeners
  ipcMain.removeAllListeners(IPC_CHANNELS.WINDOW_MINIMIZE);
  ipcMain.removeAllListeners(IPC_CHANNELS.WINDOW_MAXIMIZE);
  ipcMain.removeAllListeners(IPC_CHANNELS.WINDOW_CLOSE);

  // Remove legacy terminal listeners
  ipcMain.removeAllListeners(IPC_CHANNELS.TERMINAL_INPUT);
  ipcMain.removeAllListeners(IPC_CHANNELS.TERMINAL_RESIZE);
  ipcMain.removeAllListeners(IPC_CHANNELS.TERMINAL_READY);
}
