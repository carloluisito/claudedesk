import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { GlassCard, GlassPanelHeader } from '../../ui/GlassCard';

export interface ChangedFile {
  path: string;
  status: 'modified' | 'created' | 'deleted' | 'renamed';
  oldPath?: string;
}

interface ChangesCardProps {
  files: ChangedFile[];
  onViewDiffs?: () => void;
  onFileClick?: (path: string) => void;
}

const DEFAULT_VISIBLE_COUNT = 5;

export function ChangesCard({ files, onViewDiffs, onFileClick }: ChangesCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const hiddenCount = Math.max(0, files.length - DEFAULT_VISIBLE_COUNT);
  const showExpansionToggle = files.length > DEFAULT_VISIBLE_COUNT;
  const visibleFiles = isExpanded ? files : files.slice(0, DEFAULT_VISIBLE_COUNT);

  // Auto-collapse when files reduce to 5 or fewer
  useEffect(() => {
    if (files.length <= DEFAULT_VISIBLE_COUNT) {
      setIsExpanded(false);
    }
  }, [files.length]);

  const getStatusColor = (status: ChangedFile['status']) => {
    switch (status) {
      case 'created':
        return 'text-green-400';
      case 'deleted':
        return 'text-red-400';
      case 'renamed':
        return 'text-blue-400';
      default:
        return 'text-white/60';
    }
  };

  const toggleLabel = isExpanded
    ? 'Show less'
    : `Show ${hiddenCount} more`;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold text-white/70">Files</div>
        <div className="flex items-center gap-2">
          {onViewDiffs && files.length > 0 && (
            <button
              onClick={onViewDiffs}
              className="rounded-2xl bg-white/5 px-3 py-1.5 text-xs text-white/70 ring-1 ring-white/10 hover:bg-white/10"
            >
              View all diffs
            </button>
          )}
        </div>
      </div>
      <div className="mt-3 space-y-2">
        {files.length === 0 ? (
          <div className="text-xs text-white/55 py-2">No changes yet</div>
        ) : (
          <>
            <AnimatePresence initial={false}>
              <motion.div
                key="file-list"
                initial={false}
                animate={{ height: 'auto' }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="space-y-2 overflow-hidden"
              >
                {visibleFiles.map((file) => (
                  <div
                    key={file.path}
                    onClick={() => onFileClick?.(file.path)}
                    className={`flex items-center justify-between gap-2 rounded-2xl bg-white/5 px-3 py-2 text-sm text-white ring-1 ring-white/10 ${
                      onFileClick ? 'cursor-pointer hover:bg-white/10' : ''
                    }`}
                  >
                    <div className="min-w-0 truncate text-white/80">{file.path}</div>
                    <span
                      className={`rounded-full bg-white/5 px-2.5 py-1 text-xs ring-1 ring-white/10 ${getStatusColor(
                        file.status
                      )}`}
                    >
                      {file.status}
                    </span>
                  </div>
                ))}
              </motion.div>
            </AnimatePresence>

            {showExpansionToggle && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-1.5 w-full justify-center py-2 text-xs text-white/60 hover:text-white/80 transition-colors"
              >
                <motion.span
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                >
                  <ChevronDown className="h-4 w-4" />
                </motion.span>
                {toggleLabel}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
