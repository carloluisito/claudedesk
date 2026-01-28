/**
 * MobileStatusStrip - Bottom status bar for mobile
 *
 * Replaces FAB pattern with a persistent strip showing:
 * [Activity indicator] [Changes count] [Mode toggle] [More ...]
 */

import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Activity, FileText, Sparkles, ChevronUp, X, Play, Rocket, Bot } from 'lucide-react';
import { cn } from '@/lib/cn';
import { HStack, VStack } from '../../../design-system/primitives';
import { Text } from '../../../design-system/primitives';

interface MobileStatusStripProps {
  /** Number of active tool activities */
  activityCount?: number;
  /** Whether there's a running activity */
  hasRunningActivity?: boolean;
  /** Number of changed files */
  changesCount?: number;
  /** Current session mode */
  mode?: 'plan' | 'direct';
  /** Whether expanded sheet is open */
  isExpanded?: boolean;
  /** Callbacks */
  onActivityClick?: () => void;
  onChangesClick?: () => void;
  onModeToggle?: () => void;
  onMoreClick?: () => void;
  /** Custom class names */
  className?: string;
}

export function MobileStatusStrip({
  activityCount = 0,
  hasRunningActivity = false,
  changesCount = 0,
  mode = 'direct',
  isExpanded = false,
  onActivityClick,
  onChangesClick,
  onModeToggle,
  onMoreClick,
  className,
}: MobileStatusStripProps) {
  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40 sm:hidden',
        'bg-[#0d1117]/95 backdrop-blur-lg border-t border-white/10',
        'px-4 py-2 safe-area-inset-bottom',
        className
      )}
    >
      <HStack justify="between" align="center">
        <HStack gap={4} className="overflow-x-auto flex-1 mr-2">
          {/* Activity indicator */}
          <button
            onClick={onActivityClick}
            className={cn(
              'flex items-center gap-1.5 text-xs whitespace-nowrap transition-colors',
              hasRunningActivity ? 'text-cyan-400' : 'text-white/60'
            )}
          >
            <Activity
              className={cn(
                'h-4 w-4',
                hasRunningActivity && 'animate-pulse'
              )}
            />
            <span className="hidden xs:inline">Activity</span>
            {activityCount > 0 && (
              <span className="font-medium text-white/80">{activityCount}</span>
            )}
          </button>

          {/* Changes count */}
          <button
            onClick={onChangesClick}
            className={cn(
              'flex items-center gap-1.5 text-xs whitespace-nowrap transition-colors',
              changesCount > 0 ? 'text-amber-400' : 'text-white/60'
            )}
          >
            <FileText className="h-4 w-4" />
            <span className="hidden xs:inline">Changes</span>
            {changesCount > 0 && (
              <span className="font-medium text-white/80">{changesCount}</span>
            )}
          </button>

          {/* Mode toggle */}
          <button
            onClick={onModeToggle}
            className={cn(
              'flex items-center gap-1.5 text-xs whitespace-nowrap transition-colors',
              mode === 'plan' ? 'text-purple-400' : 'text-white/60'
            )}
          >
            <Sparkles className="h-4 w-4" />
            <span>{mode === 'plan' ? 'Plan' : 'Direct'}</span>
          </button>
        </HStack>

        {/* More button */}
        <button
          onClick={onMoreClick}
          className={cn(
            'flex items-center gap-1 rounded-lg px-2 py-1',
            'text-xs text-white/50 hover:bg-white/10 hover:text-white/70',
            'transition-colors'
          )}
        >
          <span>More</span>
          <ChevronUp
            className={cn(
              'h-4 w-4 transition-transform',
              isExpanded && 'rotate-180'
            )}
          />
        </button>
      </HStack>
    </div>
  );
}

/**
 * MobileExpandedActions - Full-screen sheet with all mobile actions
 */
