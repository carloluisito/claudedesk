import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { GlassCard } from '../../ui/GlassCard';
import { cn } from '../../../lib/cn';
import { ToolActivity } from '../../../store/terminalStore';

export interface ActivityStatusWidgetProps {
  toolActivities: ToolActivity[];
  isRunning: boolean;
  currentActivity?: string;
  onNavigate: () => void;
}

type WidgetState = 'idle' | 'running' | 'complete' | 'error';

export function ActivityStatusWidget({
  toolActivities,
  isRunning,
  currentActivity,
  onNavigate,
}: ActivityStatusWidgetProps) {
  // Track if we've shown the error shake animation
  const [hasShownErrorShake, setHasShownErrorShake] = useState(false);
  const prevErrorCountRef = useRef(0);

  // Compute counts
  const runningCount = useMemo(
    () => toolActivities.filter((a) => a.status === 'running').length,
    [toolActivities]
  );
  const completeCount = useMemo(
    () => toolActivities.filter((a) => a.status === 'complete').length,
    [toolActivities]
  );
  const errorCount = useMemo(
    () => toolActivities.filter((a) => a.status === 'error').length,
    [toolActivities]
  );
  const totalCount = toolActivities.length;
  const doneCount = completeCount + errorCount;
  const progressPercent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  // Determine widget state
  const widgetState: WidgetState = useMemo(() => {
    if (totalCount === 0) return 'idle';
    if (errorCount > 0 && !isRunning) return 'error';
    if (isRunning || runningCount > 0) return 'running';
    return 'complete';
  }, [totalCount, errorCount, isRunning, runningCount]);

  // Calculate elapsed time
  const [elapsedTime, setElapsedTime] = useState<string | null>(null);

  useEffect(() => {
    if (!isRunning || toolActivities.length === 0) {
      setElapsedTime(null);
      return;
    }

    const firstActivity = toolActivities[0];
    if (!firstActivity?.timestamp) {
      setElapsedTime(null);
      return;
    }

    const updateElapsed = () => {
      const start = new Date(firstActivity.timestamp).getTime();
      const now = Date.now();
      const seconds = Math.floor((now - start) / 1000);
      if (seconds < 60) {
        setElapsedTime(`${seconds}s`);
      } else {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        setElapsedTime(`${minutes}m ${remainingSeconds}s`);
      }
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [isRunning, toolActivities]);

  // Calculate total elapsed time for complete state
  const totalElapsedTime = useMemo(() => {
    if (toolActivities.length === 0) return null;
    const firstActivity = toolActivities[0];
    const lastActivity = toolActivities[toolActivities.length - 1];
    if (!firstActivity?.timestamp) return null;

    const start = new Date(firstActivity.timestamp).getTime();
    const end = lastActivity?.completedAt
      ? new Date(lastActivity.completedAt).getTime()
      : Date.now();
    const seconds = Math.floor((end - start) / 1000);
    return seconds;
  }, [toolActivities]);

  // Trigger error shake on first error
  const [shouldShake, setShouldShake] = useState(false);

  useEffect(() => {
    if (errorCount > prevErrorCountRef.current && !hasShownErrorShake) {
      setShouldShake(true);
      setHasShownErrorShake(true);
      const timeout = setTimeout(() => setShouldShake(false), 500);
      return () => clearTimeout(timeout);
    }
    prevErrorCountRef.current = errorCount;
  }, [errorCount, hasShownErrorShake]);

  // Reset error shake tracking when activities clear
  useEffect(() => {
    if (toolActivities.length === 0) {
      setHasShownErrorShake(false);
      prevErrorCountRef.current = 0;
    }
  }, [toolActivities.length]);

  // Handle click
  const handleClick = useCallback(() => {
    if (widgetState !== 'idle') {
      onNavigate();
    }
  }, [widgetState, onNavigate]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === ' ') && widgetState !== 'idle') {
        e.preventDefault();
        onNavigate();
      }
    },
    [widgetState, onNavigate]
  );

  // Status badge styling
  const statusBadgeClasses = useMemo(() => {
    switch (widgetState) {
      case 'idle':
        return 'bg-white/5 text-white/40';
      case 'running':
        return 'bg-emerald-500/20 text-emerald-400';
      case 'complete':
        return 'bg-emerald-500/10 text-emerald-400';
      case 'error':
        return 'bg-red-500/20 text-red-400';
    }
  }, [widgetState]);

  const statusLabel = useMemo(() => {
    switch (widgetState) {
      case 'idle':
        return 'Idle';
      case 'running':
        return 'Running';
      case 'complete':
        return 'Done';
      case 'error':
        return 'Error';
    }
  }, [widgetState]);

  const isClickable = widgetState !== 'idle';

  return (
    <motion.div
      animate={shouldShake ? { x: [-4, 4, -4, 4, 0] } : {}}
      transition={{ duration: 0.4, ease: 'easeInOut' }}
      className={cn(
        'transition-all duration-200',
        isClickable && 'cursor-pointer focus:ring-2 focus:ring-white/20 focus:outline-none rounded-2xl',
        isClickable && 'active:scale-[0.98]'
      )}
    >
      <div
        role="region"
        aria-label="Activity status summary"
        aria-live="polite"
        tabIndex={isClickable ? 0 : -1}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className="outline-none"
      >
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Activity className="h-4 w-4" />
              Activity
            </div>
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                statusBadgeClasses
              )}
            >
              {statusLabel}
            </span>
          </div>

          {/* Content based on state */}
          <AnimatePresence mode="wait">
            {widgetState === 'idle' && (
              <motion.div
                key="idle"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="text-sm text-white/40"
              >
                No activity yet
              </motion.div>
            )}

            {widgetState === 'running' && (
              <motion.div
                key="running"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="space-y-2"
              >
                {/* Current activity text */}
                {currentActivity && (
                  <p className="text-sm text-white/70 truncate">{currentActivity}</p>
                )}

                {/* Progress bar */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className={cn(
                        'h-full rounded-full',
                        errorCount > 0 ? 'bg-red-500' : 'bg-emerald-500'
                      )}
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercent}%` }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                      style={{
                        animation: 'pulse 2s ease-in-out infinite',
                      }}
                    />
                  </div>
                  {elapsedTime && (
                    <span className="text-xs text-white/40 tabular-nums">{elapsedTime}</span>
                  )}
                </div>

                {/* Counts */}
                <div className="flex items-center gap-3 text-xs">
                  {runningCount > 0 && (
                    <span className="flex items-center gap-1 text-emerald-400">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      {runningCount} running
                    </span>
                  )}
                  {completeCount > 0 && (
                    <span className="flex items-center gap-1 text-white/50">
                      <CheckCircle className="h-3 w-3" />
                      {completeCount} done
                    </span>
                  )}
                  {errorCount > 0 && (
                    <span className="flex items-center gap-1 text-red-400">
                      <XCircle className="h-3 w-3" />
                      {errorCount} error
                    </span>
                  )}
                </div>
              </motion.div>
            )}

            {widgetState === 'complete' && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="space-y-1"
              >
                {/* Summary text */}
                <p className="text-sm text-white/70">
                  {totalCount} operations completed
                  {totalElapsedTime !== null && ` in ${totalElapsedTime}s`}
                </p>

                {/* Complete count */}
                <div className="flex items-center gap-1 text-xs text-emerald-400">
                  <CheckCircle className="h-3 w-3" />
                  {completeCount} complete
                </div>
              </motion.div>
            )}

            {widgetState === 'error' && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="space-y-1"
              >
                {/* Summary text */}
                <p className="text-sm text-white/70">
                  {completeCount} complete, {errorCount} failed
                </p>

                {/* Counts */}
                <div className="flex items-center gap-3 text-xs">
                  {completeCount > 0 && (
                    <span className="flex items-center gap-1 text-white/50">
                      <CheckCircle className="h-3 w-3" />
                      {completeCount} done
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-red-400">
                    <XCircle className="h-3 w-3" />
                    {errorCount} error
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
    </motion.div>
  );
}
