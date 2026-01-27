import { Bug, AlertTriangle, XCircle, Info } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import type { RuntimeSignal } from '../../store/runStore';

interface SignalsCardProps {
  signals: RuntimeSignal[];
}

export function SignalsCard({ signals }: SignalsCardProps) {
  const getIcon = (type: RuntimeSignal['type']) => {
    switch (type) {
      case 'error':
        return <XCircle className="h-3 w-3 text-red-400 flex-shrink-0" />;
      case 'warning':
        return <AlertTriangle className="h-3 w-3 text-yellow-400 flex-shrink-0" />;
      case 'info':
        return <Info className="h-3 w-3 text-blue-400 flex-shrink-0" />;
      default:
        return <AlertTriangle className="h-3 w-3 text-white/40 flex-shrink-0" />;
    }
  };

  const errors = signals.filter((s) => s.type === 'error');
  const warnings = signals.filter((s) => s.type === 'warning');

  return (
    <GlassCard padding="lg">
      <div className="flex items-center gap-2 text-sm font-semibold text-white">
        <Bug className="h-4 w-4" />
        Signals
        {(errors.length > 0 || warnings.length > 0) && (
          <span className="flex items-center gap-1.5 ml-auto">
            {errors.length > 0 && (
              <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs text-red-400">
                {errors.length}
              </span>
            )}
            {warnings.length > 0 && (
              <span className="rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs text-yellow-400">
                {warnings.length}
              </span>
            )}
          </span>
        )}
      </div>

      <div className="mt-3 space-y-2">
        {signals.length > 0 ? (
          signals.map((signal) => (
            <div
              key={signal.id}
              className="flex items-start gap-2 text-xs text-white/70"
            >
              {getIcon(signal.type)}
              <span className="line-clamp-2">{signal.message}</span>
            </div>
          ))
        ) : (
          <div className="text-xs text-white/40 text-center py-2">
            No signals detected
          </div>
        )}
      </div>
    </GlassCard>
  );
}
