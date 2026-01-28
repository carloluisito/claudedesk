/**
 * Panel - Expandable/collapsible content panel
 */

import { forwardRef, useState, useCallback, type ReactNode } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Surface } from '../primitives/Surface';
import { Stack, HStack } from '../primitives/Stack';
import { Text } from '../primitives/Text';

interface PanelProps {
  /** Panel title */
  title: string;
  /** Icon component to display */
  icon?: ReactNode;
  /** Content inside the panel when expanded */
  children: ReactNode;
  /** Whether the panel is open by default */
  defaultOpen?: boolean;
  /** Controlled open state */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Badge to show next to title */
  badge?: ReactNode;
  /** Whether the panel can be collapsed */
  collapsible?: boolean;
  /** Custom class names */
  className?: string;
}

export const Panel = forwardRef<HTMLDivElement, PanelProps>(
  (
    {
      title,
      icon,
      children,
      defaultOpen = false,
      open: controlledOpen,
      onOpenChange,
      badge,
      collapsible = true,
      className,
    },
    ref
  ) => {
    const [internalOpen, setInternalOpen] = useState(defaultOpen);
    const prefersReduced = useReducedMotion();

    const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;

    const handleToggle = useCallback(() => {
      if (!collapsible) return;
      const newState = !isOpen;
      if (controlledOpen === undefined) {
        setInternalOpen(newState);
      }
      onOpenChange?.(newState);
    }, [collapsible, isOpen, controlledOpen, onOpenChange]);

    return (
      <Surface ref={ref} padding="none" className={className}>
        <button
          onClick={handleToggle}
          disabled={!collapsible}
          className={cn(
            'w-full px-4 py-4 transition-colors',
            collapsible && 'hover:bg-white/5 cursor-pointer',
            !collapsible && 'cursor-default'
          )}
          aria-expanded={isOpen}
        >
          <HStack justify="between" align="center" fullWidth>
            <HStack gap={2} align="center">
              {icon && <span className="text-white/70">{icon}</span>}
              <Text variant="label" color="primary">
                {title}
              </Text>
            </HStack>
            <HStack gap={2} align="center">
              {badge}
              {collapsible && (
                <ChevronDown
                  className={cn(
                    'h-5 w-5 text-white/40 transition-transform',
                    isOpen && 'rotate-180'
                  )}
                />
              )}
            </HStack>
          </HStack>
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={prefersReduced ? { opacity: 1 } : { height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={prefersReduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 pt-0">{children}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </Surface>
    );
  }
);

Panel.displayName = 'Panel';

// Simple non-collapsible section variant
interface SectionProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

export const Section = forwardRef<HTMLDivElement, SectionProps>(
  ({ title, icon, children, className }, ref) => {
    return (
      <Surface ref={ref} padding="md" className={className}>
        <HStack gap={2} align="center" className="mb-4">
          {icon && <span className="text-white/70">{icon}</span>}
          <Text variant="label" color="primary">
            {title}
          </Text>
        </HStack>
        {children}
      </Surface>
    );
  }
);

Section.displayName = 'Section';

export type { PanelProps, SectionProps };
