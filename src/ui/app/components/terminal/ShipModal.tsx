import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  X,
  Rocket,
  GitBranch,
  ChevronDown,
  ArrowLeft,
  Loader2,
  Check,
  AlertCircle,
  ExternalLink,
  Sparkles,
  FileText,
  Plus,
  Minus,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import { cn } from '../../lib/cn';
import { api } from '../../lib/api';

// Types
interface ChangedFile {
  path: string;
  insertions: number;
  deletions: number;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  oldPath?: string;
}

interface ExistingPR {
  url: string;
  number: number;
  title: string;
  state: string;
}

interface ShipSummary {
  files: ChangedFile[];
  totalInsertions: number;
  totalDeletions: number;
  currentBranch: string;
  baseBranch: string;
  hasUncommittedChanges: boolean;
  hasChangesToShip: boolean;
  unpushedCommits: number;
  hasStagedChanges: boolean;
  hasUnstagedChanges: boolean;
  existingPR: ExistingPR | null;
}

interface ShipConfig {
  commitMessage: string;
  shouldPush: boolean;
  shouldCreatePR: boolean;
  prTitle: string;
  prBody: string;
  targetBranch: string;
}

interface ShipResult {
  success: boolean;
  committed: boolean;
  pushed: boolean;
  prUrl?: string;
  commitHash?: string;
  error?: string;
}

interface ShipModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  repoId?: string;
  isMultiRepo?: boolean;
  initialConfig?: Partial<ShipConfig>;
  onFeedback: (message: string) => void;
}

