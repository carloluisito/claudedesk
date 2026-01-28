import { Router, Request, Response } from 'express';
import { mcpServerRegistry } from '../config/mcp-servers.js';
import { settingsManager } from '../config/settings.js';
import { mcpManager } from '../core/mcp-manager.js';
import { MCPServerConfig, PredefinedServerTemplate } from '../types.js';
import { MCP_SERVER_CATALOG, getTemplateById } from '../config/mcp-catalog.js';
import { checkPrerequisites } from '../utils/prerequisite-checker.js';

export const mcpRouter = Router();

// ============================================
// Server Configuration Endpoints
// ============================================

// Get all MCP servers
mcpRouter.get('/servers', (_req: Request, res: Response) => {
  try {
    const servers = mcpServerRegistry.getAll();
    res.json({ success: true, data: servers });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: errorMsg });
  }
});

// Get a specific server
mcpRouter.get('/servers/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const server = mcpServerRegistry.get(id);

    if (!server) {
      res.status(404).json({ success: false, error: `Server not found: ${id}` });
      return;
    }

    res.json({ success: true, data: server });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: errorMsg });
  }
});

// Create a new MCP server
mcpRouter.post('/servers', (req: Request, res: Response) => {
  try {
    const serverData = req.body as Omit<MCPServerConfig, 'id' | 'createdAt'>;

    // Validate transport-specific fields
    if (serverData.transport === 'stdio') {
      if (!serverData.command) {
        res.status(400).json({ success: false, error: 'Command is required for stdio transport' });
        return;
      }
    } else if (serverData.transport === 'sse') {
      if (!serverData.url) {
        res.status(400).json({ success: false, error: 'URL is required for SSE transport' });
        return;
      }
    }

    const server = mcpServerRegistry.add(serverData);
    res.status(201).json({ success: true, data: server });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    res.status(400).json({ success: false, error: errorMsg });
  }
});

// Update an existing MCP server
mcpRouter.put('/servers/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body as Partial<Omit<MCPServerConfig, 'id' | 'createdAt'>>;

    // Validate transport-specific fields if transport is being updated
    if (updates.transport === 'stdio' && !updates.command) {
      const existing = mcpServerRegistry.get(id);
      if (!existing?.command) {
        res.status(400).json({ success: false, error: 'Command is required for stdio transport' });
        return;
      }
    } else if (updates.transport === 'sse' && !updates.url) {
      const existing = mcpServerRegistry.get(id);
      if (!existing?.url) {
        res.status(400).json({ success: false, error: 'URL is required for SSE transport' });
        return;
      }
    }

    const server = mcpServerRegistry.update(id, updates);
    res.json({ success: true, data: server });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const statusCode = errorMsg.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ success: false, error: errorMsg });
  }
});

// Delete an MCP server
mcpRouter.delete('/servers/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Disconnect server if connected before deleting
    await mcpManager.disconnect(id);

    const deleted = mcpServerRegistry.remove(id);

    if (!deleted) {
      res.status(404).json({ success: false, error: `Server not found: ${id}` });
      return;
    }

    res.json({ success: true, data: { deleted: true } });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: errorMsg });
  }
});

// ============================================
// Connection Management Endpoints
// ============================================

// Connect to a server
mcpRouter.post('/servers/:id/connect', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const server = mcpServerRegistry.get(id);

    if (!server) {
      res.status(404).json({ success: false, error: `Server not found: ${id}` });
      return;
    }

    // Check if MCP is globally enabled
    const mcpSettings = settingsManager.getMcp();
    if (!mcpSettings.globalEnabled) {
      res.status(400).json({ success: false, error: 'MCP is globally disabled in settings' });
      return;
    }

    const status = await mcpManager.connect(id);
    res.json({ success: true, data: status });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: errorMsg });
  }
});

// Disconnect from a server
mcpRouter.post('/servers/:id/disconnect', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await mcpManager.disconnect(id);
    res.json({ success: true, data: { disconnected: true } });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: errorMsg });
  }
});

