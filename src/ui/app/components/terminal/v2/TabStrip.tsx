import { Terminal, GitBranch, ChevronRight, Loader2, X, Bookmark, BookmarkCheck } from 'lucide-react';
import { cn } from '../../../lib/cn';

export interface SessionTab {
  id: string;
  name: string;
  repo: string;
  branch?: string;
  dirtyFiles: number;
  pinned?: boolean;
  isMultiRepo?: boolean;
  repoCount?: number;
  isRunning?: boolean;
  isBookmarked?: boolean;
  worktreeMode?: boolean;
}

interface TabStripProps {
  tabs: SessionTab[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onClose?: (id: string) => void;
  onToggleBookmark?: (id: string) => void;
  onContextMenu?: (e: React.MouseEvent, sessionId: string) => void;
}

export function TabStrip({
  tabs,
  activeId,
  onSelect,
  onClose,
  onToggleBookmark,
  onContextMenu,
}: TabStripProps) {
  return (
    <div className="w-full px-6">
      <div className="rounded-3xl bg-white/5 p-2 ring-1 ring-white/10">
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
          {tabs.map((t, index) => {
            const active = t.id === activeId;
            return (
              <div
                key={t.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(t.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(t.id);
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onContextMenu?.(e, t.id);
                }}
                className={cn(
                  'group flex min-w-[160px] sm:min-w-[240px] items-center justify-between gap-3 rounded-2xl px-3 py-2 text-left ring-1 transition cursor-pointer',
                  active
                    ? 'bg-white text-black ring-white'
                    : 'bg-white/5 text-white ring-white/10 hover:bg-white/10'
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'truncate text-sm font-semibold',
                        active ? 'text-black' : 'text-white'
                      )}
                      title={`${t.name} • ${t.repo}${t.branch ? ` • ${t.branch}` : ''} • ⌘${index + 1}`}
                    >
                      {t.name}
                    </span>
                    {t.isRunning && (
                      <Loader2
                        className={cn('h-3 w-3 animate-spin', active ? 'text-black/60' : 'text-white/60')}
                      />
                    )}
                    {t.isBookmarked && (
                      <BookmarkCheck
                        className={cn('h-3 w-3', active ? 'text-yellow-600' : 'text-yellow-500')}
                      />
                    )}
                    {t.isMultiRepo && t.repoCount && t.repoCount > 1 && (
                      <span
                        className={cn(
                          'px-1.5 py-0.5 text-xs rounded',
                          active ? 'bg-black/10 text-black' : 'bg-blue-600/20 text-blue-400'
                        )}
                        title={`Multi-repo: ${t.repoCount} repositories`}
                      >
                        +{t.repoCount - 1}
                      </span>
                    )}
                    {t.worktreeMode && (
                      <span
                        className={cn(
                          'px-1.5 py-0.5 text-xs rounded',
                          active ? 'bg-purple-500/20 text-purple-700' : 'bg-purple-600/20 text-purple-400'
                        )}
                        title="Worktree mode"
                      >
                        worktree
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {t.dirtyFiles > 0 && (
                    <span
                      className={cn(
                        'rounded-full px-2 py-1 text-xs ring-1',
                        active
                          ? 'bg-black/5 text-black ring-black/10'
                          : 'bg-white/5 text-white/70 ring-white/10'
                      )}
                    >
                      <span className="font-semibold">{t.dirtyFiles}</span>
                      <span className="ml-1">changes</span>
                    </span>
                  )}
                  {onToggleBookmark && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleBookmark(t.id);
                      }}
                      className={cn(
                        'rounded p-1 sm:p-0.5 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center',
                        active ? 'hover:bg-black/10' : 'hover:bg-white/10'
                      )}
                      title={t.isBookmarked ? 'Remove bookmark' : 'Bookmark session'}
                    >
                      {t.isBookmarked ? (
                        <BookmarkCheck className="h-4 w-4 sm:h-3 sm:w-3 text-yellow-500" />
                      ) : (
                        <Bookmark className={cn('h-4 w-4 sm:h-3 sm:w-3', active ? 'text-black/60' : 'text-white/60')} />
                      )}
                    </button>
                  )}
                  {onClose && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onClose(t.id);
                      }}
                      className={cn(
                        'rounded p-1 sm:p-0.5 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center',
                        active ? 'hover:bg-black/10' : 'hover:bg-white/10'
                      )}
                    >
                      <X className={cn('h-4 w-4 sm:h-3 sm:w-3', active ? 'text-black/60' : 'text-white/60')} />
                    </button>
                  )}
                  <ChevronRight
                    className={cn('h-4 w-4 opacity-60', active ? 'text-black/60' : 'text-white/60')}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
