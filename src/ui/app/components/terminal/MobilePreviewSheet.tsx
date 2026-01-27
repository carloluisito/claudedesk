import { useMemo } from 'react';
import {
  Play,
  ExternalLink,
  Cloud,
  Server,
  Box,
  Square,
  Loader2,
  FileText,
} from 'lucide-react';
import { useRunStore } from '../../store/runStore';

interface MobilePreviewSheetProps {
  repoId: string | undefined;
  onStartApp: () => void;
  onOpenLogs: () => void;
}

export function MobilePreviewSheet({
  repoId,
  onStartApp,
  onOpenLogs,
}: MobilePreviewSheetProps) {
  const { apps, stopApp } = useRunStore();

  // Find running app for this repo
  const app = useMemo(() => {
    if (!repoId) return null;
    return apps.find(
      (a) =>
        a.repoId === repoId &&
        (a.status === 'RUNNING' || a.status === 'STARTING')
    );
  }, [apps, repoId]);

  const handleStop = async () => {
    if (!app) return;
    try {
      await stopApp(app.id);
    } catch (error) {
      console.error('Failed to stop app:', error);
    }
  };

  const handleOpenExternal = () => {
    const url = app?.tunnelUrl || app?.localUrl;
    if (url) {
      window.open(url, '_blank');
    }
  };

  const displayUrl = app?.tunnelUrl || app?.localUrl || '';
  const port = app?.detectedPort || app?.runConfig?.port;

  if (!app) {
    return (
      <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
        <div className="w-14 h-14 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
          <Play className="h-7 w-7 text-zinc-400" />
        </div>
        <h3 className="text-base font-medium text-zinc-900 dark:text-zinc-100 mb-1">
          No app running
        </h3>
        <p className="text-sm text-zinc-500 mb-4">
          {repoId
            ? `Start an app to view logs`
            : 'Select a session first'}
        </p>
        {repoId && (
          <button
            onClick={onStartApp}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white"
          >
            <Play className="h-4 w-4" />
            Start App
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 px-4">
      {/* App Status Card */}
      <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {app.containerId ? (
              <Box className="h-4 w-4 text-blue-500" />
            ) : (
              <Server className="h-4 w-4 text-zinc-500" />
            )}
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {app.repoId}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {app.status === 'RUNNING' ? (
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-600 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Running
              </span>
            ) : (
              <span className="flex items-center gap-1 rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs text-yellow-600 dark:text-yellow-400">
                <Loader2 className="h-3 w-3 animate-spin" />
                Starting
              </span>
            )}
          </div>
        </div>

        {/* URL Display */}
        <div className="flex items-center gap-2 rounded-lg bg-white/50 dark:bg-zinc-800/50 px-3 py-2 mb-3">
          {app.tunnelUrl && (
            <Cloud className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />
          )}
          <span className="text-xs text-zinc-600 dark:text-zinc-400 truncate flex-1">
            {displayUrl}
          </span>
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            :{port}
          </span>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleOpenExternal}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300"
          >
            <ExternalLink className="h-4 w-4" />
            Open App
          </button>
          <button
            onClick={handleStop}
            className="flex items-center justify-center gap-2 rounded-lg bg-red-100 dark:bg-red-900/30 px-3 py-2 text-sm text-red-600 dark:text-red-400"
          >
            <Square className="h-4 w-4" />
            Stop
          </button>
        </div>
      </div>

      {/* View Logs Button */}
      <button
        onClick={onOpenLogs}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-medium text-white"
      >
        <FileText className="h-4 w-4" />
        View Logs
      </button>
    </div>
  );
}
