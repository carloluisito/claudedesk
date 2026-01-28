/**
 * SessionCreationCard - Inline expandable form for creating new sessions
 *
 * Replaces the modal pattern with an in-page card that expands at the top of the grid.
 * Uses a stepper flow: Workspace -> Repo -> Options -> Create
 */

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Plus, X, ChevronDown, ChevronRight, GitBranch, Loader2, Check, FolderPlus } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Surface } from '../../design-system/primitives/Surface';
import { VStack, HStack } from '../../design-system/primitives/Stack';
import { Text } from '../../design-system/primitives/Text';
import { WorkspacePicker } from './WorkspacePicker';
import { RepoGrid } from './RepoGrid';
import { WorktreeOptions } from './WorktreeOptions';

interface Workspace {
  id: string;
  name: string;
  path: string;
}

interface Repo {
  id: string;
  name: string;
  path: string;
  workspaceId: string;
}

interface SessionCreationCardProps {
  /** Whether the card is expanded */
  expanded?: boolean;
  /** Callback when expansion state changes */
  onExpandedChange?: (expanded: boolean) => void;
  /** Available workspaces */
  workspaces: Workspace[];
  /** Available repos */
  repos: Repo[];
  /** Whether app data is loading */
  isLoading?: boolean;
  /** Callback when session is created */
  onCreateSession: (
    repoIds: string[],
    options?: {
      worktreeMode: boolean;
      branch?: string;
      baseBranch?: string;
      existingWorktreePath?: string;
    }
  ) => void;
  /** Custom class names */
  className?: string;
}

type CreationStep = 'workspace' | 'repo' | 'options' | 'creating';

