import { Router, Request, Response } from 'express';
import { readdir, readFile, writeFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { agentUsageManager } from '../config/agent-usage.js';

export const agentRouter = Router();

// Agent type from markdown frontmatter
interface ClaudeAgent {
  id: string;
  name: string;
  description?: string;
  model: 'opus' | 'sonnet' | 'haiku' | 'inherit';
  color?: string;
  source: 'user' | 'builtin';
}

// Built-in Claude Code agents (these are part of Claude Code itself)
const BUILTIN_AGENTS: ClaudeAgent[] = [
  {
    id: 'bash',
    name: 'Bash',
    description: 'Execute shell commands and scripts',
    model: 'inherit',
    source: 'builtin',
  },
  {
    id: 'general-purpose',
    name: 'general-purpose',
    description: 'General purpose assistant for various tasks',
    model: 'inherit',
    source: 'builtin',
  },
  {
    id: 'statusline-setup',
    name: 'statusline-setup',
    description: 'Configure terminal status line',
    model: 'sonnet',
    source: 'builtin',
  },
  {
    id: 'explore',
    name: 'Explore',
    description: 'Explore and understand codebases',
    model: 'haiku',
    source: 'builtin',
  },
  {
    id: 'plan',
    name: 'Plan',
    description: 'Create implementation plans for features',
    model: 'inherit',
    source: 'builtin',
  },
  {
    id: 'claude-code-guide',
    name: 'claude-code-guide',
    description: 'Guide for using Claude Code effectively',
    model: 'haiku',
    source: 'builtin',
  },
];

/**
 * Parse YAML frontmatter from markdown content
 */
function parseFrontmatter(content: string): Record<string, string> {
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatterMatch) {
    return {};
  }

  const frontmatter: Record<string, string> = {};
  const lines = frontmatterMatch[1].split(/\r?\n/);

  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const key = line.substring(0, colonIndex).trim();
    let value = line.substring(colonIndex + 1).trim();

    // Remove surrounding quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    frontmatter[key] = value;
  }

  return frontmatter;
}

/**
 * Read user agents from ~/.claude/agents directory
 */
async function getUserAgents(): Promise<ClaudeAgent[]> {
  const home = homedir();
  const agentsDir = join(home, '.claude', 'agents');

  if (!existsSync(agentsDir)) {
    return [];
  }

  try {
    const files = await readdir(agentsDir);
    const mdFiles = files.filter((f) => f.endsWith('.md'));

    const agents: ClaudeAgent[] = [];

    for (const file of mdFiles) {
      try {
        const filePath = join(agentsDir, file);
        const content = await readFile(filePath, 'utf-8');
        const frontmatter = parseFrontmatter(content);

        // Extract agent ID from filename (without .md extension)
        const id = file.replace(/\.md$/, '');

        // Parse model, default to 'inherit' if not specified
        let model: ClaudeAgent['model'] = 'inherit';
        if (frontmatter.model) {
          const m = frontmatter.model.toLowerCase();
          if (m === 'opus' || m === 'sonnet' || m === 'haiku' || m === 'inherit') {
            model = m;
          }
        }

        // Handle description - may be a long escaped string, just take first sentence
        let description = frontmatter.description || '';
        if (description.startsWith('"')) {
          description = description.slice(1);
        }
        // Truncate at first sentence or 200 chars
        const firstSentence = description.split(/[.!?]/)[0];
        description = firstSentence.length > 200 ? firstSentence.substring(0, 200) + '...' : firstSentence;

        agents.push({
          id,
          name: frontmatter.name || id,
          description: description || undefined,
          model,
          color: frontmatter.color,
          source: 'user',
        });
      } catch (err) {
        console.error(`[AgentRoutes] Failed to parse agent file ${file}:`, err);
      }
    }

    return agents;
  } catch (err) {
    console.error('[AgentRoutes] Failed to read agents directory:', err);
    return [];
  }
}

// GET /api/agents - List all agents (user + builtin)
agentRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const userAgents = await getUserAgents();
    const allAgents = [...userAgents, ...BUILTIN_AGENTS];

    res.json({ success: true, data: allAgents });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[AgentRoutes] Error fetching agents:', error);
    res.status(500).json({ success: false, error: errorMsg });
  }
});

// GET /api/agents/user - List only user agents
agentRouter.get('/user', async (_req: Request, res: Response) => {
  try {
    const userAgents = await getUserAgents();
    res.json({ success: true, data: userAgents });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: errorMsg });
  }
});

