import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../lib/api';
import {
  MCPServerConfig,
  MCPServerStatus,
  MCPSettings,
  ToolInfo,
  MCPToolDefinition,
} from '../types/mcp';

interface UseMCPServersReturn {
  servers: MCPServerConfig[];
  statuses: Map<string, MCPServerStatus>;
  settings: MCPSettings | null;
  tools: ToolInfo[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createServer: (config: Omit<MCPServerConfig, 'id' | 'createdAt'>) => Promise<MCPServerConfig>;
  updateServer: (id: string, updates: Partial<MCPServerConfig>) => Promise<MCPServerConfig>;
  deleteServer: (id: string) => Promise<void>;
  connectServer: (id: string) => Promise<void>;
  disconnectServer: (id: string) => Promise<void>;
  updateSettings: (updates: Partial<MCPSettings>) => Promise<void>;
}

// Polling interval in milliseconds (30 seconds)
const POLL_INTERVAL = 30000;

/**
 * Hook for managing MCP servers and their connection state
 */
export function useMCPServers(): UseMCPServersReturn {
  const [servers, setServers] = useState<MCPServerConfig[]>([]);
  const [statuses, setStatuses] = useState<Map<string, MCPServerStatus>>(new Map());
  const [settings, setSettings] = useState<MCPSettings | null>(null);
  const [tools, setTools] = useState<ToolInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const serversRef = useRef<MCPServerConfig[]>([]);
  const isMountedRef = useRef(true);

  // Keep serversRef in sync with servers state
  useEffect(() => {
    serversRef.current = servers;
  }, [servers]);

  // Load initial data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Load servers, settings, and tools in parallel
      const [serversData, settingsData, toolsData] = await Promise.all([
        api<MCPServerConfig[]>('GET', '/mcp/servers'),
        api<MCPSettings>('GET', '/mcp/settings'),
        api<ToolInfo[]>('GET', '/mcp/tools'),
      ]);

      setServers(serversData);
      setSettings(settingsData);
      setTools(toolsData);

      // Load status for each server
      const statusPromises = serversData.map(server =>
        api<MCPServerStatus>('GET', `/mcp/servers/${server.id}/status`)
          .then(status => ({ id: server.id, status }))
          .catch(() => ({
            id: server.id,
            status: { id: server.id, status: 'disconnected' as const }
          }))
      );

      const statusResults = await Promise.all(statusPromises);
      const statusMap = new Map<string, MCPServerStatus>();
      statusResults.forEach(({ id, status }) => {
        statusMap.set(id, status);
      });

      setStatuses(statusMap);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load MCP data';
      setError(message);
      console.error('[useMCPServers] Load error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    isMountedRef.current = true;
    loadData();

    return () => {
      isMountedRef.current = false;
    };
  }, [loadData]);

  // Separate polling effect - only depends on loadData, uses ref for servers
  useEffect(() => {
    // Poll for status updates every 30 seconds
    const pollStatuses = async () => {
      const currentServers = serversRef.current;
      if (currentServers.length === 0 || !isMountedRef.current) return;

      try {
        // Refresh statuses
        const statusResults = await Promise.all(
          currentServers.map(server =>
            api<MCPServerStatus>('GET', `/mcp/servers/${server.id}/status`)
              .then(status => ({ id: server.id, status }))
              .catch(() => ({
                id: server.id,
                status: { id: server.id, status: 'disconnected' as const }
              }))
          )
        );

        if (!isMountedRef.current) return;

        const statusMap = new Map<string, MCPServerStatus>();
        statusResults.forEach(({ id, status }) => {
          statusMap.set(id, status);
        });
        setStatuses(statusMap);

        // Refresh tools
        const toolsData = await api<ToolInfo[]>('GET', '/mcp/tools').catch(() => null);
        if (toolsData && isMountedRef.current) {
          setTools(toolsData);
        }
      } catch {
        // Ignore errors during polling - don't spam console
      }
    };

    pollIntervalRef.current = setInterval(pollStatuses, POLL_INTERVAL);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, []); // Empty deps - runs once on mount

  // CRUD operations
  const createServer = useCallback(async (config: Omit<MCPServerConfig, 'id' | 'createdAt'>) => {
    const newServer = await api<MCPServerConfig>('POST', '/mcp/servers', config);
    setServers(prev => [...prev, newServer]);
    return newServer;
  }, []);

  const updateServer = useCallback(async (id: string, updates: Partial<MCPServerConfig>) => {
    const updated = await api<MCPServerConfig>('PUT', `/mcp/servers/${id}`, updates);
    setServers(prev => prev.map(s => s.id === id ? updated : s));
    return updated;
  }, []);

  const deleteServer = useCallback(async (id: string) => {
    await api('DELETE', `/mcp/servers/${id}`);
    setServers(prev => prev.filter(s => s.id !== id));
    setStatuses(prev => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  // Connection operations
  const connectServer = useCallback(async (id: string) => {
    const status = await api<MCPServerStatus>('POST', `/mcp/servers/${id}/connect`);
    setStatuses(prev => {
      const next = new Map(prev);
      next.set(id, status);
      return next;
    });
  }, []);

  const disconnectServer = useCallback(async (id: string) => {
    await api('POST', `/mcp/servers/${id}/disconnect`);
    // Status will be updated via WebSocket
  }, []);

  // Settings operations
  const updateSettings = useCallback(async (updates: Partial<MCPSettings>) => {
    const updated = await api<MCPSettings>('PUT', '/mcp/settings', updates);
    setSettings(updated);
  }, []);

  return {
    servers,
    statuses,
    settings,
    tools,
    isLoading,
    error,
    refresh: loadData,
    createServer,
    updateServer,
    deleteServer,
    connectServer,
    disconnectServer,
    updateSettings,
  };
}
