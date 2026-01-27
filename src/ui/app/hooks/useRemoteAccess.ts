import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../lib/api';

export interface TunnelStatus {
  enabled: boolean;
  status: 'stopped' | 'starting' | 'running' | 'error';
  url: string | null;
  startedAt: string | null;
  autoStart: boolean;
  cloudflaredInstalled: boolean;
  cloudflaredVersion: string | null;
  tokenConfigured: boolean;
}

export interface TunnelToken {
  token: string | null;
  createdAt: string | null;
}

export interface QRCodeData {
  qrDataUrl: string;
  url: string;
}

export function useRemoteAccess() {
  const [status, setStatus] = useState<TunnelStatus | null>(null);
  const [token, setToken] = useState<TunnelToken | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch tunnel status
  const fetchStatus = useCallback(async () => {
    try {
      const data = await api<TunnelStatus>('GET', '/tunnel/status');
      setStatus(data);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch tunnel status';
      setError(message);
    }
  }, []);

  // Fetch auth token
  const fetchToken = useCallback(async () => {
    try {
      const data = await api<TunnelToken>('GET', '/tunnel/token');
      setToken(data);
    } catch (err) {
      console.error('Failed to fetch tunnel token:', err);
    }
  }, []);

  // Start tunnel
  const startTunnel = useCallback(async (): Promise<{ success: boolean; url?: string; error?: string }> => {
    try {
      const result = await api<{ url: string; startedAt: string }>('POST', '/tunnel/start');
      await fetchStatus();
      return { success: true, url: result.url };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start tunnel';
      await fetchStatus(); // Refresh status even on error
      return { success: false, error: message };
    }
  }, [fetchStatus]);

  // Stop tunnel
  const stopTunnel = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      await api('POST', '/tunnel/stop');
      await fetchStatus();
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to stop tunnel';
      await fetchStatus();
      return { success: false, error: message };
    }
  }, [fetchStatus]);

  // Update tunnel settings
  const updateSettings = useCallback(async (updates: {
    enabled?: boolean;
    autoStart?: boolean;
    rotateToken?: boolean;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      await api('PUT', '/tunnel/settings', updates);
      await fetchStatus();
      if (updates.rotateToken) {
        await fetchToken();
      }
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update settings';
      return { success: false, error: message };
    }
  }, [fetchStatus, fetchToken]);

  // Rotate auth token
  const rotateToken = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    return updateSettings({ rotateToken: true });
  }, [updateSettings]);

  // Generate QR code
  const generateQR = useCallback(async (): Promise<{ success: boolean; data?: QRCodeData; error?: string }> => {
    try {
      const data = await api<QRCodeData>('GET', '/tunnel/qr');
      return { success: true, data };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate QR code';
      return { success: false, error: message };
    }
  }, []);

  // Initial load
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      await Promise.all([fetchStatus(), fetchToken()]);
      setLoading(false);
    };

    loadInitialData();
  }, [fetchStatus, fetchToken]);

  // Poll status - always poll when tunnel is enabled to catch auto-start
  useEffect(() => {
    // Clear existing interval
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    // Only poll if enabled
    if (status?.enabled) {
      // Poll more frequently when running/starting, less when stopped
      const pollInterval = (status.status === 'running' || status.status === 'starting')
        ? 5000   // 5 seconds when active
        : 3000;  // 3 seconds when stopped (to catch auto-start)

      pollIntervalRef.current = setInterval(() => {
        fetchStatus();
      }, pollInterval);
    }

    // Cleanup on unmount
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [status?.enabled, status?.status, fetchStatus]);

  return {
    status,
    token,
    loading,
    error,
    startTunnel,
    stopTunnel,
    updateSettings,
    rotateToken,
    generateQR,
    refresh: fetchStatus,
  };
}
