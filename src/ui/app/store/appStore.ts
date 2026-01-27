import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { RepoConfig, Workspace } from '../types';
import { api } from '../lib/api';
import { requestCache, CACHE_KEYS } from '../lib/request-cache';

interface AppState {
  // Auth
  token: string | null;
  isLoading: boolean;
  error: string | null;

  // Data
  repos: RepoConfig[];
  workspaces: Workspace[];

  // Actions
  setToken: (token: string | null) => void;
  loadData: (options?: { forceRefresh?: boolean }) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      token: null,
      isLoading: false,
      error: null,
      repos: [],
      workspaces: [],

      // Actions
      setToken: (token) => set({ token }),

      loadData: async (options?: { forceRefresh?: boolean }) => {
        const { token, isLoading } = get();
        if (!token) return;

        // Guard against duplicate simultaneous calls
        if (isLoading && !options?.forceRefresh) {
          return;
        }

        set({ isLoading: true, error: null });

        // Use cached data to avoid duplicate API calls
        // Default stale time is 30 seconds
        try {
          const data = await requestCache.fetch(
            CACHE_KEYS.APP_DATA,
            async () => {
              const [repos, workspaces] = await Promise.all([
                api<RepoConfig[]>('GET', '/repos'),
                api<Workspace[]>('GET', '/workspaces').catch(() => []),
              ]);

              return { repos, workspaces };
            },
            { staleTime: 30000, forceRefresh: options?.forceRefresh }
          );

          set({ ...data, isLoading: false });
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Failed to load data',
            isLoading: false,
          });
        }
      },

      logout: () => {
        // Clear persisted state from localStorage explicitly
        try {
          localStorage.removeItem('claudedesk-app');
        } catch {
          // Ignore storage errors
        }
        set({
          token: null,
          repos: [],
          workspaces: [],
          error: null,
        });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'claudedesk-app',
      partialize: (state) => ({ token: state.token }),
    }
  )
);
