/**
 * PromoteModal - Two-step flow for graduating an idea to a project
 *
 * Step 1: Setup (project name, directory, scaffold options)
 * Step 2: Review & Confirm
 *
 * Glassmorphism, purple accent.
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Rocket,
  ChevronRight,
  ChevronLeft,
  FolderOpen,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '../../lib/cn';
import type { Idea, PromoteOptions } from '../../../../types';

interface PromoteModalProps {
  idea: Idea;
  onPromote: (opts: PromoteOptions) => Promise<void>;
  onClose: () => void;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50) || 'my-project';
}

export function PromoteModal({ idea, onPromote, onClose }: PromoteModalProps) {
  const [step, setStep] = useState(1);
  const [repoName, setRepoName] = useState(
    idea.title ? slugify(idea.title) : 'my-project'
  );
  const [directory, setDirectory] = useState('');
  const [generateScaffold, setGenerateScaffold] = useState(false);
  const [transferHistory, setTransferHistory] = useState(true);
  const [isPromoting, setIsPromoting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handlePromote = useCallback(async () => {
    if (!repoName.trim() || !directory.trim()) return;

    setIsPromoting(true);
    setError(null);
    try {
      await onPromote({
        repoName: repoName.trim(),
        directory: directory.trim(),
        generateScaffold,
        transferHistory,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Promotion failed');
      setIsPromoting(false);
    }
  }, [repoName, directory, generateScaffold, transferHistory, onPromote]);

  const canProceed = repoName.trim().length > 0 && directory.trim().length > 0;

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
        className="relative w-full max-w-[560px] rounded-2xl bg-[#0d1117] ring-1 ring-white/10 shadow-2xl overflow-hidden"
        role="dialog"
        aria-label="Promote idea to project"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-purple-500/10 ring-1 ring-purple-500/20">
              <Rocket className="h-4 w-4 text-purple-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Promote to Project</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-white/5">
          <div className={cn(
            'flex items-center gap-1.5 text-xs font-medium',
            step === 1 ? 'text-purple-400' : 'text-white/30'
          )}>
            <span className={cn(
              'flex items-center justify-center h-5 w-5 rounded-full text-[10px]',
              step === 1 ? 'bg-purple-500/20 ring-1 ring-purple-500/30' : 'bg-white/5'
            )}>1</span>
            Setup
          </div>
          <ChevronRight className="h-3 w-3 text-white/20" />
          <div className={cn(
            'flex items-center gap-1.5 text-xs font-medium',
            step === 2 ? 'text-purple-400' : 'text-white/30'
          )}>
            <span className={cn(
              'flex items-center justify-center h-5 w-5 rounded-full text-[10px]',
              step === 2 ? 'bg-purple-500/20 ring-1 ring-purple-500/30' : 'bg-white/5'
            )}>2</span>
            Confirm
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-5"
              >
                {/* Project name */}
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1.5">
                    Project Name
                  </label>
                  <input
                    ref={nameInputRef}
                    value={repoName}
                    onChange={(e) => setRepoName(e.target.value)}
                    placeholder="my-awesome-project"
                    className="w-full rounded-xl bg-white/[0.04] ring-1 ring-white/[0.08] px-4 py-2.5 text-sm text-white/90 placeholder-white/30 outline-none focus:ring-purple-500/30 transition-all"
                  />
                </div>

                {/* Directory */}
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1.5">
                    Repository Location
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      value={directory}
                      onChange={(e) => setDirectory(e.target.value)}
                      placeholder="/path/to/workspace"
                      className="flex-1 rounded-xl bg-white/[0.04] ring-1 ring-white/[0.08] px-4 py-2.5 text-sm text-white/90 placeholder-white/30 outline-none focus:ring-purple-500/30 transition-all"
                    />
                    <button
                      className="flex items-center justify-center h-10 w-10 rounded-xl bg-white/[0.04] ring-1 ring-white/[0.08] text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
                      title="Browse"
                    >
                      <FolderOpen className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="mt-1 text-[11px] text-white/30">
                    Project will be created at: {directory ? `${directory}/${repoName}` : '<select a location>'}
                  </p>
                </div>

                {/* Options */}
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={generateScaffold}
                      onChange={(e) => setGenerateScaffold(e.target.checked)}
                      className="h-4 w-4 rounded border-white/20 bg-white/5 text-purple-500 focus:ring-purple-500/30"
                    />
                    <span className="text-sm text-white/70 group-hover:text-white/90 transition-colors">
                      Generate project scaffold (README, .gitignore)
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={transferHistory}
                      onChange={(e) => setTransferHistory(e.target.checked)}
                      className="h-4 w-4 rounded border-white/20 bg-white/5 text-purple-500 focus:ring-purple-500/30"
                    />
                    <span className="text-sm text-white/70 group-hover:text-white/90 transition-colors">
                      Transfer chat history to new session
                    </span>
                  </label>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {/* Summary */}
                <div className="rounded-xl bg-white/[0.03] ring-1 ring-white/[0.06] p-4 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/50">Project Name</span>
                    <span className="text-white font-medium">{repoName}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/50">Location</span>
                    <span className="text-white/80 font-mono text-xs">{directory}/{repoName}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/50">Scaffold</span>
                    <span className="text-white/70">{generateScaffold ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/50">Transfer History</span>
                    <span className="text-white/70">{transferHistory ? 'Yes' : 'No'}</span>
                  </div>
                </div>

                {/* Warning */}
                <div className="flex items-start gap-3 rounded-xl bg-amber-500/5 ring-1 ring-amber-500/10 px-4 py-3">
                  <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-200/70">
                    This will mark the idea as Promoted and create a new session with the repository.
                  </p>
                </div>

                {/* Error */}
                {error && (
                  <div className="flex items-start gap-3 rounded-xl bg-red-500/10 ring-1 ring-red-500/20 px-4 py-3">
                    <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-red-200/80">{error}</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10">
          <div>
            {step === 2 && (
              <button
                onClick={() => setStep(1)}
                disabled={isPromoting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm text-white/60 hover:text-white/80 hover:bg-white/5 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isPromoting}
              className="px-4 py-2 rounded-xl text-sm text-white/60 hover:text-white/80 hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>

            {step === 1 ? (
              <button
                onClick={() => setStep(2)}
                disabled={!canProceed}
                className={cn(
                  'flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-medium transition-all',
                  canProceed
                    ? 'bg-purple-500/20 text-purple-200 ring-1 ring-purple-500/30 hover:bg-purple-500/30'
                    : 'bg-white/5 text-white/30 cursor-not-allowed'
                )}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={handlePromote}
                disabled={isPromoting}
                className={cn(
                  'flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-medium transition-all',
                  isPromoting
                    ? 'bg-purple-500/10 text-purple-300/50 cursor-wait'
                    : 'bg-purple-500/20 text-purple-200 ring-1 ring-purple-500/30 hover:bg-purple-500/30'
                )}
              >
                {isPromoting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Rocket className="h-4 w-4" />
                    Create Project
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
