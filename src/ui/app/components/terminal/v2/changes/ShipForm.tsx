/**
 * ShipForm - Commit, push, and PR creation form
 *
 * Multi-step form for shipping changes with:
 * - Commit message textarea (required for uncommitted changes)
 * - "Push to remote" checkbox
 * - "Create Pull Request" checkbox (requires push)
 * - Target branch dropdown (when creating PR)
 * - PR title and description fields
 * - "Generate with AI" button for PR content
 * - Existing PR display if one already exists
 *
 * Handles validation:
 * - Commit message required if there are uncommitted changes
 * - Can ship without message if only pushing existing commits
 *
 * Accessibility:
 * - aria-label on all buttons
 * - aria-busy during loading states
 * - aria-required on commit message
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Loader2,
  Sparkles,
  GitBranch,
  ChevronDown,
  ExternalLink,
  Rocket,
  ArrowLeft,
} from 'lucide-react';
import { cn } from '../../../../lib/cn';

interface ExistingPR {
  url: string;
  number: number;
  title: string;
  state: string;
}

interface ShipFormProps {
  // Form state
  commitMessage: string;
  onCommitMessageChange: (value: string) => void;
  shouldPush: boolean;
  onShouldPushChange: (value: boolean) => void;
  shouldCreatePR: boolean;
  onShouldCreatePRChange: (value: boolean) => void;
  prTitle: string;
  onPrTitleChange: (value: string) => void;
  prDescription: string;
  onPrDescriptionChange: (value: string) => void;
  targetBranch: string;
  onTargetBranchChange: (value: string) => void;
  availableBranches: string[];
  currentBranch?: string;

  // Actions
  onGenerate: () => void;
  onShip: () => void;
  onCancel: () => void;

  // State
  isGenerating: boolean;
  isShipping: boolean;
  existingPR?: ExistingPR | null;
  error?: string | null;

  // Flags
  hasUncommittedChanges: boolean;
  unpushedCommits: number;
}

export function ShipForm({
  commitMessage,
  onCommitMessageChange,
  shouldPush,
  onShouldPushChange,
  shouldCreatePR,
  onShouldCreatePRChange,
  prTitle,
  onPrTitleChange,
  prDescription,
  onPrDescriptionChange,
  targetBranch,
  onTargetBranchChange,
  availableBranches,
  currentBranch,
  onGenerate,
  onShip,
  onCancel,
  isGenerating,
  isShipping,
  existingPR,
  error,
  hasUncommittedChanges,
  unpushedCommits,
}: ShipFormProps) {
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);

  // Can ship if:
  // 1. Has uncommitted changes AND commit message is provided, OR
  // 2. Has only unpushed commits (no new commit needed)
  const hasOnlyUnpushedCommits = !hasUncommittedChanges && unpushedCommits > 0;
  const canShip = hasOnlyUnpushedCommits || (hasUncommittedChanges && commitMessage.trim());

  return (
    <div className="space-y-4">
      {/* Back button header */}
      <button
        onClick={onCancel}
        className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white/70 transition-colors"
        aria-label="Go back"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to changes
      </button>

      {/* Commit Message - only show if there are uncommitted changes */}
      {hasUncommittedChanges ? (
        <div>
          <label className="block text-xs font-medium text-white/55 mb-1.5">
            Commit Message <span className="text-red-400">*</span>
          </label>
          <textarea
            value={commitMessage}
            onChange={(e) => onCommitMessageChange(e.target.value)}
            placeholder="Describe your changes..."
            className="w-full rounded-xl bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/35 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-white/20 resize-none"
            rows={2}
            aria-label="Commit message"
            aria-required="true"
          />
        </div>
      ) : unpushedCommits > 0 ? (
        <div className="rounded-xl bg-blue-500/10 ring-1 ring-blue-500/20 p-3">
          <p className="text-sm text-blue-400">
            All changes are committed. Ready to push {unpushedCommits} commit{unpushedCommits !== 1 ? 's' : ''} to remote.
          </p>
        </div>
      ) : null}

      {/* Push checkbox */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={shouldPush}
          onChange={(e) => onShouldPushChange(e.target.checked)}
          className="rounded border-white/20 bg-white/5 text-purple-600 focus:ring-purple-500"
        />
        <span className="text-sm text-white/70">Push to remote</span>
      </label>

      {/* Existing PR or Create PR */}
      {existingPR ? (
        <div className="rounded-xl bg-green-500/10 ring-1 ring-green-500/20 p-3">
          <div className="flex items-start gap-2">
            <ExternalLink className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-green-400">
                  PR #{existingPR.number}
                </span>
                <span
                  className={cn(
                    'px-1.5 py-0.5 rounded-full text-xs font-medium',
                    existingPR.state === 'open' || existingPR.state === 'opened'
                      ? 'bg-green-500/20 text-green-400'
                      : existingPR.state === 'merged'
                      ? 'bg-purple-500/20 text-purple-400'
                      : 'bg-white/10 text-white/50'
                  )}
                >
                  {existingPR.state}
                </span>
              </div>
              <p className="text-sm text-green-400/70 truncate mt-0.5">
                {existingPR.title}
              </p>
              <a
                href={existingPR.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-green-400 hover:text-green-300 mt-1.5"
              >
                View Pull Request
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Create PR checkbox */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={shouldCreatePR}
              onChange={(e) => onShouldCreatePRChange(e.target.checked)}
              disabled={!shouldPush}
              className="rounded border-white/20 bg-white/5 text-purple-600 focus:ring-purple-500 disabled:opacity-50"
            />
            <span className={cn('text-sm', shouldPush ? 'text-white/70' : 'text-white/40')}>
              Create Pull Request
            </span>
          </label>

          {/* PR Form */}
          {shouldCreatePR && shouldPush && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="pl-4 space-y-3 border-l-2 border-purple-500/30"
            >
              {/* Target Branch */}
              <div className="relative">
                <label className="block text-xs font-medium text-white/55 mb-1.5">
                  Target Branch
                </label>
                <button
                  onClick={() => setShowBranchDropdown(!showBranchDropdown)}
                  className="flex items-center justify-between w-full rounded-xl bg-white/5 px-3 py-2 text-sm text-white ring-1 ring-white/10 hover:bg-white/10"
                >
                  <span className="flex items-center gap-2">
                    <GitBranch className="h-4 w-4 text-white/40" />
                    {targetBranch || 'main'}
                  </span>
                  <ChevronDown className="h-4 w-4 text-white/40" />
                </button>
                {showBranchDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 rounded-xl bg-[#0d1117] ring-1 ring-white/10 shadow-lg z-10 max-h-40 overflow-y-auto">
                    {availableBranches
                      .filter((b) => b !== currentBranch)
                      .map((branch) => (
                        <button
                          key={branch}
                          onClick={() => {
                            onTargetBranchChange(branch);
                            setShowBranchDropdown(false);
                          }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left text-white/70 hover:bg-white/10"
                        >
                          <GitBranch className="h-4 w-4 text-white/40" />
                          {branch}
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {/* PR Title */}
              <div>
                <label className="block text-xs font-medium text-white/55 mb-1.5">
                  Title
                </label>
                <input
                  type="text"
                  value={prTitle}
                  onChange={(e) => onPrTitleChange(e.target.value)}
                  placeholder="PR title..."
                  className="w-full rounded-xl bg-white/5 px-3 py-2 text-sm text-white placeholder-white/35 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
                />
              </div>

              {/* PR Description */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-white/55">
                    Description
                  </label>
                  <button
                    onClick={onGenerate}
                    disabled={isGenerating}
                    className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 disabled:opacity-50"
                    aria-label="Generate PR content with AI"
                  >
                    {isGenerating ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                    Generate
                  </button>
                </div>
                <textarea
                  value={prDescription}
                  onChange={(e) => onPrDescriptionChange(e.target.value)}
                  placeholder="Describe your changes..."
                  className="w-full rounded-xl bg-white/5 px-3 py-2 text-sm text-white placeholder-white/35 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-white/20 resize-none"
                  rows={3}
                />
              </div>
            </motion.div>
          )}
        </>
      )}

      {/* Error display */}
      {error && (
        <div className="rounded-xl bg-red-500/10 ring-1 ring-red-500/20 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2 pt-2">
        <button
          onClick={onCancel}
          className="flex-1 rounded-xl bg-white/5 py-2.5 text-sm text-white/70 ring-1 ring-white/10 hover:bg-white/10"
          aria-label="Cancel"
        >
          Cancel
        </button>
        <button
          onClick={onShip}
          disabled={!canShip || isShipping}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-purple-600 py-2.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Ship changes"
          aria-busy={isShipping}
        >
          {isShipping ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Shipping...
            </>
          ) : (
            <>
              <Rocket className="h-4 w-4" />
              Ship It
            </>
          )}
        </button>
      </div>
    </div>
  );
}
