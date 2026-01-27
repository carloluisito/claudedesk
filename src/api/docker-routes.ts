import { Router, Request, Response } from 'express';
import net from 'net';
import { sharedDockerManager } from '../core/shared-docker-manager.js';
import { settingsManager } from '../config/settings.js';

export const dockerRouter = Router();

// Get Docker availability
dockerRouter.get('/availability', async (_req: Request, res: Response) => {
  try {
    const dockerAvailable = await sharedDockerManager.isDockerAvailable();
    const composeAvailable = await sharedDockerManager.isComposeAvailable();

    res.json({
      success: true,
      data: {
        docker: dockerAvailable,
        compose: composeAvailable,
        available: dockerAvailable && composeAvailable,
      },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: errorMsg });
  }
});

// Get Docker environment status
dockerRouter.get('/status', async (_req: Request, res: Response) => {
  try {
    const status = await sharedDockerManager.getStatus();
    res.json({ success: true, data: status });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: errorMsg });
  }
});

// Start Docker environment
dockerRouter.post('/start', async (_req: Request, res: Response) => {
  try {
    const status = await sharedDockerManager.start();
    res.json({ success: true, data: status });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: errorMsg });
  }
});

// Stop Docker environment
dockerRouter.post('/stop', async (_req: Request, res: Response) => {
  try {
    const status = await sharedDockerManager.stop();
    res.json({ success: true, data: status });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: errorMsg });
  }
});

// Restart Docker environment
dockerRouter.post('/restart', async (_req: Request, res: Response) => {
  try {
    const status = await sharedDockerManager.restart();
    res.json({ success: true, data: status });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: errorMsg });
  }
});

// Get logs for a specific service
dockerRouter.get('/logs/:service', async (req: Request, res: Response) => {
  try {
    const { service } = req.params;
    const { tail } = req.query;

    const logs = await sharedDockerManager.getServiceLogs(
      service,
      tail ? parseInt(tail as string) : 100
    );

    res.json({ success: true, data: { service, logs } });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: errorMsg });
  }
});

// Get connection info for all services
dockerRouter.get('/connections', async (_req: Request, res: Response) => {
  try {
    const connections = sharedDockerManager.getConnectionInfo();
    res.json({ success: true, data: connections });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: errorMsg });
  }
});

// Get Docker settings
dockerRouter.get('/settings', (_req: Request, res: Response) => {
  try {
    const settings = settingsManager.getDocker();
    res.json({ success: true, data: settings });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: errorMsg });
  }
});

// Update Docker settings
dockerRouter.put('/settings', (req: Request, res: Response) => {
  try {
    const updates = req.body;
    const settings = settingsManager.updateDocker(updates);
    res.json({ success: true, data: settings });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    res.status(400).json({ success: false, error: errorMsg });
  }
});

// ============================================
// Port Conflict Detection
// ============================================

/**
 * Helper to check if a port is in use
 */
function checkPortInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        resolve(true);
      } else {
        resolve(false);
      }
    });
    server.once('listening', () => {
      server.close();
      resolve(false);
    });
    server.listen(port, '127.0.0.1');
  });
}

/**
 * GET /check-port
 * Checks if a port is in use (for port conflict detection)
 */
dockerRouter.get('/check-port', async (req: Request, res: Response) => {
  try {
    const port = parseInt(req.query.port as string, 10);

    if (isNaN(port) || port < 1 || port > 65535) {
      return res.status(400).json({
        success: false,
        error: 'Valid port number (1-65535) is required',
      });
    }

    const inUse = await checkPortInUse(port);

    res.json({
      success: true,
      data: {
        port,
        inUse,
      },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: errorMsg });
  }
});
