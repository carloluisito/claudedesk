import { MCPClient } from './mcp-client.js';
import { mcpServerRegistry } from '../config/mcp-servers.js';
import { settingsManager } from '../config/settings.js';
import { wsManager } from './ws-manager.js';
import {
  MCPServerConfig,
  MCPServerStatus,
  MCPToolDefinition,
  MCPToolResultContent,
} from '../types.js';

interface ToolInfo {
  serverId: string;
  serverName: string;
  tool: MCPToolDefinition;
}

/**
 * MCPManager is a singleton that manages the lifecycle of all MCP server connections.
 * It handles connection, disconnection, tool discovery, and tool invocation.
 */
class MCPManager {
  private clients: Map<string, MCPClient> = new Map();
  private statuses: Map<string, MCPServerStatus> = new Map();
  private isInitialized = false;

  /**
   * Initialize the MCP manager and auto-connect to enabled servers
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('[MCP Manager] Already initialized');
      return;
    }

    const mcpSettings = settingsManager.getMcp();

    if (!mcpSettings.globalEnabled) {
      console.log('[MCP Manager] MCP is globally disabled, skipping initialization');
      this.isInitialized = true;
      return;
    }

    console.log('[MCP Manager] Initializing...');

    // Get servers with autoConnect enabled
    const autoConnectServers = mcpServerRegistry.getAutoConnect();

    if (autoConnectServers.length === 0) {
      console.log('[MCP Manager] No servers configured for auto-connect');
      this.isInitialized = true;
      return;
    }

    // Connect to each server in parallel
    const connectionPromises = autoConnectServers.map(async (server) => {
      try {
        await this.connect(server.id);
      } catch (error) {
        console.error(`[MCP Manager] Failed to auto-connect to ${server.name}:`, error);
      }
    });

    await Promise.allSettled(connectionPromises);

    this.isInitialized = true;
    console.log(`[MCP Manager] Initialized with ${this.clients.size} connected server(s)`);
  }

  /**
   * Connect to a specific MCP server
   */
  async connect(serverId: string): Promise<MCPServerStatus> {
    const server = mcpServerRegistry.get(serverId);

    if (!server) {
      throw new Error(`Server not found: ${serverId}`);
    }

    if (!server.enabled) {
      throw new Error(`Server is disabled: ${server.name}`);
    }

    // Check if already connected
    if (this.clients.has(serverId)) {
      const status = this.statuses.get(serverId);
      if (status?.status === 'connected') {
        return status;
      }
      // If not connected, clean up old client
      await this.disconnect(serverId);
    }

    // Set connecting status
    const connectingStatus: MCPServerStatus = {
      id: serverId,
      status: 'connecting',
    };
    this.statuses.set(serverId, connectingStatus);
    this.broadcastStatusChange(serverId);

    try {
      // Create and connect client
      const client = new MCPClient(server);
      const mcpSettings = settingsManager.getMcp();

      await client.connect(mcpSettings.connectionTimeout);

      // Discover tools
      const tools = await client.listTools();

      // Store client
      this.clients.set(serverId, client);

      // Update status
      const connectedStatus: MCPServerStatus = {
        id: serverId,
        status: 'connected',
        tools,
        connectedAt: new Date().toISOString(),
      };
      this.statuses.set(serverId, connectedStatus);

      console.log(`[MCP Manager] Connected to ${server.name} with ${tools.length} tool(s)`);

      // Broadcast status change
      this.broadcastStatusChange(serverId);

      return connectedStatus;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      // Update status to error
      const errorStatus: MCPServerStatus = {
        id: serverId,
        status: 'error',
        error: errorMsg,
        lastError: errorMsg,
        lastErrorAt: new Date().toISOString(),
      };
      this.statuses.set(serverId, errorStatus);

      console.error(`[MCP Manager] Connection failed for ${server.name}:`, errorMsg);

      // Broadcast status change
      this.broadcastStatusChange(serverId);

      throw new Error(`Failed to connect to ${server.name}: ${errorMsg}`);
    }
  }

