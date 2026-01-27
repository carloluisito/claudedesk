import { Router, Request, Response } from 'express';
import { appManager } from '../core/app-manager.js';
import { sharedDockerManager } from '../core/shared-docker-manager.js';

export const appRouter = Router();

/**
 * GET /api/apps
 * List all running applications
 */
appRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const apps = appManager.getApps();
    res.json({ success: true, data: apps });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[app-routes] Failed to list apps:', errorMsg);
    res.status(500).json({ success: false, error: errorMsg });
  }
});

/**
 * POST /api/apps/start
 * Start a new application
 * Body: { repoId, port?, command?, env?, tunnel?, docker? }
 */
appRouter.post('/start', async (req: Request, res: Response) => {
  try {
    const { repoId, port, command, env, tunnel, docker } = req.body;

    if (!repoId) {
      res.status(400).json({ success: false, error: 'repoId is required' });
      return;
    }

    const app = await appManager.startApp({
      repoId,
      port,
      command,
      env,
      tunnel,
      docker,
    });

    res.json({ success: true, data: app });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[app-routes] Failed to start app:', errorMsg);
    res.status(500).json({ success: false, error: errorMsg });
  }
});

/**
 * POST /api/apps/:id/stop
 * Stop a running application
 */
appRouter.post('/:id/stop', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await appManager.stopApp(id);

    res.json({ success: true, data: { message: 'App stopped' } });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[app-routes] Failed to stop app:', errorMsg);
    res.status(500).json({ success: false, error: errorMsg });
  }
});

/**
 * POST /api/apps/:id/restart
 * Restart a running application
 */
appRouter.post('/:id/restart', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const app = await appManager.restartApp(id);

    res.json({ success: true, data: app });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[app-routes] Failed to restart app:', errorMsg);
    res.status(500).json({ success: false, error: errorMsg });
  }
});

/**
 * GET /api/apps/:id/logs
 * Get logs for an application
 */
appRouter.get('/:id/logs', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const logs = appManager.getAppLogs(id);

    res.json({ success: true, data: { logs } });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[app-routes] Failed to get app logs:', errorMsg);
    res.status(500).json({ success: false, error: errorMsg });
  }
});

/**
 * GET /api/apps/:repoId/monorepo-info
 * Detect monorepo services for a repository
 */
appRouter.get('/:repoId/monorepo-info', async (req: Request, res: Response) => {
  try {
    const { repoId } = req.params;

    const info = await appManager.detectMonorepoServices(repoId);

    res.json({ success: true, data: info });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[app-routes] Failed to detect monorepo info:', errorMsg);
    res.status(500).json({ success: false, error: errorMsg });
  }
});

/**
 * GET /api/apps/:repoId/docker-info
 * Get Docker configuration info for a repository
 */
appRouter.get('/:repoId/docker-info', async (req: Request, res: Response) => {
  try {
    const { repoId } = req.params;

    const info = await appManager.getDockerInfo(repoId);

    res.json({ success: true, data: info });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[app-routes] Failed to get docker info:', errorMsg);
    res.status(500).json({ success: false, error: errorMsg });
  }
});

/**
 * GET /api/apps/docker/status
 * Get Docker availability status
 */
appRouter.get('/docker/status', async (_req: Request, res: Response) => {
  try {
    const available = await sharedDockerManager.isDockerAvailable();
    const message = available ? 'Docker is available' : 'Docker is not available or not running';

    res.json({
      success: true,
      data: {
        available,
        message,
      },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[app-routes] Failed to check docker status:', errorMsg);
    res.status(500).json({ success: false, error: errorMsg });
  }
});
