/**
 * BranchCompare - Source to target branch comparison
 *
 * Features:
 * - Visual source -> target display
 * - Ahead/behind indicators
 * - Editable target branch
 */

import { useState } from 'react';
import { GitBranch, ArrowRight, ChevronDown, Check, RefreshCw, AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/cn';
import { VStack, HStack } from '../../design-system/primitives/Stack';
import { Text } from '../../design-system/primitives/Text';
import { Surface } from '../../design-system/primitives/Surface';

interface BranchCompareProps {
  sourceBranch: string;
  targetBranch: string;
  onTargetChange: (branch: string) => void;
  availableBranches?: string[];
  aheadCount?: number;
  behindCount?: number;
  isProtected?: boolean;
  onRefresh?: () => void;
  isLoading?: boolean;
  className?: string;
}

export function BranchCompare({
  sourceBranch,
  targetBranch,
  onTargetChange,
  availableBranches = [],
  aheadCount = 0,
  behindCount = 0,
  isProtected = false,
  onRefresh,
  isLoading = false,
  className,
}: BranchCompareProps) {
  const [showTargetPicker, setShowTargetPicker] = useState(false);

  const hasDivergence = behindCount > 0;

  return (
    <Surface variant="default" padding="md" className={className}>
      <VStack gap={4}>
        {/* Branch comparison visual */}
        <HStack justify="between" align="center" fullWidth>
          {/* Source branch */}
          <BranchChip
            branch={sourceBranch}
            label="Source"
            variant="source"
          />

          {/* Arrow with stats */}
          <VStack gap={1} align="center">
            <ArrowRight className="h-5 w-5 text-white/30" />
            {(aheadCount > 0 || behindCount > 0) && (
              <HStack gap={2}>
                {aheadCount > 0 && (
                  <span className="text-xs text-emerald-400">
                    +{aheadCount} ahead
                  </span>
                )}
                {behindCount > 0 && (
                  <span className="text-xs text-amber-400">
                    -{behindCount} behind
                  </span>
                )}
              </HStack>
            )}
          </VStack>

          {/* Target branch (editable) */}
          <div className="relative">
            <button
              onClick={() => setShowTargetPicker(!showTargetPicker)}
              disabled={availableBranches.length === 0}
              className={cn(
                'flex items-center gap-2 rounded-xl px-4 py-2.5 transition-colors',
                'bg-blue-500/10 ring-1 ring-blue-500/20',
                'hover:bg-blue-500/15',
                availableBranches.length === 0 && 'opacity-50 cursor-not-allowed'
              )}
            >
              <GitBranch className="h-4 w-4 text-blue-400" />
              <VStack gap={0} align="start">
                <span className="text-[10px] text-blue-400/70 uppercase tracking-wider">
                  Target
                </span>
                <span className="text-sm font-medium text-blue-300">
                  {targetBranch}
                </span>
              </VStack>
              {availableBranches.length > 0 && (
                <ChevronDown
                  className={cn(
                    'h-4 w-4 text-blue-400/50 transition-transform',
                    showTargetPicker && 'rotate-180'
                  )}
                />
              )}
            </button>

            {/* Branch picker dropdown */}
            {showTargetPicker && availableBranches.length > 0 && (
              <div className="absolute top-full right-0 mt-2 w-64 z-50 rounded-xl bg-[#161b22] ring-1 ring-white/10 shadow-xl overflow-hidden">
                <div className="max-h-64 overflow-y-auto py-1">
                  {availableBranches.map((branch) => (
                    <button
                      key={branch}
                      onClick={() => {
                        onTargetChange(branch);
                        setShowTargetPicker(false);
                      }}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 text-left text-sm',
                        'hover:bg-white/5 transition-colors',
                        branch === targetBranch && 'bg-blue-500/10'
                      )}
                    >
                      <GitBranch className="h-3.5 w-3.5 text-white/40" />
                      <span
                        className={cn(
                          'flex-1 truncate',
                          branch === targetBranch ? 'text-blue-300' : 'text-white/70'
                        )}
                      >
                        {branch}
                      </span>
                      {branch === targetBranch && (
                        <Check className="h-3.5 w-3.5 text-blue-400" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </HStack>

        {/* Warnings */}
        {(isProtected || hasDivergence) && (
          <VStack gap={2}>
            {isProtected && (
              <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-300 ring-1 ring-amber-500/20">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>
                  <strong>{targetBranch}</strong> is a protected branch. A pull
                  request is required.
                </span>
              </div>
            )}
            {hasDivergence && (
              <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-300 ring-1 ring-amber-500/20">
                <RefreshCw className="h-3.5 w-3.5" />
                <span>
                  Your branch is {behindCount} commits behind{' '}
                  <strong>{targetBranch}</strong>. Consider rebasing first.
                </span>
                {onRefresh && (
                  <button
                    onClick={onRefresh}
                    disabled={isLoading}
                    className="ml-auto text-amber-400 hover:text-amber-300 disabled:opacity-50"
                  >
                    {isLoading ? 'Fetching...' : 'Fetch latest'}
                  </button>
                )}
              </div>
            )}
          </VStack>
        )}
      </VStack>
    </Surface>
  );
}

// Branch chip component
interface BranchChipProps {
  branch: string;
  label: string;
  variant: 'source' | 'target';
}

function BranchChip({ branch, label, variant }: BranchChipProps) {
  const isSource = variant === 'source';

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-xl px-4 py-2.5',
        isSource
          ? 'bg-white/5 ring-1 ring-white/10'
          : 'bg-blue-500/10 ring-1 ring-blue-500/20'
      )}
    >
      <GitBranch
        className={cn('h-4 w-4', isSource ? 'text-white/50' : 'text-blue-400')}
      />
      <VStack gap={0} align="start">
        <span
          className={cn(
            'text-[10px] uppercase tracking-wider',
            isSource ? 'text-white/40' : 'text-blue-400/70'
          )}
        >
          {label}
        </span>
        <span
          className={cn(
            'text-sm font-medium',
            isSource ? 'text-white/70' : 'text-blue-300'
          )}
        >
          {branch}
        </span>
      </VStack>
    </div>
  );
}

export type { BranchCompareProps };
