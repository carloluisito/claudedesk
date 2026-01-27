import { Settings, Box, Cloud } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';

interface ActiveConfigCardProps {
  port?: number;
  command?: string;
  envCount: number;
  dockerEnabled: boolean;
  tunnelEnabled: boolean;
}

export function ActiveConfigCard({
  port,
  command,
  envCount,
  dockerEnabled,
  tunnelEnabled,
}: ActiveConfigCardProps) {
  return (
    <GlassCard padding="md">
      <div className="flex items-center gap-2 text-sm font-semibold text-white">
        <Settings className="h-4 w-4" />
        Active Configuration
      </div>

      <div className="mt-3 space-y-2 text-sm">
        {port && (
          <div className="flex items-center justify-between">
            <span className="text-white/50">Port</span>
            <span className="font-mono text-white">{port}</span>
          </div>
        )}

        {command && (
          <div className="flex items-center justify-between">
            <span className="text-white/50">Command</span>
            <span className="font-mono text-white/70 text-xs truncate max-w-[160px]" title={command}>
              {command}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-white/50">Environment</span>
          <span className="text-white/70">
            {envCount > 0 ? `${envCount} variable${envCount !== 1 ? 's' : ''}` : 'None'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-white/50">
            <Box className="h-3 w-3" />
            Docker
          </span>
          <span className={dockerEnabled ? 'text-blue-400' : 'text-white/40'}>
            {dockerEnabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-white/50">
            <Cloud className="h-3 w-3" />
            Tunnel
          </span>
          <span className={tunnelEnabled ? 'text-orange-400' : 'text-white/40'}>
            {tunnelEnabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
      </div>
    </GlassCard>
  );
}
