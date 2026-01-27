import { useState, useEffect } from 'react';
import { X, Gauge, RefreshCw, Timer, Info, Lightbulb, Clock } from 'lucide-react';
import { cn } from '../../lib/cn';

interface ClaudeQuotaBucket {
  utilization: number;
  resets_at: string;
}

interface ClaudeUsageQuota {
  five_hour: ClaudeQuotaBucket;
  seven_day: ClaudeQuotaBucket;
  lastUpdated: string;
}

interface UsageDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  quota?: ClaudeUsageQuota | null;
  onRefresh?: () => void;
}

/**
 * Get color and status label for quota utilization
 */
function getQuotaStatus(utilization: number): {
  text: string;
  bg: string;
  bar: string;
  badgeBg: string;
  badgeText: string;
  label: string;
} {
  const pct = utilization * 100;
  if (pct >= 90) {
    return {
      text: 'text-red-400',
      bg: 'bg-red-500/20',
      bar: 'bg-red-500',
      badgeBg: 'bg-red-500/20',
      badgeText: 'text-red-400',
      label: 'Near Limit',
    };
  }
  if (pct >= 70) {
    return {
      text: 'text-orange-400',
      bg: 'bg-orange-500/20',
      bar: 'bg-orange-500',
      badgeBg: 'bg-orange-500/20',
      badgeText: 'text-orange-400',
      label: 'High Usage',
    };
  }
  if (pct >= 50) {
    return {
      text: 'text-yellow-400',
      bg: 'bg-yellow-500/20',
      bar: 'bg-yellow-500',
      badgeBg: 'bg-yellow-500/20',
      badgeText: 'text-yellow-400',
      label: 'Moderate',
    };
  }
  return {
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/20',
    bar: 'bg-emerald-500',
    badgeBg: 'bg-emerald-500/20',
    badgeText: 'text-emerald-400',
    label: 'Normal',
  };
}

/**
 * Format time until reset in human-readable format (relative)
 */
