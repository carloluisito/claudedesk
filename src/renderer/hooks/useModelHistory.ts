import { useState, useEffect, useCallback } from 'react';
import type { ModelSwitchHistoryEntry } from '../../main/model-history-manager';

export interface UseModelHistoryReturn {
  history: ModelSwitchHistoryEntry[];
  isLoading: boolean;
  refresh: () => Promise<void>;
  clearHistory: () => Promise<void>;
}

export function useModelHistory(sessionId: string | null): UseModelHistoryReturn {
  const [history, setHistory] = useState<ModelSwitchHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadHistory = useCallback(async () => {
    if (!sessionId) {
      setHistory([]);
      return;
    }

    setIsLoading(true);
    try {
      const result = await window.electronAPI.getModelHistory(sessionId);
      setHistory(result);
    } catch (err) {
      console.error('[useModelHistory] Failed to load history:', err);
      setHistory([]);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  const clearHistory = useCallback(async () => {
    if (!sessionId) return;

    try {
      await window.electronAPI.clearModelHistory(sessionId);
      setHistory([]);
    } catch (err) {
      console.error('[useModelHistory] Failed to clear history:', err);
    }
  }, [sessionId]);

  // Load on mount and when sessionId changes
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Listen for model change events to refresh
  useEffect(() => {
    if (!sessionId) return;

    const unsubscribe = window.electronAPI.onModelChanged((event) => {
      // Refresh if the event is for our session
      if (event.sessionId === sessionId) {
        loadHistory();
      }
    });

    return unsubscribe;
  }, [sessionId, loadHistory]);

  return {
    history,
    isLoading,
    refresh: loadHistory,
    clearHistory,
  };
}
