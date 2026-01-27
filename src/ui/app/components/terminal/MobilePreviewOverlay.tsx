import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ExternalLink,
  Square,
  RefreshCw,
  Loader2,
  Cloud,
  Trash2,
  Copy,
  Check,
  ArrowDown,
  Play,
} from 'lucide-react';
import { useRunStore } from '../../store/runStore';

interface MobilePreviewOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  repoId: string | undefined;
}

export function MobilePreviewOverlay({
  isOpen,
  onClose,
  repoId,
}: MobilePreviewOverlayProps) {
  const { apps, stopApp, restartApp, getAppLogs } = useRunStore();
  const [isStopping, setIsStopping] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [logs, setLogs] = useState('');
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [logOffset, setLogOffset] = useState(0);
  const logsContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);
  const fullLogsRef = useRef('');

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

  // Load logs with polling
  const loadLogs = async () => {
    if (!app) return;
    try {
      const newLogs = await getAppLogs(app.id);
      fullLogsRef.current = newLogs;
      setLogs(newLogs.slice(logOffset));
    } catch (err) {
      console.error('Failed to load logs:', err);
    }
  };

  useEffect(() => {
    if (!isOpen || !app) {
      setLogs('');
      setLogOffset(0);
      fullLogsRef.current = '';
      return;
    }
    setIsLoadingLogs(true);
    loadLogs().finally(() => setIsLoadingLogs(false));
    const interval = setInterval(loadLogs, 3000);
    return () => clearInterval(interval);
  }, [app?.id, isOpen, logOffset]);

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
    shouldAutoScroll.current = distanceFromBottom < 50;
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
      onClose();
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
      setLogs('');
    } catch (error) {
      console.error('Failed to restart app:', error);
    } finally {
      setIsRestarting(false);
    }
  };

  const handleClearLogs = () => {
    setLogOffset(fullLogsRef.current.length);
    setLogs('');
    shouldAutoScroll.current = true;
    setShowScrollButton(false);
  };

  const handleShowAllLogs = () => {
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

  const displayUrl = app?.tunnelUrl || app?.localUrl || '';
  const port = app?.detectedPort || app?.runConfig?.port;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 bg-white dark:bg-zinc-950 flex flex-col"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-3 py-2 safe-top">
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800"
              >
                <ArrowLeft className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
              </button>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Logs
                </span>
                {app && (
                  <span className="text-xs text-zinc-500 truncate max-w-[150px]">
                    {app.repoId}
                  </span>
                )}
              </div>
            </div>

            {app && (
              <div className="flex items-center gap-1">
                {app.status === 'RUNNING' && (
                  <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live
                  </span>
                )}
                {app.status === 'STARTING' && (
                  <span className="flex items-center gap-1 rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs text-yellow-500">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Starting
                  </span>
                )}
              </div>
            )}
          </div>

          {/* URL Bar */}
          {app && (
            <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 px-3 py-2">
              <div className="flex items-center gap-1.5 min-w-0 flex-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 px-3 py-2">
                {app.tunnelUrl && (
                  <Cloud className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />
                )}
                <span className="text-xs text-zinc-600 dark:text-zinc-400 truncate">
                  {displayUrl}
                </span>
              </div>
              <button
                onClick={handleCopyUrl}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800"
                title="Copy URL"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Copy className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                )}
              </button>
              <button
                onClick={handleOpenExternal}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800"
                title="Open in browser"
              >
                <ExternalLink className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
              </button>
            </div>
          )}

          {/* Logs Area */}
          <div
            ref={logsContainerRef}
            onScroll={handleLogsScroll}
            className="flex-1 overflow-auto bg-zinc-950 p-3 font-mono text-xs relative min-h-0"
          >
            {!app ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-zinc-500 p-4 text-center">
                <Loader2 className="h-8 w-8 text-zinc-600" />
                <p className="text-sm">App is no longer running</p>
                <button
                  onClick={onClose}
                  className="rounded-lg bg-zinc-800 px-4 py-2 text-sm text-zinc-300"
                >
                  Go Back
                </button>
              </div>
            ) : app.status === 'STARTING' && !logs ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-zinc-500">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <span className="text-sm">Starting app...</span>
              </div>
            ) : isLoadingLogs && !logs ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
              </div>
            ) : logs ? (
              <pre className="whitespace-pre-wrap break-words text-zinc-300 leading-relaxed">
                {logs}
              </pre>
            ) : logOffset > 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-zinc-500">
                <Check className="h-8 w-8 text-emerald-500" />
                <span className="text-sm">Logs cleared</span>
                <span className="text-xs text-zinc-600">New logs will appear here</span>
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
                className="sticky bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-blue-600 px-4 py-2 text-sm text-white shadow-lg hover:bg-blue-500 transition-all"
              >
                <ArrowDown className="h-4 w-4" />
                Scroll to Latest
              </button>
            )}
          </div>

          {/* Status Bar */}
          {app && (
            <div className="border-t border-zinc-800 px-3 py-2 text-xs text-zinc-500 bg-zinc-900">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span>Port {port}</span>
                  <span className="text-zinc-600">·</span>
                  <span>{app.containerId ? 'Docker' : 'Local'}</span>
                  {lineCount > 0 && (
                    <>
                      <span className="text-zinc-600">·</span>
                      <span>{lineCount} lines</span>
                    </>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  {logOffset > 0 && (
                    <button
                      onClick={handleShowAllLogs}
                      className="rounded px-2 py-1 hover:bg-zinc-800 text-blue-500 text-xs"
                      title="Show all logs"
                    >
                      Show all
                    </button>
                  )}
                  <button
                    onClick={handleClearLogs}
                    className="rounded p-1.5 hover:bg-zinc-800 text-zinc-500"
                    title="Clear old logs"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleRefreshLogs}
                    disabled={isLoadingLogs}
                    className="rounded p-1.5 hover:bg-zinc-800 text-zinc-500 disabled:opacity-50"
                    title="Refresh logs"
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoadingLogs ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Floating Action Buttons */}
          {app && app.status === 'RUNNING' && (
            <div className="absolute bottom-20 left-0 right-0 flex justify-center gap-3 safe-bottom">
              <button
                onClick={handleOpenExternal}
                className="flex items-center gap-2 rounded-full bg-zinc-900 dark:bg-zinc-100 px-4 py-2.5 text-sm text-white dark:text-zinc-900 shadow-lg"
              >
                <ExternalLink className="h-4 w-4" />
                Open
              </button>
              <button
                onClick={handleRestart}
                disabled={isRestarting}
                className="flex items-center gap-2 rounded-full bg-blue-500 px-4 py-2.5 text-sm text-white shadow-lg disabled:opacity-50"
              >
                {isRestarting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Restart
              </button>
              <button
                onClick={handleStop}
                disabled={isStopping}
                className="flex items-center gap-2 rounded-full bg-red-500 px-4 py-2.5 text-sm text-white shadow-lg disabled:opacity-50"
              >
                {isStopping ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                Stop
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