function getTimeUntilReset(resetsAt: string): string {
  const now = new Date();
  const resetTime = new Date(resetsAt);
  const diffMs = resetTime.getTime() - now.getTime();

  if (diffMs <= 0) return 'now';

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Format reset time in absolute format
 */
function getAbsoluteResetTime(resetsAt: string): string {
  const resetTime = new Date(resetsAt);
  return resetTime.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function UsageDashboard({
  isOpen,
  onClose,
  quota,
  onRefresh,
}: UsageDashboardProps) {
  const [loading, setLoading] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    try {
      onRefresh?.();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStats();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const fiveHourStatus = quota ? getQuotaStatus(quota.five_hour.utilization) : null;
  const sevenDayStatus = quota ? getQuotaStatus(quota.seven_day.utilization) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-700 px-4 py-3 shrink-0">
          <div className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Usage Quota</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchStats}
              disabled={loading}
              className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {quota ? (
            <>
              {/* 5-Hour Quota */}
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">5-Hour Limit</span>
                  <div className="flex items-center gap-2">
                    <span className={cn('px-2 py-0.5 text-xs font-medium rounded-full', fiveHourStatus?.badgeBg, fiveHourStatus?.badgeText)}>
                      {fiveHourStatus?.label}
                    </span>
                    <span className={cn('text-2xl font-bold', fiveHourStatus?.text)}>
                      {(quota.five_hour.utilization * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div
                  className="h-3 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden mb-3"
                  role="meter"
                  aria-label="5-hour quota usage"
                  aria-valuenow={Math.round(quota.five_hour.utilization * 100)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className={cn('h-full rounded-full transition-all', fiveHourStatus?.bar)}
                    style={{ width: `${Math.min(quota.five_hour.utilization * 100, 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-sm text-zinc-500">
                  <div className="flex items-center gap-1.5">
                    <Timer className="h-4 w-4" />
                    <span>Resets in {getTimeUntilReset(quota.five_hour.resets_at)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    <span>{getAbsoluteResetTime(quota.five_hour.resets_at)}</span>
                  </div>
                </div>
              </div>

              {/* 7-Day Quota */}
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Weekly Limit</span>
                  <div className="flex items-center gap-2">
                    <span className={cn('px-2 py-0.5 text-xs font-medium rounded-full', sevenDayStatus?.badgeBg, sevenDayStatus?.badgeText)}>
                      {sevenDayStatus?.label}
                    </span>
                    <span className={cn('text-2xl font-bold', sevenDayStatus?.text)}>
                      {(quota.seven_day.utilization * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div
                  className="h-3 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden mb-3"
                  role="meter"
                  aria-label="Weekly quota usage"
                  aria-valuenow={Math.round(quota.seven_day.utilization * 100)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className={cn('h-full rounded-full transition-all', sevenDayStatus?.bar)}
                    style={{ width: `${Math.min(quota.seven_day.utilization * 100, 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-sm text-zinc-500">
                  <div className="flex items-center gap-1.5">
                    <Timer className="h-4 w-4" />
                    <span>Resets in {getTimeUntilReset(quota.seven_day.resets_at)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    <span>{getAbsoluteResetTime(quota.seven_day.resets_at)}</span>
                  </div>
                </div>
              </div>

              {/* Last Updated */}
              <div className="text-center text-xs text-zinc-500">
                Last updated: {new Date(quota.lastUpdated).toLocaleTimeString()}
              </div>

              {/* What These Limits Mean */}
              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50">
                <div className="flex items-center gap-2 mb-3">
                  <Info className="h-5 w-5 text-blue-500" />
                  <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300">What These Limits Mean</h3>
                </div>
                <div className="space-y-3 text-sm text-blue-800 dark:text-blue-200/80">
                  <div>
                    <p className="font-medium text-blue-900 dark:text-blue-200">5-Hour Limit</p>
                    <p className="mt-0.5">
                      This is a rolling 5-hour window that limits how much you can use Claude in a short period.
                      When you reach this limit, requests may be queued or slowed down until usage decreases.
                      The window continuously moves forward, so older usage drops off as time passes.
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-blue-900 dark:text-blue-200">Weekly Limit</p>
                    <p className="mt-0.5">
                      This is a 7-day rolling limit on your total Claude usage. It helps ensure fair access
                      for all users throughout the week. Plan your work to avoid hitting this limit.
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-blue-900 dark:text-blue-200">How Usage is Measured</p>
                    <p className="mt-0.5">
                      Usage is measured in tokens - the basic units Claude uses to process text.
                      Both your prompts and Claude's responses count toward your quota.
                      Larger conversations and more complex requests use more tokens.
                    </p>
                  </div>
                </div>
              </div>

              {/* Tips to Manage Usage */}
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="h-5 w-5 text-amber-500" />
                  <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-300">Tips to Manage Usage</h3>
                </div>
                <ul className="space-y-2 text-sm text-amber-800 dark:text-amber-200/80">
                  <li className="flex items-start gap-2">
                    <span className="text-amber-500 mt-0.5">1.</span>
                    <span>
                      <strong>Be specific in your requests.</strong> Clear, focused prompts often get better results
                      with fewer follow-up exchanges.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-500 mt-0.5">2.</span>
                    <span>
                      <strong>Break up large tasks.</strong> Instead of one massive request, work in smaller chunks
                      that are easier to review and iterate on.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-500 mt-0.5">3.</span>
                    <span>
                      <strong>Use Plan Mode for complex work.</strong> Planning before executing helps avoid
                      costly mistakes and rework.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-500 mt-0.5">4.</span>
                    <span>
                      <strong>Take breaks when limits are high.</strong> The 5-hour window resets continuously -
                      a short break can free up significant capacity.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-500 mt-0.5">5.</span>
                    <span>
                      <strong>Review before sending.</strong> Double-check your prompts to minimize
                      unnecessary back-and-forth.
                    </span>
                  </li>
                </ul>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-zinc-500">
              <Gauge className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Quota data unavailable</p>
              <p className="text-xs mt-1">OAuth token may not be accessible</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default UsageDashboard;
