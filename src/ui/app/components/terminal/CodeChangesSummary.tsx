import { useState, memo } from 'react';
import { ChevronRight, FilePlus, Pencil, Trash2, FileCode, Maximize2 } from 'lucide-react';
import { cn } from '../../lib/cn';
import { FileChange } from '../../store/terminalStore';

interface CodeChangesSummaryProps {
  fileChanges: FileChange[];
  onFileClick: (filePath: string) => void;
  onViewAllChanges: () => void;
}

// Get icon and color for each operation type
function getOperationIcon(operation: FileChange['operation']) {
  switch (operation) {
    case 'created':
      return { Icon: FilePlus, color: 'text-emerald-400' };
    case 'modified':
      return { Icon: Pencil, color: 'text-amber-400' };
    case 'deleted':
      return { Icon: Trash2, color: 'text-red-400' };
  }
}

export const CodeChangesSummary = memo(function CodeChangesSummary({
  fileChanges,
  onFileClick,
  onViewAllChanges,
}: CodeChangesSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Don't render if no file changes
  if (fileChanges.length === 0) return null;

  // Count by operation type
  const createdCount = fileChanges.filter((fc) => fc.operation === 'created').length;
  const modifiedCount = fileChanges.filter((fc) => fc.operation === 'modified').length;
  const deletedCount = fileChanges.filter((fc) => fc.operation === 'deleted').length;

  // Build summary text
  const summaryParts: string[] = [];
  if (createdCount > 0) summaryParts.push(`${createdCount} created`);
  if (modifiedCount > 0) summaryParts.push(`${modifiedCount} modified`);
  if (deletedCount > 0) summaryParts.push(`${deletedCount} deleted`);
  const summaryText = `${fileChanges.length} file${fileChanges.length === 1 ? '' : 's'} changed`;

  return (
    <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            'flex items-center gap-1.5 text-xs font-medium transition-colors',
            'text-white/60 hover:text-white/90'
          )}
        >
          <ChevronRight
            className={cn(
              'h-3.5 w-3.5 transition-transform flex-shrink-0',
              isExpanded && 'rotate-90'
            )}
          />
          <FileCode className="h-3.5 w-3.5 flex-shrink-0 text-blue-400" />
          <span className="text-white/80">{summaryText}</span>
          <span className="text-white/40">({summaryParts.join(', ')})</span>
        </button>

        {/* View All Changes button */}
        <button
          onClick={onViewAllChanges}
          className="flex items-center gap-1 px-2 py-1 text-xs text-white/60 hover:text-white hover:bg-white/10 rounded-xl ring-1 ring-white/10 transition-colors"
        >
          <Maximize2 className="h-3 w-3" />
          <span className="hidden sm:inline">View All</span>
        </button>
      </div>

      {/* File list */}
      {isExpanded && (
        <div className="mt-2 space-y-1">
          {fileChanges.map((change) => {
            const { Icon, color } = getOperationIcon(change.operation);
            return (
              <button
                key={change.id}
                onClick={() => onFileClick(change.filePath)}
                className={cn(
                  'flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-xl',
                  'text-xs text-white/70 hover:bg-white/10 transition-colors group ring-1 ring-transparent hover:ring-white/10'
                )}
              >
                <Icon className={cn('h-3.5 w-3.5 flex-shrink-0', color)} />
                <span className="font-mono truncate flex-1" title={change.filePath}>
                  {change.fileName}
                </span>
                <span className="text-white/40 text-[10px] hidden group-hover:inline">
                  {change.operation}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
});