export function SessionCreationCard({
  expanded: controlledExpanded,
  onExpandedChange,
  workspaces,
  repos,
  isLoading = false,
  onCreateSession,
  className,
}: SessionCreationCardProps) {
  const prefersReduced = useReducedMotion();

  // Internal state
  const [internalExpanded, setInternalExpanded] = useState(false);
  const [step, setStep] = useState<CreationStep>('workspace');
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('');
  const [selectedRepoIds, setSelectedRepoIds] = useState<string[]>([]);
  const [worktreeMode, setWorktreeMode] = useState(false);
  const [worktreeConfig, setWorktreeConfig] = useState<{
    action: 'create' | 'existing';
    branch: string;
    baseBranch: string;
    existingPath: string;
  }>({
    action: 'create',
    branch: '',
    baseBranch: 'main',
    existingPath: '',
  });
  const [isCreating, setIsCreating] = useState(false);

  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;

  // Filter repos by workspace
  const filteredRepos = useMemo(() => {
    if (!selectedWorkspaceId) return repos;
    return repos.filter((r) => r.workspaceId === selectedWorkspaceId);
  }, [repos, selectedWorkspaceId]);

  // Handlers
  const handleToggle = useCallback(() => {
    const newState = !isExpanded;
    if (controlledExpanded === undefined) {
      setInternalExpanded(newState);
    }
    onExpandedChange?.(newState);
    if (!newState) {
      // Reset state when closing
      setStep('workspace');
      setSelectedRepoIds([]);
      setWorktreeMode(false);
    }
  }, [isExpanded, controlledExpanded, onExpandedChange]);

  const handleWorkspaceSelect = useCallback((id: string) => {
    setSelectedWorkspaceId(id);
    setSelectedRepoIds([]);
    setStep('repo');
  }, []);

  const handleRepoToggle = useCallback((repoId: string) => {
    setSelectedRepoIds((prev) =>
      prev.includes(repoId) ? prev.filter((id) => id !== repoId) : [...prev, repoId]
    );
  }, []);

  const handleContinueToOptions = useCallback(() => {
    if (selectedRepoIds.length > 0) {
      setStep('options');
    }
  }, [selectedRepoIds]);

  const handleCreate = useCallback(async () => {
    if (selectedRepoIds.length === 0) return;

    setIsCreating(true);

    let options = undefined;
    if (worktreeMode) {
      if (worktreeConfig.action === 'existing' && worktreeConfig.existingPath) {
        options = {
          worktreeMode: true,
          existingWorktreePath: worktreeConfig.existingPath,
        };
      } else if (worktreeConfig.action === 'create' && worktreeConfig.branch) {
        options = {
          worktreeMode: true,
          branch: worktreeConfig.branch,
          baseBranch: worktreeConfig.baseBranch || undefined,
        };
      }
    }

    try {
      await onCreateSession(selectedRepoIds, options);
      // Reset and close
      handleToggle();
    } finally {
      setIsCreating(false);
    }
  }, [selectedRepoIds, worktreeMode, worktreeConfig, onCreateSession, handleToggle]);

  const handleBack = useCallback(() => {
    if (step === 'repo') {
      setStep('workspace');
    } else if (step === 'options') {
      setStep('repo');
    }
  }, [step]);

  // Can proceed to create?
  const canCreate = selectedRepoIds.length > 0 && (!worktreeMode ||
    (worktreeConfig.action === 'existing' && worktreeConfig.existingPath) ||
    (worktreeConfig.action === 'create' && worktreeConfig.branch)
  );

  return (
    <div className={className}>
      <AnimatePresence mode="wait">
        {!isExpanded ? (
          // Collapsed trigger button
          <motion.button
            key="trigger"
            initial={prefersReduced ? {} : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={prefersReduced ? {} : { opacity: 0 }}
            onClick={handleToggle}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-2xl',
              'bg-white/5 px-4 py-3 text-sm font-medium text-white/70',
              'ring-1 ring-white/10 transition-colors',
              'hover:bg-white/10 hover:text-white'
            )}
          >
            <Plus className="h-4 w-4" />
            New Session
          </motion.button>
        ) : (
          // Expanded form
          <motion.div
            key="form"
            initial={prefersReduced ? {} : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={prefersReduced ? {} : { opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Surface variant="elevated" padding="none">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <HStack gap={2} align="center">
                  {step !== 'workspace' && (
                    <button
                      onClick={handleBack}
                      className="rounded-lg p-1 text-white/50 hover:bg-white/10 hover:text-white/70"
                    >
                      <ChevronRight className="h-4 w-4 rotate-180" />
                    </button>
                  )}
                  <Text variant="h4" color="primary">
                    {step === 'workspace' && 'Select Workspace'}
                    {step === 'repo' && 'Select Repository'}
                    {step === 'options' && 'Session Options'}
                    {step === 'creating' && 'Creating Session...'}
                  </Text>
                </HStack>
                <button
                  onClick={handleToggle}
                  className="rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white/70"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4">
                <AnimatePresence mode="wait">
                  {/* Step 1: Workspace Selection */}
                  {step === 'workspace' && (
                    <motion.div
                      key="workspace"
                      initial={prefersReduced ? {} : { opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={prefersReduced ? {} : { opacity: 0, x: -20 }}
                    >
                      <WorkspacePicker
                        workspaces={workspaces}
                        selectedId={selectedWorkspaceId}
                        onSelect={handleWorkspaceSelect}
                        isLoading={isLoading}
                      />
                    </motion.div>
                  )}

                  {/* Step 2: Repository Selection */}
                  {step === 'repo' && (
                    <motion.div
                      key="repo"
                      initial={prefersReduced ? {} : { opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={prefersReduced ? {} : { opacity: 0, x: -20 }}
                    >
                      <VStack gap={4}>
                        <RepoGrid
                          repos={filteredRepos}
                          selectedIds={selectedRepoIds}
                          onToggle={handleRepoToggle}
                          isLoading={isLoading}
                        />

                        <HStack justify="end">
                          <button
                            onClick={handleContinueToOptions}
                            disabled={selectedRepoIds.length === 0}
                            className={cn(
                              'flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium',
                              'transition-colors',
                              selectedRepoIds.length > 0
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'bg-white/10 text-white/30 cursor-not-allowed'
                            )}
                          >
                            Continue
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </HStack>
                      </VStack>
                    </motion.div>
                  )}

                  {/* Step 3: Options & Create */}
                  {step === 'options' && (
                    <motion.div
                      key="options"
                      initial={prefersReduced ? {} : { opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={prefersReduced ? {} : { opacity: 0, x: -20 }}
                    >
                      <VStack gap={4}>
                        {/* Selected repos summary */}
                        <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
                          <Text variant="bodySm" color="secondary">
                            {selectedRepoIds.length} {selectedRepoIds.length === 1 ? 'repository' : 'repositories'} selected
                          </Text>
                        </div>

                        {/* Worktree options (only for single repo) */}
                        {selectedRepoIds.length === 1 && (
                          <WorktreeOptions
                            enabled={worktreeMode}
                            onEnabledChange={setWorktreeMode}
                            action={worktreeConfig.action}
                            onActionChange={(action) => setWorktreeConfig((c) => ({ ...c, action }))}
                            branch={worktreeConfig.branch}
                            onBranchChange={(branch) => setWorktreeConfig((c) => ({ ...c, branch }))}
                            baseBranch={worktreeConfig.baseBranch}
                            onBaseBranchChange={(baseBranch) => setWorktreeConfig((c) => ({ ...c, baseBranch }))}
                            existingPath={worktreeConfig.existingPath}
                            onExistingPathChange={(existingPath) => setWorktreeConfig((c) => ({ ...c, existingPath }))}
                            repoId={selectedRepoIds[0]}
                          />
                        )}

                        {/* Create button */}
                        <HStack justify="end">
                          <button
                            onClick={handleCreate}
                            disabled={!canCreate || isCreating}
                            className={cn(
                              'flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold',
                              'transition-colors',
                              canCreate && !isCreating
                                ? 'bg-white text-black hover:bg-white/90'
                                : 'bg-white/10 text-white/30 cursor-not-allowed'
                            )}
                          >
                            {isCreating ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Creating...
                              </>
                            ) : (
                              <>
                                <Check className="h-4 w-4" />
                                Create Session
                              </>
                            )}
                          </button>
                        </HStack>
                      </VStack>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Surface>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export type { SessionCreationCardProps, Workspace, Repo };
