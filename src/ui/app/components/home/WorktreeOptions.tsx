/**
 * WorktreeOptions - Collapsible worktree configuration
 */

import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, GitBranch, Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';
import { api } from '../../lib/api';
import { VStack, HStack } from '../../design-system/primitives/Stack';
import { Text } from '../../design-system/primitives/Text';

interface WorktreeOptionsProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  action: 'create' | 'existing';
  onActionChange: (action: 'create' | 'existing') => void;
  branch: string;
  onBranchChange: (branch: string) => void;
  baseBranch: string;
  onBaseBranchChange: (baseBranch: string) => void;
  existingPath: string;
  onExistingPathChange: (path: string) => void;
  repoId: string;
}

export function WorktreeOptions({
  enabled,
  onEnabledChange,
  action,
  onActionChange,
  branch,
  onBranchChange,
  baseBranch,
  onBaseBranchChange,
  existingPath,
  onExistingPathChange,
  repoId,
}: WorktreeOptionsProps) {
  const [availableBranches, setAvailableBranches] = useState<string[]>([]);
  const [existingWorktrees, setExistingWorktrees] = useState<
    Array<{ path: string; branch: string; isMain?: boolean }>
  >([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [loadingWorktrees, setLoadingWorktrees] = useState(false);
  const [mainBranch, setMainBranch] = useState('main');

  // Fetch branches when enabled
  useEffect(() => {
    if (!enabled || !repoId) return;

    const fetchData = async () => {
      setLoadingBranches(true);
      setLoadingWorktrees(true);

      try {
        const branchData = await api<{ branches: string[]; mainBranch: string }>(
          'GET',
          `/terminal/repos/${repoId}/branches?fetch=true`
        );
        setAvailableBranches(branchData.branches);
        setMainBranch(branchData.mainBranch || 'main');
        if (!baseBranch) {
          onBaseBranchChange(branchData.mainBranch || 'main');
        }
      } catch (e) {
        console.error('Failed to fetch branches:', e);
      } finally {
        setLoadingBranches(false);
      }

      try {
        const worktrees = await api<Array<{ path: string; branch: string; isMain?: boolean }>>(
          'GET',
          `/terminal/repos/${repoId}/worktrees`
        );
        const filtered = (worktrees || []).filter((wt) => !wt.isMain);
        setExistingWorktrees(filtered);
        if (filtered.length > 0 && !existingPath) {
          onExistingPathChange(filtered[0].path);
        }
      } catch (e) {
        console.error('Failed to fetch worktrees:', e);
      } finally {
        setLoadingWorktrees(false);
      }
    };

    fetchData();
  }, [enabled, repoId]);

  return (
    <div className="rounded-xl bg-white/5 ring-1 ring-white/10">
      {/* Toggle header */}
      <button
        onClick={() => onEnabledChange(!enabled)}
        className="flex w-full items-center justify-between p-3"
      >
        <HStack gap={2} align="center">
          <GitBranch className="h-4 w-4 text-white/50" />
          <Text variant="bodySm" color="secondary">
            Use Worktree
          </Text>
        </HStack>
        <HStack gap={2} align="center">
          <div
            className={cn(
              'h-5 w-9 rounded-full transition-colors',
              enabled ? 'bg-blue-500' : 'bg-white/10'
            )}
          >
            <div
              className={cn(
                'h-4 w-4 rounded-full bg-white transition-transform mt-0.5',
                enabled ? 'translate-x-4 ml-0.5' : 'translate-x-0.5'
              )}
            />
          </div>
        </HStack>
      </button>

      {/* Options when enabled */}
      {enabled && (
        <div className="border-t border-white/10 p-3">
          <VStack gap={3}>
            {/* Action tabs */}
            <HStack gap={2}>
              <button
                onClick={() => onActionChange('create')}
                className={cn(
                  'flex-1 rounded-lg py-2 text-xs font-medium transition-colors',
                  action === 'create'
                    ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30'
                    : 'bg-white/5 text-white/50 hover:bg-white/10'
                )}
              >
                Create New
              </button>
              <button
                onClick={() => onActionChange('existing')}
                disabled={existingWorktrees.length === 0}
                className={cn(
                  'flex-1 rounded-lg py-2 text-xs font-medium transition-colors',
                  action === 'existing'
                    ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30'
                    : 'bg-white/5 text-white/50 hover:bg-white/10',
                  existingWorktrees.length === 0 && 'opacity-50 cursor-not-allowed'
                )}
              >
                Use Existing ({existingWorktrees.length})
              </button>
            </HStack>

            {/* Create new worktree */}
            {action === 'create' && (
              <VStack gap={2}>
                <div>
                  <label className="block text-xs text-white/50 mb-1">Branch Name</label>
                  <input
                    type="text"
                    value={branch}
                    onChange={(e) => onBranchChange(e.target.value)}
                    placeholder="feature/my-branch"
                    className={cn(
                      'w-full rounded-lg bg-white/5 px-3 py-2 text-sm',
                      'text-white placeholder-white/30',
                      'ring-1 ring-white/10 focus:ring-white/20 focus:outline-none'
                    )}
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-1">Base Branch</label>
                  {loadingBranches ? (
                    <div className="flex items-center gap-2 text-white/40">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-xs">Loading branches...</span>
                    </div>
                  ) : (
                    <select
                      value={baseBranch}
                      onChange={(e) => onBaseBranchChange(e.target.value)}
                      className={cn(
                        'w-full rounded-lg bg-white/5 px-3 py-2 text-sm',
                        'text-white',
                        'ring-1 ring-white/10 focus:ring-white/20 focus:outline-none'
                      )}
                    >
                      {availableBranches.map((b) => (
                        <option key={b} value={b}>
                          {b} {b === mainBranch && '(default)'}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </VStack>
            )}

            {/* Use existing worktree */}
            {action === 'existing' && (
              <VStack gap={2}>
                {loadingWorktrees ? (
                  <div className="flex items-center gap-2 text-white/40 py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-xs">Loading worktrees...</span>
                  </div>
                ) : existingWorktrees.length === 0 ? (
                  <Text variant="bodyXs" color="muted" className="py-2">
                    No existing worktrees found
                  </Text>
                ) : (
                  <div className="max-h-[120px] overflow-y-auto space-y-1">
                    {existingWorktrees.map((wt) => (
                      <button
                        key={wt.path}
                        onClick={() => onExistingPathChange(wt.path)}
                        className={cn(
                          'w-full flex items-center gap-2 rounded-lg p-2 text-left text-xs transition-colors',
                          existingPath === wt.path
                            ? 'bg-blue-500/20 ring-1 ring-blue-500/30'
                            : 'bg-white/5 hover:bg-white/10'
                        )}
                      >
                        <GitBranch
                          className={cn(
                            'h-3.5 w-3.5',
                            existingPath === wt.path ? 'text-blue-400' : 'text-white/40'
                          )}
                        />
                        <span
                          className={cn(
                            'truncate',
                            existingPath === wt.path ? 'text-white' : 'text-white/70'
                          )}
                        >
                          {wt.branch}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </VStack>
            )}
          </VStack>
        </div>
      )}
    </div>
  );
}

export type { WorktreeOptionsProps };
