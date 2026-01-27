import { create } from 'zustand';
import { api } from '../lib/api';
import type { AppStatus, RunningApp, DockerStatus, DockerInfo, DetectedService } from '../types/run';

// Signal types extracted from logs
export interface RuntimeSignal {
  id: string;
  type: 'warning' | 'error' | 'info';
  message: string;
  timestamp: string;
}

export interface MonorepoInfo {
  isMonorepo: boolean;
  services: DetectedService[];
  primaryServiceId?: string;
}

interface RunStore {
  apps: RunningApp[];
  isLoading: boolean;
  error: string | null;
  dockerStatus: DockerStatus | null;

  // Actions
  loadApps: () => Promise<void>;
  startApp: (repoId: string, config?: { port?: number; command?: string; env?: Record<string, string>; docker?: { enabled: boolean; imageName?: string; memoryLimit?: string; cpuLimit?: number }; tunnel?: { enabled: boolean } }) => Promise<RunningApp>;
  stopApp: (appId: string) => Promise<void>;
  restartApp: (appId: string) => Promise<void>;
  getAppLogs: (appId: string) => Promise<string>;
  getAppById: (appId: string) => RunningApp | undefined;
  getAppByRepoId: (repoId: string) => RunningApp | undefined;

  // Docker & Monorepo info
  loadDockerStatus: () => Promise<void>;
  loadMonorepoInfo: (repoId: string) => Promise<MonorepoInfo>;
  loadDockerInfo: (repoId: string) => Promise<DockerInfo>;

  // Signal extraction
  extractSignals: (logs: string) => RuntimeSignal[];
}

// Helper to extract signals from log content
function extractSignalsFromLogs(logs: string): RuntimeSignal[] {
  const signals: RuntimeSignal[] = [];
  const lines = logs.split('\n');

  lines.forEach((line, index) => {
    const lowerLine = line.toLowerCase();

    // Check for errors
    if (lowerLine.includes('[error]') || lowerLine.includes('error:') || lowerLine.includes('failed')) {
      signals.push({
        id: `signal-error-${index}`,
        type: 'error',
        message: line.replace(/^\[error\]\s*/i, '').replace(/^error:\s*/i, '').trim(),
        timestamp: new Date().toISOString(),
      });
    }
    // Check for warnings
    else if (lowerLine.includes('[warn]') || lowerLine.includes('warning:') || lowerLine.includes('deprecated')) {
      signals.push({
        id: `signal-warn-${index}`,
        type: 'warning',
        message: line.replace(/^\[warn\]\s*/i, '').replace(/^warning:\s*/i, '').trim(),
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Deduplicate similar messages and limit to most recent
  const uniqueSignals = signals.reduce((acc, signal) => {
    const exists = acc.find(s => s.message === signal.message);
    if (!exists) {
      acc.push(signal);
    }
    return acc;
  }, [] as RuntimeSignal[]);

  return uniqueSignals.slice(-10); // Keep last 10 signals
}

export const useRunStore = create<RunStore>((set, get) => ({
  apps: [],
  isLoading: false,
  error: null,
  dockerStatus: null,

  loadApps: async () => {
    set({ isLoading: true, error: null });
    try {
      const apps = await api<RunningApp[]>('GET', '/apps');
      set({ apps, isLoading: false });
    } catch (error) {
      console.error('[runStore] Failed to load apps:', error);
      set({ error: 'Failed to load apps', isLoading: false });
    }
  },

  startApp: async (repoId, config) => {
    set({ isLoading: true, error: null });
    try {
      const app = await api<RunningApp>('POST', '/apps/start', {
        repoId,
        ...config,
      });
      set((state) => ({
        apps: [...state.apps.filter((a) => a.repoId !== repoId), app],
        isLoading: false,
      }));
      return app;
    } catch (error: any) {
      console.error('[runStore] Failed to start app:', error);
      set({ error: error.message || 'Failed to start app', isLoading: false });
      throw error;
    }
  },

  stopApp: async (appId) => {
    set({ isLoading: true, error: null });
    try {
      await api('POST', `/apps/${appId}/stop`);
      set((state) => ({
        apps: state.apps.map((a) =>
          a.id === appId ? { ...a, status: 'STOPPED' as AppStatus } : a
        ),
        isLoading: false,
      }));
    } catch (error: any) {
      console.error('[runStore] Failed to stop app:', error);
      set({ error: error.message || 'Failed to stop app', isLoading: false });
      throw error;
    }
  },

  restartApp: async (appId) => {
    set({ isLoading: true, error: null });
    try {
      const app = await api<RunningApp>('POST', `/apps/${appId}/restart`);
      set((state) => ({
        apps: state.apps.map((a) => (a.id === appId ? app : a)),
        isLoading: false,
      }));
    } catch (error: any) {
      console.error('[runStore] Failed to restart app:', error);
      set({ error: error.message || 'Failed to restart app', isLoading: false });
      throw error;
    }
  },

  getAppLogs: async (appId) => {
    try {
      const result = await api<{ logs: string }>('GET', `/apps/${appId}/logs`);
      return result.logs;
    } catch (error) {
      console.error('[runStore] Failed to get app logs:', error);
      return '';
    }
  },

  getAppById: (appId) => {
    return get().apps.find((a) => a.id === appId);
  },

  getAppByRepoId: (repoId) => {
    return get().apps.find(
      (a) => a.repoId === repoId && (a.status === 'RUNNING' || a.status === 'STARTING')
    );
  },

  loadDockerStatus: async () => {
    try {
      const status = await api<DockerStatus>('GET', '/apps/docker/status');
      set({ dockerStatus: status });
    } catch (error) {
      console.error('[runStore] Failed to load docker status:', error);
      set({ dockerStatus: { available: false, message: 'Failed to check Docker status' } });
    }
  },

  loadMonorepoInfo: async (repoId) => {
    try {
      const info = await api<MonorepoInfo>('GET', `/apps/${repoId}/monorepo-info`);
      return info;
    } catch (error) {
      console.error('[runStore] Failed to load monorepo info:', error);
      return { isMonorepo: false, services: [] };
    }
  },

  loadDockerInfo: async (repoId) => {
    try {
      const info = await api<DockerInfo>('GET', `/apps/${repoId}/docker-info`);
      return info;
    } catch (error) {
      console.error('[runStore] Failed to load docker info:', error);
      return { hasDockerfile: false, hasDockerCompose: false, needsRebuild: null };
    }
  },

  extractSignals: (logs) => {
    return extractSignalsFromLogs(logs);
  },
}));
