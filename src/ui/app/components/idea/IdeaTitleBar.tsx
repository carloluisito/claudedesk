/**
 * IdeaTitleBar - Title bar with inline editing and action buttons
 *
 * Purple accent, glassmorphism style. Actions: Save, Attach, Promote.
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Lightbulb,
  Save,
  Check,
  Link2,
  Rocket,
  X,
  FolderGit2,
  Loader2,
} from 'lucide-react';
import { cn } from '../../lib/cn';
import type { Idea } from '../../../../types';

interface IdeaTitleBarProps {
  idea: Idea;
  onUpdateTitle: (title: string) => void;
  onSave: () => void;
  onAttach: () => void;
  onDetach: (repoId: string) => void;
  onPromote: () => void;
  repoNames?: Record<string, string>; // repoId -> display name
}

export function IdeaTitleBar({
  idea,
  onUpdateTitle,
  onSave,
  onAttach,
  onDetach,
  onPromote,
  repoNames = {},
}: IdeaTitleBarProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(idea.title || 'Untitled Idea');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSubmitTitle = useCallback(() => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== idea.title) {
      onUpdateTitle(trimmed);
    }
    setIsEditing(false);
  }, [editValue, idea.title, onUpdateTitle]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmitTitle();
      } else if (e.key === 'Escape') {
        setEditValue(idea.title || 'Untitled Idea');
        setIsEditing(false);
      }
    },
    [handleSubmitTitle, idea.title]
  );

  const isSaved = idea.status === 'saved';
  const isRunning = idea.chatStatus === 'running';
  const hasAttachedRepos = idea.attachedRepoIds && idea.attachedRepoIds.length > 0;

  return (
    <div className="relative z-10 flex items-center gap-3 px-4 py-2.5 border-b border-purple-500/10 bg-[#0a0d14]/80 backdrop-blur-xl">
      {/* Lightbulb icon */}
      <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-purple-500/10 ring-1 ring-purple-500/20">
        <Lightbulb className="h-4 w-4 text-purple-400" />
      </div>

      {/* Title (editable) */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSubmitTitle}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent text-white font-medium text-sm border-b border-purple-500/40 outline-none focus:border-purple-500 py-0.5 px-0"
            maxLength={100}
          />
        ) : (
          <button
            onClick={() => {
              setEditValue(idea.title || 'Untitled Idea');
              setIsEditing(true);
            }}
            className="text-sm font-medium text-white/90 hover:text-white truncate max-w-[300px] transition-colors"
            title="Click to edit title"
          >
            {idea.title || 'Untitled Idea'}
          </button>
        )}

        {/* Attached repo badges */}
        {hasAttachedRepos && (
          <div className="flex items-center gap-1.5 mt-0.5">
            {idea.attachedRepoIds!.map((repoId) => (
              <span
                key={repoId}
                className="inline-flex items-center gap-1 text-[11px] text-white/50 bg-white/5 rounded px-1.5 py-0.5 ring-1 ring-white/10"
              >
                <FolderGit2 className="h-3 w-3" />
                <span className="truncate max-w-[100px]">
                  {repoNames[repoId] || repoId}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDetach(repoId);
                  }}
                  className="ml-0.5 hover:text-red-400 transition-colors"
                  title="Detach repository"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        {/* Save button */}
        <motion.button
          onClick={onSave}
          disabled={isSaved}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ring-1',
            isSaved
              ? 'text-emerald-400 bg-emerald-500/10 ring-emerald-500/20 cursor-default'
              : 'text-purple-300 bg-purple-500/10 ring-purple-500/20 hover:bg-purple-500/20 hover:text-purple-200'
          )}
          whileHover={isSaved ? {} : { scale: 1.02 }}
          whileTap={isSaved ? {} : { scale: 0.98 }}
        >
          {isSaved ? (
            <>
              <Check className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Saved</span>
            </>
          ) : (
            <>
              <Save className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Save</span>
            </>
          )}
        </motion.button>

        {/* Attach button */}
        <motion.button
          onClick={onAttach}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-purple-300 bg-purple-500/10 ring-1 ring-purple-500/20 hover:bg-purple-500/20 hover:text-purple-200 transition-all"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Link2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Attach</span>
        </motion.button>

        {/* Promote button */}
        <motion.button
          onClick={onPromote}
          disabled={isRunning}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ring-1',
            isRunning
              ? 'text-white/30 bg-white/5 ring-white/10 cursor-not-allowed'
              : 'text-purple-300 bg-purple-500/10 ring-purple-500/20 hover:bg-purple-500/20 hover:text-purple-200'
          )}
          whileHover={isRunning ? {} : { scale: 1.02 }}
          whileTap={isRunning ? {} : { scale: 0.98 }}
        >
          {isRunning ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Rocket className="h-3.5 w-3.5" />
          )}
          <span className="hidden sm:inline">Promote</span>
        </motion.button>
      </div>
    </div>
  );
}
