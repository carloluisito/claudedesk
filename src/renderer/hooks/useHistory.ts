/**
 * Custom hook for session history management
 */

import { useState, useCallback } from 'react';
import type {
  HistorySessionEntry,
  HistorySearchResult,
  HistorySettings,
  HistoryStats,
} from '../../shared/types/history-types';

export function useHistory() {
  const [sessions, setSessions] = useState<HistorySessionEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load all history sessions
   */
  const loadSessions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await window.electronAPI.listHistory();
      setSessions(data);
    } catch (err) {
      console.error('Failed to load history sessions:', err);
      setError('Failed to load session history');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Get full content for a session
   */
  const getSessionContent = useCallback(async (sessionId: string): Promise<string> => {
    setError(null);
    try {
      return await window.electronAPI.getHistory(sessionId);
    } catch (err) {
      console.error('Failed to get session content:', err);
      setError('Failed to load session content');
      return '';
    }
  }, []);

  /**
   * Search across all sessions
   */
  const searchHistory = useCallback(
    async (query: string, useRegex = false): Promise<HistorySearchResult[]> => {
      setIsLoading(true);
      setError(null);
      try {
        return await window.electronAPI.searchHistory(query, useRegex);
      } catch (err) {
        console.error('Search failed:', err);
        setError('Search failed. Please check your regex syntax.');
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Delete a session from history
   */
  const deleteSession = useCallback(async (sessionId: string): Promise<boolean> => {
    setError(null);
    try {
      const success = await window.electronAPI.deleteHistory(sessionId);
      if (success) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      }
      return success;
    } catch (err) {
      console.error('Failed to delete session:', err);
      setError('Failed to delete session');
      return false;
    }
  }, []);

  /**
   * Delete all sessions
   */
  const deleteAllSessions = useCallback(async (): Promise<boolean> => {
    setError(null);
    try {
      const success = await window.electronAPI.deleteAllHistory();
      if (success) {
        setSessions([]);
      }
      return success;
    } catch (err) {
      console.error('Failed to delete all sessions:', err);
      setError('Failed to delete all sessions');
      return false;
    }
  }, []);

  /**
   * Export session as Markdown
   */
  const exportMarkdown = useCallback(async (sessionId: string, outputPath: string): Promise<boolean> => {
    setError(null);
    try {
      return await window.electronAPI.exportHistoryMarkdown(sessionId, outputPath);
    } catch (err) {
      console.error('Failed to export markdown:', err);
      setError('Failed to export as Markdown');
      return false;
    }
  }, []);

  /**
   * Export session as JSON
   */
  const exportJson = useCallback(async (sessionId: string, outputPath: string): Promise<boolean> => {
    setError(null);
    try {
      return await window.electronAPI.exportHistoryJson(sessionId, outputPath);
    } catch (err) {
      console.error('Failed to export JSON:', err);
      setError('Failed to export as JSON');
      return false;
    }
  }, []);

  /**
   * Get history settings
   */
  const getSettings = useCallback(async (): Promise<HistorySettings | null> => {
    setError(null);
    try {
      return await window.electronAPI.getHistorySettings();
    } catch (err) {
      console.error('Failed to get settings:', err);
      setError('Failed to load settings');
      return null;
    }
  }, []);

  /**
   * Update history settings
   */
  const updateSettings = useCallback(async (settings: Partial<HistorySettings>): Promise<boolean> => {
    setError(null);
    try {
      return await window.electronAPI.updateHistorySettings(settings);
    } catch (err) {
      console.error('Failed to update settings:', err);
      setError('Failed to update settings');
      return false;
    }
  }, []);

  /**
   * Get history statistics
   */
  const getStats = useCallback(async (): Promise<HistoryStats | null> => {
    setError(null);
    try {
      return await window.electronAPI.getHistoryStats();
    } catch (err) {
      console.error('Failed to get stats:', err);
      setError('Failed to load statistics');
      return null;
    }
  }, []);

  return {
    sessions,
    isLoading,
    error,
    loadSessions,
    getSessionContent,
    searchHistory,
    deleteSession,
    deleteAllSessions,
    exportMarkdown,
    exportJson,
    getSettings,
    updateSettings,
    getStats,
  };
}
