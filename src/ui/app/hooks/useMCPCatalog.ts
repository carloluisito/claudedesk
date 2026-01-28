import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import {
  PredefinedServerTemplate,
  PrerequisiteCheckResult,
} from '../types/mcp-catalog';
import { MCPServerConfig } from '../types/mcp';

interface UseMCPCatalogReturn {
  catalog: PredefinedServerTemplate[];
  isLoading: boolean;
  error: string | null;
  getTemplate: (templateId: string) => Promise<PredefinedServerTemplate>;
  checkPrerequisites: (templateId: string) => Promise<PrerequisiteCheckResult[]>;
  createFromTemplate: (
    templateId: string,
    name: string,
    config: Record<string, string>
  ) => Promise<MCPServerConfig>;
}

/**
 * Hook for MCP server catalog operations
 */
export function useMCPCatalog(): UseMCPCatalogReturn {
  const [catalog, setCatalog] = useState<PredefinedServerTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load catalog on mount
  useEffect(() => {
    const loadCatalog = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await api<PredefinedServerTemplate[]>('GET', '/mcp/catalog');
        setCatalog(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load catalog';
        setError(message);
        console.error('[useMCPCatalog] Load error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadCatalog();
  }, []);

  // Get single template
  const getTemplate = useCallback(async (templateId: string) => {
    return api<PredefinedServerTemplate>('GET', `/mcp/catalog/${templateId}`);
  }, []);

  // Check prerequisites for a template
  const checkPrerequisites = useCallback(async (templateId: string) => {
    return api<PrerequisiteCheckResult[]>(
      'POST',
      `/mcp/catalog/${templateId}/check-prerequisites`
    );
  }, []);

  // Create server from template
  const createFromTemplate = useCallback(
    async (templateId: string, name: string, config: Record<string, string>) => {
      return api<MCPServerConfig>('POST', '/mcp/servers/from-template', {
        templateId,
        name,
        config,
      });
    },
    []
  );

  return {
    catalog,
    isLoading,
    error,
    getTemplate,
    checkPrerequisites,
    createFromTemplate,
  };
}
