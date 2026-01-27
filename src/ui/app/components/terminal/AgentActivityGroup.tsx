import { useState, useEffect, memo } from 'react';
import { Bot, ChevronDown, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/cn';
import { ToolActivity } from '../../store/terminalStore';
import { ToolActivityItem } from './ToolActivityItem';

interface AgentActivityGroupProps {
  agentActivity: ToolActivity;
  childActivities: ToolActivity[];
  agentName: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export const AgentActivityGroup = memo(function AgentActivityGroup({
  agentActivity,
  childActivities,
  agentName,
  isExpanded,
  onToggleExpand,
}: AgentActivityGroupProps) {
  const isRunning = agentActivity.status === 'running';
  const isComplete = agentActivity.status === 'complete';
  const isError = agentActivity.status === 'error';

  // Calculate duration for completed activities
  const duration = agentActivity.timestamp && agentActivity.completedAt
    ? Math.round(
        (new Date(agentActivity.completedAt).getTime() -
          new Date(agentActivity.timestamp).getTime()) /
          1000
      )
    : null;

  // Calculate progress
  const totalChildren = childActivities.length;
  const completedChildren = childActivities.filter(
    (a) => a.status === 'complete' || a.status === 'error'
  ).length;
  const progressPercent =
    totalChildren > 0 ? Math.round((completedChildren / totalChildren) * 100) : 0;

  return (
    <div
      className={cn(
        'rounded-2xl p-3 ring-1',
        'bg-blue-500/10 ring-blue-500/20',
        'border-l-2 border-blue-500'
      )}
    >
      {/* Header */}
      <button
        onClick={onToggleExpand}
        className="flex items-center gap-2 w-full text-left"
      >
        {/* Agent icon */}
        <Bot className="h-4 w-4 text-blue-400 flex-shrink-0" />

        {/* Agent name */}
        <span className="text-xs font-medium text-white/80 truncate flex-1">
          {agentName}
        </span>

        {/* Status badge */}
        <span
          className={cn(
            'inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full',
            isRunning && 'bg-blue-500/20 text-blue-400',
            isComplete && 'bg-white/10 text-white/50',
            isError && 'bg-red-500/20 text-red-400'
          )}
        >
          {isRunning && (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Running
            </>
          )}
          {isComplete && (
            <>
              <CheckCircle className="h-3 w-3" />
              Completed
            </>
          )}
          {isError && (
            <>
              <XCircle className="h-3 w-3" />
              Failed
            </>
          )}
        </span>

        {/* Expand/collapse chevron */}
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 text-white/40 transition-transform',
            isExpanded && 'rotate-180'
          )}
        />

        {/* Duration */}
        {duration !== null && (
          <span className="text-[10px] text-white/40">{duration}s</span>
        )}
      </button>

      {/* Progress bar (only when running) */}
      {isRunning && totalChildren > 0 && (
        <div className="h-1 bg-white/10 rounded-full overflow-hidden mt-2">
          <div
            className="h-full bg-blue-500 transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* Child activities */}
      <AnimatePresence initial={false}>
        {isExpanded && childActivities.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="ml-4 mt-2 space-y-1 border-l border-white/10 pl-2">
              {childActivities.map((activity) => (
                <ToolActivityItem
                  key={activity.id}
                  activity={activity}
                  isNested
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
