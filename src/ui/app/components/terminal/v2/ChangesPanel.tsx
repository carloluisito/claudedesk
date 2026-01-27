/**
 * ChangesPanel - Unified ship workflow component
 *
 * Provides an inline interface for committing, pushing, and creating PRs
 * directly from the terminal side panel. Implements progressive disclosure
 * with smart routing to full-screen review for complex/risky changes.
 *
 * View States:
 * - collapsed: Shows summary, file list, and "Ship" CTA button
 * - expanded: Shows the ShipForm for commit message, push, and PR options
 * - success: Shows SuccessCard after successful ship
 * - error: Shows ErrorCard with retry option
 *
 * Smart Routing:
 * Automatically navigates to full-screen review (/pre-ship) when:
 * - More than 10 files are changed
 * - Security-sensitive files are detected (auth, .env, credentials, etc.)
 *
 * @example
 * <ChangesPanel
 *   sessionId={activeSessionId}
 *   repoId={activeSession?.repoIds?.[0]}
 *   changedFiles={changedFiles}
 *   onViewDiffs={() => navigate('/review-changes')}
 *   onNavigateToFullScreen={() => navigate('/pre-ship')}
 * />
 */
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Rocket } from 'lucide-react';
import { api } from '../../../lib/api';
import { SummaryCard } from './changes/SummaryCard';
import { FileList } from './changes/FileList';
import { ShipForm } from './changes/ShipForm';
import { SuccessCard } from './changes/SuccessCard';
import { ErrorCard } from './changes/ErrorCard';
import { ChangedFile } from './ChangesCard';

// Types from ShipModal
interface ShipSummary {
  files: Array<{
    path: string;
    insertions: number;
    deletions: number;
    status: 'added' | 'modified' | 'deleted' | 'renamed';
    oldPath?: string;
  }>;
  totalInsertions: number;
  totalDeletions: number;
  currentBranch: string;
  baseBranch: string;
  hasUncommittedChanges: boolean;
  hasChangesToShip: boolean;
  unpushedCommits: number;
  hasStagedChanges: boolean;
  hasUnstagedChanges: boolean;
  existingPR: {
    url: string;
    number: number;
    title: string;
    state: string;
  } | null;
}

interface ShipResult {
  success: boolean;
  committed: boolean;
  pushed: boolean;
  prUrl?: string;
  commitHash?: string;
  error?: string;
}

type ViewState = 'collapsed' | 'expanded' | 'success' | 'error';

// Security-sensitive file patterns for smart routing
const SECURITY_PATTERNS = [
  'auth',
  'login',
  'password',
  'security',
  'crypto',
  'token',
  '.env',
  'secrets',
  'credentials',
  'key',
  'private',
  'api-key',
  'apikey',
];

interface ChangesPanelProps {
  sessionId: string;
  repoId?: string;
  isMultiRepo?: boolean;
  changedFiles: ChangedFile[];
  onViewDiffs?: () => void;
  onClose?: () => void;
  onNavigateToFullScreen?: () => void;
}

