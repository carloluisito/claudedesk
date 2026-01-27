import { useState, useCallback } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { motion, AnimatePresence } from 'framer-motion';

interface QuotaAlertBannerProps {
  hourlyPct?: number;
  weeklyPct?: number;
  onViewDetails: () => void;
}

type AlertLevel = 'warning' | 'critical' | null;

/**
 * Determine alert level based on quota percentages
 * - 5-hour quota >= 95%: critical
 * - 5-hour quota >= 80%: warning
 * - Weekly quota >= 90%: warning
 */
function getAlertLevel(hourlyPct?: number, weeklyPct?: number): {
  level: AlertLevel;
  message: string;
  type: 'hourly' | 'weekly';
} {
  // Check hourly first - it's more urgent
  if (hourlyPct !== undefined) {
    if (hourlyPct >= 95) {
      return {
        level: 'critical',
        message: 'Your 5-hour quota is nearly exhausted. Requests may be queued or slowed.',
        type: 'hourly',
      };
    }
    if (hourlyPct >= 80) {
      return {
        level: 'warning',
        message: 'You are approaching your 5-hour usage limit. Consider pausing to let it reset.',
        type: 'hourly',
      };
    }
  }

  // Check weekly
  if (weeklyPct !== undefined && weeklyPct >= 90) {
    return {
      level: 'warning',
      message: 'Your weekly quota is running low. Plan your remaining usage carefully.',
      type: 'weekly',
    };
  }

  return { level: null, message: '', type: 'hourly' };
}

export function QuotaAlertBanner({
  hourlyPct,
  weeklyPct,
  onViewDetails,
}: QuotaAlertBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  const { level, message } = getAlertLevel(hourlyPct, weeklyPct);

  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
  }, []);

  // Don't render if no alert or dismissed
  if (!level || isDismissed) {
    return null;
  }

  const isCritical = level === 'critical';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        role="alert"
        aria-live={isCritical ? 'assertive' : 'polite'}
        className={cn(
          'mx-6 mt-2 rounded-xl px-4 py-3 flex items-center gap-3 ring-1',
          isCritical
            ? 'bg-red-500/10 ring-red-500/30 text-red-300'
            : 'bg-amber-500/10 ring-amber-500/30 text-amber-300'
        )}
      >
        <AlertTriangle
          className={cn(
            'h-5 w-5 shrink-0',
            isCritical ? 'text-red-400' : 'text-amber-400'
          )}
          aria-hidden="true"
        />

        <p className="flex-1 text-sm">{message}</p>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onViewDetails}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
              isCritical
                ? 'bg-red-500/20 hover:bg-red-500/30 text-red-200'
                : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-200'
            )}
          >
            View Details
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className={cn(
              'p-1.5 rounded-lg transition-colors',
              isCritical
                ? 'hover:bg-red-500/20 text-red-400'
                : 'hover:bg-amber-500/20 text-amber-400'
            )}
            aria-label="Dismiss alert"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
