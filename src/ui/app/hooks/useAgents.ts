/**
 * useAgents Hook - Manages Claude Code agent fetching, pinning, and execution
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../lib/api';
import type { Agent, AgentExecution, AgentInputValues, PinnedAgentsSettings, AgentUsage } from '../types/agents';

// Backend agent type from /api/agents
interface BackendAgent {
  id: string;
  name: string;
  description?: string;
  model: 'opus' | 'sonnet' | 'haiku' | 'inherit';
  color?: string;
  source: 'user' | 'builtin';
}

function mapBackendAgent(agent: BackendAgent, pinnedIds: string[]): Agent {
  return {
    id: agent.id,
    name: agent.name,
    description: agent.description,
    model: agent.model,
    color: agent.color,
    source: agent.source,
    isPinned: pinnedIds.includes(agent.id),
  };
}

interface UseAgentsOptions {
  repoId?: string;
}

export function useAgents(options: UseAgentsOptions = {}) {
  const { repoId } = options;

  const [userAgents, setUserAgents] = useState<Agent[]>([]);
  const [builtinAgents, setBuiltinAgents] = useState<Agent[]>([]);
  const [pinnedAgentIds, setPinnedAgentIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [executions, setExecutions] = useState<AgentExecution[]>([]);

  // Agent selection state (supports both single and chain)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [selectedAgents, setSelectedAgents] = useState<Agent[]>([]);
  const [recentAgentUsage, setRecentAgentUsage] = useState<AgentUsage[]>([]);

  // Load pinned agents settings
  const loadPinnedSettings = useCallback(async () => {
    try {
      const data = await api<PinnedAgentsSettings>('GET', '/settings/agents');
      setPinnedAgentIds(data.pinnedAgentIds || []);
      return data.pinnedAgentIds || [];
    } catch (err) {
      console.error('Failed to load pinned agents:', err);
      return [];
    }
  }, []);

  // Load recent agents usage
  const loadRecentAgents = useCallback(async () => {
    try {
      const data = await api<AgentUsage[]>('GET', '/agents/recent');
      setRecentAgentUsage(data);
    } catch (err) {
      console.error('Failed to load recent agents:', err);
    }
  }, []);

  // Load all Claude Code agents from ~/.claude/agents
  const loadClaudeAgents = useCallback(async (pinnedIds: string[]) => {
    try {
      const backendAgents = await api<BackendAgent[]>('GET', '/agents');
      const agents = backendAgents.map((agent) => mapBackendAgent(agent, pinnedIds));

      // Separate user and builtin agents
      setUserAgents(agents.filter((a) => a.source === 'user'));
      setBuiltinAgents(agents.filter((a) => a.source === 'builtin'));
      return agents;
    } catch (err) {
      console.error('Failed to load Claude agents:', err);
      return [];
    }
  }, []);

  // Load all agents
  const loadAgents = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const pinnedIds = await loadPinnedSettings();
      await Promise.all([loadClaudeAgents(pinnedIds), loadRecentAgents()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agents');
    } finally {
      setLoading(false);
    }
  }, [loadPinnedSettings, loadClaudeAgents, loadRecentAgents]);

  // Refresh agents
  const refresh = useCallback(async () => {
    await loadAgents();
  }, [loadAgents]);

  // Toggle pinned status
  const togglePin = useCallback(async (agentId: string) => {
    const newPinnedIds = pinnedAgentIds.includes(agentId)
      ? pinnedAgentIds.filter((id) => id !== agentId)
      : [...pinnedAgentIds, agentId];

    // Optimistic update
    setPinnedAgentIds(newPinnedIds);

    // Update agents' isPinned status
    setUserAgents((prev) =>
      prev.map((a) => ({
        ...a,
        isPinned: newPinnedIds.includes(a.id),
      }))
    );
    setBuiltinAgents((prev) =>
      prev.map((a) => ({
        ...a,
        isPinned: newPinnedIds.includes(a.id),
      }))
    );

    try {
      await api('PUT', '/settings/agents', { pinnedAgentIds: newPinnedIds });
    } catch (err) {
      console.error('Failed to update pinned agents:', err);
      // Revert on error
      setPinnedAgentIds(pinnedAgentIds);
    }
  }, [pinnedAgentIds]);

  // Execute agent
  const executeAgent = useCallback(async (
    agent: Agent,
    inputs: AgentInputValues,
    targetRepoId: string
  ): Promise<AgentExecution> => {
    const executionId = `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const execution: AgentExecution = {
      id: executionId,
      agentId: agent.id,
      agentName: agent.name,
      status: 'pending',
      startedAt: new Date().toISOString(),
    };

    setExecutions((prev) => [...prev, execution]);

    try {
      // Update to running
      setExecutions((prev) =>
        prev.map((e) =>
          e.id === executionId ? { ...e, status: 'running' as const } : e
        )
      );

      const result = await api<{ output?: string; error?: string }>(
        'POST',
        `/skills/${encodeURIComponent(agent.id)}/execute`,
        {
          repoId: targetRepoId,
          inputs,
        }
      );

      // Update to completed
      const completedExecution: AgentExecution = {
        ...execution,
        status: 'completed',
        output: result.output,
        completedAt: new Date().toISOString(),
      };

      setExecutions((prev) =>
        prev.map((e) => (e.id === executionId ? completedExecution : e))
      );

      return completedExecution;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Execution failed';

      const failedExecution: AgentExecution = {
        ...execution,
        status: 'failed',
        error: errorMsg,
        completedAt: new Date().toISOString(),
      };

      setExecutions((prev) =>
        prev.map((e) => (e.id === executionId ? failedExecution : e))
      );

      return failedExecution;
    }
  }, []);

  // Cancel execution (for future WebSocket integration)
  const cancelExecution = useCallback((executionId: string) => {
    setExecutions((prev) =>
      prev.map((e) =>
        e.id === executionId && e.status === 'running'
          ? { ...e, status: 'failed' as const, error: 'Cancelled by user' }
          : e
      )
    );
  }, []);

  // Re-run a previous execution
  const rerunExecution = useCallback(async (
    executionId: string,
    inputs: AgentInputValues,
    targetRepoId: string
  ) => {
    const execution = executions.find((e) => e.id === executionId);
    if (!execution) return;

    const agent = [...userAgents, ...builtinAgents].find((a) => a.id === execution.agentId);
    if (!agent) return;

    return executeAgent(agent, inputs, targetRepoId);
  }, [executions, userAgents, builtinAgents, executeAgent]);

  // Clear completed executions
  const clearExecutions = useCallback(() => {
    setExecutions((prev) => prev.filter((e) => e.status === 'running' || e.status === 'pending'));
  }, []);

  // Filtered agents based on search
  const allAgents = useMemo(() => {
    return [...userAgents, ...builtinAgents];
  }, [userAgents, builtinAgents]);

  const filteredAgents = useMemo(() => {
    if (!searchQuery.trim()) return allAgents;

    const query = searchQuery.toLowerCase();
    return allAgents.filter(
      (agent) =>
        agent.name.toLowerCase().includes(query) ||
        agent.description?.toLowerCase().includes(query) ||
        agent.model.toLowerCase().includes(query)
    );
  }, [allAgents, searchQuery]);

  const pinnedAgents = useMemo(() => {
    return filteredAgents.filter((a) => a.isPinned);
  }, [filteredAgents]);

  const userFilteredAgents = useMemo(() => {
    return filteredAgents.filter((a) => a.source === 'user' && !a.isPinned);
  }, [filteredAgents]);

  const builtinFilteredAgents = useMemo(() => {
    return filteredAgents.filter((a) => a.source === 'builtin' && !a.isPinned);
  }, [filteredAgents]);

  // Recent agents - map usage data to actual agents
  const recentAgents = useMemo(() => {
    return recentAgentUsage
      .map((usage) => allAgents.find((a) => a.id === usage.agentId))
      .filter((a): a is Agent => a !== undefined);
  }, [recentAgentUsage, allAgents]);

  // Chain management: max 5 agents
  const MAX_CHAIN_LENGTH = 5;

  const addAgentToChain = useCallback((agent: Agent) => {
    setSelectedAgents((prev) => {
      if (prev.length >= MAX_CHAIN_LENGTH) return prev;
      if (prev.some((a) => a.id === agent.id)) return prev; // no duplicates
      return [...prev, agent];
    });
    // Also set as selectedAgent for backward compat (last added)
    setSelectedAgent(agent);
  }, []);

  const removeAgentFromChain = useCallback((agentId: string) => {
    setSelectedAgents((prev) => {
      const next = prev.filter((a) => a.id !== agentId);
      // Update selectedAgent for backward compat
      if (next.length === 0) setSelectedAgent(null);
      else setSelectedAgent(next[next.length - 1]);
      return next;
    });
  }, []);

  const reorderChain = useCallback((fromIndex: number, toIndex: number) => {
    setSelectedAgents((prev) => {
      const arr = [...prev];
      const [moved] = arr.splice(fromIndex, 1);
      arr.splice(toIndex, 0, moved);
      return arr;
    });
  }, []);

  const clearChain = useCallback(() => {
    setSelectedAgents([]);
    setSelectedAgent(null);
  }, []);

  // CRUD operations for custom agents
  const createAgent = useCallback(async (data: {
    name: string;
    description: string;
    model: string;
    color: string;
    systemPrompt: string;
  }): Promise<void> => {
    const created = await api<BackendAgent>('POST', '/agents', data);
    // Refresh list to pick up the new agent
    await loadClaudeAgents(pinnedAgentIds);
  }, [loadClaudeAgents, pinnedAgentIds]);

  const updateAgent = useCallback(async (agentId: string, data: {
    name: string;
    description: string;
    model: string;
    color: string;
    systemPrompt: string;
  }): Promise<void> => {
    await api<BackendAgent>('PUT', `/agents/${encodeURIComponent(agentId)}`, data);
    await loadClaudeAgents(pinnedAgentIds);
  }, [loadClaudeAgents, pinnedAgentIds]);

  const deleteAgent = useCallback(async (agentId: string): Promise<void> => {
    await api<{ id: string; deleted: boolean }>('DELETE', `/agents/${encodeURIComponent(agentId)}`);
    // Remove from pinned if needed
    if (pinnedAgentIds.includes(agentId)) {
      const newPinnedIds = pinnedAgentIds.filter((id) => id !== agentId);
      setPinnedAgentIds(newPinnedIds);
      try {
        await api('PUT', '/settings/agents', { pinnedAgentIds: newPinnedIds });
      } catch (err) {
        console.error('Failed to update pinned agents after delete:', err);
      }
    }
    // Clear selection if deleted agent was selected
    if (selectedAgent?.id === agentId) {
      setSelectedAgent(null);
    }
    setSelectedAgents((prev) => prev.filter((a) => a.id !== agentId));
    await loadClaudeAgents(pinnedAgentIds.filter((id) => id !== agentId));
  }, [loadClaudeAgents, pinnedAgentIds, selectedAgent]);

  const getAgentRaw = useCallback(async (agentId: string): Promise<{
    id: string;
    name: string;
    description: string;
    model: 'opus' | 'sonnet' | 'haiku' | 'inherit';
    color: string;
    systemPrompt: string;
  }> => {
    return api('GET', `/agents/${encodeURIComponent(agentId)}/raw`);
  }, []);

  // Add agent to recent (optimistic update + API call happens when message is sent)
  const addToRecentAgents = useCallback((agent: Agent) => {
    // Optimistic update - add to front of recent list
    setRecentAgentUsage((prev) => {
      const filtered = prev.filter((u) => u.agentId !== agent.id);
      const newUsage: AgentUsage = {
        agentId: agent.id,
        lastUsedAt: new Date().toISOString(),
        useCount: (prev.find((u) => u.agentId === agent.id)?.useCount || 0) + 1,
      };
      return [newUsage, ...filtered].slice(0, 3);
    });
  }, []);

  // Load on mount
  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  return {
    // Data
    allAgents,
    userAgents: userFilteredAgents,
    builtinAgents: builtinFilteredAgents,
    pinnedAgents,
    recentAgents,
    executions,

    // Selection state (single agent - backward compat)
    selectedAgent,
    setSelectedAgent,

    // Chain selection state
    selectedAgents,
    setSelectedAgents,
    addAgentToChain,
    removeAgentFromChain,
    reorderChain,
    clearChain,
    maxChainLength: MAX_CHAIN_LENGTH,

    // State
    loading,
    error,
    searchQuery,

    // Actions
    setSearchQuery,
    refresh,
    togglePin,
    executeAgent,
    cancelExecution,
    rerunExecution,
    clearExecutions,
    addToRecentAgents,

    // CRUD
    createAgent,
    updateAgent,
    deleteAgent,
    getAgentRaw,
  };
}

export type UseAgentsReturn = ReturnType<typeof useAgents>;
