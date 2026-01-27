import { Terminal, Search, ShieldCheck } from 'lucide-react';
import { cn } from '../../../lib/cn';

interface WorkspaceHeaderProps {
  name: string;
  repo: string;
  branch?: string;
  changesCount: number;
  mode: 'plan' | 'direct';
  permissionMode?: 'autonomous' | 'read-only';
  onToggleMode: () => void;
  onJumpTo?: () => void;
}

export function WorkspaceHeader({
  name,
  repo,
  branch,
  changesCount,
  mode,
  permissionMode,
  onToggleMode,
  onJumpTo,
}: WorkspaceHeaderProps) {
  return (
    <div className="flex flex-col gap-3 rounded-3xl bg-white/5 p-4 ring-1 ring-white/10 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="text-sm font-semibold text-white">{name}</div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/55">
          <span className="inline-flex items-center gap-1">
            <Terminal className="h-3.5 w-3.5" />
            {repo}
          </span>
          {permissionMode && (
            <>
              <span className="text-white/35">•</span>
              <span className={cn(
                "inline-flex items-center gap-1",
                permissionMode === 'autonomous' ? "text-amber-400" : "text-emerald-400"
              )}>
                <ShieldCheck className="h-3.5 w-3.5" />
                {permissionMode === 'autonomous' ? 'Autonomous' : 'Read-Only'}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-0">
        {onJumpTo && (
          <button
            onClick={onJumpTo}
            className="inline-flex items-center gap-2 rounded-2xl bg-white/5 px-3 py-2 min-h-[44px] text-sm text-white ring-1 ring-white/10 hover:bg-white/10 active:bg-white/15 touch-target"
          >
            <Search className="h-4 w-4" />
            Navigate
          </button>
        )}
      </div>
    </div>
  );
}
