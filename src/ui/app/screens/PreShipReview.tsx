/**
 * PreShipReview.tsx - Pre-Ship Review Screen
 * Final safety gate before committing and opening a pull request
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, ExternalLink } from 'lucide-react';
import { BackgroundTexture } from '../components/ui/BackgroundTexture';
import {
  ReviewTopBar,
  PreShipBranchInfo,
  PreShipCommitForm,
  PreShipPRForm,
  PreShipReadiness,
  PreShipWarnings,
  PreShipActions,
} from '../components/review';
import { useTerminalStore } from '../store/terminalStore';
import { api } from '../lib/api';

interface ShipSummaryFile {
  path: string;
  insertions: number;
  deletions: number;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
}

interface ShipSummary {
  files: ShipSummaryFile[];
  totalInsertions: number;
  totalDeletions: number;
  currentBranch: string;
  baseBranch: string;
  hasUncommittedChanges: boolean;
  hasChangesToShip: boolean;
  unpushedCommits: number;
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

export default function PreShipReview() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('sessionId');

  const { sessions } = useTerminalStore();
  const session = sessions.find((s) => s.id === sessionId);
  const repoId = session?.repoIds?.[0];
  const isMultiRepo = session?.isMultiRepo;

  // Ship summary state
  const [summary, setSummary] = useState<ShipSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<string[]>([]);

  // Form state
  const [commitMessage, setCommitMessage] = useState('');
  const [prTitle, setPrTitle] = useState('');
  const [prDescription, setPrDescription] = useState('');
  const [targetBranch, setTargetBranch] = useState('');

  // Action state
  const [shipping, setShipping] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<ShipResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Warnings (computed from file paths)
  const [warnings, setWarnings] = useState<string[]>([]);

  // Ref guard to prevent duplicate API calls (React StrictMode)
  const hasLoadedData = useRef(false);

  // Build URL helper for multi-repo
  const buildUrl = useCallback(
    (path: string) => {
      if (isMultiRepo && repoId) {
        return `${path}?repoId=${repoId}`;
      }
      return path;
    },
    [isMultiRepo, repoId]
  );

  // Load ship summary (only called once on mount)
  const loadSummary = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const data = await api<ShipSummary>(
        'GET',
        buildUrl(`/terminal/sessions/${sessionId}/ship-summary`)
      );
      setSummary(data);

      // Set defaults (using functional updates to avoid dependency issues)
      setTargetBranch((prev) => prev || data.baseBranch || '');
      if (data.currentBranch) {
        const title = data.currentBranch
          .replace(/^(feature|fix|bugfix|hotfix|chore|refactor|docs)\//, '')
          .replace(/[-_]/g, ' ')
          .replace(/^\w/, (c) => c.toUpperCase());
        setPrTitle((prev) => prev || title);
      }

      // Detect warnings from file paths
      const newWarnings: string[] = [];
      for (const file of data.files) {
        const path = file.path.toLowerCase();
        if (path.includes('auth') || path.includes('login') || path.includes('password')) {
          newWarnings.push('Touches authentication logic');
        }
        if (path.includes('security') || path.includes('crypto') || path.includes('token')) {
          if (!newWarnings.includes('Modifies security-sensitive paths')) {
            newWarnings.push('Modifies security-sensitive paths');
          }
        }
        if (path.includes('.env') || path.includes('secrets') || path.includes('credentials')) {
          if (!newWarnings.includes('May contain sensitive configuration')) {
            newWarnings.push('May contain sensitive configuration');
          }
        }
      }
      setWarnings([...new Set(newWarnings)]);
    } catch (err) {
      console.error('Failed to load summary:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [sessionId, buildUrl]);

  // Load available branches
  const loadBranches = useCallback(async () => {
    if (!repoId && !sessionId) return;
    try {
      const targetRepoId = repoId || sessionId;
      const data = await api<{ branches: string[]; currentBranch: string; mainBranch: string }>(
        'GET',
        `/terminal/repos/${targetRepoId}/branches`
      );
      setBranches(data.branches);
    } catch (err) {
      console.error('Failed to load branches:', err);
    }
  }, [repoId, sessionId]);

  // Generate PR content with AI
  const generatePRContent = useCallback(async () => {
    if (!sessionId) return;
    setGenerating(true);
    try {
      const body: { targetBranch: string; repoId?: string } = {
        targetBranch: targetBranch || summary?.baseBranch || 'main',
      };
      if (isMultiRepo && repoId) {
        body.repoId = repoId;
      }
      const data = await api<{ title: string; description: string }>(
        'POST',
        `/terminal/sessions/${sessionId}/generate-pr-content`,
        body
      );
      setPrTitle(data.title);
      setPrDescription(data.description);
      if (!commitMessage) {
        setCommitMessage(data.title);
      }
    } catch (err) {
      console.error('Failed to generate:', err);
    } finally {
      setGenerating(false);
    }
  }, [sessionId, targetBranch, summary?.baseBranch, commitMessage, isMultiRepo, repoId]);

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
      const body: {
        commitMessage: string;
        push: boolean;
        createPR: boolean;
        prTitle: string;
        prBody: string;
        targetBranch: string;
        repoId?: string;
      } = {
        commitMessage: commitMessage.trim(),
        push: true,
        createPR: true,
        prTitle: prTitle.trim() || commitMessage.trim(),
        prBody: prDescription,
        targetBranch: targetBranch || summary?.baseBranch || 'main',
      };
      if (isMultiRepo && repoId) {
        body.repoId = repoId;
      }

      const data = await api<ShipResult>(
        'POST',
        `/terminal/sessions/${sessionId}/ship`,
        body
      );
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setShipping(false);
    }
  }, [sessionId, commitMessage, prTitle, prDescription, targetBranch, summary?.baseBranch, isMultiRepo, repoId]);

  // Cancel and go back
  const handleCancel = useCallback(() => {
    navigate(sessionId ? `/terminal?sessionId=${sessionId}` : '/terminal');
  }, [navigate, sessionId]);

  // Load data on mount (with StrictMode protection)
  useEffect(() => {
    if (hasLoadedData.current) return;
    hasLoadedData.current = true;
    loadSummary();
    loadBranches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redirect if no session
  if (!sessionId) {
    return (
      <div className="h-screen flex flex-col overflow-hidden bg-[#05070c] text-white items-center justify-center">
        <div className="text-center">
          <p className="text-white/50">No session specified</p>
          <button
            onClick={() => navigate('/terminal')}
            className="mt-4 rounded-2xl bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
          >
            Back to Terminal
          </button>
        </div>
      </div>
    );
  }

  // Success state
  if (result?.success) {
    return (
      <div className="h-screen flex flex-col overflow-hidden bg-[#05070c] text-white">
        <BackgroundTexture />
        <div className="relative flex-1 flex flex-col overflow-hidden min-h-0">
          <ReviewTopBar
            title="Pre-Ship Review"
            subtitle="Changes shipped successfully"
            sessionId={sessionId}
            showBackToSession={false}
          />

          <div className="flex-1 flex items-center justify-center px-6">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 mb-4">
                <Check className="h-8 w-8 text-emerald-400" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">Changes Shipped!</h2>
              <div className="text-sm text-white/60 space-y-1">
                {result.committed && (
                  <p>
                    Committed as{' '}
                    <span className="font-mono text-white/80">{result.commitHash}</span>
                  </p>
                )}
                {result.pushed && <p>Pushed to remote</p>}
                {result.prUrl && (
                  <a
                    href={result.prUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1 text-purple-400 hover:text-purple-300 mt-3"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View Pull Request
                  </a>
                )}
              </div>
              <button
                onClick={handleCancel}
                className="mt-8 rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-black hover:opacity-90"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#05070c] text-white">
      <BackgroundTexture />

      <div className="relative flex-1 flex flex-col overflow-hidden min-h-0">
        <ReviewTopBar
          title="Pre-Ship Review"
          subtitle="Final review before committing and opening a pull request"
          sessionId={sessionId}
        />

        <div className="flex-1 flex flex-col overflow-y-auto min-h-0 w-full px-6 pt-8 pb-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/70" />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Left - Commit & PR metadata (2/3 width) */}
              <div className="lg:col-span-2 space-y-6">
                <PreShipBranchInfo
                  sourceBranch={summary?.currentBranch || 'main'}
                  targetBranch={targetBranch || summary?.baseBranch || 'main'}
                  availableBranches={branches}
                  onTargetBranchChange={setTargetBranch}
                />

                <PreShipCommitForm
                  message={commitMessage}
                  onMessageChange={setCommitMessage}
                />

                <PreShipPRForm
                  title={prTitle}
                  description={prDescription}
                  onTitleChange={setPrTitle}
                  onDescriptionChange={setPrDescription}
                  onGenerate={generatePRContent}
                  isGenerating={generating}
                />
              </div>

              {/* Right - Safety & actions (1/3 width) */}
              <div className="space-y-4">
                <PreShipReadiness
                  filesApproved={summary?.files.length || 0}
                  totalFiles={summary?.files.length || 0}
                  items={[{ label: 'Tests', status: 'not_run' }]}
                />

                <PreShipWarnings warnings={warnings} />

                <PreShipActions
                  onCommitAndCreatePR={handleShip}
                  onCancel={handleCancel}
                  isLoading={shipping}
                  disabled={!commitMessage.trim() || !summary?.hasChangesToShip}
                />

                {error && (
                  <div className="rounded-2xl bg-red-500/10 p-3 text-sm text-red-400 ring-1 ring-red-500/20">
                    {error}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mt-6 flex-shrink-0 text-center text-xs text-white/45">
            This is your final checkpoint before changes leave your machine.
          </div>
        </div>
      </div>
    </div>
  );
}
