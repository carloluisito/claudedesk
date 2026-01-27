import { Activity, Play, Square, RefreshCcw, Loader2 } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { cn } from '../../lib/cn';
import type { AppStatus } from '../../types/run';

interface RuntimeStatusCardProps {
  status: AppStatus;
  uptime?: string;
  isLoading?: boolean;
  onStart: () => void;
  onStop: () => void;
  onRestart: () => void;
}

export function RuntimeStatusCard({
  status,
  uptime,
  isLoading = false,
  onStart,
  onStop,
  onRestart,
}: RuntimeStatusCardProps) {
  const isRunning = status === 'RUNNING';
  const isStarting = status === 'STARTING';
  const isStopping = status === 'STOPPING';
  const isStopped = status === 'STOPPED';
  const isFailed = status === 'FAILED';

  const getStatusColor = () => {
    switch (status) {
      case 'RUNNING':
        return 'text-green-400';
      case 'STARTING':
        return 'text-yellow-400';
      case 'STOPPING':
        return 'text-orange-400';
      case 'STOPPED':
        return 'text-white/50';
      case 'FAILED':
        return 'text-red-400';
      default:
        return 'text-white/50';
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'RUNNING':
        return 'Running';
      case 'STARTING':
        return 'Starting...';
      case 'STOPPING':
        return 'Stopping...';
      case 'STOPPED':
        return 'Stopped';
      case 'FAILED':
        return 'Failed';
      default:
        return 'Unknown';
    }
  };

  return (
    <GlassCard padding="lg">
      <div className="flex items-center gap-2 text-sm font-semibold text-white">
        <Activity className="h-4 w-4" />
        Runtime Status
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-sm text-white/60">State</span>
        <span className={cn('text-sm font-semibold', getStatusColor())}>
          {getStatusLabel()}
        </span>
      </div>

      {uptime && isRunning && (
        <div className="mt-2 flex items-center justify-between">
          <span className="text-sm text-white/60">Uptime</span>
          <span className="text-sm text-white/70">{uptime}</span>
        </div>
      )}

      <div className="mt-4 flex items-center gap-2">
        {isRunning || isStarting ? (
          <button
            onClick={onStop}
            disabled={isLoading || isStopping}
            className={cn(
              'inline-flex flex-1 items-center justify-center gap-2 rounded-2xl px-3 py-2 text-sm ring-1 transition',
              'bg-white text-black ring-white hover:opacity-90',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isStopping ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Square className="h-4 w-4" />
            )}
            Stop
          </button>
        ) : (
          <button
            onClick={onStart}
            disabled={isLoading || isStarting}
            className={cn(
              'inline-flex flex-1 items-center justify-center gap-2 rounded-2xl px-3 py-2 text-sm ring-1 transition',
              'bg-white text-black ring-white hover:opacity-90',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isStarting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Run
          </button>
        )}

        <button
          onClick={onRestart}
          disabled={isLoading || !isRunning}
          className={cn(
            'inline-flex items-center justify-center rounded-2xl p-2 ring-1 transition',
            'bg-white/5 ring-white/10 hover:bg-white/10',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
          title="Restart"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCcw className="h-4 w-4" />
          )}
        </button>
      </div>
    </GlassCard>
  );
}
