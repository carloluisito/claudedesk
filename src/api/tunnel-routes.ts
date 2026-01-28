import { Router, Request, Response } from 'express';
import { remoteTunnelManager } from '../core/remote-tunnel-manager.js';
import { settingsManager } from '../config/settings.js';
import { randomBytes } from 'crypto';
import QRCode from 'qrcode';

export const tunnelRouter = Router();

/**
 * Generate a secure random token for tunnel authentication
 */
function generateSecureToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * GET /api/tunnel/status
 * Get current tunnel status and configuration
 */
tunnelRouter.get('/status', async (_req: Request, res: Response) => {
  try {
    const settings = settingsManager.getTunnel();
    const tunnelState = remoteTunnelManager.getStatus();
    const cloudflaredInfo = await remoteTunnelManager.isCloudflaredInstalled();

    res.json({
      success: true,
      data: {
        enabled: settings.enabled,
        status: tunnelState.status,
        url: tunnelState.url,
        startedAt: tunnelState.startedAt,
        autoStart: settings.autoStart,
        cloudflaredInstalled: cloudflaredInfo.installed,
        cloudflaredVersion: cloudflaredInfo.version,
        tokenConfigured: !!settings.authToken,
      },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: errorMsg });
  }
});

/**
 * POST /api/tunnel/start
 * Start the tunnel
 */
tunnelRouter.post('/start', async (_req: Request, res: Response) => {
  try {
    const result = await remoteTunnelManager.start();

    if (!result.success) {
      res.status(500).json({ success: false, error: result.error });
      return;
    }

    res.json({
      success: true,
      data: {
        url: result.url!,
        startedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: errorMsg });
  }
});

/**
 * POST /api/tunnel/stop
 * Stop the tunnel
 */
tunnelRouter.post('/stop', async (_req: Request, res: Response) => {
  try {
    await remoteTunnelManager.stop();

    res.json({
      success: true,
      data: { stopped: true },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: errorMsg });
  }
});

/**
 * PUT /api/tunnel/settings
 * Update tunnel settings
 */
tunnelRouter.put('/settings', async (req: Request, res: Response) => {
  try {
    const { enabled, autoStart, rotateToken } = req.body;
    const currentSettings = settingsManager.getTunnel();

    // Prepare updates
    const updates: Partial<typeof currentSettings> = {};

    if (typeof enabled === 'boolean') {
      updates.enabled = enabled;

      // Generate secure token on first enable
      if (enabled && !currentSettings.authToken) {
        updates.authToken = generateSecureToken();
        updates.tokenCreatedAt = new Date().toISOString();
        console.log('[Tunnel] Generated new auth token for remote access');
      }
    }

    if (typeof autoStart === 'boolean') {
      updates.autoStart = autoStart;
    }

    // Handle token rotation
    if (rotateToken === true) {
      updates.authToken = generateSecureToken();
      updates.tokenCreatedAt = new Date().toISOString();
      console.log('[Tunnel] Rotated auth token');
    }

    // Save settings
    const newSettings = settingsManager.updateTunnel(updates);

    res.json({
      success: true,
      data: {
        enabled: newSettings.enabled,
        autoStart: newSettings.autoStart,
        tokenConfigured: !!newSettings.authToken,
        tokenCreatedAt: newSettings.tokenCreatedAt,
      },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: errorMsg });
  }
});

/**
 * GET /api/tunnel/token
 * Get the auth token (for display in UI)
 */
tunnelRouter.get('/token', (_req: Request, res: Response) => {
  try {
    const settings = settingsManager.getTunnel();

    res.json({
      success: true,
      data: {
        token: settings.authToken || null,
        createdAt: settings.tokenCreatedAt || null,
      },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: errorMsg });
  }
});

/**
 * GET /api/tunnel/qr
 * Generate QR code for mobile pairing
 * Returns a data URL with embedded token for one-time pairing
 */
tunnelRouter.get('/qr', async (_req: Request, res: Response) => {
  try {
    const settings = settingsManager.getTunnel();
    const tunnelState = remoteTunnelManager.getStatus();

    if (!settings.enabled || !settings.authToken) {
      res.status(400).json({
        success: false,
        error: 'Tunnel must be enabled with auth token configured',
      });
      return;
    }

    if (tunnelState.status !== 'running' || !tunnelState.url) {
      res.status(400).json({
        success: false,
        error: 'Tunnel must be running to generate QR code',
      });
      return;
    }

    // Create URL with embedded token for one-time login
    const pairingUrl = `${tunnelState.url}?token=${settings.authToken}`;

    // Generate QR code as data URL
    const qrDataUrl = await QRCode.toDataURL(pairingUrl, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    res.json({
      success: true,
      data: {
        qrDataUrl,
        url: tunnelState.url,
      },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: errorMsg });
  }
});
