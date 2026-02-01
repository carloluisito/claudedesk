import { Router, Request, Response } from 'express';
import { ideaManager } from '../core/idea-manager.js';
import type { PromoteOptions } from '../types.js';

export const ideaRouter = Router();

// POST /ideas — Create a new idea (ephemeral by default)
ideaRouter.post('/', (req: Request, res: Response) => {
  try {
    const idea = ideaManager.createIdea();
    res.json({ success: true, data: idea });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: msg });
  }
});

// GET /ideas — List all saved ideas
ideaRouter.get('/', (req: Request, res: Response) => {
  try {
    const ideas = ideaManager.getAllSavedIdeas();
    res.json({ success: true, data: ideas });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: msg });
  }
});

// GET /ideas/:id — Get idea with messages
ideaRouter.get('/:id', (req: Request, res: Response) => {
  try {
    const idea = ideaManager.getIdea(req.params.id);
    if (!idea) {
      return res.status(404).json({ success: false, error: 'Idea not found' });
    }
    res.json({ success: true, data: idea });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: msg });
  }
});

// PUT /ideas/:id — Update title, tags, status
ideaRouter.put('/:id', (req: Request, res: Response) => {
  try {
    const { title, tags, status } = req.body;
    const idea = ideaManager.updateIdea(req.params.id, { title, tags, status });
    res.json({ success: true, data: idea });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('not found')) {
      return res.status(404).json({ success: false, error: msg });
    }
    res.status(500).json({ success: false, error: msg });
  }
});

// DELETE /ideas/:id — Delete idea + cleanup temp dir
ideaRouter.delete('/:id', (req: Request, res: Response) => {
  try {
    ideaManager.deleteIdea(req.params.id);
    res.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('not found')) {
      return res.status(404).json({ success: false, error: msg });
    }
    res.status(500).json({ success: false, error: msg });
  }
});

// POST /ideas/:id/save — Pin ephemeral → saved
ideaRouter.post('/:id/save', (req: Request, res: Response) => {
  try {
    const idea = ideaManager.saveIdea(req.params.id);
    res.json({ success: true, data: idea });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('not found')) {
      return res.status(404).json({ success: false, error: msg });
    }
    res.status(500).json({ success: false, error: msg });
  }
});

// POST /ideas/:id/cancel — Cancel running Claude process
ideaRouter.post('/:id/cancel', (req: Request, res: Response) => {
  try {
    ideaManager.cancelClaude(req.params.id);
    res.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: msg });
  }
});

// POST /ideas/:id/promote — Graduate to project
ideaRouter.post('/:id/promote', async (req: Request, res: Response) => {
  try {
    const options: PromoteOptions = req.body;
    if (!options.repoName || !options.directory) {
      return res.status(400).json({ success: false, error: 'repoName and directory are required' });
    }
    const result = await ideaManager.promoteIdea(req.params.id, options);
    res.json({ success: true, data: result });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('not found')) {
      return res.status(404).json({ success: false, error: msg });
    }
    res.status(500).json({ success: false, error: msg });
  }
});

// POST /ideas/:id/attach — Link to existing repo
ideaRouter.post('/:id/attach', (req: Request, res: Response) => {
  try {
    const { repoId } = req.body;
    if (!repoId) {
      return res.status(400).json({ success: false, error: 'repoId is required' });
    }
    const idea = ideaManager.attachRepo(req.params.id, repoId);
    res.json({ success: true, data: idea });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('not found')) {
      return res.status(404).json({ success: false, error: msg });
    }
    res.status(500).json({ success: false, error: msg });
  }
});

// POST /ideas/:id/detach — Unlink from repo
ideaRouter.post('/:id/detach', (req: Request, res: Response) => {
  try {
    const { repoId } = req.body;
    if (!repoId) {
      return res.status(400).json({ success: false, error: 'repoId is required' });
    }
    const idea = ideaManager.detachRepo(req.params.id, repoId);
    res.json({ success: true, data: idea });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('not found')) {
      return res.status(404).json({ success: false, error: msg });
    }
    res.status(500).json({ success: false, error: msg });
  }
});
