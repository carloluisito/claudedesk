/**
 * ChainProgressIndicator - Shows real-time chain execution progress
 * Displays during chain execution with per-agent status
 */

import { Bot, Check, X, Loader2, Square } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ChainSegment } from '../../../types/agents';

interface ChainProgressIndicatorProps {
  segments: ChainSegment[];
  onCancel?: () => void;
  chainStatus?: 'running' | 'completed' | 'partial' | 'cancelled';
}

export function ChainProgressIndicator({
  segments,
  onCancel,
  chainStatus,
}: ChainProgressIndicatorProps) {
  if (!segments || segments.length === 0) return null;

  const currentIndex = segments.findIndex((s) => s.status === 'running');
  const completedCount = segments.filter((s) => s.status === 'completed').length;
  const isRunning = chainStatus === 'running';

  // Status text
  let statusText = '';
  if (chainStatus === 'completed') {
    statusText = `Chain completed \u2022 ${segments.length} agents`;
  } else if (chainStatus === 'partial') {
    const failed = segments.find((s) => s.status === 'failed');
    statusText = `Chain stopped \u2022 ${failed ? `@${failed.agentName} failed` : 'error'}`;
  } else if (chainStatus === 'cancelled') {
    statusText = 'Chain cancelled';
  } else if (currentIndex >= 0) {
    const current = segments[currentIndex];
    if (currentIndex > 0) {
      const prev = segments[currentIndex - 1];
      statusText = `Completed @${prev.agentName}, running @${current.agentName}...`;
    } else {
      statusText = `Running @${current.agentName}...`;
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2 ring-1 ring-white/[0.06]"
      role="status"
      aria-live="polite"
      aria-label={`Chain execution progress: ${statusText}`}
    >
      {/* Progress chips */}
      <div className="flex items-center gap-1">
        {segments.map((segment, idx) => (
          <ProgressChip key={idx} segment={segment} index={idx} />
        ))}
      </div>

      {/* Status text */}
      <span className="text-xs text-white/50 truncate flex-1">
        {statusText}
      </span>

      {/* Stop button */}
      <AnimatePresence>
        {isRunning && onCancel && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={onCancel}
            className="flex shrink-0 items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-1 text-[10px] font-medium text-red-400 hover:bg-red-500/20 transition-colors"
            aria-label="Stop chain"
          >
            <Square className="h-2.5 w-2.5" />
            Stop chain
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// --- Sub-component ---

interface ProgressChipProps {
  segment: ChainSegment;
  index: number;
}

function ProgressChip({ segment, index }: ProgressChipProps) {
  const isPending = segment.status === 'pending';
  const isRunning = segment.status === 'running';
  const isCompleted = segment.status === 'completed';
  const isFailed = segment.status === 'failed';
  const isCancelled = segment.status === 'cancelled';

  return (
    <motion.div
      layout
      className={`relative flex items-center justify-center rounded-full transition-all ${
        isPending
          ? 'h-6 w-6 bg-white/5 opacity-40'
          : isRunning
            ? 'h-7 w-7 bg-blue-500/15'
            : isCompleted
              ? 'h-6 w-6 bg-emerald-500/15'
              : isFailed
                ? 'h-6 w-6 bg-red-500/15'
                : 'h-6 w-6 bg-white/5 opacity-60'
      }`}
      title={`${segment.agentName}: ${segment.status}`}
    >
      {/* Pulsing ring for running state */}
      {isRunning && (
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-blue-400/50"
          animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.2, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            '@media (prefers-reduced-motion: reduce)': {
              animation: 'none',
            },
          } as React.CSSProperties}
        />
      )}

      {/* Icon */}
      {isPending && (
        <span className="text-[9px] font-bold text-white/40">{index + 1}</span>
      )}
      {isRunning && (
        <Loader2 className="h-3.5 w-3.5 text-blue-400 animate-spin" />
      )}
      {isCompleted && (
        <Check className="h-3 w-3 text-emerald-400" />
      )}
      {isFailed && (
        <X className="h-3 w-3 text-red-400" />
      )}
      {isCancelled && (
        <Square className="h-2.5 w-2.5 text-white/40" />
      )}

      {/* Screen reader text */}
      <span className="sr-only">
        {segment.agentName}: {segment.status}
      </span>
    </motion.div>
  );
}
