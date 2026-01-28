/**
 * SafetyChecklist - Enhanced warning system for pre-ship review
 *
 * Features:
 * - Warning severity levels (critical, warning, info)
 * - Show affected code snippets
 * - Expandable details
 */

import { useState } from 'react';
import { AlertTriangle, AlertCircle, Info, ChevronDown, Check, X, FileText } from 'lucide-react';
import { cn } from '../../lib/cn';
import { VStack, HStack } from '../../design-system/primitives/Stack';
import { Text } from '../../design-system/primitives/Text';
import { Surface } from '../../design-system/primitives/Surface';

type WarningSeverity = 'critical' | 'warning' | 'info';

interface SafetyWarning {
  id: string;
  severity: WarningSeverity;
  title: string;
  description: string;
  affectedFiles?: string[];
  codeSnippet?: {
    file: string;
    line: number;
    content: string;
  };
  canDismiss?: boolean;
}

interface SafetyChecklistProps {
  warnings: SafetyWarning[];
  onDismiss?: (id: string) => void;
  onViewFile?: (file: string, line?: number) => void;
  className?: string;
}

const severityConfig: Record<
  WarningSeverity,
  {
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    ringColor: string;
    label: string;
  }
> = {
  critical: {
    icon: <AlertTriangle className="h-4 w-4" />,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    ringColor: 'ring-red-500/20',
    label: 'Critical',
  },
  warning: {
    icon: <AlertCircle className="h-4 w-4" />,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    ringColor: 'ring-amber-500/20',
    label: 'Warning',
  },
  info: {
    icon: <Info className="h-4 w-4" />,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    ringColor: 'ring-blue-500/20',
    label: 'Info',
  },
};

export function SafetyChecklist({
  warnings,
  onDismiss,
  onViewFile,
  className,
}: SafetyChecklistProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => new Set(prev).add(id));
    onDismiss?.(id);
  };

  // Group warnings by severity
  const grouped = {
    critical: warnings.filter((w) => w.severity === 'critical' && !dismissedIds.has(w.id)),
    warning: warnings.filter((w) => w.severity === 'warning' && !dismissedIds.has(w.id)),
    info: warnings.filter((w) => w.severity === 'info' && !dismissedIds.has(w.id)),
  };

  const hasBlockingWarnings = grouped.critical.length > 0;
  const totalActive = grouped.critical.length + grouped.warning.length + grouped.info.length;

  if (totalActive === 0) {
    return (
      <Surface variant="default" padding="md" className={className}>
        <HStack gap={3} align="center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
            <Check className="h-5 w-5" />
          </div>
          <VStack gap={0}>
            <Text variant="body" color="primary">
              All checks passed
            </Text>
            <Text variant="bodySm" color="tertiary">
              No issues detected in this changeset
            </Text>
          </VStack>
        </HStack>
      </Surface>
    );
  }

  return (
    <VStack gap={3} className={className}>
      {/* Summary header */}
      <Surface
        variant={hasBlockingWarnings ? 'default' : 'default'}
        padding="sm"
        className={cn(hasBlockingWarnings && 'ring-red-500/30')}
      >
        <HStack justify="between" align="center">
          <HStack gap={2} align="center">
            {hasBlockingWarnings ? (
              <AlertTriangle className="h-4 w-4 text-red-400" />
            ) : (
              <AlertCircle className="h-4 w-4 text-amber-400" />
            )}
            <Text
              variant="bodySm"
              color={hasBlockingWarnings ? 'error' : 'warning'}
            >
              {hasBlockingWarnings
                ? `${grouped.critical.length} blocking issue${grouped.critical.length > 1 ? 's' : ''} found`
                : `${totalActive} item${totalActive > 1 ? 's' : ''} to review`}
            </Text>
          </HStack>
          <HStack gap={2}>
            {grouped.critical.length > 0 && (
              <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs text-red-400">
                {grouped.critical.length} critical
              </span>
            )}
            {grouped.warning.length > 0 && (
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-400">
                {grouped.warning.length} warning
              </span>
            )}
            {grouped.info.length > 0 && (
              <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs text-blue-400">
                {grouped.info.length} info
              </span>
            )}
          </HStack>
        </HStack>
      </Surface>

      {/* Warning items */}
      {Object.entries(grouped).map(([severity, items]) =>
        items.map((warning) => (
          <WarningItem
            key={warning.id}
            warning={warning}
            config={severityConfig[severity as WarningSeverity]}
            isExpanded={expandedIds.has(warning.id)}
            onToggle={() => toggleExpanded(warning.id)}
            onDismiss={warning.canDismiss ? () => handleDismiss(warning.id) : undefined}
            onViewFile={onViewFile}
          />
        ))
      )}
    </VStack>
  );
}

