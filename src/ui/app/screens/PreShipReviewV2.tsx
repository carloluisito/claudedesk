/**
 * PreShipReviewV2.tsx - Enhanced Pre-Ship Review Screen
 * Uses new V2 components for safety, branch comparison, and PR preview
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, ExternalLink, Rocket } from 'lucide-react';
import { BackgroundTexture } from '../components/ui/BackgroundTexture';
import { ReviewTopBar } from '../components/review';
import { SafetyChecklist, type SafetyWarning } from '../components/ship/SafetyChecklist';
import { BranchCompare } from '../components/ship/BranchCompare';
import { PRPreview } from '../components/ship/PRPreview';
import { VStack, HStack } from '../design-system/primitives/Stack';
import { Surface } from '../design-system/primitives/Surface';
import { Text } from '../design-system/primitives/Text';
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

// Detect warnings from file changes
function detectWarnings(files: ShipSummaryFile[]): SafetyWarning[] {
  const warnings: SafetyWarning[] = [];
  const seenWarnings = new Set<string>();

  for (const file of files) {
    const path = file.path.toLowerCase();

    // Authentication warnings
    if (path.includes('auth') || path.includes('login') || path.includes('password')) {
      if (!seenWarnings.has('auth')) {
        seenWarnings.add('auth');
        warnings.push({
          id: 'auth-changes',
          severity: 'warning',
          title: 'Authentication logic modified',
          description: 'Changes touch authentication-related code. Review carefully for security implications.',
          affectedFiles: files.filter(f => {
            const p = f.path.toLowerCase();
            return p.includes('auth') || p.includes('login') || p.includes('password');
          }).map(f => f.path),
          canDismiss: true,
        });
      }
    }

    // Security warnings
    if (path.includes('security') || path.includes('crypto') || path.includes('token') || path.includes('jwt')) {
      if (!seenWarnings.has('security')) {
        seenWarnings.add('security');
        warnings.push({
          id: 'security-changes',
          severity: 'critical',
          title: 'Security-sensitive code modified',
          description: 'Changes affect security-critical paths. Ensure thorough review and testing.',
          affectedFiles: files.filter(f => {
            const p = f.path.toLowerCase();
            return p.includes('security') || p.includes('crypto') || p.includes('token') || p.includes('jwt');
          }).map(f => f.path),
          canDismiss: false,
        });
      }
    }

    // Environment/secrets warnings
    if (path.includes('.env') || path.includes('secret') || path.includes('credential') || path.includes('config')) {
      if (!seenWarnings.has('secrets')) {
        seenWarnings.add('secrets');
        warnings.push({
          id: 'secrets-changes',
          severity: 'critical',
          title: 'Possible sensitive configuration',
          description: 'Changes may include sensitive configuration. Verify no secrets are being committed.',
          affectedFiles: files.filter(f => {
            const p = f.path.toLowerCase();
            return p.includes('.env') || p.includes('secret') || p.includes('credential');
          }).map(f => f.path),
          canDismiss: false,
        });
      }
    }

    // Large file warning
    if (file.insertions + file.deletions > 500) {
      warnings.push({
        id: `large-file-${file.path}`,
        severity: 'info',
        title: 'Large file change',
        description: `${file.path} has ${file.insertions + file.deletions} lines changed. Consider splitting into smaller changes.`,
        affectedFiles: [file.path],
        canDismiss: true,
      });
    }
  }

  // Sort by severity
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  return warnings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}

export default function PreShipReviewV2() {
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
  const [prTitle, setPrTitle] = useState('');
  const [prDescription, setPrDescription] = useState('');
  const [targetBranch, setTargetBranch] = useState('');

  // Action state
  const [shipping, setShipping] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<ShipResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Ref guard to prevent duplicate API calls
  const hasLoadedData = useRef(false);

  // Compute warnings from files
  const warnings = useMemo(() => {
    if (!summary) return [];
    return detectWarnings(summary.files);
  }, [summary]);

  // Check if there are blocking warnings
  const hasBlockingWarnings = useMemo(() => {
    return warnings.some(w => w.severity === 'critical' && !w.canDismiss);
  }, [warnings]);

  // Build commits array for PR preview
  const commits = useMemo(() => {
    if (!summary) return [];
    // We don't have commit data from the API, so we'll show unpushed count
    if (summary.unpushedCommits > 0) {
      return Array.from({ length: Math.min(summary.unpushedCommits, 3) }, (_, i) => ({
        hash: `commit-${i}`,
        message: `Unpushed commit ${i + 1}`,
      }));
    }
    return [];
  }, [summary]);

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

  // Load ship summary
  const loadSummary = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const data = await api<ShipSummary>(
        'GET',
        buildUrl(`/terminal/sessions/${sessionId}/ship-summary`)
      );
      setSummary(data);
      setTargetBranch(prev => prev || data.baseBranch || 'main');

      // Generate default PR title from branch name
      if (data.currentBranch) {
        const title = data.currentBranch
          .replace(/^(feature|fix|bugfix|hotfix|chore|refactor|docs)\//, '')
          .replace(/[-_]/g, ' ')
          .replace(/^\w/, (c) => c.toUpperCase());
        setPrTitle(prev => prev || title);
      }
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
    } catch (err) {
      console.error('Failed to generate:', err);
    } finally {
      setGenerating(false);
    }
  }, [sessionId, targetBranch, summary?.baseBranch, isMultiRepo, repoId]);

  // Ship the changes
  const handleShip = useCallback(async () => {
    if (!sessionId || !prTitle.trim()) {
      setError('PR title is required');
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
        commitMessage: prTitle.trim(),
        push: true,
        createPR: true,
        prTitle: prTitle.trim(),
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
  }, [sessionId, prTitle, prDescription, targetBranch, summary?.baseBranch, isMultiRepo, repoId]);

  // Cancel and go back
  const handleCancel = useCallback(() => {
    navigate(sessionId ? `/terminal?sessionId=${sessionId}` : '/terminal');
  }, [navigate, sessionId]);

  // Load data on mount
  useEffect(() => {
    if (hasLoadedData.current) return;
    hasLoadedData.current = true;
    loadSummary();
    loadBranches();
  }, [loadSummary, loadBranches]);

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

        <div className="flex-1 flex flex-col overflow-y-auto min-h-0 w-full px-6 pt-6 pb-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/70" />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Left - PR Preview (2/3 width) */}
              <div className="lg:col-span-2 space-y-6">
                <BranchCompare
                  sourceBranch={summary?.currentBranch || 'main'}
                  targetBranch={targetBranch || summary?.baseBranch || 'main'}
                  onTargetChange={setTargetBranch}
                  availableBranches={branches}
                  aheadCount={summary?.unpushedCommits || 0}
                  behindCount={0}
                  isProtected={targetBranch === 'main' || targetBranch === 'master'}
                />

                <PRPreview
                  title={prTitle}
                  onTitleChange={setPrTitle}
                  description={prDescription}
                  onDescriptionChange={setPrDescription}
                  commits={commits}
                  filesChanged={summary?.files.length || 0}
                  canGenerate={true}
                  isGenerating={generating}
                  onGenerate={generatePRContent}
                />
              </div>

              {/* Right - Safety & Actions (1/3 width) */}
              <div className="space-y-4">
                <SafetyChecklist
                  warnings={warnings}
                  onViewFile={(file) => {
                    // Could navigate to review with file selected
                    console.log('View file:', file);
                  }}
                />

                {/* Ship Actions */}
                <Surface variant="default" padding="md">
                  <VStack gap={4}>
                    <button
                      onClick={handleShip}
                      disabled={shipping || !prTitle.trim() || !summary?.hasChangesToShip || hasBlockingWarnings}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {shipping ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black/70" />
                          Shipping...
                        </>
                      ) : (
                        <>
                          <Rocket className="h-4 w-4" />
                          Create PR & Ship
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleCancel}
                      className="w-full rounded-xl bg-white/5 px-4 py-2.5 text-sm text-white/70 hover:bg-white/10 ring-1 ring-white/10"
                    >
                      Cancel
                    </button>

                    {error && (
                      <div className="rounded-xl bg-red-500/10 p-3 text-sm text-red-400 ring-1 ring-red-500/20">
                        {error}
                      </div>
                    )}

                    {hasBlockingWarnings && (
                      <Text variant="bodyXs" color="error">
                        Resolve critical warnings before shipping
                      </Text>
                    )}
                  </VStack>
                </Surface>

                {/* Summary Stats */}
                <Surface variant="default" padding="sm">
                  <HStack justify="between" align="center">
                    <Text variant="bodySm" color="tertiary">
                      {summary?.files.length || 0} files
                    </Text>
                    <HStack gap={3}>
                      <Text variant="bodySm" color="success">
                        +{summary?.totalInsertions || 0}
                      </Text>
                      <Text variant="bodySm" color="error">
                        -{summary?.totalDeletions || 0}
                      </Text>
                    </HStack>
                  </HStack>
                </Surface>
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