// Get server status
mcpRouter.get('/servers/:id/status', (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const status = mcpManager.getStatus(id);
    res.json({ success: true, data: status });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: errorMsg });
  }
});

// ============================================
// Tool Discovery & Invocation Endpoints
// ============================================

// Get all tools from connected servers
mcpRouter.get('/tools', (_req: Request, res: Response) => {
  try {
    const tools = mcpManager.getAllTools();
    res.json({ success: true, data: tools });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: errorMsg });
  }
});

// Invoke a tool
mcpRouter.post('/tools/:serverId/:toolName/invoke', async (req: Request, res: Response) => {
  try {
    const { serverId, toolName } = req.params;
    const { arguments: toolArgs } = req.body;

    // Check if MCP is globally enabled
    const mcpSettings = settingsManager.getMcp();
    if (!mcpSettings.globalEnabled) {
      res.status(400).json({ success: false, error: 'MCP is globally disabled in settings' });
      return;
    }

    const result = await mcpManager.invokeTool(serverId, toolName, toolArgs);
    res.json({ success: true, data: result });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: errorMsg });
  }
});

// ============================================
// Settings Endpoints
// ============================================

// Get MCP settings
mcpRouter.get('/settings', (_req: Request, res: Response) => {
  try {
    const settings = settingsManager.getMcp();
    res.json({ success: true, data: settings });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: errorMsg });
  }
});

// Update MCP settings
mcpRouter.put('/settings', (req: Request, res: Response) => {
  try {
    const updates = req.body;
    const settings = settingsManager.updateMcp(updates);
    res.json({ success: true, data: settings });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    res.status(400).json({ success: false, error: errorMsg });
  }
});

// ============================================
// Catalog Endpoints
// ============================================

// Get full catalog
mcpRouter.get('/catalog', (_req: Request, res: Response) => {
  try {
    res.json({ success: true, data: MCP_SERVER_CATALOG });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: errorMsg });
  }
});

// Get single template
mcpRouter.get('/catalog/:templateId', (req: Request, res: Response) => {
  try {
    const { templateId } = req.params;
    const template = getTemplateById(templateId);

    if (!template) {
      res.status(404).json({ success: false, error: `Template not found: ${templateId}` });
      return;
    }

    res.json({ success: true, data: template });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: errorMsg });
  }
});

// Check prerequisites for a template
mcpRouter.post('/catalog/:templateId/check-prerequisites', async (req: Request, res: Response) => {
  try {
    const { templateId } = req.params;
    const template = getTemplateById(templateId);

    if (!template) {
      res.status(404).json({ success: false, error: `Template not found: ${templateId}` });
      return;
    }

    const results = await checkPrerequisites(template.prerequisites);
    res.json({ success: true, data: results });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: errorMsg });
  }
});

// Create server from template
mcpRouter.post('/servers/from-template', (req: Request, res: Response) => {
  try {
    const { templateId, name, config } = req.body as {
      templateId: string;
      name: string;
      config: Record<string, string>;
    };

    const template = getTemplateById(templateId);
    if (!template) {
      res.status(404).json({ success: false, error: `Template not found: ${templateId}` });
      return;
    }

    // Validate required config fields
    for (const field of template.configFields) {
      if (field.required && !config[field.key]) {
        res.status(400).json({ success: false, error: `Missing required field: ${field.name}` });
        return;
      }
    }

    // Build env object from config
    const env: Record<string, string> = {};
    for (const field of template.configFields) {
      if (config[field.key]) {
        env[field.key] = config[field.key];
      }
    }

    // Create server config
    const serverConfig: Omit<MCPServerConfig, 'id' | 'createdAt'> = {
      name,
      transport: template.transport,
      command: template.command,
      args: template.args,
      env: Object.keys(env).length > 0 ? env : undefined,
      enabled: true,
      autoConnect: true,
    };

    const server = mcpServerRegistry.add(serverConfig);
    res.status(201).json({ success: true, data: server });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    res.status(400).json({ success: false, error: errorMsg });
  }
});