  /**
   * Disconnect from a specific MCP server
   */
  async disconnect(serverId: string): Promise<void> {
    const client = this.clients.get(serverId);

    if (client) {
      try {
        await client.disconnect();
      } catch (error) {
        console.error(`[MCP Manager] Error disconnecting from ${serverId}:`, error);
      }

      this.clients.delete(serverId);
    }

    // Update status
    const status: MCPServerStatus = {
      id: serverId,
      status: 'disconnected',
    };
    this.statuses.set(serverId, status);

    // Broadcast status change
    this.broadcastStatusChange(serverId);

    console.log(`[MCP Manager] Disconnected from ${serverId}`);
  }

  /**
   * Get status for a specific server
   */
  getStatus(serverId: string): MCPServerStatus {
    const status = this.statuses.get(serverId);

    if (status) {
      return status;
    }

    // Return default disconnected status if not found
    return {
      id: serverId,
      status: 'disconnected',
    };
  }

  /**
   * Get statuses for all configured servers
   */
  getAllStatuses(): MCPServerStatus[] {
    const allServers = mcpServerRegistry.getAll();

    return allServers.map(server => {
      const status = this.statuses.get(server.id);
      if (status) {
        return status;
      }

      // Return default disconnected status
      return {
        id: server.id,
        status: 'disconnected',
      };
    });
  }

  /**
   * Get all tools from all connected servers
   */
  getAllTools(): ToolInfo[] {
    const tools: ToolInfo[] = [];

    for (const [serverId, status] of this.statuses.entries()) {
      if (status.status === 'connected' && status.tools) {
        const server = mcpServerRegistry.get(serverId);
        if (server) {
          for (const tool of status.tools) {
            tools.push({
              serverId,
              serverName: server.name,
              tool,
            });
          }
        }
      }
    }

    return tools;
  }

  /**
   * Get tools from a specific server
   */
  getServerTools(serverId: string): MCPToolDefinition[] {
    const status = this.statuses.get(serverId);

    if (status?.status === 'connected' && status.tools) {
      return status.tools;
    }

    return [];
  }

  /**
   * Invoke a tool on a specific server
   */
  async invokeTool(
    serverId: string,
    toolName: string,
    args: Record<string, unknown>
  ): Promise<MCPToolResultContent[]> {
    const client = this.clients.get(serverId);

    if (!client || !client.getIsConnected()) {
      throw new Error(`Server not connected: ${serverId}`);
    }

    const server = mcpServerRegistry.get(serverId);
    if (!server) {
      throw new Error(`Server not found: ${serverId}`);
    }

    // Broadcast tool start event
    wsManager.broadcastAll({
      type: 'mcp-tool-start',
      serverId,
      serverName: server.name,
      toolName,
      arguments: args,
    });

    try {
      const mcpSettings = settingsManager.getMcp();
      const result = await client.callTool(toolName, args, mcpSettings.toolTimeout);

      // Broadcast tool complete event
      wsManager.broadcastAll({
        type: 'mcp-tool-complete',
        serverId,
        serverName: server.name,
        toolName,
        result,
        success: true,
      });

      console.log(`[MCP Manager] Tool invoked: ${server.name}.${toolName}`);

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      // Broadcast tool complete event with error
      wsManager.broadcastAll({
        type: 'mcp-tool-complete',
        serverId,
        serverName: server.name,
        toolName,
        error: errorMsg,
        success: false,
      });

      throw error;
    }
  }

  /**
   * Reconnect to a server (disconnect then connect)
   */
  async reconnect(serverId: string): Promise<MCPServerStatus> {
    await this.disconnect(serverId);
    return await this.connect(serverId);
  }

  /**
   * Disconnect from all servers (for shutdown)
   */
  async shutdown(): Promise<void> {
    console.log('[MCP Manager] Shutting down...');

    const disconnectPromises = Array.from(this.clients.keys()).map(serverId =>
      this.disconnect(serverId)
    );

    await Promise.allSettled(disconnectPromises);

    this.clients.clear();
    this.statuses.clear();
    this.isInitialized = false;

    console.log('[MCP Manager] Shutdown complete');
  }

  /**
   * Broadcast status change to all WebSocket clients
   */
  private broadcastStatusChange(serverId: string): void {
    const status = this.statuses.get(serverId);
    const server = mcpServerRegistry.get(serverId);

    if (status && server) {
      wsManager.broadcastAll({
        type: 'mcp-status-changed',
        serverId,
        serverName: server.name,
        status: status.status,
        tools: status.tools,
        error: status.error,
      });
    }
  }
}

// Singleton instance
export const mcpManager = new MCPManager();
