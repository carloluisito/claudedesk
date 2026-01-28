import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { randomUUID } from 'crypto';
import { MCPServerConfig, MCPServerConfigSchema } from '../types.js';

// Lazy path resolution - evaluated when needed, not at module load time
function getConfigPath(): string {
  return join(process.cwd(), 'config', 'mcp-servers.json');
}

interface MCPServersFile {
  servers: MCPServerConfig[];
}

/**
 * MCPServerRegistry manages the configuration of MCP servers.
 * It handles CRUD operations and persists to config/mcp-servers.json
 */
export class MCPServerRegistry {
  private servers: Map<string, MCPServerConfig> = new Map();

  constructor() {
    this.load();
  }

  private load(): void {
    const configPath = getConfigPath();

    if (!existsSync(configPath)) {
      this.createDefault();
      return;
    }

    try {
      const content = readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(content) as MCPServersFile;

      // Validate and load each server
      for (const serverData of parsed.servers) {
        try {
          const server = MCPServerConfigSchema.parse(serverData);
          this.servers.set(server.id, server);
        } catch (err) {
          console.warn(`[MCP Registry] Invalid server config for ${serverData.id}:`, err);
        }
      }

      console.log(`[MCP Registry] Loaded ${this.servers.size} server(s)`);
    } catch (error) {
      console.warn('[MCP Registry] Failed to load config, using defaults:', error);
      this.createDefault();
    }
  }

  private createDefault(): void {
    const configPath = getConfigPath();
    const dir = dirname(configPath);

    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    const defaultConfig: MCPServersFile = {
      servers: [],
    };

    writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
    console.log('[MCP Registry] Created default config');
  }

  private save(): void {
    const configPath = getConfigPath();
    const dir = dirname(configPath);

    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    const config: MCPServersFile = {
      servers: Array.from(this.servers.values()),
    };

    writeFileSync(configPath, JSON.stringify(config, null, 2));
  }

  /**
   * Get all MCP servers
   */
  getAll(): MCPServerConfig[] {
    return Array.from(this.servers.values());
  }

  /**
   * Get a server by ID
   */
  get(id: string): MCPServerConfig | undefined {
    return this.servers.get(id);
  }

  /**
   * Add a new server
   */
  add(config: Omit<MCPServerConfig, 'id' | 'createdAt'>): MCPServerConfig {
    const now = new Date().toISOString();
    const server: MCPServerConfig = {
      ...config,
      id: randomUUID(),
      createdAt: now,
    };

    // Validate
    const validated = MCPServerConfigSchema.parse(server);

    this.servers.set(validated.id, validated);
    this.save();

    console.log(`[MCP Registry] Added server: ${validated.name} (${validated.id})`);
    return validated;
  }

  /**
   * Update an existing server
   */
  update(id: string, updates: Partial<Omit<MCPServerConfig, 'id' | 'createdAt'>>): MCPServerConfig {
    const existing = this.servers.get(id);
    if (!existing) {
      throw new Error(`Server not found: ${id}`);
    }

    const updated: MCPServerConfig = {
      ...existing,
      ...updates,
      id, // Prevent ID change
      createdAt: existing.createdAt, // Prevent createdAt change
      updatedAt: new Date().toISOString(),
    };

    // Validate
    const validated = MCPServerConfigSchema.parse(updated);

    this.servers.set(id, validated);
    this.save();

    console.log(`[MCP Registry] Updated server: ${validated.name} (${id})`);
    return validated;
  }

  /**
   * Remove a server
   */
  remove(id: string): boolean {
    const deleted = this.servers.delete(id);
    if (deleted) {
      this.save();
      console.log(`[MCP Registry] Removed server: ${id}`);
    }
    return deleted;
  }

  /**
   * Get all enabled servers
   */
  getEnabled(): MCPServerConfig[] {
    return Array.from(this.servers.values()).filter(s => s.enabled);
  }

  /**
   * Get servers with autoConnect enabled
   */
  getAutoConnect(): MCPServerConfig[] {
    return Array.from(this.servers.values()).filter(s => s.enabled && s.autoConnect);
  }
}

// Lazy singleton - only created on first access
let _mcpServerRegistry: MCPServerRegistry | null = null;

function getMCPServerRegistryInstance(): MCPServerRegistry {
  if (!_mcpServerRegistry) {
    _mcpServerRegistry = new MCPServerRegistry();
  }
  return _mcpServerRegistry;
}

// Export a proxy that forwards all property/method access to the lazy instance
export const mcpServerRegistry = new Proxy({} as MCPServerRegistry, {
  get(_, prop) {
    const instance = getMCPServerRegistryInstance();
    const value = (instance as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === 'function' ? (value as Function).bind(instance) : value;
  }
});