// Individual warning item
interface WarningItemProps {
  warning: SafetyWarning;
  config: (typeof severityConfig)[WarningSeverity];
  isExpanded: boolean;
  onToggle: () => void;
  onDismiss?: () => void;
  onViewFile?: (file: string, line?: number) => void;
}

function WarningItem({
  warning,
  config,
  isExpanded,
  onToggle,
  onDismiss,
  onViewFile,
}: WarningItemProps) {
  return (
    <div
      className={cn(
        'rounded-xl ring-1 overflow-hidden',
        config.bgColor,
        config.ringColor
      )}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-start justify-between gap-3 text-left"
      >
        <HStack gap={3} align="start">
          <span className={cn('mt-0.5', config.color)}>{config.icon}</span>
          <VStack gap={0.5}>
            <Text variant="bodySm" color="primary">
              {warning.title}
            </Text>
            <Text variant="bodyXs" color="tertiary">
              {warning.description}
            </Text>
          </VStack>
        </HStack>
        <HStack gap={2} align="center">
          {onDismiss && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDismiss();
              }}
              className="rounded-lg p-1 text-white/30 hover:text-white/50 hover:bg-white/10"
              title="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <ChevronDown
            className={cn(
              'h-4 w-4 text-white/30 transition-transform',
              isExpanded && 'rotate-180'
            )}
          />
        </HStack>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-0 border-t border-white/10">
          <VStack gap={3} className="mt-3">
            {/* Affected files */}
            {warning.affectedFiles && warning.affectedFiles.length > 0 && (
              <VStack gap={1}>
                <Text variant="labelSm" color="muted">
                  Affected Files
                </Text>
                <div className="space-y-1">
                  {warning.affectedFiles.map((file) => (
                    <button
                      key={file}
                      onClick={() => onViewFile?.(file)}
                      className="flex items-center gap-2 w-full text-left text-xs text-white/60 hover:text-white/80"
                    >
                      <FileText className="h-3 w-3" />
                      <span className="font-mono truncate">{file}</span>
                    </button>
                  ))}
                </div>
              </VStack>
            )}

            {/* Code snippet */}
            {warning.codeSnippet && (
              <VStack gap={1}>
                <Text variant="labelSm" color="muted">
                  Code Reference
                </Text>
                <button
                  onClick={() =>
                    onViewFile?.(warning.codeSnippet!.file, warning.codeSnippet!.line)
                  }
                  className="text-left"
                >
                  <div className="rounded-lg bg-white/5 p-3 ring-1 ring-white/10">
                    <div className="flex items-center gap-2 text-xs text-white/40 mb-2">
                      <FileText className="h-3 w-3" />
                      <span className="font-mono">
                        {warning.codeSnippet.file}:{warning.codeSnippet.line}
                      </span>
                    </div>
                    <pre className="text-xs font-mono text-white/70 overflow-x-auto">
                      {warning.codeSnippet.content}
                    </pre>
                  </div>
                </button>
              </VStack>
            )}
          </VStack>
        </div>
      )}
    </div>
  );
}

export type { SafetyChecklistProps, SafetyWarning, WarningSeverity };
