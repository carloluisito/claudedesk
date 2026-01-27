import { Undo2, Eye, Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';

interface ReviewDiffViewerProps {
  filePath: string;
  status: 'modified' | 'created' | 'deleted';
  diffLines: string[];
  isLoading?: boolean;
  onRevert?: () => void;
  onViewFull?: () => void;
}

export function ReviewDiffViewer({
  filePath,
  status,
  diffLines,
  isLoading = false,
  onRevert,
  onViewFull,
}: ReviewDiffViewerProps) {
  if (isLoading) {
    return (
      <div className="rounded-3xl bg-white/5 p-4 ring-1 ring-white/10 flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-6 w-6 animate-spin text-white/50" />
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-white/5 p-4 ring-1 ring-white/10">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-white truncate flex-1 mr-2">
          {filePath}
        </div>
        <span
          className={cn(
            'rounded-full bg-white/5 px-2.5 py-1 text-xs ring-1 ring-white/10',
            status === 'created' && 'text-green-400',
            status === 'deleted' && 'text-red-400',
            status === 'modified' && 'text-white/60'
          )}
        >
          {status}
        </span>
      </div>

      <div className="mt-3 space-y-1 font-mono text-sm max-h-[400px] overflow-y-auto">
        {diffLines.length === 0 ? (
          <div className="text-white/40 text-center py-8">No changes to display</div>
        ) : (
          diffLines.map((line, i) => {
            const isAddition = line.startsWith('+') && !line.startsWith('+++');
            const isDeletion = line.startsWith('-') && !line.startsWith('---');
            const isHeader = line.startsWith('@@');
            const isMeta = line.startsWith('diff ') || line.startsWith('index ') || line.startsWith('---') || line.startsWith('+++');

            if (isMeta) return null;

            return (
              <div
                key={i}
                className={cn(
                  'rounded-lg px-3 py-1',
                  isAddition && 'bg-white/10 text-white',
                  isDeletion && 'bg-black/20 text-white/70',
                  isHeader && 'bg-blue-500/10 text-blue-400',
                  !isAddition && !isDeletion && !isHeader && 'text-white/60'
                )}
              >
                {line}
              </div>
            );
          })
        )}
      </div>

      <div className="mt-4 flex items-center gap-2">
        {onRevert && (
          <button
            onClick={onRevert}
            className="inline-flex items-center gap-2 rounded-2xl bg-white/5 px-3 py-2 text-xs text-white ring-1 ring-white/10 hover:bg-white/10"
          >
            <Undo2 className="h-4 w-4" />
            Revert file
          </button>
        )}
        {onViewFull && (
          <button
            onClick={onViewFull}
            className="inline-flex items-center gap-2 rounded-2xl bg-white/5 px-3 py-2 text-xs text-white ring-1 ring-white/10 hover:bg-white/10"
          >
            <Eye className="h-4 w-4" />
            View full file
          </button>
        )}
      </div>
    </div>
  );
}
