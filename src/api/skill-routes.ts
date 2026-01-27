import { Router, Request, Response } from 'express';
import { skillRegistry } from '../config/skills.js';
import { skillExecutor } from '../core/skill-executor.js';
import { repoRegistry } from '../config/repos.js';
import { join } from 'path';

export const skillRouter = Router();

// GET /api/skills - List all global skills
skillRouter.get('/', (_req: Request, res: Response) => {
  const skills = skillRegistry.getGlobal();
  res.json({ success: true, data: skills });
});

// POST /api/skills/reload - Reload all global skills
skillRouter.post('/reload', (_req: Request, res: Response) => {
  skillRegistry.reload();
  const skills = skillRegistry.getGlobal();
  res.json({ success: true, data: { message: 'Skills reloaded', count: skills.length } });
});

// GET /api/skills/repo/:repoId - List skills available for a repo (global + repo)
skillRouter.get('/repo/:repoId', (req: Request, res: Response) => {
  const { repoId } = req.params;

  const repo = repoRegistry.get(repoId);
  if (!repo) {
    res.status(404).json({ success: false, error: 'Repo not found' });
    return;
  }

  // Ensure repo skills are loaded
  skillRegistry.loadRepoSkills(repoId, repo.path);

  const skills = skillRegistry.getAll(repoId);
  res.json({ success: true, data: skills });
});

// POST /api/skills/repo/:repoId/reload - Reload skills for a specific repo
skillRouter.post('/repo/:repoId/reload', (req: Request, res: Response) => {
  const { repoId } = req.params;

  const repo = repoRegistry.get(repoId);
  if (!repo) {
    res.status(404).json({ success: false, error: 'Repo not found' });
    return;
  }

  skillRegistry.reloadRepo(repoId, repo.path);
  const skills = skillRegistry.getRepoSkills(repoId);
  res.json({ success: true, data: { message: `Skills reloaded for ${repoId}`, count: skills.length } });
});

// GET /api/skills/:skillId - Get a specific skill
skillRouter.get('/:skillId', (req: Request, res: Response) => {
  const { skillId } = req.params;
  const { repoId } = req.query;

  // If repoId provided, load repo skills first
  if (repoId && typeof repoId === 'string') {
    const repo = repoRegistry.get(repoId);
    if (repo) {
      skillRegistry.loadRepoSkills(repoId, repo.path);
    }
  }

  const skill = skillRegistry.get(skillId, repoId as string | undefined);

  if (!skill) {
    res.status(404).json({ success: false, error: 'Skill not found' });
    return;
  }

  res.json({ success: true, data: skill });
});

// POST /api/skills/:skillId/execute - Execute a skill
skillRouter.post('/:skillId/execute', async (req: Request, res: Response) => {
  try {
    const { skillId } = req.params;
    const { repoId, inputs } = req.body;

    if (!repoId) {
      res.status(400).json({ success: false, error: 'repoId is required' });
      return;
    }

    const repo = repoRegistry.get(repoId);
    if (!repo) {
      res.status(404).json({ success: false, error: 'Repo not found' });
      return;
    }

    // Determine working directory and artifacts directory
    const workingDir = repo.path;
    const artifactsDir = join(repo.path, '.claudedesk-artifacts');

    console.log(`[SkillRoutes] Executing skill ${skillId} for repo ${repoId}`);

    const result = await skillExecutor.execute(
      { skillId, repoId, inputs },
      repo,
      workingDir,
      artifactsDir
    );

    res.json({ success: true, data: result });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[SkillRoutes] Skill execution error:`, error);
    res.status(500).json({ success: false, error: errorMsg });
  }
});
