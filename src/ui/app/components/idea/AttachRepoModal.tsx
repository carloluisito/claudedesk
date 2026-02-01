/**
 * AttachRepoModal - Link an idea to an existing repository
 *
 * Single-step modal: search + select repo.
 * Glassmorphism, purple accent.
 */
import { useState, useRef, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  Search,
  FolderGit2,
  Check,
  Info,
} from 'lucide-react';
import { cn } from '../../lib/cn';
import type { Idea } from '../../../../types';

interface RepoItem {
  id: string;
  path?: string;
}

interface AttachRepoModalProps {
  idea: Idea;
  repos: RepoItem[];
  onAttach: (repoId: string) => void;
  onClose: () => void;
}

export function AttachRepoModal({ idea, repos, onAttach, onClose }: AttachRepoModalProps) {
  const [search, setSearch] = useState('');
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  // Handle Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const filteredRepos = useMemo(() => {
    const alreadyAttached = new Set(idea.attachedRepoIds || []);
    return repos
      .filter(r => !alreadyAttached.has(r.id))
      .filter(r => {
        if (!search.trim()) return true;
        return r.id.toLowerCase().includes(search.toLowerCase());
      });
  }, [repos, search, idea.attachedRepoIds]);

  const needsSave = idea.status === 'ephemeral';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-[520px] rounded-2xl bg-[#0d1117] ring-1 ring-white/10 shadow-2xl overflow-hidden"
        role="dialog"
        aria-label="Attach repository"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">Attach Repository</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Save gate */}
        {needsSave && (
          <div className="mx-6 mt-4 flex items-start gap-3 rounded-xl bg-amber-500/10 ring-1 ring-amber-500/20 px-4 py-3">
            <Info className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-amber-200/80">
              Save this idea before attaching a repository.
            </p>
          </div>
        )}

        {/* Info banner */}
        <div className="mx-6 mt-4 flex items-start gap-3 rounded-xl bg-purple-500/5 ring-1 ring-purple-500/10 px-4 py-3">
          <Info className="h-4 w-4 text-purple-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-white/50">
            Attaching won't modify your repository. Claude will have read-only context.
          </p>
        </div>

        {/* Search */}
        <div className="px-6 mt-4">
          <div className="flex items-center gap-2 rounded-xl bg-white/[0.04] ring-1 ring-white/[0.08] px-4 py-2.5 focus-within:ring-purple-500/30 transition-all">
            <Search className="h-4 w-4 text-white/30" />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search repositories..."
              className="flex-1 bg-transparent text-sm text-white/80 placeholder-white/30 outline-none"
              disabled={needsSave}
            />
          </div>
        </div>

        {/* Repo list */}
        <div className="px-6 py-4 max-h-[300px] overflow-y-auto space-y-1">
          {filteredRepos.length === 0 ? (
            <p className="text-center text-sm text-white/30 py-8">
              {search ? 'No repositories match your search.' : 'No repositories available.'}
            </p>
          ) : (
            filteredRepos.map((repo) => {
              const isSelected = repo.id === selectedRepoId;
              return (
                <button
                  key={repo.id}
                  onClick={() => setSelectedRepoId(isSelected ? null : repo.id)}
                  disabled={needsSave}
                  className={cn(
                    'w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all ring-1',
                    isSelected
                      ? 'bg-purple-500/10 ring-purple-500/30 text-white'
                      : 'bg-white/[0.02] ring-white/[0.06] text-white/70 hover:bg-white/[0.04]',
                    needsSave && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <FolderGit2 className={cn(
                    'h-4 w-4 flex-shrink-0',
                    isSelected ? 'text-purple-400' : 'text-white/40'
                  )} />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium truncate block">
                      {repo.id}
                    </span>
                  </div>
                  {isSelected && (
                    <Check className="h-4 w-4 text-purple-400 flex-shrink-0" />
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm text-white/60 hover:text-white/80 hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => selectedRepoId && onAttach(selectedRepoId)}
            disabled={!selectedRepoId || needsSave}
            className={cn(
              'px-5 py-2 rounded-xl text-sm font-medium transition-all',
              selectedRepoId && !needsSave
                ? 'bg-purple-500/20 text-purple-200 ring-1 ring-purple-500/30 hover:bg-purple-500/30'
                : 'bg-white/5 text-white/30 cursor-not-allowed'
            )}
          >
            Attach Selected
          </button>
        </div>
      </motion.div>
    </div>
  );
}
