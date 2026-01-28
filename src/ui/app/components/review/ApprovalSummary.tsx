/**
 * ApprovalSummary - Summary panel for review screen
 */

import { Check, X, AlertTriangle, ArrowRight } from 'lucide-react';
import { cn } from '../../lib/cn';
import { VStack, HStack } from '../../design-system/primitives/Stack';
import { Text } from '../../design-system/primitives/Text';
import { Surface } from '../../design-system/primitives/Surface';

interface ApprovalSummaryProps {
  totalFiles: number;
  approvedFiles: number;
  additions: number;
  deletions: number;
  onApproveAll: () => void;
  onRejectAll: () => void;
  onProceed: () => void;
  canProceed?: boolean;
  isLoading?: boolean;
  className?: string;
}

export function ApprovalSummary({
  totalFiles,
  approvedFiles,
  additions,
  deletions,
  onApproveAll,
  onRejectAll,
  onProceed,
  canProceed = false,
  isLoading = false,
  className,
}: ApprovalSummaryProps) {
  const pendingFiles = totalFiles - approvedFiles;
  const allApproved = approvedFiles === totalFiles && totalFiles > 0;
  const approvalPercent = totalFiles > 0 ? (approvedFiles / totalFiles) * 100 : 0;

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex-shrink-0 border-b border-white/10 p-4">
        <Text variant="h4" color="primary">
          Review Summary
        </Text>
      </div>

      {/* Stats */}
      <div className="flex-1 overflow-y-auto p-4">
        <VStack gap={4}>
          {/* File counts */}
          <Surface variant="inset" padding="sm">
            <VStack gap={2}>
              <HStack justify="between">
                <Text variant="bodySm" color="secondary">
                  Total files
                </Text>
                <Text variant="bodySm" color="primary">
                  {totalFiles}
                </Text>
              </HStack>
              <div className="h-px bg-white/10" />
              <HStack justify="between">
                <HStack gap={1.5} align="center">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <Text variant="bodyXs" color="secondary">
                    Additions
                  </Text>
                </HStack>
                <Text variant="bodyXs" color="success">
                  +{additions}
                </Text>
              </HStack>
              <HStack justify="between">
                <HStack gap={1.5} align="center">
                  <span className="h-2 w-2 rounded-full bg-red-400" />
                  <Text variant="bodyXs" color="secondary">
                    Deletions
                  </Text>
                </HStack>
                <Text variant="bodyXs" color="error">
                  -{deletions}
                </Text>
              </HStack>
            </VStack>
          </Surface>

          {/* Approval status */}
          <Surface variant="inset" padding="sm">
            <VStack gap={2}>
              <Text variant="labelSm" color="tertiary">
                Approval Status
              </Text>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${approvalPercent}%` }}
                />
              </div>
              <HStack justify="between">
                <HStack gap={1} align="center">
                  <Check className="h-3 w-3 text-emerald-400" />
                  <Text variant="bodyXs" color="secondary">
                    {approvedFiles} approved
                  </Text>
                </HStack>
                {pendingFiles > 0 && (
                  <HStack gap={1} align="center">
                    <AlertTriangle className="h-3 w-3 text-amber-400" />
                    <Text variant="bodyXs" color="warning">
                      {pendingFiles} pending
                    </Text>
                  </HStack>
                )}
              </HStack>
            </VStack>
          </Surface>

          {/* Quick actions */}
          <VStack gap={2}>
            <Text variant="labelSm" color="tertiary">
              Quick Actions
            </Text>
            <HStack gap={2}>
              <button
                onClick={onApproveAll}
                disabled={isLoading || allApproved}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-medium',
                  'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20',
                  'hover:bg-emerald-500/20 transition-colors',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                <Check className="h-3.5 w-3.5" />
                Approve All
              </button>
              <button
                onClick={onRejectAll}
                disabled={isLoading || approvedFiles === 0}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-medium',
                  'bg-red-500/10 text-red-400 ring-1 ring-red-500/20',
                  'hover:bg-red-500/20 transition-colors',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                <X className="h-3.5 w-3.5" />
                Clear All
              </button>
            </HStack>
          </VStack>
        </VStack>
      </div>

      {/* Footer action */}
      <div className="flex-shrink-0 border-t border-white/10 p-4">
        <button
          onClick={onProceed}
          disabled={isLoading || !canProceed}
          className={cn(
            'w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold',
            'transition-colors',
            canProceed && !isLoading
              ? 'bg-white text-black hover:bg-white/90'
              : 'bg-white/10 text-white/30 cursor-not-allowed'
          )}
        >
          {canProceed ? (
            <>
              Continue to Ship
              <ArrowRight className="h-4 w-4" />
            </>
          ) : (
            <>
              <AlertTriangle className="h-4 w-4" />
              Approve All Files First
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export type { ApprovalSummaryProps };
