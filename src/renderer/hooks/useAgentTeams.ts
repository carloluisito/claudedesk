import { useState, useEffect, useCallback } from 'react';
import type { TeamInfo, SessionMetadata } from '../../shared/ipc-types';

export function useAgentTeams() {
  const [teams, setTeams] = useState<TeamInfo[]>([]);

  // Load initial teams
  useEffect(() => {
    const load = async () => {
      try {
        const loadedTeams = await window.electronAPI.getTeams();
        setTeams(loadedTeams);
      } catch (err) {
        console.error('Failed to load teams:', err);
      }
    };
    load();
  }, []);

  // Listen for team events
  useEffect(() => {
    const unsubDetected = window.electronAPI.onTeamDetected((team: TeamInfo) => {
      setTeams(prev => {
        const idx = prev.findIndex(t => t.name === team.name);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = team;
          return next;
        }
        return [...prev, team];
      });
    });

    const unsubTeammate = window.electronAPI.onTeammateAdded(() => {
      // Refresh teams when a new teammate is added
      window.electronAPI.getTeams().then(setTeams).catch(console.error);
    });

    const unsubTasks = window.electronAPI.onTasksUpdated((event) => {
      setTeams(prev => prev.map(t =>
        t.name === event.teamName ? { ...t, tasks: event.tasks, updatedAt: Date.now() } : t
      ));
    });

    const unsubRemoved = window.electronAPI.onTeamRemoved((event) => {
      setTeams(prev => prev.filter(t => t.name !== event.teamName));
    });

    return () => {
      unsubDetected();
      unsubTeammate();
      unsubTasks();
      unsubRemoved();
    };
  }, []);

  const getTeamForSession = useCallback(async (sessionId: string): Promise<TeamInfo | null> => {
    try {
      return await window.electronAPI.getTeamForSession(sessionId);
    } catch {
      return null;
    }
  }, []);

  const getTeamSessions = useCallback(async (teamName: string): Promise<SessionMetadata[]> => {
    try {
      return await window.electronAPI.getTeamSessions(teamName);
    } catch {
      return [];
    }
  }, []);

  const linkSession = useCallback(async (sessionId: string, teamName: string, agentId: string) => {
    return window.electronAPI.linkSessionToTeam(sessionId, teamName, agentId);
  }, []);

  const unlinkSession = useCallback(async (sessionId: string) => {
    return window.electronAPI.unlinkSessionFromTeam(sessionId);
  }, []);

  const closeTeam = useCallback(async (teamName: string) => {
    return window.electronAPI.closeTeam(teamName);
  }, []);

  const refreshTeams = useCallback(async () => {
    try {
      const loadedTeams = await window.electronAPI.getTeams();
      setTeams(loadedTeams);
    } catch (err) {
      console.error('Failed to refresh teams:', err);
    }
  }, []);

  return {
    teams,
    getTeamForSession,
    getTeamSessions,
    linkSession,
    unlinkSession,
    closeTeam,
    refreshTeams,
  };
}
