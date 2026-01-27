import { Files, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '../../lib/cn';

export interface ReviewFile {
  path: string;
  status: 'modified' | 'created' | 'deleted';
  approved: boolean;
}

interface ReviewFileListProps {
  files: ReviewFile[];
  selectedPath?: string;
  onSelectFile: (path: string) => void;
  onToggleApproval: (path: string) => void;
}

export function ReviewFileList({
  files,
  selectedPath,
  onSelectFile,
  onToggleApproval,
}: ReviewFileListProps) {
  return (
    <div className="space-y-2">
      {files.map((file) => (
        <div
          key={file.path}
          onClick={() => onSelectFile(file.path)}
          className={cn(
            'flex w-full items-center justify-between gap-2 rounded-2xl px-3 py-2 text-sm ring-1 transition cursor-pointer',
            selectedPath === file.path && 'ring-2 ring-white/30',
            file.approved
              ? 'bg-white/10 text-white ring-white/15'
              : 'bg-white/5 text-white/70 ring-white/10 hover:bg-white/10'
          )}
        >
          <div className="flex min-w-0 items-center gap-2">
            <Files className="h-4 w-4 flex-shrink-0" />
            <span className="min-w-0 truncate">{file.path}</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'rounded-full bg-white/5 px-2 py-0.5 text-xs ring-1 ring-white/10',
                file.status === 'created' && 'text-green-400',
                file.status === 'deleted' && 'text-red-400',
                file.status === 'modified' && 'text-white/60'
              )}
            >
              {file.status}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleApproval(file.path);
              }}
              className="p-0.5 hover:bg-white/10 rounded-lg transition"
            >
              {file.approved ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <XCircle className="h-4 w-4 text-white/40" />
              )}
            </button>
          </div>
        </div>
      ))}
      {files.length === 0 && (
        <div className="text-center text-sm text-white/50 py-8">
          No files changed
        </div>
      )}
    </div>
  );
}
