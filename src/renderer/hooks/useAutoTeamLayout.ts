import { useEffect, useRef } from 'react';
import type { TeammateDetectedEvent, SessionMetadata } from '../../shared/ipc-types';

interface UseAutoTeamLayoutOptions {
  enabled: boolean;
  sessions: SessionMetadata[];
  paneCount: number;
  splitPane: (paneId: string, direction: 'horizontal' | 'vertical') => string;
  assignSession: (paneId: string, sessionId: string) => void;
  focusedPaneId: string | null;
}

export function useAutoTeamLayout({
  enabled,
  sessions,
  paneCount,
  splitPane,
  assignSession,
  focusedPaneId,
}: UseAutoTeamLayoutOptions) {
  const processedTeammates = useRef(new Set<string>());

  useEffect(() => {
    if (!enabled) return;

    const unsub = window.electronAPI.onTeammateAdded((event: TeammateDetectedEvent) => {
      const { member } = event;

      // Already processed this teammate
      if (processedTeammates.current.has(member.agentId)) return;
      processedTeammates.current.add(member.agentId);

      // Check if we can add more panes
      if (paneCount >= 4) return;

      // Find session for this teammate
      const teammateSession = sessions.find(
        s => s.agentId === member.agentId || s.teamName === event.teamName
      );
      if (!teammateSession) return;

      // Need a focused pane to split from
      if (!focusedPaneId) return;

      // Split and assign
      try {
        const newPaneId = splitPane(focusedPaneId, 'horizontal');
        assignSession(newPaneId, teammateSession.id);
      } catch (err) {
        console.error('Auto-layout failed:', err);
      }
    });

    return () => unsub();
  }, [enabled, sessions, paneCount, splitPane, assignSession, focusedPaneId]);
}