// Diff viewer component for file preview
function FileDiffViewer({ diff, onBack }: { diff: string; onBack: () => void }) {
  if (!diff) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
        <FileText className="h-8 w-8 mb-2 opacity-50" />
        <p>No changes</p>
      </div>
    );
  }

  const lines = diff.split('\n');

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to summary
        </button>
      </div>
      <div className="flex-1 overflow-auto font-mono text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-900">
        {lines.map((line, i) => {
          const isAddition = line.startsWith('+') && !line.startsWith('+++');
          const isDeletion = line.startsWith('-') && !line.startsWith('---');
          const isHeader = line.startsWith('@@');
          const isMeta = line.startsWith('diff ') || line.startsWith('index ') || line.startsWith('---') || line.startsWith('+++');

          if (isMeta) return null;

          return (
            <div
              key={i}
              className={cn(
                'px-3 py-0.5 flex',
                isAddition && 'bg-green-500/20',
                isDeletion && 'bg-red-500/20',
                isHeader && 'bg-blue-500/10 text-blue-400 mt-2'
              )}
            >
              <span className={cn(
                'w-5 flex-shrink-0 text-right mr-3 select-none',
                isAddition && 'text-green-500',
                isDeletion && 'text-red-500',
                !isAddition && !isDeletion && !isHeader && 'text-zinc-600'
              )}>
                {isAddition && '+'}
                {isDeletion && '-'}
                {!isAddition && !isDeletion && !isHeader && ' '}
              </span>
              <span className={cn(
                'flex-1',
                isAddition && 'text-green-400',
                isDeletion && 'text-red-400',
                !isAddition && !isDeletion && !isHeader && 'text-zinc-300'
              )}>
                {isHeader ? line : (line.slice(1) || ' ')}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ShipModal({
  isOpen,
  onClose,
  sessionId,
  repoId,
  isMultiRepo = false,
  initialConfig,
  onFeedback,
}: ShipModalProps) {
  const prefersReduced = useReducedMotion();

  // View state
  const [view, setView] = useState<'summary' | 'diff'>('summary');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileDiff, setFileDiff] = useState<string>('');

  // Data state
  const [summary, setSummary] = useState<ShipSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingDiff, setLoadingDiff] = useState(false);

  // Config state
  const [commitMessage, setCommitMessage] = useState(initialConfig?.commitMessage || '');
  const [shouldPush, setShouldPush] = useState(initialConfig?.shouldPush ?? true);
  const [shouldCreatePR, setShouldCreatePR] = useState(initialConfig?.shouldCreatePR ?? true);
  const [prTitle, setPrTitle] = useState(initialConfig?.prTitle || '');
  const [prBody, setPrBody] = useState(initialConfig?.prBody || '');
  const [targetBranch, setTargetBranch] = useState(initialConfig?.targetBranch || '');
  const [branchList, setBranchList] = useState<string[]>([]);
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);

  // Action state
  const [shipping, setShipping] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<ShipResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Feedback state
  const [feedback, setFeedback] = useState('');

  // Build URL helper for multi-repo
  const buildUrl = useCallback((path: string, params?: Record<string, string>) => {
    const url = new URL(path, window.location.origin);
    if (isMultiRepo && repoId) {
      url.searchParams.set('repoId', repoId);
    }
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }
    return url.pathname + url.search;
  }, [isMultiRepo, repoId]);

  // Build body helper for multi-repo
  const withRepoId = useCallback(<T extends Record<string, unknown>>(body: T): T & { repoId?: string } => {
    if (isMultiRepo && repoId) {
      return { ...body, repoId };
    }
    return body;
  }, [isMultiRepo, repoId]);

  // Load summary data
  const loadSummary = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api<ShipSummary>('GET', buildUrl(`/terminal/sessions/${sessionId}/ship-summary`));
      setSummary(data);

      // Set defaults based on summary
      if (!targetBranch && data.baseBranch) {
        setTargetBranch(data.baseBranch);
      }
      if (!prTitle && data.currentBranch) {
        // Convert branch name to a readable title
        const title = data.currentBranch
          .replace(/^(feature|fix|bugfix|hotfix|chore|refactor|docs)\//, '')
          .replace(/[-_]/g, ' ')
          .replace(/^\w/, c => c.toUpperCase());
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

  // Load file diff
  const loadFileDiff = useCallback(async (filePath: string) => {
    if (!sessionId) return;
    setLoadingDiff(true);
    try {
      const data = await api<{ diff: string }>(
        'POST',
        `/terminal/sessions/${sessionId}/file-diff`,
        withRepoId({ filePath, staged: false })
      );
      setFileDiff(data.diff);
      setSelectedFile(filePath);
      setView('diff');
    } catch (err) {
      console.error('Failed to load diff:', err);
    } finally {
      setLoadingDiff(false);
    }
  }, [sessionId, withRepoId]);

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
    if (!sessionId || !commitMessage.trim()) {
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
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
    } finally {
      setShipping(false);
    }
  }, [sessionId, commitMessage, shouldPush, shouldCreatePR, prTitle, prBody, targetBranch, summary?.baseBranch, withRepoId]);

  // Handle feedback submission
  const handleFeedbackSubmit = useCallback(() => {
    if (feedback.trim()) {
      onFeedback(feedback.trim());
      setFeedback('');
      onClose();
    }
  }, [feedback, onFeedback, onClose]);

  // Handle escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (view === 'diff') {
          setView('summary');
        } else {
          onClose();
        }
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handler);
    }
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, view, onClose]);

  // Load data when modal opens
  useEffect(() => {
    if (isOpen && sessionId) {
      loadSummary();
      loadBranches();
      setView('summary');
      setResult(null);
      setError(null);
    }
  }, [isOpen, sessionId, loadSummary, loadBranches]);

  // Update config from initialConfig
  useEffect(() => {
    if (initialConfig) {
      if (initialConfig.commitMessage) setCommitMessage(initialConfig.commitMessage);
      if (initialConfig.shouldPush !== undefined) setShouldPush(initialConfig.shouldPush);
      if (initialConfig.shouldCreatePR !== undefined) setShouldCreatePR(initialConfig.shouldCreatePR);
      if (initialConfig.prTitle) setPrTitle(initialConfig.prTitle);
      if (initialConfig.prBody) setPrBody(initialConfig.prBody);
      if (initialConfig.targetBranch) setTargetBranch(initialConfig.targetBranch);
    }
  }, [initialConfig]);

  // Get status icon for file
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'added':
        return <Plus className="h-3 w-3 text-green-500" />;
      case 'deleted':
        return <Minus className="h-3 w-3 text-red-500" />;
      case 'modified':
        return <FileText className="h-3 w-3 text-yellow-500" />;
      case 'renamed':
        return <ChevronRight className="h-3 w-3 text-blue-500" />;
      default:
        return <FileText className="h-3 w-3 text-zinc-400" />;
    }
  };

  // Can ship if:
  // 1. There are uncommitted changes AND commit message is provided, OR
  // 2. There are only unpushed commits (no new commit needed, just push)
  const hasUncommitted = summary && (summary.hasUncommittedChanges || summary.hasStagedChanges);
  const hasOnlyUnpushedCommits = summary && !hasUncommitted && summary.unpushedCommits > 0;
  const canShip = summary && summary.hasChangesToShip && (
    hasOnlyUnpushedCommits || // Can ship without commit message if just pushing
    (hasUncommitted && commitMessage.trim()) // Need commit message for new commits
  );
  const totalChanges = summary ? summary.files.length : 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReduced ? 0 : 0.2 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className={cn(
              'relative z-10 w-full max-w-2xl rounded-t-3xl sm:rounded-3xl',
              'border border-zinc-200 dark:border-zinc-800',
              'bg-white dark:bg-zinc-900',
              'max-h-[90vh] overflow-hidden flex flex-col'
            )}
            initial={{ opacity: 0, y: prefersReduced ? 0 : 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: prefersReduced ? 0 : 100 }}
            transition={{ duration: prefersReduced ? 0 : 0.25, ease: 'easeOut' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900/30">
                  <Rocket className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                    Ship Changes
                  </h2>
                  {summary && (
                    <p className="text-xs text-zinc-500">
                      <span className="font-mono">{summary.currentBranch}</span>
                      {summary.unpushedCommits > 0 && (
                        <span className="ml-2 text-orange-500">
                          {summary.unpushedCommits} unpushed commit{summary.unpushedCommits !== 1 ? 's' : ''}
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={loadSummary}
                  disabled={loading}
                  className="p-2 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  title="Refresh"
                >
                  <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
                </button>
                <button
                  onClick={onClose}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900/40"
                >
                  <X className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-500 mb-3" />
                  <p className="text-sm text-zinc-500">Loading changes...</p>
                </div>
              ) : error && !result ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <AlertCircle className="h-8 w-8 text-red-500 mb-3" />
                  <p className="text-sm text-red-500 text-center">{error}</p>
                  <button
                    onClick={loadSummary}
                    className="mt-4 text-sm text-purple-600 hover:text-purple-700"
                  >
                    Try again
                  </button>
                </div>
              ) : result?.success ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                    <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                    Changes Shipped!
                  </h3>
                  <div className="text-sm text-zinc-500 space-y-1 text-center">
                    {result.committed && (
                      <p>Committed as <span className="font-mono text-zinc-700 dark:text-zinc-300">{result.commitHash}</span></p>
                    )}
                    {result.pushed && <p>Pushed to remote</p>}
                    {result.prUrl && (
                      <a
                        href={result.prUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1 text-purple-600 hover:text-purple-700 mt-2"
                      >
                        <ExternalLink className="h-4 w-4" />
                        View Pull Request
                      </a>
                    )}
                  </div>
                </div>
              ) : view === 'diff' ? (
                <FileDiffViewer
                  diff={fileDiff}
                  onBack={() => {
                    setView('summary');
                    setSelectedFile(null);
                  }}
                />
              ) : summary ? (
                <div className="space-y-5">
                  {/* Summary */}
                  <div>
                    <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Summary</h3>
                    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-3">
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                        {totalChanges} file{totalChanges !== 1 ? 's' : ''} changed,{' '}
                        <span className="text-green-600">+{summary.totalInsertions}</span>{' '}
                        <span className="text-red-500">-{summary.totalDeletions}</span>
                      </p>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {summary.files.map((file) => (
                          <button
                            key={file.path}
                            onClick={() => loadFileDiff(file.path)}
                            disabled={loadingDiff}
                            className="flex items-center justify-between w-full px-2 py-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700/50 text-left group"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {getStatusIcon(file.status)}
                              <span className="text-xs font-mono text-zinc-600 dark:text-zinc-400 truncate">
                                {file.oldPath ? `${file.oldPath} → ${file.path}` : file.path}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs flex-shrink-0">
                              <span className="text-green-600">+{file.insertions}</span>
                              <span className="text-red-500">-{file.deletions}</span>
                              <span className="text-zinc-400 opacity-0 group-hover:opacity-100">View</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Commit Message - only show if there are uncommitted changes */}
                  {(summary.hasUncommittedChanges || summary.hasStagedChanges || summary.hasUnstagedChanges) ? (
                    <div>
                      <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        Commit Message
                      </h3>
                      <textarea
                        value={commitMessage}
                        onChange={(e) => setCommitMessage(e.target.value)}
                        placeholder="Describe your changes..."
                        className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none"
                        rows={2}
                      />
                    </div>
                  ) : summary.unpushedCommits > 0 ? (
                    <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 p-3">
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        All changes are committed. Ready to push {summary.unpushedCommits} commit{summary.unpushedCommits !== 1 ? 's' : ''} to remote.
                      </p>
                    </div>
                  ) : null}

                  {/* Push Option */}
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={shouldPush}
                        onChange={(e) => setShouldPush(e.target.checked)}
                        className="rounded border-zinc-300 dark:border-zinc-600 text-purple-600 focus:ring-purple-500"
                      />
                      Push to remote
                    </label>
                  </div>

                  {/* Existing PR or Create PR Option */}
                  {summary.existingPR ? (
                    <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/50">
                          <ExternalLink className="h-4 w-4 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-green-700 dark:text-green-300">
                              Pull Request #{summary.existingPR.number}
                            </span>
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-xs font-medium",
                              summary.existingPR.state === 'open' || summary.existingPR.state === 'opened'
                                ? "bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300"
                                : summary.existingPR.state === 'merged'
                                ? "bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300"
                                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                            )}>
                              {summary.existingPR.state}
                            </span>
                          </div>
                          <p className="text-sm text-green-600 dark:text-green-400 truncate mt-1">
                            {summary.existingPR.title}
                          </p>
                          <a
                            href={summary.existingPR.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-green-700 dark:text-green-300 hover:underline mt-2"
                          >
                            <ExternalLink className="h-3 w-3" />
                            View Pull Request
                          </a>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={shouldCreatePR}
                            onChange={(e) => setShouldCreatePR(e.target.checked)}
                            disabled={!shouldPush}
                            className="rounded border-zinc-300 dark:border-zinc-600 text-purple-600 focus:ring-purple-500 disabled:opacity-50"
                          />
                          Create Pull Request
                        </label>
                      </div>

                      {shouldCreatePR && shouldPush && (
                        <div className="pl-6 space-y-3 border-l-2 border-purple-200 dark:border-purple-800">
                          {/* Target Branch */}
                          <div className="relative">
                            <label className="block text-xs font-medium text-zinc-500 mb-1">
                              Target Branch
                            </label>
                            <button
                              onClick={() => setShowBranchDropdown(!showBranchDropdown)}
                              className="flex items-center justify-between w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100"
                            >
                              <span className="flex items-center gap-2">
                                <GitBranch className="h-4 w-4 text-zinc-400" />
                                {targetBranch || summary.baseBranch || 'main'}
                              </span>
                              <ChevronDown className="h-4 w-4 text-zinc-400" />
                            </button>
                            {showBranchDropdown && (
                              <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg z-10 max-h-40 overflow-y-auto">
                                {branchList.filter(b => b !== summary.currentBranch).map((branch) => (
                                  <button
                                    key={branch}
                                    onClick={() => {
                                      setTargetBranch(branch);
                                      setShowBranchDropdown(false);
                                    }}
                                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                  >
                                    <GitBranch className="h-4 w-4 text-zinc-400" />
                                    {branch}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* PR Title */}
                          <div>
                            <label className="block text-xs font-medium text-zinc-500 mb-1">
                              Title
                            </label>
                            <input
                              type="text"
                              value={prTitle}
                              onChange={(e) => setPrTitle(e.target.value)}
                              placeholder="PR title..."
                              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                            />
                          </div>

                          {/* PR Body */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-xs font-medium text-zinc-500">
                                Description
                              </label>
                              <button
                                onClick={generatePRContent}
                                disabled={generating}
                                className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 disabled:opacity-50"
                              >
                                {generating ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Sparkles className="h-3 w-3" />
                                )}
                                Generate
                              </button>
                            </div>
                            <textarea
                              value={prBody}
                              onChange={(e) => setPrBody(e.target.value)}
                              placeholder="Describe your changes..."
                              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none"
                              rows={3}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Feedback Field */}
                  <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800">
                    <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Need changes first?
                    </h3>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && feedback.trim()) {
                            handleFeedbackSubmit();
                          }
                        }}
                        placeholder="Describe what needs to be done..."
                        className="flex-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                      <button
                        onClick={handleFeedbackSubmit}
                        disabled={!feedback.trim()}
                        className="px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50"
                      >
                        Send
                      </button>
                    </div>
                  </div>

                  {/* Error display */}
                  {error && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      {error}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
                  <FileText className="h-8 w-8 mb-3 opacity-50" />
                  <p className="text-sm">No changes to ship</p>
                </div>
              )}
            </div>

            {/* Footer */}
            {!result?.success && summary && view === 'summary' && (
              <div className="flex items-center justify-end gap-3 border-t border-zinc-200 dark:border-zinc-800 px-5 py-4">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleShip}
                  disabled={!canShip || shipping}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {shipping ? (
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
            )}

            {/* Success footer */}
            {result?.success && (
              <div className="flex items-center justify-center border-t border-zinc-200 dark:border-zinc-800 px-5 py-4">
                <button
                  onClick={onClose}
                  className="px-5 py-2 rounded-xl bg-purple-600 text-white text-sm font-medium hover:bg-purple-700"
                >
                  Done
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