interface MobileExpandedActionsProps {
  isOpen: boolean;
  onClose: () => void;
  onRun?: () => void;
  onShip?: () => void;
  onAgents?: () => void;
  onViewTimeline?: () => void;
  onViewChanges?: () => void;
  hasRunningApp?: boolean;
  changesCount?: number;
}

export function MobileExpandedActions({
  isOpen,
  onClose,
  onRun,
  onShip,
  onAgents,
  onViewTimeline,
  onViewChanges,
  hasRunningApp = false,
  changesCount = 0,
}: MobileExpandedActionsProps) {
  const prefersReduced = useReducedMotion();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm sm:hidden"
            onClick={onClose}
          />

          {/* Content */}
          <motion.div
            initial={prefersReduced ? {} : { y: '100%' }}
            animate={{ y: 0 }}
            exit={prefersReduced ? {} : { y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={cn(
              'fixed bottom-0 left-0 right-0 z-50 sm:hidden',
              'bg-[#0d1117] border-t border-white/10 rounded-t-3xl',
              'max-h-[70vh] overflow-y-auto safe-area-inset-bottom'
            )}
          >
            <div className="p-4">
              {/* Header */}
              <HStack justify="between" align="center" className="mb-4">
                <Text variant="h4" color="primary">
                  Quick Actions
                </Text>
                <button
                  onClick={onClose}
                  className="rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white/70 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </HStack>

              {/* Action buttons */}
              <VStack gap={3}>
                <ActionButton
                  icon={<Play className="h-5 w-5" />}
                  label={hasRunningApp ? 'View Preview' : 'Run App'}
                  description={hasRunningApp ? 'Open running app preview' : 'Start the development server'}
                  onClick={onRun}
                  color="emerald"
                />

                <ActionButton
                  icon={<Rocket className="h-5 w-5" />}
                  label="Ship Changes"
                  description={changesCount > 0 ? `${changesCount} files to review` : 'No changes to ship'}
                  onClick={onShip}
                  disabled={changesCount === 0}
                  color="purple"
                />

                <ActionButton
                  icon={<Bot className="h-5 w-5" />}
                  label="Browse Agents"
                  description="Select an AI agent for specialized tasks"
                  onClick={onAgents}
                  color="blue"
                />

                <div className="border-t border-white/10 pt-3 mt-1">
                  <HStack gap={3}>
                    <button
                      onClick={onViewTimeline}
                      className="flex-1 rounded-xl bg-white/5 px-4 py-3 text-sm font-medium text-white/70 ring-1 ring-white/10 hover:bg-white/10"
                    >
                      View Timeline
                    </button>
                    <button
                      onClick={onViewChanges}
                      className="flex-1 rounded-xl bg-white/5 px-4 py-3 text-sm font-medium text-white/70 ring-1 ring-white/10 hover:bg-white/10"
                    >
                      View Changes
                    </button>
                  </HStack>
                </div>
              </VStack>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Action button helper
interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick?: () => void;
  disabled?: boolean;
  color?: 'emerald' | 'purple' | 'blue' | 'amber';
}

function ActionButton({ icon, label, description, onClick, disabled, color = 'blue' }: ActionButtonProps) {
  const colorStyles = {
    emerald: 'bg-emerald-500/10 ring-emerald-500/20 text-emerald-400',
    purple: 'bg-purple-500/10 ring-purple-500/20 text-purple-400',
    blue: 'bg-blue-500/10 ring-blue-500/20 text-blue-400',
    amber: 'bg-amber-500/10 ring-amber-500/20 text-amber-400',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full flex items-center gap-3 p-4 rounded-2xl ring-1 text-left transition-colors',
        colorStyles[color],
        disabled && 'opacity-50 cursor-not-allowed',
        !disabled && 'hover:bg-white/5'
      )}
    >
      <div className="flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white">{label}</p>
        <p className="text-xs text-white/50 truncate">{description}</p>
      </div>
    </button>
  );
}

export type { MobileStatusStripProps, MobileExpandedActionsProps };
