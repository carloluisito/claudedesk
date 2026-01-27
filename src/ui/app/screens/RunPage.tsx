import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Terminal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { AppHeader, HeaderButton } from '../components/ui/AppHeader';
import { BackgroundTexture } from '../components/ui/BackgroundTexture';
import {
  RuntimeStatusCard,
  ExposedPortsCard,
  SignalsCard,
  RuntimeLogsCard,
  ClaudeHintCard,
  RunConfigurationCard,
  ActiveConfigCard,
} from '../components/run';
import { useRunStore, type RuntimeSignal } from '../store/runStore';
import type { AppStatus } from '../types/run';

// Format uptime from startedAt timestamp
function formatUptime(startedAt: string): string {
  const start = new Date(startedAt);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

// Toast component
function Toast({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="fixed bottom-6 right-6 z-[60] rounded-2xl bg-white/10 px-4 py-3 text-sm text-white ring-1 ring-white/15 backdrop-blur"
    >
      {message}
    </motion.div>
  );
}

export default function RunPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const repoId = searchParams.get('repoId') || undefined;
  const sessionId = searchParams.get('sessionId') || undefined;

  // Run store
  const {
    apps,
    isLoading,
    loadApps,
    stopApp,
    restartApp,
    getAppLogs,
    getAppByRepoId,
    extractSignals,
  } = useRunStore();

  // Local state
  const [logs, setLogs] = useState('');
  const [logsLoading, setLogsLoading] = useState(false);
  const [signals, setSignals] = useState<RuntimeSignal[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [uptime, setUptime] = useState<string>('');
  const [logOffset, setLogOffset] = useState(0);
  const fullLogsRef = useMemo(() => ({ current: '' }), []);

  // Find the running app for this repo
  const app = useMemo(() => {
    if (!repoId) return null;
    return getAppByRepoId(repoId);
  }, [repoId, apps, getAppByRepoId]);

  // Calculate uptime
  useEffect(() => {
    if (!app?.startedAt || app.status !== 'RUNNING') {
      setUptime('');
      return;
    }

    const updateUptime = () => {
      setUptime(formatUptime(app.startedAt));
    };

    updateUptime();
    const interval = setInterval(updateUptime, 1000);
    return () => clearInterval(interval);
  }, [app?.startedAt, app?.status]);

  // Load apps on mount
  useEffect(() => {
    loadApps();
    const interval = setInterval(loadApps, 5000);
    return () => clearInterval(interval);
  }, [loadApps]);

  // Load logs when app is available
  const loadLogs = useCallback(async () => {
    if (!app) return;
    try {
      const newLogs = await getAppLogs(app.id);
      fullLogsRef.current = newLogs;
      // Apply offset for cleared logs
      const visibleLogs = newLogs.slice(logOffset);
      setLogs(visibleLogs);
      // Extract signals from full logs
      setSignals(extractSignals(newLogs));
    } catch (err) {
      console.error('Failed to load logs:', err);
    }
  }, [app?.id, logOffset, getAppLogs, extractSignals]);

  useEffect(() => {
    if (!app) {
      setLogs('');
      setSignals([]);
      setLogOffset(0);
      fullLogsRef.current = '';
      return;
    }
    setLogsLoading(true);
    loadLogs().finally(() => setLogsLoading(false));
    const interval = setInterval(loadLogs, 3000);
    return () => clearInterval(interval);
  }, [app?.id, loadLogs]);

  // Toast helper
  const fireToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  };

  // Handlers
  const handleAppStarted = () => {
    loadApps();
    fireToast('App starting...');
  };

  const handleStop = async () => {
    if (!app) return;
    try {
      await stopApp(app.id);
      fireToast('App stopped');
    } catch (error: any) {
      fireToast(error.message || 'Failed to stop app');
    }
  };

  const handleRestart = async () => {
    if (!app) return;
    try {
      await restartApp(app.id);
      setLogs('');
      setLogOffset(0);
      fireToast('App restarting...');
    } catch (error: any) {
      fireToast(error.message || 'Failed to restart app');
    }
  };

  const handleClearLogs = () => {
    setLogOffset(fullLogsRef.current.length);
    setLogs('');
  };

  const handleRefreshLogs = async () => {
    setLogsLoading(true);
    await loadLogs();
    setLogsLoading(false);
  };

  // Derive app status
  const appStatus: AppStatus = app?.status || 'STOPPED';

  // Derive exposed ports
  const exposedPorts = useMemo(() => {
    if (!app) return [];
    const port = app.detectedPort || app.runConfig?.port;
    if (!port) return [];
    return [
      {
        port,
        localUrl: app.localUrl,
        tunnelUrl: app.tunnelUrl,
      },
    ];
  }, [app]);

  // Back button handler
  const handleBack = () => {
    if (sessionId) {
      navigate(`/terminal?sessionId=${sessionId}`);
    } else {
      navigate('/terminal');
    }
  };

  return (
    <div className="min-h-screen bg-[#05070c] text-white">
      {/* Background texture */}
      <BackgroundTexture />

      <div className="relative flex-1 flex flex-col overflow-hidden min-h-0">
        {/* Header */}
        <AppHeader
          subtitle="Execute applications and inspect runtime behavior"
          backTo="/terminal"
          actions={
            <HeaderButton
              onClick={handleBack}
              icon={<Terminal className="h-4 w-4" />}
              label="Back to Session"
            />
          }
        />

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-y-auto min-h-0 w-full px-6 pt-6 pb-16">
          {!repoId ? (
            // No repo selected
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10 mb-4">
                <Terminal className="h-8 w-8 text-white/40" />
              </div>
              <p className="text-lg font-medium text-white/70">No repository selected</p>
              <p className="text-sm text-white/50 mt-1">
                Return to a session to run an app
              </p>
              <button
                onClick={handleBack}
                className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-white/5 px-4 py-2 text-sm text-white ring-1 ring-white/10 hover:bg-white/10"
              >
                <Terminal className="h-4 w-4" />
                Back to Terminal
              </button>
            </div>
          ) : (
            // Main grid layout
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Left column - Controls (1/3) */}
              <div className="space-y-4">
                {/* Show configuration card when stopped/failed, runtime cards when running */}
                {!app || app.status === 'STOPPED' || app.status === 'FAILED' ? (
                  <RunConfigurationCard
                    repoId={repoId}
                    onStarted={handleAppStarted}
                  />
                ) : (
                  <>
                    <RuntimeStatusCard
                      status={appStatus}
                      uptime={uptime}
                      isLoading={isLoading}
                      onStart={() => {}} // No-op since we use RunConfigurationCard for starting
                      onStop={handleStop}
                      onRestart={handleRestart}
                    />

                    <ActiveConfigCard
                      port={app.runConfig?.port}
                      command={app.runConfig?.command}
                      envCount={app.runConfig?.env ? Object.keys(app.runConfig.env).length : 0}
                      dockerEnabled={app.runConfig?.docker?.enabled || false}
                      tunnelEnabled={app.runConfig?.tunnel?.enabled || false}
                    />

                    <ExposedPortsCard ports={exposedPorts} />

                    <SignalsCard signals={signals} />
                  </>
                )}
              </div>

              {/* Right column - Logs (2/3) */}
              <div className="lg:col-span-2 flex flex-col gap-4">
                <RuntimeLogsCard
                  logs={logs}
                  isLoading={logsLoading}
                  isConnected={true}
                  onClear={handleClearLogs}
                  onRefresh={handleRefreshLogs}
                />

                <ClaudeHintCard />
              </div>
            </div>
          )}

          {/* Footer tip */}
          <div className="mt-10 text-center text-xs text-white/45">
            Runtime feedback closes the loop between execution and AI reasoning.
          </div>
        </div>

        {/* Toast */}
        <AnimatePresence>{toast && <Toast message={toast} />}</AnimatePresence>
      </div>
    </div>
  );
}
