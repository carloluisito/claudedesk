/**
 * SummaryCard - Displays git change statistics
 *
 * Shows a compact summary of the current changes including:
 * - Total file count with "files changed" label
 * - Insertions (green) and deletions (red) counts
 * - Current branch with arrow to base branch
 * - Unpushed commits indicator (amber)
 *
 * Used in ChangesPanel collapsed view to give users a quick
 * overview before expanding to the full ship form.
 */
import { GitBranch, ArrowUp } from 'lucide-react';

interface SummaryCardProps {
  fileCount: number;
  insertions: number;
  deletions: number;
  currentBranch?: string;
  baseBranch?: string;
  unpushedCommits?: number;
}

export function SummaryCard({
  fileCount,
  insertions,
  deletions,
  currentBranch,
  baseBranch,
  unpushedCommits = 0,
}: SummaryCardProps) {
  return (
    <div className="rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
      {/* Stats row */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-white/70">
          {fileCount} file{fileCount !== 1 ? 's' : ''} changed
        </span>
        <div className="flex items-center gap-3">
          <span className="text-green-400">+{insertions}</span>
          <span className="text-red-400">-{deletions}</span>
        </div>
      </div>

      {/* Branch info */}
      {currentBranch && (
        <div className="mt-2 flex items-center gap-2 text-xs text-white/55">
          <GitBranch className="h-3.5 w-3.5" />
          <span className="font-mono truncate">{currentBranch}</span>
          {baseBranch && currentBranch !== baseBranch && (
            <>
              <span className="text-white/30">→</span>
              <span className="font-mono text-white/40">{baseBranch}</span>
            </>
          )}
        </div>
      )}

      {/* Unpushed commits indicator */}
      {unpushedCommits > 0 && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-400">
          <ArrowUp className="h-3 w-3" />
          <span>
            {unpushedCommits} unpushed commit{unpushedCommits !== 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  );
}
