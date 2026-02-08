/**
 * useCheckpoints - React hook for managing checkpoint state
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { Checkpoint } from '../../shared/ipc-types';

export interface CheckpointGroup {
  sessionId: string;
  sessionName: string;
  checkpoints: Checkpoint[];
}

export function useCheckpoints(sessionId?: string) {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  /**
   * Load checkpoints from backend
   */
  const loadCheckpoints = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await window.electronAPI.listCheckpoints(sessionId);
      if (isMountedRef.current) {
        setCheckpoints(result);
      }
    } catch (err) {
      console.error('Failed to load checkpoints:', err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load checkpoints');
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [sessionId]);

  /**
   * Create a new checkpoint
   */
  const createCheckpoint = useCallback(
    async (name: string, description?: string, tags?: string[]) => {
      if (!sessionId) {
        throw new Error('No active session');
      }

      setError(null);

      try {
        const checkpoint = await window.electronAPI.createCheckpoint({
          sessionId,
          name,
          description,
          tags,
        });

        if (isMountedRef.current) {
          setCheckpoints((prev) => [...prev, checkpoint].sort((a, b) => a.createdAt - b.createdAt));
        }

        return checkpoint;
      } catch (err) {
        console.error('Failed to create checkpoint:', err);
        if (isMountedRef.current) {
          setError(err instanceof Error ? err.message : 'Failed to create checkpoint');
        }
        throw err;
      }
    },
    [sessionId]
  );

  /**
   * Delete a checkpoint
   */
  const deleteCheckpoint = useCallback(async (checkpointId: string) => {
    setError(null);

    try {
      const success = await window.electronAPI.deleteCheckpoint(checkpointId);

      if (success && isMountedRef.current) {
        setCheckpoints((prev) => prev.filter((cp) => cp.id !== checkpointId));
      }

      return success;
    } catch (err) {
      console.error('Failed to delete checkpoint:', err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to delete checkpoint');
      }
      throw err;
    }
  }, []);

  /**
   * Update checkpoint metadata
   */
  const updateCheckpoint = useCallback(
    async (
      checkpointId: string,
      updates: Partial<Pick<Checkpoint, 'name' | 'description' | 'tags' | 'isTemplate'>>
    ) => {
      setError(null);

      try {
        const updated = await window.electronAPI.updateCheckpoint(checkpointId, updates);

        if (updated && isMountedRef.current) {
          setCheckpoints((prev) =>
            prev.map((cp) => (cp.id === checkpointId ? updated : cp))
          );
        }

        return updated;
      } catch (err) {
        console.error('Failed to update checkpoint:', err);
        if (isMountedRef.current) {
          setError(err instanceof Error ? err.message : 'Failed to update checkpoint');
        }
        throw err;
      }
    },
    []
  );

  /**
   * Export checkpoint to Markdown or JSON
   */
  const exportCheckpoint = useCallback(
    async (checkpointId: string, format: 'markdown' | 'json') => {
      setError(null);

      try {
        const content = await window.electronAPI.exportCheckpoint(checkpointId, format);
        return content;
      } catch (err) {
        console.error('Failed to export checkpoint:', err);
        if (isMountedRef.current) {
          setError(err instanceof Error ? err.message : 'Failed to export checkpoint');
        }
        throw err;
      }
    },
    []
  );

  /**
   * Copy checkpoint to clipboard
   */
  const copyCheckpointToClipboard = useCallback(
    async (checkpointId: string) => {
      try {
        const content = await exportCheckpoint(checkpointId, 'markdown');
        await navigator.clipboard.writeText(content);
        return true;
      } catch (err) {
        console.error('Failed to copy checkpoint:', err);
        throw err;
      }
    },
    [exportCheckpoint]
  );

  /**
   * Group checkpoints by session
   */
  const getCheckpointGroups = useCallback(
    async (allCheckpoints?: Checkpoint[]): Promise<CheckpointGroup[]> => {
      const cps = allCheckpoints || checkpoints;

      // Group by session
      const sessionMap = new Map<string, Checkpoint[]>();

      for (const checkpoint of cps) {
        const existing = sessionMap.get(checkpoint.sessionId) || [];
        existing.push(checkpoint);
        sessionMap.set(checkpoint.sessionId, existing);
      }

      // Convert to groups (with session names - could enhance with actual session metadata)
      const groups: CheckpointGroup[] = [];

      for (const [sessionId, sessionCheckpoints] of sessionMap.entries()) {
        groups.push({
          sessionId,
          sessionName: sessionId.substring(0, 8), // Could fetch actual session name from history
          checkpoints: sessionCheckpoints.sort((a, b) => a.createdAt - b.createdAt),
        });
      }

      // Sort groups by most recent checkpoint
      groups.sort((a, b) => {
        const aLatest = a.checkpoints[a.checkpoints.length - 1]?.createdAt || 0;
        const bLatest = b.checkpoints[b.checkpoints.length - 1]?.createdAt || 0;
        return bLatest - aLatest;
      });

      return groups;
    },
    [checkpoints]
  );

  /**
   * Load checkpoints on mount and when sessionId changes
   */
  useEffect(() => {
    loadCheckpoints();
  }, [loadCheckpoints]);

  /**
   * Listen for checkpoint events
   */
  useEffect(() => {
    const handleCheckpointCreated = (checkpoint: Checkpoint) => {
      if (!sessionId || checkpoint.sessionId === sessionId) {
        setCheckpoints((prev) => {
          // Avoid duplicates
          if (prev.some((cp) => cp.id === checkpoint.id)) {
            return prev;
          }
          return [...prev, checkpoint].sort((a, b) => a.createdAt - b.createdAt);
        });
      }
    };

    const handleCheckpointDeleted = (checkpointId: string) => {
      setCheckpoints((prev) => prev.filter((cp) => cp.id !== checkpointId));
    };

    const unsubscribeCreated = window.electronAPI.onCheckpointCreated(handleCheckpointCreated);
    const unsubscribeDeleted = window.electronAPI.onCheckpointDeleted(handleCheckpointDeleted);

    return () => {
      unsubscribeCreated();
      unsubscribeDeleted();
    };
  }, [sessionId]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    checkpoints,
    isLoading,
    error,
    loadCheckpoints,
    createCheckpoint,
    deleteCheckpoint,
    updateCheckpoint,
    exportCheckpoint,
    copyCheckpointToClipboard,
    getCheckpointGroups,
  };
}
