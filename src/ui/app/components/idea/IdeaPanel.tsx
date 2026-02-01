/**
 * IdeaPanel - Right sidebar for browsing ideas
 *
 * Toggle via Ctrl+B. 320px on desktop, full-screen on mobile.
 * Purple accent, glassmorphism.
 */
import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Lightbulb,
  Search,
  X,
  Plus,
} from 'lucide-react';
import { cn } from '../../lib/cn';
import { useIdeaStore } from '../../store/ideaStore';
import { IdeaList } from './IdeaList';

interface IdeaPanelProps {
  onClose: () => void;
}

export function IdeaPanel({ onClose }: IdeaPanelProps) {
  const {
    ideas,
    activeIdeaId,
    switchIdea,
    createIdea,
    ideaPanelSearch,
    setIdeaPanelSearch,
  } = useIdeaStore();

  const searchRef = useRef<HTMLInputElement>(null);

  // Focus search on open
  useEffect(() => {
    if (searchRef.current) {
      searchRef.current.focus();
    }
  }, []);

  // Handle Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <motion.aside
      initial={{ x: 320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 320, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className={cn(
        'relative flex flex-col border-l border-purple-500/10 bg-[#080b11]/95 backdrop-blur-xl',
        'w-full sm:w-[320px] flex-shrink-0'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-purple-500/10">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-purple-400" />
          <h2 className="text-sm font-semibold text-white/90">Ideas</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="flex items-center gap-2 rounded-lg bg-white/[0.04] ring-1 ring-white/[0.08] px-3 py-2 focus-within:ring-purple-500/30 transition-all">
          <Search className="h-3.5 w-3.5 text-white/30" />
          <input
            ref={searchRef}
            value={ideaPanelSearch}
            onChange={(e) => setIdeaPanelSearch(e.target.value)}
            placeholder="Search ideas..."
            className="flex-1 bg-transparent text-sm text-white/80 placeholder-white/30 outline-none"
          />
          {ideaPanelSearch && (
            <button
              onClick={() => setIdeaPanelSearch('')}
              className="text-white/30 hover:text-white/60"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Idea list */}
      <IdeaList
        ideas={ideas}
        activeIdeaId={activeIdeaId}
        searchQuery={ideaPanelSearch}
        onIdeaClick={(id) => switchIdea(id)}
      />

      {/* New Idea button */}
      <div className="px-3 py-3 border-t border-purple-500/10">
        <button
          onClick={() => createIdea()}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-purple-500/10 px-4 py-2.5 text-sm font-medium text-purple-300 ring-1 ring-purple-500/20 hover:bg-purple-500/15 transition-all"
        >
          <Plus className="h-4 w-4" />
          New Idea
          <kbd className="ml-1 px-1 py-0.5 rounded bg-purple-500/10 text-[10px] text-purple-400/60 font-mono">
            Ctrl+I
          </kbd>
        </button>
      </div>
    </motion.aside>
  );
}