// GET /api/agents/builtin - List only builtin agents
agentRouter.get('/builtin', (_req: Request, res: Response) => {
  res.json({ success: true, data: BUILTIN_AGENTS });
});

// GET /api/agents/recent - Get recently used agents
agentRouter.get('/recent', (_req: Request, res: Response) => {
  try {
    const recentAgents = agentUsageManager.getRecentAgents(3);
    res.json({ success: true, data: recentAgents });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: errorMsg });
  }
});

// GET /api/agents/:agentId - Get a specific agent
agentRouter.get('/:agentId', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;

    // Check builtin first
    const builtin = BUILTIN_AGENTS.find((a) => a.id === agentId);
    if (builtin) {
      res.json({ success: true, data: builtin });
      return;
    }

    // Check user agents
    const userAgents = await getUserAgents();
    const userAgent = userAgents.find((a) => a.id === agentId);
    if (userAgent) {
      res.json({ success: true, data: userAgent });
      return;
    }

    res.status(404).json({ success: false, error: 'Agent not found' });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: errorMsg });
  }
});

// POST /api/agents/detect - Auto-detect best agent for a prompt
agentRouter.post('/detect', async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ success: false, error: 'Prompt is required' });
      return;
    }

    // Simple keyword-based detection logic
    const lowerPrompt = prompt.toLowerCase();

    // Check for bash/shell commands
    if (
      lowerPrompt.includes('run ') ||
      lowerPrompt.includes('execute ') ||
      lowerPrompt.includes('shell ') ||
      lowerPrompt.includes('bash ') ||
      lowerPrompt.includes('command ')
    ) {
      const bashAgent = BUILTIN_AGENTS.find((a) => a.id === 'bash');
      if (bashAgent) {
        res.json({ success: true, data: { agentId: bashAgent.id, agentName: bashAgent.name, autoDetected: true } });
        return;
      }
    }

    // Check for exploration/understanding tasks
    if (
      lowerPrompt.includes('explore ') ||
      lowerPrompt.includes('understand ') ||
      lowerPrompt.includes('what is ') ||
      lowerPrompt.includes('how does ') ||
      lowerPrompt.includes('explain ')
    ) {
      const exploreAgent = BUILTIN_AGENTS.find((a) => a.id === 'explore');
      if (exploreAgent) {
        res.json({ success: true, data: { agentId: exploreAgent.id, agentName: exploreAgent.name, autoDetected: true } });
        return;
      }
    }

    // Check for planning tasks
    if (
      lowerPrompt.includes('plan ') ||
      lowerPrompt.includes('design ') ||
      lowerPrompt.includes('architect ') ||
      lowerPrompt.includes('strategy ')
    ) {
      const planAgent = BUILTIN_AGENTS.find((a) => a.id === 'plan');
      if (planAgent) {
        res.json({ success: true, data: { agentId: planAgent.id, agentName: planAgent.name, autoDetected: true } });
        return;
      }
    }

    // Default: no specific agent detected (use default Claude)
    res.json({ success: true, data: null });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[AgentRoutes] Error detecting agent:', error);
    res.status(500).json({ success: false, error: errorMsg });
  }
});

/**
 * Slugify a name into a valid filename ID
 */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Build markdown content from agent data
 */
function buildAgentMarkdown(data: {
  name: string;
  description?: string;
  model?: string;
  color?: string;
  systemPrompt?: string;
}): string {
  const frontmatterLines: string[] = [];
  frontmatterLines.push(`name: "${data.name}"`);
  if (data.description) frontmatterLines.push(`description: "${data.description}"`);
  if (data.model && data.model !== 'inherit') frontmatterLines.push(`model: ${data.model}`);
  if (data.color) frontmatterLines.push(`color: "${data.color}"`);

  let content = `---\n${frontmatterLines.join('\n')}\n---\n`;
  if (data.systemPrompt) {
    content += `\n${data.systemPrompt}\n`;
  }
  return content;
}

