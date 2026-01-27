/**
 * FileItem - Individual changed file row
 *
 * Displays a single file in the changes list with:
 * - Status icon: Plus (green/added), Minus (red/deleted),
 *   FileText (yellow/modified), ArrowRight (blue/renamed)
 * - File path with directory shown in muted color
 * - Insertion/deletion counts
 * - Status badge (added, modified, deleted, renamed)
 *
 * Supports click handling for viewing file diffs and
 * selection state for highlighting the active file.
 */
import { Plus, Minus, FileText, ArrowRight } from 'lucide-react';
import { cn } from '../../../../lib/cn';

export interface FileItemProps {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed' | 'created';
  insertions?: number;
  deletions?: number;
  oldPath?: string;
  onClick?: () => void;
  isSelected?: boolean;
}

export function FileItem({
  path,
  status,
  insertions = 0,
  deletions = 0,
  oldPath,
  onClick,
  isSelected = false,
}: FileItemProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'added':
      case 'created':
        return <Plus className="h-3.5 w-3.5 text-green-400" />;
      case 'deleted':
        return <Minus className="h-3.5 w-3.5 text-red-400" />;
      case 'renamed':
        return <ArrowRight className="h-3.5 w-3.5 text-blue-400" />;
      case 'modified':
      default:
        return <FileText className="h-3.5 w-3.5 text-yellow-400" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'added':
      case 'created':
        return 'text-green-400';
      case 'deleted':
        return 'text-red-400';
      case 'renamed':
        return 'text-blue-400';
      case 'modified':
      default:
        return 'text-yellow-400';
    }
  };

  // Extract filename from path
  const filename = path.split('/').pop() || path;
  const directory = path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : '';

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2 rounded-xl px-3 py-2 text-left transition-colors',
        'bg-white/5 ring-1 ring-white/10',
        onClick && 'hover:bg-white/10 cursor-pointer',
        isSelected && 'ring-blue-500/50 bg-blue-500/10'
      )}
    >
      {/* Status icon */}
      <div className="flex-shrink-0">{getStatusIcon()}</div>

      {/* File path */}
      <div className="flex-1 min-w-0">
        {oldPath ? (
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-white/50 truncate">{oldPath}</span>
            <ArrowRight className="h-3 w-3 text-white/30 flex-shrink-0" />
            <span className="text-white/80 truncate">{path}</span>
          </div>
        ) : (
          <div className="text-xs">
            <span className="text-white/80">{filename}</span>
            {directory && (
              <span className="text-white/40 ml-1">{directory}</span>
            )}
          </div>
        )}
      </div>

      {/* Stats */}
      {(insertions > 0 || deletions > 0) && (
        <div className="flex items-center gap-2 text-xs flex-shrink-0">
          {insertions > 0 && <span className="text-green-400">+{insertions}</span>}
          {deletions > 0 && <span className="text-red-400">-{deletions}</span>}
        </div>
      )}

      {/* Status badge */}
      <span
        className={cn(
          'rounded-full bg-white/5 px-2 py-0.5 text-xs ring-1 ring-white/10',
          getStatusColor()
        )}
      >
        {status}
      </span>
    </button>
  );
}