export function ChangesPanel({
  sessionId,
  repoId,
  isMultiRepo = false,
  changedFiles,
  onViewDiffs,
  onClose,
  onNavigateToFullScreen,
}: ChangesPanelProps) {
  // View state
  const [view, setView] = useState<ViewState>('collapsed');

  // Data state
  const [summary, setSummary] = useState<ShipSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [branchList, setBranchList] = useState<string[]>([]);

  // Form state
  const [commitMessage, setCommitMessage] = useState('');
  const [shouldPush, setShouldPush] = useState(true);
  const [shouldCreatePR, setShouldCreatePR] = useState(true);
  const [prTitle, setPrTitle] = useState('');
  const [prBody, setPrBody] = useState('');
  const [targetBranch, setTargetBranch] = useState('');

  // Action state
  const [shipping, setShipping] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<ShipResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Build URL helper for multi-repo
  const buildUrl = useCallback(
    (path: string) => {
      const url = new URL(path, window.location.origin);
      if (isMultiRepo && repoId) {
        url.searchParams.set('repoId', repoId);
      }
      return url.pathname + url.search;
    },
    [isMultiRepo, repoId]
  );

  // Build body helper for multi-repo
  const withRepoId = useCallback(
    <T extends Record<string, unknown>>(body: T): T & { repoId?: string } => {
      if (isMultiRepo && repoId) {
        return { ...body, repoId };
      }
      return body;
    },
    [isMultiRepo, repoId]
  );

  // Smart routing: check if we should go to full screen
  const shouldRouteToFullScreen = useCallback(() => {
    if (!summary) return false;

    // Route to full screen if >10 files
    if (summary.files.length > 10) return true;

    // Route to full screen if security-sensitive files
    const hasSecurityFiles = summary.files.some((f) =>
      SECURITY_PATTERNS.some((p) => f.path.toLowerCase().includes(p))
    );
    if (hasSecurityFiles) return true;

    return false;
  }, [summary]);

  // Load summary data
  const loadSummary = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api<ShipSummary>(
        'GET',
        buildUrl(`/terminal/sessions/${sessionId}/ship-summary`)
      );
      setSummary(data);

      // Set defaults based on summary
      if (!targetBranch && data.baseBranch) {
        setTargetBranch(data.baseBranch);
      }
      if (!prTitle && data.currentBranch) {
        const title = data.currentBranch
          .replace(/^(feature|fix|bugfix|hotfix|chore|refactor|docs)\//, '')
          .replace(/[-_]/g, ' ')
          .replace(/^\w/, (c) => c.toUpperCase());
        setPrTitle(title);
      }
      // Don't create PR if one already exists
      if (data.existingPR) {
        setShouldCreatePR(false);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [sessionId, buildUrl, targetBranch, prTitle]);

  // Load branch list
  const loadBranches = useCallback(async () => {
    if (!repoId && !sessionId) return;
    try {
      const targetRepoId = repoId || sessionId;
      const data = await api<{ branches: string[]; currentBranch: string; mainBranch: string }>(
        'GET',
        `/terminal/repos/${targetRepoId}/branches`
      );
      setBranchList(data.branches);
    } catch (err) {
      console.error('Failed to load branches:', err);
    }
  }, [repoId, sessionId]);

  // Generate PR content with AI
  const generatePRContent = useCallback(async () => {
    if (!sessionId) return;
    setGenerating(true);
    setError(null);
    try {
      const data = await api<{ title: string; description: string }>(
        'POST',
        `/terminal/sessions/${sessionId}/generate-pr-content`,
        withRepoId({ targetBranch: targetBranch || summary?.baseBranch || 'main' })
      );
      setPrTitle(data.title);
      setPrBody(data.description);
      if (!commitMessage) {
        setCommitMessage(data.title);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(`Failed to generate: ${errorMsg}`);
    } finally {
      setGenerating(false);
    }
  }, [sessionId, withRepoId, targetBranch, summary?.baseBranch, commitMessage]);

  // Ship the changes
  const handleShip = useCallback(async () => {
    // Check smart routing first
    if (shouldRouteToFullScreen() && onNavigateToFullScreen) {
      onNavigateToFullScreen();
      return;
    }

    if (!sessionId || (!commitMessage.trim() && summary?.hasUncommittedChanges)) {
      setError('Commit message is required');
      return;
    }

    setShipping(true);
    setError(null);
    setResult(null);

    try {
      const data = await api<ShipResult>(
        'POST',
        `/terminal/sessions/${sessionId}/ship`,
        withRepoId({
          commitMessage: commitMessage.trim(),
          push: shouldPush,
          createPR: shouldCreatePR,
          prTitle: prTitle.trim() || commitMessage.trim(),
          prBody: prBody,
          targetBranch: targetBranch || summary?.baseBranch || 'main',
        })
      );
      setResult(data);
      if (data.success) {
        setView('success');
      } else if (data.error) {
        setError(data.error);
        setView('error');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      setView('error');
    } finally {
      setShipping(false);
    }
  }, [
    sessionId,
    commitMessage,
    shouldPush,
    shouldCreatePR,
    prTitle,
    prBody,
    targetBranch,
    summary,
    withRepoId,
    shouldRouteToFullScreen,
    onNavigateToFullScreen,
  ]);

  // Handle Ship button click in collapsed view
  const handleShipClick = useCallback(() => {
    // Check smart routing first
    if (shouldRouteToFullScreen() && onNavigateToFullScreen) {
      onNavigateToFullScreen();
      return;
    }
    setView('expanded');
  }, [shouldRouteToFullScreen, onNavigateToFullScreen]);

  // Handle done from success view
  const handleDone = useCallback(() => {
    setView('collapsed');
    setResult(null);
    setCommitMessage('');
    setPrTitle('');
    setPrBody('');
    loadSummary();
    onClose?.();
  }, [loadSummary, onClose]);

  // Handle retry from error view
  const handleRetry = useCallback(() => {
    setView('expanded');
    setError(null);
  }, []);

  // Handle dismiss from error view
  const handleDismiss = useCallback(() => {
    setView('collapsed');
    setError(null);
  }, []);

  // Handle escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (view === 'expanded') {
          setView('collapsed');
        } else if (view === 'success' || view === 'error') {
          handleDone();
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [view, handleDone]);

  // Load data when panel mounts or sessionId changes
  useEffect(() => {
    if (sessionId) {
      loadSummary();
      loadBranches();
    }
  }, [sessionId, loadSummary, loadBranches]);

  // Convert changedFiles to FileList format (use summary data when available)
  const fileListData = summary?.files || changedFiles.map((f) => ({
    path: f.path,
    status: f.status === 'created' ? 'added' : f.status,
    insertions: 0,
    deletions: 0,
  }));

  const hasChanges = changedFiles.length > 0 || (summary?.hasChangesToShip ?? false);

  return (
    <div className="space-y-3">
      <AnimatePresence mode="wait">
        {view === 'collapsed' && (
          <motion.div
            key="collapsed"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* Summary Card */}
            {summary && (
              <SummaryCard
                fileCount={summary.files.length}
                insertions={summary.totalInsertions}
                deletions={summary.totalDeletions}
                currentBranch={summary.currentBranch}
                baseBranch={summary.baseBranch}
                unpushedCommits={summary.unpushedCommits}
              />
            )}

            {/* File List */}
            <div className="mt-3">
              <FileList
                files={fileListData as any}
                onFileClick={onViewDiffs ? () => onViewDiffs() : undefined}
                maxVisible={5}
                onViewAllDiffs={onViewDiffs}
              />
            </div>

            {/* Ship CTA */}
            {hasChanges && (
              <button
                onClick={handleShipClick}
                className="mt-4 w-full flex items-center justify-center gap-2 rounded-2xl bg-purple-600 py-3 text-sm font-medium text-white hover:bg-purple-700 transition-colors"
                aria-label="Ship changes"
              >
                <Rocket className="h-4 w-4" />
                Ship Changes
              </button>
            )}

            {!hasChanges && !loading && (
              <div className="mt-4 text-center text-sm text-white/50">
                No changes to ship
              </div>
            )}
          </motion.div>
        )}

        {view === 'expanded' && (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <ShipForm
              commitMessage={commitMessage}
              onCommitMessageChange={setCommitMessage}
              shouldPush={shouldPush}
              onShouldPushChange={setShouldPush}
              shouldCreatePR={shouldCreatePR}
              onShouldCreatePRChange={setShouldCreatePR}
              prTitle={prTitle}
              onPrTitleChange={setPrTitle}
              prDescription={prBody}
              onPrDescriptionChange={setPrBody}
              targetBranch={targetBranch}
              onTargetBranchChange={setTargetBranch}
              availableBranches={branchList}
              currentBranch={summary?.currentBranch}
              onGenerate={generatePRContent}
              onShip={handleShip}
              onCancel={() => setView('collapsed')}
              isGenerating={generating}
              isShipping={shipping}
              existingPR={summary?.existingPR}
              error={error}
              hasUncommittedChanges={summary?.hasUncommittedChanges || summary?.hasStagedChanges || summary?.hasUnstagedChanges || false}
              unpushedCommits={summary?.unpushedCommits || 0}
            />
          </motion.div>
        )}

        {view === 'success' && result && (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <SuccessCard
              committed={result.committed}
              pushed={result.pushed}
              commitHash={result.commitHash}
              prUrl={result.prUrl}
              onDone={handleDone}
            />
          </motion.div>
        )}

        {view === 'error' && error && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <ErrorCard
              error={error}
              onRetry={handleRetry}
              onDismiss={handleDismiss}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
