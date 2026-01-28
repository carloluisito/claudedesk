/**
 * MCP (Model Context Protocol) Frontend Types
 */

export type MCPTransport = 'stdio' | 'sse';

export type MCPConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

export interface MCPServerConfig {
  id: string;
  name: string;
  transport: MCPTransport;
  command?: string;
  args?: string[];
  cwd?: string;
  url?: string;
  env?: Record<string, string>;
  enabled: boolean;
  autoConnect: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface MCPServerStatus {
  id: string;
  status: MCPConnectionStatus;
  error?: string;
  tools?: MCPToolDefinition[];
  connectedAt?: string;
  lastError?: string;
  lastErrorAt?: string;
}

export interface MCPToolDefinition {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
}

export interface MCPToolResultContent {
  type: 'text' | 'image' | 'resource';
  text?: string;
  data?: string;
  mimeType?: string;
  uri?: string;
}

export interface MCPSettings {
  globalEnabled: boolean;
  toolApprovalMode: 'auto' | 'ask';
  connectionTimeout: number;
  toolTimeout: number;
}

export interface ToolInfo {
  serverId: string;
  serverName: string;
  tool: MCPToolDefinition;
}

export interface MCPToolInvocation {
  serverId: string;
  serverName: string;
  toolName: string;
  arguments: Record<string, unknown>;
  result?: MCPToolResultContent[];
  error?: string;
  timestamp: string;
}
