/**
 * InlineForm - Form that expands in place
 */

import { forwardRef, useState, type ReactNode, type FormEvent } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Plus, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Surface } from '../primitives/Surface';
import { HStack, VStack } from '../primitives/Stack';
import { Text } from '../primitives/Text';

interface InlineFormProps {
  /** Trigger button label */
  triggerLabel: string;
  /** Trigger button icon */
  triggerIcon?: ReactNode;
  /** Form title when expanded */
  title?: string;
  /** Form content */
  children: ReactNode;
  /** Whether the form is expanded (controlled) */
  expanded?: boolean;
  /** Callback when expansion state changes */
  onExpandedChange?: (expanded: boolean) => void;
  /** Whether the form is in loading state */
  isLoading?: boolean;
  /** Submit button label */
  submitLabel?: string;
  /** Cancel button label */
  cancelLabel?: string;
  /** Called when form is submitted */
  onSubmit?: () => void;
  /** Called when form is cancelled */
  onCancel?: () => void;
  /** Whether submit button is disabled */
  submitDisabled?: boolean;
  /** Custom class names */
  className?: string;
}

export const InlineForm = forwardRef<HTMLDivElement, InlineFormProps>(
  (
    {
      triggerLabel,
      triggerIcon = <Plus className="h-4 w-4" />,
      title,
      children,
      expanded: controlledExpanded,
      onExpandedChange,
      isLoading = false,
      submitLabel = 'Create',
      cancelLabel = 'Cancel',
      onSubmit,
      onCancel,
      submitDisabled = false,
      className,
    },
    ref
  ) => {
    const [internalExpanded, setInternalExpanded] = useState(false);
    const prefersReduced = useReducedMotion();

    const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;

    const handleToggle = () => {
      const newState = !isExpanded;
      if (controlledExpanded === undefined) {
        setInternalExpanded(newState);
      }
      onExpandedChange?.(newState);
    };

    const handleCancel = () => {
      if (controlledExpanded === undefined) {
        setInternalExpanded(false);
      }
      onExpandedChange?.(false);
      onCancel?.();
    };

    const handleSubmit = (e: FormEvent) => {
      e.preventDefault();
      onSubmit?.();
    };

    return (
      <div ref={ref} className={className}>
        <AnimatePresence mode="wait">
          {!isExpanded ? (
            <motion.button
              key="trigger"
              initial={prefersReduced ? {} : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={prefersReduced ? {} : { opacity: 0 }}
              onClick={handleToggle}
              className={cn(
                'flex w-full items-center justify-center gap-2 rounded-2xl',
                'bg-white/5 px-4 py-3 text-sm font-medium text-white/70',
                'ring-1 ring-white/10 transition-colors',
                'hover:bg-white/10 hover:text-white'
              )}
            >
              {triggerIcon}
              {triggerLabel}
            </motion.button>
          ) : (
            <motion.div
              key="form"
              initial={prefersReduced ? {} : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={prefersReduced ? {} : { opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Surface variant="elevated" padding="md">
                <form onSubmit={handleSubmit}>
                  <VStack gap={4}>
                    {/* Header */}
                    {title && (
                      <HStack justify="between" align="center">
                        <Text variant="h4" color="primary">
                          {title}
                        </Text>
                        <button
                          type="button"
                          onClick={handleCancel}
                          className="rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white/70 transition-colors"
                          aria-label="Close form"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </HStack>
                    )}

                    {/* Form content */}
                    <div>{children}</div>

                    {/* Actions */}
                    <HStack gap={3} justify="end">
                      <button
                        type="button"
                        onClick={handleCancel}
                        disabled={isLoading}
                        className={cn(
                          'rounded-xl bg-white/5 px-4 py-2 text-sm font-medium',
                          'text-white/70 ring-1 ring-white/10',
                          'transition-colors hover:bg-white/10',
                          'disabled:opacity-50 disabled:cursor-not-allowed'
                        )}
                      >
                        {cancelLabel}
                      </button>
                      <button
                        type="submit"
                        disabled={isLoading || submitDisabled}
                        className={cn(
                          'flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2',
                          'text-sm font-medium text-white',
                          'transition-colors hover:bg-blue-700',
                          'disabled:opacity-50 disabled:cursor-not-allowed'
                        )}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          submitLabel
                        )}
                      </button>
                    </HStack>
                  </VStack>
                </form>
              </Surface>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

InlineForm.displayName = 'InlineForm';

export type { InlineFormProps };
