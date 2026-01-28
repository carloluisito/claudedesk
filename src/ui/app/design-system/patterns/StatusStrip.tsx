/**
 * StatusStrip - Bottom status bar with quick actions
 * Replaces FAB pattern on mobile with persistent strip
 */

import { forwardRef, useState, type ReactNode } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ChevronUp, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { HStack, VStack } from '../primitives/Stack';
import { Text } from '../primitives/Text';

interface StatusItem {
  id: string;
  icon: ReactNode;
  label: string;
  value?: string | number;
  color?: 'default' | 'success' | 'warning' | 'error' | 'info';
  onClick?: () => void;
}

interface StatusStripProps {
  /** Status items to display */
  items: StatusItem[];
  /** Actions available when expanded */
  expandedContent?: ReactNode;
  /** Whether the strip can be expanded */
  expandable?: boolean;
  /** Controlled expanded state */
  expanded?: boolean;
  /** Callback when expanded state changes */
  onExpandedChange?: (expanded: boolean) => void;
  /** Custom class names */
  className?: string;
  /** Position of the strip */
  position?: 'bottom' | 'top';
}

const colorStyles: Record<string, string> = {
  default: 'text-white/60',
  success: 'text-emerald-400',
  warning: 'text-amber-400',
  error: 'text-red-400',
  info: 'text-blue-400',
};

export const StatusStrip = forwardRef<HTMLDivElement, StatusStripProps>(
  (
    {
      items,
      expandedContent,
      expandable = true,
      expanded: controlledExpanded,
      onExpandedChange,
      className,
      position = 'bottom',
    },
    ref
  ) => {
    const [internalExpanded, setInternalExpanded] = useState(false);
    const prefersReduced = useReducedMotion();

    const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;

    const handleToggle = () => {
      if (!expandable) return;
      const newState = !isExpanded;
      if (controlledExpanded === undefined) {
        setInternalExpanded(newState);
      }
      onExpandedChange?.(newState);
    };

    return (
      <div
        ref={ref}
        className={cn(
          'fixed left-0 right-0 z-40',
          position === 'bottom' ? 'bottom-0' : 'top-0',
          className
        )}
      >
        <AnimatePresence>
          {/* Expanded panel */}
          {isExpanded && expandedContent && (
            <motion.div
              initial={prefersReduced ? {} : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReduced ? {} : { opacity: 0, y: 20 }}
              transition={{ duration: 0.2 }}
              className={cn(
                'bg-[#0d1117]/95 backdrop-blur-lg border-white/10',
                position === 'bottom' ? 'border-t' : 'border-b',
                'max-h-[60vh] overflow-y-auto'
              )}
            >
              <div className="p-4">
                <HStack justify="between" align="center" className="mb-4">
                  <Text variant="h4" color="primary">
                    Quick Actions
                  </Text>
                  <button
                    onClick={handleToggle}
                    className="rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white/70 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </HStack>
                {expandedContent}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status strip bar */}
        <div
          className={cn(
            'bg-[#0d1117]/95 backdrop-blur-lg border-white/10',
            position === 'bottom' ? 'border-t' : 'border-b',
            'px-4 py-2 safe-area-inset-bottom'
          )}
        >
          <HStack justify="between" align="center">
            <HStack gap={4} className="overflow-x-auto flex-1 mr-2">
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={item.onClick}
                  disabled={!item.onClick}
                  className={cn(
                    'flex items-center gap-1.5 text-xs whitespace-nowrap',
                    'transition-colors',
                    item.onClick && 'hover:opacity-80 cursor-pointer',
                    !item.onClick && 'cursor-default',
                    colorStyles[item.color || 'default']
                  )}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  <span className="hidden sm:inline">{item.label}</span>
                  {item.value !== undefined && (
                    <span className="font-medium text-white/80">
                      {item.value}
                    </span>
                  )}
                </button>
              ))}
            </HStack>

            {/* Expand toggle */}
            {expandable && expandedContent && (
              <button
                onClick={handleToggle}
                className={cn(
                  'flex items-center gap-1 rounded-lg px-2 py-1',
                  'text-xs text-white/50 hover:bg-white/10 hover:text-white/70',
                  'transition-colors'
                )}
              >
                <span className="hidden sm:inline">More</span>
                <ChevronUp
                  className={cn(
                    'h-4 w-4 transition-transform',
                    isExpanded && 'rotate-180'
                  )}
                />
              </button>
            )}
          </HStack>
        </div>
      </div>
    );
  }
);

StatusStrip.displayName = 'StatusStrip';

// Status badge component for items
interface StatusBadgeProps {
  icon: ReactNode;
  label: string;
  value?: string | number;
  color?: 'default' | 'success' | 'warning' | 'error' | 'info';
}

export function StatusBadge({ icon, label, value, color = 'default' }: StatusBadgeProps) {
  return (
    <div className={cn('flex items-center gap-1.5 text-xs', colorStyles[color])}>
      {icon}
      <span className="hidden sm:inline">{label}</span>
      {value !== undefined && (
        <span className="font-medium text-white/80">{value}</span>
      )}
    </div>
  );
}

export type { StatusStripProps, StatusItem, StatusBadgeProps };