// GET /api/agents/:agentId/raw - Get full agent file content for editing
agentRouter.get('/:agentId/raw', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const home = homedir();
    const filePath = join(home, '.claude', 'agents', `${agentId}.md`);

    if (!existsSync(filePath)) {
      res.status(404).json({ success: false, error: 'Agent not found' });
      return;
    }

    const content = await readFile(filePath, 'utf-8');
    const frontmatter = parseFrontmatter(content);

    // Extract body (after frontmatter)
    const bodyMatch = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?([\s\S]*)$/);
    const systemPrompt = bodyMatch ? bodyMatch[1].trim() : '';

    let model: ClaudeAgent['model'] = 'inherit';
    if (frontmatter.model) {
      const m = frontmatter.model.toLowerCase();
      if (m === 'opus' || m === 'sonnet' || m === 'haiku' || m === 'inherit') {
        model = m;
      }
    }

    res.json({
      success: true,
      data: {
        id: agentId,
        name: frontmatter.name || agentId,
        description: frontmatter.description || '',
        model,
        color: frontmatter.color || '',
        systemPrompt,
        source: 'user' as const,
      },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: errorMsg });
  }
});

// POST /api/agents - Create a new custom agent
agentRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { name, description, model, color, systemPrompt } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ success: false, error: 'Name is required', field: 'name' });
      return;
    }

    const id = slugify(name);
    if (!id) {
      res.status(400).json({ success: false, error: 'Name must contain at least one alphanumeric character', field: 'name' });
      return;
    }

    // Check for collision with builtin agents
    if (BUILTIN_AGENTS.some((a) => a.id === id)) {
      res.status(409).json({ success: false, error: `"${id}" is reserved by a built-in agent. Choose a different name.`, field: 'name' });
      return;
    }

    const home = homedir();
    const agentsDir = join(home, '.claude', 'agents');
    const filePath = join(agentsDir, `${id}.md`);

    // Check for existing file
    if (existsSync(filePath)) {
      res.status(409).json({ success: false, error: `An agent with ID "${id}" already exists. Choose a different name.`, field: 'name' });
      return;
    }

    // Ensure directory exists
    if (!existsSync(agentsDir)) {
      await mkdir(agentsDir, { recursive: true });
    }

    const content = buildAgentMarkdown({ name: name.trim(), description, model, color, systemPrompt });
    await writeFile(filePath, content, 'utf-8');

    const validModel: ClaudeAgent['model'] = ['opus', 'sonnet', 'haiku', 'inherit'].includes(model) ? model : 'inherit';

    res.status(201).json({
      success: true,
      data: {
        id,
        name: name.trim(),
        description: description || undefined,
        model: validModel,
        color: color || undefined,
        source: 'user' as const,
      },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[AgentRoutes] Error creating agent:', error);
    res.status(500).json({ success: false, error: `Failed to create agent: ${errorMsg}` });
  }
});

// PUT /api/agents/:agentId - Update an existing custom agent
agentRouter.put('/:agentId', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const { name, description, model, color, systemPrompt } = req.body;

    // Prevent editing builtin agents
    if (BUILTIN_AGENTS.some((a) => a.id === agentId)) {
      res.status(403).json({ success: false, error: 'Cannot edit a built-in agent' });
      return;
    }

    const home = homedir();
    const filePath = join(home, '.claude', 'agents', `${agentId}.md`);

    if (!existsSync(filePath)) {
      res.status(404).json({ success: false, error: 'Agent not found' });
      return;
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ success: false, error: 'Name is required', field: 'name' });
      return;
    }

    const content = buildAgentMarkdown({ name: name.trim(), description, model, color, systemPrompt });
    await writeFile(filePath, content, 'utf-8');

    const validModel: ClaudeAgent['model'] = ['opus', 'sonnet', 'haiku', 'inherit'].includes(model) ? model : 'inherit';

    res.json({
      success: true,
      data: {
        id: agentId,
        name: name.trim(),
        description: description || undefined,
        model: validModel,
        color: color || undefined,
        source: 'user' as const,
      },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[AgentRoutes] Error updating agent:', error);
    res.status(500).json({ success: false, error: `Failed to update agent: ${errorMsg}` });
  }
});

// DELETE /api/agents/:agentId - Delete a custom agent
agentRouter.delete('/:agentId', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;

    // Prevent deleting builtin agents
    if (BUILTIN_AGENTS.some((a) => a.id === agentId)) {
      res.status(403).json({ success: false, error: 'Cannot delete a built-in agent' });
      return;
    }

    const home = homedir();
    const filePath = join(home, '.claude', 'agents', `${agentId}.md`);

    if (!existsSync(filePath)) {
      res.status(404).json({ success: false, error: 'Agent not found' });
      return;
    }

    await unlink(filePath);

    res.json({ success: true, data: { id: agentId, deleted: true } });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[AgentRoutes] Error deleting agent:', error);
    res.status(500).json({ success: false, error: `Failed to delete agent: ${errorMsg}` });
  }
});
