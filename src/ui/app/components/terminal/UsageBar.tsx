import { memo, useMemo, useState, useEffect, useCallback } from 'react';
import { RefreshCw, Gauge } from 'lucide-react';
import { cn } from '../../lib/cn';
import { api } from '../../lib/api';
import { useTerminalStore } from '../../store/terminalStore';
import { UsageDashboard } from './UsageDashboard';

interface ClaudeQuotaBucket {
  utilization: number;
  resets_at: string;
}

interface ClaudeUsageQuota {
  five_hour: ClaudeQuotaBucket;
  seven_day: ClaudeQuotaBucket;
  lastUpdated: string;
}

interface UsageBarProps {
  className?: string;
}

/**
 * Get color for quota utilization
 */
function getQuotaColor(utilization: number): string {
  if (utilization >= 0.9) return 'text-red-400';
  if (utilization >= 0.7) return 'text-orange-400';
  if (utilization >= 0.5) return 'text-yellow-400';
  return 'text-emerald-400';
}

/**
 * Format time until reset
 */
function getTimeUntilReset(resetsAt: string): string {
  const now = new Date();
  const resetTime = new Date(resetsAt);
  const diffMs = resetTime.getTime() - now.getTime();

  if (diffMs <= 0) return 'now';

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export const UsageBar = memo(function UsageBar({
  className,
}: UsageBarProps) {
  const { sessions, activeSessionId } = useTerminalStore();
  const [showDashboard, setShowDashboard] = useState(false);
  const [quota, setQuota] = useState<ClaudeUsageQuota | null>(null);
  const [loading, setLoading] = useState(false);

  const session = useMemo(
    () => sessions.find((s) => s.id === activeSessionId),
    [sessions, activeSessionId]
  );

  // Fetch quota
  const fetchQuota = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      const refreshParam = forceRefresh ? '?refresh=true' : '';
      const quotaResult = await api<ClaudeUsageQuota | null>('GET', `/terminal/usage/quota${refreshParam}`);
      setQuota(quotaResult);
    } catch (error) {
      console.error('[UsageBar] Error fetching quota:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount and when session changes
  useEffect(() => {
    fetchQuota();
  }, [fetchQuota, activeSessionId]);

  // Don't render if no session
  if (!session) {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setShowDashboard(true)}
        className={cn(
          'flex items-center gap-4 px-4 py-2.5 bg-zinc-900/50 border-b border-zinc-800 w-full text-left',
          'hover:bg-zinc-800/50 transition-colors cursor-pointer',
          className
        )}
        title="Click to view usage details"
      >
        {quota ? (
          <>
            {/* Quota Display */}
            <div className="flex items-center gap-3">
              <Gauge className="h-3.5 w-3.5 text-zinc-500" />
              <span className="text-xs text-zinc-500">Usage Quota</span>
              <div className="flex items-center gap-1.5 text-xs" title={`5h quota resets in ${getTimeUntilReset(quota.five_hour.resets_at)}`}>
                <span className="text-zinc-500">5h</span>
                <span className={getQuotaColor(quota.five_hour.utilization)}>
                  {(quota.five_hour.utilization * 100).toFixed(0)}%
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs" title={`7d quota resets in ${getTimeUntilReset(quota.seven_day.resets_at)}`}>
                <span className="text-zinc-500">7d</span>
                <span className={getQuotaColor(quota.seven_day.utilization)}>
                  {(quota.seven_day.utilization * 100).toFixed(0)}%
                </span>
              </div>
            </div>

            {/* Loading indicator */}
            {loading && (
              <RefreshCw className="h-3 w-3 text-zinc-500 animate-spin ml-auto" />
            )}
          </>
        ) : (
          <div className="flex items-center gap-3 text-xs text-zinc-500">
            <Gauge className="h-3.5 w-3.5" />
            <span>{loading ? 'Loading quota...' : 'Quota unavailable'}</span>
          </div>
        )}
      </button>

      {/* Usage Dashboard Modal */}
      <UsageDashboard
        isOpen={showDashboard}
        onClose={() => setShowDashboard(false)}
        quota={quota}
        onRefresh={() => fetchQuota(true)}
      />
    </>
  );
});

export default UsageBar;
