import { Play, Rocket, Eye, Bot } from 'lucide-react';
import { cn } from '../../../lib/cn';

interface ActionRailProps {
  onRun: () => void;
  onShip: () => void;
  onAgents?: () => void;
  hasRunningApp?: boolean;
  isPreviewOpen?: boolean;
  isAgentsOpen?: boolean;
  changesCount?: number;
}

export function ActionRail({
  onRun,
  onShip,
  onAgents,
  hasRunningApp = false,
  isPreviewOpen = false,
  isAgentsOpen = false,
  changesCount = 0,
}: ActionRailProps) {
  return (
    <div className="flex items-center gap-2 rounded-3xl bg-white/5 p-2 ring-1 ring-white/10">
      {/* Run/Preview Button */}
      <button
        onClick={onRun}
        className={cn(
          'flex-1 inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 ring-1 transition',
          hasRunningApp
            ? isPreviewOpen
              ? 'bg-emerald-500/20 text-emerald-400 ring-emerald-500/50'
              : 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/30 hover:bg-emerald-500/20'
            : 'bg-white/5 text-white ring-white/10 hover:bg-white/10'
        )}
        title={hasRunningApp ? 'Preview • ⌘R' : 'Run • ⌘R'}
      >
        {hasRunningApp ? <Eye className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        <span className="text-sm font-semibold">{hasRunningApp ? 'Run' : 'Run'}</span>
      </button>

      {/* Ship Button */}
      <button
        onClick={onShip}
        className="relative flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-black ring-1 ring-white hover:opacity-90 transition"
        title="Ship • ⌘⇧P"
      >
        <Rocket className="h-5 w-5" />
        <span className="text-sm font-semibold">Ship</span>
        {changesCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white">
            {changesCount > 9 ? '9+' : changesCount}
          </span>
        )}
      </button>

      {/* Agents Button */}
      {onAgents && (
        <button
          onClick={onAgents}
          className={cn(
            'flex-1 inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 ring-1 transition',
            isAgentsOpen
              ? 'bg-blue-500/20 text-blue-400 ring-blue-500/50'
              : 'bg-white/5 text-white ring-white/10 hover:bg-white/10'
          )}
          title="Agents • ⌘⇧A"
        >
          <Bot className="h-5 w-5" />
          <span className="text-sm font-semibold">Agents</span>
        </button>
      )}
    </div>
  );
}
