import { useState, useCallback, useEffect } from 'react';
import {
  FileInfo,
  DragDropSettings,
  DragDropInsertMode,
} from '../../shared/ipc-types';

export interface DragState {
  isDragging: boolean;
  files: FileInfo[];
  isShiftPressed: boolean;
}

export interface DropQueueItem {
  files: FileInfo[];
  mode: DragDropInsertMode;
  position?: { x: number; y: number };
}

export interface UseDragDropResult {
  dragState: DragState;
  dropQueue: DropQueueItem[];
  settings: DragDropSettings | null;
  setDragState: (state: DragState) => void;
  addToDropQueue: (item: DropQueueItem) => void;
  processNextDrop: () => DropQueueItem | undefined;
  clearDropQueue: () => void;
  loadSettings: () => Promise<void>;
  updateSettings: (settings: Partial<DragDropSettings>) => Promise<void>;
  getEffectiveInsertMode: (file: FileInfo) => DragDropInsertMode;
  getEffectiveMaxSize: (file: FileInfo) => number;
}

export function useDragDrop(): UseDragDropResult {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    files: [],
    isShiftPressed: false,
  });
  const [dropQueue, setDropQueue] = useState<DropQueueItem[]>([]);
  const [settings, setSettings] = useState<DragDropSettings | null>(null);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const appSettings = await window.electronAPI.getSettings();
      if (appSettings.dragDropSettings) {
        setSettings(appSettings.dragDropSettings);
      }
    } catch (err) {
      console.error('Failed to load drag-drop settings:', err);
    }
  }, []);

  const updateSettings = useCallback(async (partial: Partial<DragDropSettings>) => {
    try {
      // Update settings via IPC
      const appSettings = await window.electronAPI.getSettings();
      const updated = {
        ...appSettings.dragDropSettings,
        ...partial,
      };

      // Save updated settings
      // Note: We'll need to add an updateDragDropSettings IPC handler
      // For now, this is a placeholder
      setSettings(updated as DragDropSettings);
    } catch (err) {
      console.error('Failed to update drag-drop settings:', err);
    }
  }, []);

  const addToDropQueue = useCallback((item: DropQueueItem) => {
    setDropQueue((prev) => [...prev, item]);
  }, []);

  const processNextDrop = useCallback((): DropQueueItem | undefined => {
    let item: DropQueueItem | undefined;
    setDropQueue((prev) => {
      if (prev.length === 0) return prev;
      item = prev[0];
      return prev.slice(1);
    });
    return item;
  }, []);

  const clearDropQueue = useCallback(() => {
    setDropQueue([]);
  }, []);

  const getEffectiveInsertMode = useCallback((file: FileInfo): DragDropInsertMode => {
    if (!settings) return 'path';

    // Check category override
    const categorySettings = settings.categoryOverrides[file.category];
    if (categorySettings?.insertMode) {
      return categorySettings.insertMode;
    }

    // Fall back to default
    return settings.defaultInsertMode;
  }, [settings]);

  const getEffectiveMaxSize = useCallback((file: FileInfo): number => {
    if (!settings) return 100;

    // Check category override
    const categorySettings = settings.categoryOverrides[file.category];
    if (categorySettings?.maxSizeKB !== undefined) {
      return categorySettings.maxSizeKB;
    }

    // Fall back to default
    return settings.maxContentSizeKB;
  }, [settings]);

  return {
    dragState,
    dropQueue,
    settings,
    setDragState,
    addToDropQueue,
    processNextDrop,
    clearDropQueue,
    loadSettings,
    updateSettings,
    getEffectiveInsertMode,
    getEffectiveMaxSize,
  };
}
