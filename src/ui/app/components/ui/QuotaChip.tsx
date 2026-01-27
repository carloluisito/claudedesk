import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '../../lib/cn';

/**
 * Get color configuration based on usage percentage
 */
function getQuotaColors(pct: number): {
  text: string;
  bar: string;
  ring: string;
  bg: string;
  statusLabel: string;
} {
  if (pct >= 90) {
    return {
      text: 'text-red-400',
      bar: 'bg-red-500',
      ring: 'ring-red-500/30',
      bg: 'bg-red-500/10',
      statusLabel: 'Near Limit',
    };
  }
  if (pct >= 70) {
    return {
      text: 'text-orange-400',
      bar: 'bg-orange-500',
      ring: 'ring-orange-500/30',
      bg: 'bg-orange-500/10',
      statusLabel: 'High Usage',
    };
  }
  if (pct >= 50) {
    return {
      text: 'text-yellow-400',
      bar: 'bg-yellow-500',
      ring: 'ring-yellow-500/30',
      bg: 'bg-yellow-500/10',
      statusLabel: 'Moderate',
    };
  }
  return {
    text: 'text-emerald-400',
    bar: 'bg-emerald-500',
    ring: 'ring-emerald-500/30',
    bg: 'bg-emerald-500/10',
    statusLabel: 'Normal',
  };
}

interface QuotaTooltipProps {
  label: string;
  pct: number;
  resetTime?: string;
  isHourly: boolean;
}

function QuotaTooltip({ label, pct, resetTime, isHourly }: QuotaTooltipProps) {
  const colors = getQuotaColors(pct);

  const explanation = isHourly
    ? 'This limits how much you can use Claude in a rolling 5-hour window. When full, requests may be queued or slowed.'
    : 'This limits your total Claude usage over a 7-day rolling period. Plan ahead to avoid interruptions.';

  return (
    <div
      className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 w-64 p-3 rounded-xl bg-zinc-900 border border-zinc-700 shadow-xl"
      role="tooltip"
    >
      {/* Arrow */}
      <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-zinc-900 border-l border-t border-zinc-700 rotate-45" />

      {/* Header with label and status */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-white">{label} Quota</span>
        <span className={cn('text-xs font-medium px-1.5 py-0.5 rounded', colors.bg, colors.text)}>
          {colors.statusLabel}
        </span>
      </div>

      {/* Progress bar with ARIA attributes */}
      <div
        className="h-2 bg-zinc-700 rounded-full overflow-hidden mb-2"
        role="meter"
        aria-label={`${label} quota usage`}
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn('h-full rounded-full transition-all', colors.bar)}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>

      {/* Usage percentage */}
      <div className="flex items-center justify-between text-xs mb-3">
        <span className={cn('font-semibold', colors.text)}>{pct}% used</span>
        {resetTime && (
          <span className="text-zinc-400">Resets {resetTime}</span>
        )}
      </div>

      {/* Explanation text */}
      <p className="text-xs text-zinc-400 leading-relaxed">
        {explanation}
      </p>

      {/* Click hint */}
      <p className="text-xs text-zinc-500 mt-2 pt-2 border-t border-zinc-700">
        Click for full usage details
      </p>
    </div>
  );
}

interface QuotaChipProps {
  label: string;
  pct?: number;
  resetTime?: string;
  onClick?: () => void;
  isHourly?: boolean;
}

export function QuotaChip({ label, pct, resetTime, onClick, isHourly = false }: QuotaChipProps) {
  const isLoading = pct === undefined;
  const clampedPct = isLoading ? 0 : Math.max(0, Math.min(100, pct));
  const colors = getQuotaColors(clampedPct);

  const [showTooltip, setShowTooltip] = useState(false);
  const hoverTimeoutRef = useRef<number | null>(null);
  const chipRef = useRef<HTMLButtonElement>(null);

  const handleMouseEnter = useCallback(() => {
    hoverTimeoutRef.current = window.setTimeout(() => {
      setShowTooltip(true);
    }, 300);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setShowTooltip(false);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Handle keyboard interaction
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.();
    }
  }, [onClick]);

  return (
    <button
      ref={chipRef}
      type="button"
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
      onKeyDown={handleKeyDown}
      className={cn(
        'relative inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm ring-1 transition-all cursor-pointer',
        'hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent',
        isLoading
          ? 'bg-white/5 text-white ring-white/10'
          : cn(colors.bg, 'text-white', colors.ring)
      )}
      aria-label={`${label} quota: ${isLoading ? 'loading' : `${clampedPct}% used`}`}
    >
      <span className={cn('text-xs', isLoading ? 'text-white/60' : colors.text)}>
        {label}
      </span>
      <div
        className="h-1.5 w-20 overflow-hidden rounded-full bg-white/10"
        role="meter"
        aria-label={`${label} usage progress`}
        aria-valuenow={clampedPct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn(
            'h-full transition-all',
            isLoading ? 'bg-white/20 animate-pulse' : colors.bar
          )}
          style={{ width: isLoading ? '100%' : `${clampedPct}%` }}
        />
      </div>
      <span className={cn('text-xs font-semibold', isLoading ? 'text-white/75' : colors.text)}>
        {isLoading ? '--' : `${clampedPct}%`}
      </span>

      {/* Tooltip */}
      {showTooltip && !isLoading && (
        <QuotaTooltip
          label={label}
          pct={clampedPct}
          resetTime={resetTime}
          isHourly={isHourly}
        />
      )}
    </button>
  );
}

export { getQuotaColors };
