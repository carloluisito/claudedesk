import { useState, useEffect, useRef } from 'react';
import {
  Search,
  FolderPlus,
  GitMerge,
  Check,
  X,
  FileDown,
  FileJson,
} from 'lucide-react';
import { cn } from '../../lib/cn';

// Split View Session Selector Modal
interface SplitSessionSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: { id: string; repoId: string; repoIds?: string[]; isMultiRepo?: boolean }[];
  currentSessionId: string | null;
  onSelect: (sessionId: string) => void;
}

export function SplitSessionSelector({
  isOpen,
  onClose,
  sessions,
  currentSessionId,
  onSelect,
}: SplitSessionSelectorProps) {
  if (!isOpen) return null;

  const availableSessions = sessions.filter((s) => s.id !== currentSessionId);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-zinc-700 bg-zinc-900 p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-zinc-100 mb-3">
          Select Session for Split View
        </h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {availableSessions.length === 0 ? (
            <p className="text-zinc-500 text-sm text-center py-4">
              No other sessions available. Create another session first.
            </p>
          ) : (
            availableSessions.map((session) => (
              <button
                key={session.id}
                onClick={() => {
                  onSelect(session.id);
                  onClose();
                }}
                className="w-full px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-left text-sm text-zinc-200 flex items-center gap-2"
              >
                <span>{session.repoIds?.[0] || session.repoId}</span>
                {session.isMultiRepo && (
                  <span className="px-1.5 py-0.5 text-xs bg-blue-600/20 text-blue-400 rounded">
                    +{(session.repoIds?.length || 1) - 1}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
        <button
          onClick={onClose}
          className="mt-4 w-full py-2 rounded-lg border border-zinc-700 text-zinc-400 text-sm hover:bg-zinc-800"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// Add Repository Modal
interface AddRepoModalProps {
  isOpen: boolean;
  onClose: () => void;
  repos: { id: string; path: string }[];
  currentRepoIds: string[];
  onAdd: (repoId: string) => void;
}

export function AddRepoModal({
  isOpen,
  onClose,
  repos,
  currentRepoIds,
  onAdd,
}: AddRepoModalProps) {
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setHighlightedIndex(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const availableRepos = repos.filter(
    (repo) =>
      !currentRepoIds.includes(repo.id) &&
      (repo.id.toLowerCase().includes(search.toLowerCase()) ||
        repo.path.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-3">
          <FolderPlus className="h-5 w-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-zinc-100">Add Repository</h3>
        </div>
        <p className="text-sm text-zinc-500 mb-3">
          Add another repository to this session for cross-repo context.
        </p>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setHighlightedIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setHighlightedIndex((prev) => Math.min(prev + 1, availableRepos.length - 1));
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                setHighlightedIndex((prev) => Math.max(prev - 1, 0));
              }
              if (e.key === 'Enter' && availableRepos[highlightedIndex]) {
                onAdd(availableRepos[highlightedIndex].id);
                onClose();
              }
              if (e.key === 'Escape') onClose();
            }}
            placeholder="Search repositories..."
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 pl-9 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
            autoFocus
          />
        </div>

        <div className="max-h-64 overflow-y-auto space-y-1">
          {availableRepos.length === 0 ? (
            <p className="text-zinc-500 text-sm text-center py-4">
              {currentRepoIds.length === repos.length
                ? 'All repositories are already in this session.'
                : 'No matching repositories found.'}
            </p>
          ) : (
            availableRepos.map((repo, index) => (
              <button
                key={repo.id}
                onClick={() => {
                  onAdd(repo.id);
                  onClose();
                }}
                className={cn(
                  'w-full px-3 py-2 rounded-lg text-left text-sm',
                  index === highlightedIndex
                    ? 'bg-blue-600 text-white'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                )}
              >
                <p className="font-medium">{repo.id}</p>
                <p className="text-xs opacity-70 truncate">{repo.path}</p>
              </button>
            ))
          )}
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full py-2 rounded-lg border border-zinc-700 text-zinc-400 text-sm hover:bg-zinc-800"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// Merge Sessions Modal
interface MergeSessionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: { id: string; repoId: string; repoIds?: string[]; isMultiRepo?: boolean }[];
  currentSessionId: string | null;
  onMerge: (sessionIds: string[]) => void;
}

export function MergeSessionsModal({
  isOpen,
  onClose,
  sessions,
  currentSessionId,
  onMerge,
}: MergeSessionsModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen && currentSessionId) {
      setSelectedIds([currentSessionId]);
    }
  }, [isOpen, currentSessionId]);

  if (!isOpen) return null;

  const toggleSession = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleMerge = () => {
    if (selectedIds.length >= 2) {
      onMerge(selectedIds);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-3">
          <GitMerge className="h-5 w-5 text-purple-400" />
          <h3 className="text-lg font-semibold text-zinc-100">Merge Sessions</h3>
        </div>
        <p className="text-sm text-zinc-500 mb-3">
          Select sessions to merge. This will combine their repositories into a single
          session with fresh history.
        </p>

        <div className="max-h-64 overflow-y-auto space-y-1">
          {sessions.map((session) => {
            const isSelected = selectedIds.includes(session.id);
            const isCurrent = session.id === currentSessionId;
            return (
              <button
                key={session.id}
                onClick={() => toggleSession(session.id)}
                className={cn(
                  'w-full px-3 py-2 rounded-lg text-left text-sm flex items-center gap-3',
                  isSelected
                    ? 'bg-purple-600 text-white'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                )}
              >
                <div
                  className={cn(
                    'w-5 h-5 rounded border flex items-center justify-center flex-shrink-0',
                    isSelected ? 'bg-white border-white' : 'border-zinc-600'
                  )}
                >
                  {isSelected && <Check className="h-3 w-3 text-purple-600" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">
                      {session.repoIds?.[0] || session.repoId}
                    </span>
                    {session.isMultiRepo && (
                      <span
                        className={cn(
                          'px-1.5 py-0.5 text-xs rounded',
                          isSelected ? 'bg-white/20' : 'bg-blue-600/20 text-blue-400'
                        )}
                      >
                        +{(session.repoIds?.length || 1) - 1}
                      </span>
                    )}
                    {isCurrent && (
                      <span
                        className={cn(
                          'px-1.5 py-0.5 text-xs rounded',
                          isSelected ? 'bg-white/20' : 'bg-zinc-700 text-zinc-400'
                        )}
                      >
                        current
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-zinc-700 text-zinc-400 text-sm hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            onClick={handleMerge}
            disabled={selectedIds.length < 2}
            className="flex-1 py-2 rounded-lg bg-purple-600 text-white text-sm disabled:bg-zinc-700 disabled:text-zinc-500"
          >
            Merge {selectedIds.length} Sessions
          </button>
        </div>
      </div>
    </div>
  );
}

// Session Tab Context Menu
interface SessionContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onAddRepo: () => void;
  onMerge: () => void;
  onCloseSession: () => void;
  onExportMarkdown: () => void;
  onExportJson: () => void;
}

export function SessionContextMenu({
  isOpen,
  position,
  onClose,
  onAddRepo,
  onMerge,
  onCloseSession,
  onExportMarkdown,
  onExportJson,
}: SessionContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-48 rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl py-1"
      style={{ top: position.y, left: position.x }}
    >
      <button
        onClick={() => {
          onAddRepo();
          onClose();
        }}
        className="w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800 flex items-center gap-2"
      >
        <FolderPlus className="h-4 w-4 text-blue-400" />
        Add Repository...
      </button>
      <button
        onClick={() => {
          onMerge();
          onClose();
        }}
        className="w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800 flex items-center gap-2"
      >
        <GitMerge className="h-4 w-4 text-purple-400" />
        Merge with...
      </button>
      <div className="border-t border-zinc-800 my-1" />
      <button
        onClick={() => {
          onExportMarkdown();
          onClose();
        }}
        className="w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800 flex items-center gap-2"
      >
        <FileDown className="h-4 w-4 text-green-400" />
        Export as Markdown
      </button>
      <button
        onClick={() => {
          onExportJson();
          onClose();
        }}
        className="w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800 flex items-center gap-2"
      >
        <FileJson className="h-4 w-4 text-orange-400" />
        Export as JSON
      </button>
      <div className="border-t border-zinc-800 my-1" />
      <button
        onClick={() => {
          onCloseSession();
          onClose();
        }}
        className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-zinc-800 flex items-center gap-2"
      >
        <X className="h-4 w-4" />
        Close Session
      </button>
    </div>
  );
}
