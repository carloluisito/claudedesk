import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { MCPServerConfig, MCPToolDefinition, MCPToolResultContent } from '../types.js';

/**
 * MCPClient manages the connection to a single MCP server
 * and provides methods for tool discovery and invocation.
 */
export class MCPClient {
  private client: Client | null = null;
  private transport: StdioClientTransport | SSEClientTransport | null = null;
  private config: MCPServerConfig;
  private isConnected = false;

  constructor(config: MCPServerConfig) {
    this.config = config;
  }

  /**
   * Connect to the MCP server
   */
  async connect(timeout: number = 30000): Promise<void> {
    if (this.isConnected) {
      throw new Error('Already connected');
    }

    try {
      // Create appropriate transport based on config
      if (this.config.transport === 'stdio') {
        if (!this.config.command) {
          throw new Error('Command is required for stdio transport');
        }

        // Build environment with config overrides
        const env: Record<string, string> = {};
        if (process.env) {
          for (const [key, value] of Object.entries(process.env)) {
            if (value !== undefined) {
              env[key] = value;
            }
          }
        }
        if (this.config.env) {
          Object.assign(env, this.config.env);
        }

        this.transport = new StdioClientTransport({
          command: this.config.command,
          args: this.config.args || [],
          env: Object.keys(env).length > 0 ? env : undefined,
          stderr: 'pipe', // Capture stderr for error handling
        });
      } else if (this.config.transport === 'sse') {
        if (!this.config.url) {
          throw new Error('URL is required for SSE transport');
        }

        this.transport = new SSEClientTransport(new URL(this.config.url));
      } else {
        throw new Error(`Unsupported transport: ${this.config.transport}`);
      }

      // Create client
      this.client = new Client({
        name: 'claudedesk',
        version: '1.0.0',
      });

      // Connect with timeout
      const connectPromise = this.client.connect(this.transport);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Connection timeout')), timeout)
      );

      await Promise.race([connectPromise, timeoutPromise]);

      this.isConnected = true;
      console.log(`[MCP Client] Connected to ${this.config.name} (${this.config.id})`);
    } catch (error) {
      // Clean up on error
      await this.cleanup();
      throw error;
    }
  }

  /**
   * Disconnect from the MCP server
   */
  async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    await this.cleanup();
    console.log(`[MCP Client] Disconnected from ${this.config.name} (${this.config.id})`);
  }

  /**
   * Clean up resources
   */
  private async cleanup(): Promise<void> {
    this.isConnected = false;

    if (this.client) {
      try {
        await this.client.close();
      } catch (err) {
        console.error('[MCP Client] Error closing client:', err);
      }
      this.client = null;
    }

    if (this.transport) {
      try {
        await this.transport.close();
      } catch (err) {
        console.error('[MCP Client] Error closing transport:', err);
      }
      this.transport = null;
    }
  }

  /**
   * List available tools from the server
   */
  async listTools(): Promise<MCPToolDefinition[]> {
    if (!this.isConnected || !this.client) {
      throw new Error('Not connected');
    }

    try {
      const response = await this.client.listTools();

      // Map MCP SDK tool format to our format
      return response.tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema as Record<string, unknown>,
      }));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to list tools: ${errorMsg}`);
    }
  }

  /**
   * Call a tool on the server
   */
  async callTool(
    name: string,
    args: Record<string, unknown>,
    timeout: number = 60000
  ): Promise<MCPToolResultContent[]> {
    if (!this.isConnected || !this.client) {
      throw new Error('Not connected');
    }

    try {
      // Call tool with timeout
      const callPromise = this.client.callTool({
        name,
        arguments: args,
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Tool invocation timeout')), timeout)
      );

      const response = await Promise.race([callPromise, timeoutPromise]);

      // Map MCP SDK result format to our format
      const contentArray = response.content as Array<{
        type: string;
        text?: string;
        data?: string;
        mimeType?: string;
        resource?: { uri?: string; mimeType?: string; text?: string };
      }>;

      return contentArray.map((content): MCPToolResultContent => {
        if (content.type === 'text') {
          return {
            type: 'text',
            text: content.text,
          };
        } else if (content.type === 'image') {
          return {
            type: 'image',
            data: content.data,
            mimeType: content.mimeType,
          };
        } else if (content.type === 'resource') {
          return {
            type: 'resource',
            uri: content.resource?.uri,
            mimeType: content.resource?.mimeType,
            text: content.resource?.text,
          };
        }
        return { type: 'text', text: String(content) };
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Tool invocation failed: ${errorMsg}`);
    }
  }

  /**
   * Check if client is connected
   */
  getIsConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Get server configuration
   */
  getConfig(): MCPServerConfig {
    return { ...this.config };
  }
}
