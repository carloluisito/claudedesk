import { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  ExternalLink,
  RefreshCw,
  Play,
  Square,
  Loader2,
  Cloud,
  Copy,
  Check,
  Trash2,
  ArrowDown,
} from 'lucide-react';
import { useRunStore } from '../../store/runStore';

interface PreviewPanelProps {
  repoId: string | undefined;
  onClose: () => void;
  onStartApp: () => void;
}

export function PreviewPanel({
  repoId,
  onClose,
  onStartApp,
}: PreviewPanelProps) {
  const { apps, loadApps, stopApp, restartApp, getAppLogs } = useRunStore();
  const [isRestarting, setIsRestarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [copied, setCopied] = useState(false);
  const [logs, setLogs] = useState('');
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [logOffset, setLogOffset] = useState(0); // Track where to start showing logs from
  const logsContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);
  const fullLogsRef = useRef(''); // Store full logs for offset calculation

  // Find running app for this repo
  const app = useMemo(() => {
    if (!repoId) return null;
    return apps.find(
      (a) =>
        a.repoId === repoId &&
        (a.status === 'RUNNING' || a.status === 'STARTING')
    );
  }, [apps, repoId]);

  // Count log lines
  const lineCount = useMemo(() => {
    if (!logs) return 0;
    return logs.split('\n').length;
  }, [logs]);

  // Poll for app status updates
  useEffect(() => {
    loadApps();
    const interval = setInterval(loadApps, 5000);
    return () => clearInterval(interval);
  }, [loadApps]);

  // Load logs with polling
  const loadLogs = async () => {
    if (!app) return;
    try {
      const newLogs = await getAppLogs(app.id);
      fullLogsRef.current = newLogs;
      // Only show logs after the offset
      setLogs(newLogs.slice(logOffset));
    } catch (err) {
      console.error('Failed to load logs:', err);
    }
  };

  useEffect(() => {
    if (!app) {
      setLogs('');
      setLogOffset(0);
      fullLogsRef.current = '';
      return;
    }
    setIsLoadingLogs(true);
    loadLogs().finally(() => setIsLoadingLogs(false));
    const interval = setInterval(loadLogs, 3000);
    return () => clearInterval(interval);
  }, [app?.id, logOffset]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (shouldAutoScroll.current && logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Track if user scrolled up (disable auto-scroll)
  const handleLogsScroll = () => {
    if (!logsContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = logsContainerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    // If user is within 50px of bottom, enable auto-scroll
    shouldAutoScroll.current = distanceFromBottom < 50;
    // Show scroll button if more than 100px from bottom
    setShowScrollButton(distanceFromBottom > 100);
  };

  const handleScrollToBottom = () => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
      shouldAutoScroll.current = true;
      setShowScrollButton(false);
    }
  };

  const handleStop = async () => {
    if (!app) return;
    setIsStopping(true);
    try {
      await stopApp(app.id);
    } catch (error) {
      console.error('Failed to stop app:', error);
    } finally {
      setIsStopping(false);
    }
  };

  const handleRestart = async () => {
    if (!app) return;
    setIsRestarting(true);
    try {
      await restartApp(app.id);
      setLogs(''); // Clear logs on restart
    } catch (error) {
      console.error('Failed to restart app:', error);
    } finally {
      setIsRestarting(false);
    }
  };

  const handleClearLogs = () => {
    // Set offset to current position - only show new logs from now on
    setLogOffset(fullLogsRef.current.length);
    setLogs('');
    shouldAutoScroll.current = true;
    setShowScrollButton(false);
  };

  const handleShowAllLogs = () => {
    // Reset offset to show all logs
    setLogOffset(0);
  };

  const handleRefreshLogs = async () => {
    setIsLoadingLogs(true);
    await loadLogs();
    setIsLoadingLogs(false);
    shouldAutoScroll.current = true;
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  };

  const handleCopyUrl = async () => {
    const url = app?.tunnelUrl || app?.localUrl;
    if (url) {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenExternal = () => {
    const url = app?.tunnelUrl || app?.localUrl;
    if (url) {
      window.open(url, '_blank');
    }
  };

  // Get the URL to display
  const displayUrl = app?.tunnelUrl || app?.localUrl || '';
  const port = app?.detectedPort || app?.runConfig?.port;

  return (
    <div className="w-80 lg:w-96 h-full flex flex-col border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-3 py-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
            Logs
          </span>
          {app?.status === 'RUNNING' && (
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          )}
          {app?.status === 'STARTING' && (
            <span className="flex items-center gap-1 rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs text-yellow-500">
              <Loader2 className="h-3 w-3 animate-spin" />
              Starting
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {app ? (
        <>
          {/* URL Bar */}
          <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 px-3 py-2">
            <div className="flex items-center gap-1.5 min-w-0 flex-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 px-2 py-1.5">
              {app.tunnelUrl && (
                <Cloud className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />
              )}
              <span className="text-xs text-zinc-600 dark:text-zinc-400 truncate">
                {displayUrl}
              </span>
            </div>
            <button
              onClick={handleCopyUrl}
              className="rounded p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"
              title="Copy URL"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
            <button
              onClick={handleOpenExternal}
              className="rounded p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"
              title="Open in new tab"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Logs Area */}
          <div
            ref={logsContainerRef}
            onScroll={handleLogsScroll}
            className="flex-1 overflow-auto bg-zinc-950 p-3 font-mono text-xs relative min-h-0"
          >
            {app.status === 'STARTING' && !logs ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-zinc-500">
                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                <span className="text-xs">Starting app...</span>
              </div>
            ) : isLoadingLogs && !logs ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
              </div>
            ) : logs ? (
              <pre className="whitespace-pre-wrap break-words text-zinc-300 leading-relaxed">
                {logs}
              </pre>
            ) : logOffset > 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-zinc-500">
                <Check className="h-6 w-6 text-emerald-500" />
                <span className="text-xs">Logs cleared</span>
                <span className="text-[10px] text-zinc-600">New logs will appear here</span>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-zinc-500">
                <span>No logs yet</span>
              </div>
            )}

            {/* Scroll to bottom button */}
            {showScrollButton && (
              <button
                onClick={handleScrollToBottom}
                className="sticky bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-blue-600 px-3 py-1.5 text-xs text-white shadow-lg hover:bg-blue-500 transition-all"
              >
                <ArrowDown className="h-3 w-3" />
                Latest
              </button>
            )}
          </div>

          {/* Status Bar with Controls */}
          <div className="flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800 px-3 py-1.5 text-xs text-zinc-500">
            <span className="flex items-center gap-1.5">
              <span>Port {port}</span>
              <span className="text-zinc-400">·</span>
              <span>{app.containerId ? 'Docker' : 'Local'}</span>
              {lineCount > 0 && (
                <>
                  <span className="text-zinc-400">·</span>
                  <span>{lineCount} lines</span>
                </>
              )}
            </span>
            <div className="flex items-center gap-1">
              {logOffset > 0 && (
                <button
                  onClick={handleShowAllLogs}
                  className="rounded px-1.5 py-0.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-blue-500 text-[10px]"
                  title="Show all logs"
                >
                  Show all
                </button>
              )}
              <button
                onClick={handleClearLogs}
                className="rounded p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"
                title="Clear old logs"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={handleRefreshLogs}
                disabled={isLoadingLogs}
                className="rounded p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 disabled:opacity-50"
                title="Refresh logs"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoadingLogs ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={handleRestart}
                disabled={isRestarting}
                className="rounded p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 disabled:opacity-50"
                title="Restart app"
              >
                {isRestarting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                onClick={handleStop}
                disabled={isStopping}
                className="rounded p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 disabled:opacity-50"
                title="Stop app"
              >
                {isStopping ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Square className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>
        </>
      ) : (
        /* No App Running State */
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
            <Play className="h-6 w-6 text-zinc-400" />
          </div>
          <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1">
            No app running
          </h3>
          <p className="text-xs text-zinc-500 mb-4">
            {repoId
              ? `Start an app for ${repoId} to see logs`
              : 'Select a session to see logs'}
          </p>
          {repoId && (
            <button
              onClick={onStartApp}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-500"
            >
              <Play className="h-4 w-4" />
              Start App
            </button>
          )}
        </div>
      )}
    </div>
  );
}
