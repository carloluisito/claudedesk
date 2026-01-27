/**
 * AgentExecutionStatus - Inline execution status display
 */

import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  X,
  RefreshCw,
  Bot,
} from 'lucide-react';
import { cn } from '../../lib/cn';
import type { AgentExecution } from '../../types/agents';

interface AgentExecutionStatusProps {
  execution: AgentExecution;
  onCancel?: (executionId: string) => void;
  onRerun?: (executionId: string) => void;
  onDismiss?: (executionId: string) => void;
}

export function AgentExecutionStatus({
  execution,
  onCancel,
  onRerun,
  onDismiss,
}: AgentExecutionStatusProps) {
  const prefersReduced = useReducedMotion();
  const [isExpanded, setIsExpanded] = useState(false);

  const statusConfig = {
    pending: {
      icon: Loader2,
      label: 'Pending',
      className: 'bg-white/10 text-white/60 ring-white/10',
      iconClassName: 'animate-spin',
    },
    running: {
      icon: Loader2,
      label: 'Running',
      className: 'bg-blue-500/20 text-blue-400 ring-blue-500/30',
      iconClassName: 'animate-spin',
    },
    completed: {
      icon: CheckCircle2,
      label: 'Completed',
      className: 'bg-emerald-500/20 text-emerald-400 ring-emerald-500/30',
      iconClassName: '',
    },
    failed: {
      icon: XCircle,
      label: 'Failed',
      className: 'bg-red-500/20 text-red-400 ring-red-500/30',
      iconClassName: '',
    },
  };

  const config = statusConfig[execution.status];
  const StatusIcon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: prefersReduced ? 0 : 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: prefersReduced ? 0 : -10 }}
      className={cn('rounded-2xl p-4 ring-1', config.className)}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-8 w-8 rounded-xl bg-white/10">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{execution.agentName}</span>
              <div className="flex items-center gap-1.5 text-xs">
                <StatusIcon className={cn('h-3.5 w-3.5', config.iconClassName)} />
                {config.label}
              </div>
            </div>
            {execution.currentStep && execution.status === 'running' && (
              <p className="text-xs opacity-70 mt-0.5">{execution.currentStep}</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Cancel button (only for running/pending) */}
          {(execution.status === 'running' || execution.status === 'pending') && onCancel && (
            <button
              onClick={() => onCancel(execution.id)}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            >
              <X className="h-3 w-3" />
              Cancel
            </button>
          )}

          {/* Re-run button (only for completed/failed) */}
          {(execution.status === 'completed' || execution.status === 'failed') && onRerun && (
            <button
              onClick={() => onRerun(execution.id)}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              Re-run
            </button>
          )}

          {/* Dismiss button */}
          {(execution.status === 'completed' || execution.status === 'failed') && onDismiss && (
            <button
              onClick={() => onDismiss(execution.id)}
              className="p-1 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4 opacity-50" />
            </button>
          )}

          {/* Expand/collapse for output/error */}
          {(execution.output || execution.error) && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 rounded-lg hover:bg-white/10 transition-colors"
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 opacity-50" />
              ) : (
                <ChevronDown className="h-4 w-4 opacity-50" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Progress bar (for running status) */}
      {execution.status === 'running' && execution.progress !== undefined && (
        <div className="mt-3 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-blue-400 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${execution.progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      )}

      {/* Indeterminate progress (for running without progress) */}
      {execution.status === 'running' && execution.progress === undefined && (
        <div className="mt-3 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full w-1/3 bg-blue-400 rounded-full"
            animate={{
              x: ['0%', '200%', '0%'],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </div>
      )}

      {/* Expandable content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: prefersReduced ? 0 : 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t border-white/10">
              {execution.error && (
                <div className="rounded-xl bg-red-500/10 p-3">
                  <p className="text-xs font-medium text-red-400 mb-1">Error</p>
                  <pre className="text-xs text-red-300/80 whitespace-pre-wrap font-mono">
                    {execution.error}
                  </pre>
                </div>
              )}
              {execution.output && (
                <div className="rounded-xl bg-white/5 p-3">
                  <p className="text-xs font-medium text-white/60 mb-1">Output</p>
                  <pre className="text-xs text-white/70 whitespace-pre-wrap font-mono max-h-40 overflow-y-auto">
                    {execution.output}
                  </pre>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/**
 * AgentExecutionList - Container for multiple executions
 */
interface AgentExecutionListProps {
  executions: AgentExecution[];
  onCancel?: (executionId: string) => void;
  onRerun?: (executionId: string) => void;
  onDismiss?: (executionId: string) => void;
}

export function AgentExecutionList({
  executions,
  onCancel,
  onRerun,
  onDismiss,
}: AgentExecutionListProps) {
  if (executions.length === 0) return null;

  return (
    <div className="space-y-2">
      <AnimatePresence mode="popLayout">
        {executions.map((execution) => (
          <AgentExecutionStatus
            key={execution.id}
            execution={execution}
            onCancel={onCancel}
            onRerun={onRerun}
            onDismiss={onDismiss}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
