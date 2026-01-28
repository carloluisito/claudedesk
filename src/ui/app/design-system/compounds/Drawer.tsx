/**
 * Drawer - Side drawer component (inline, not modal)
 * Can be used as a sidebar panel that slides in/out
 */

import { forwardRef, type ReactNode } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Surface } from '../primitives/Surface';
import { HStack } from '../primitives/Stack';
import { Text } from '../primitives/Text';

type DrawerPosition = 'left' | 'right';
type DrawerSize = 'sm' | 'md' | 'lg' | 'xl';

interface DrawerProps {
  /** Whether the drawer is open */
  open: boolean;
  /** Callback when drawer should close */
  onClose: () => void;
  /** Drawer title */
  title?: string;
  /** Content inside the drawer */
  children: ReactNode;
  /** Position of the drawer */
  position?: DrawerPosition;
  /** Width of the drawer */
  size?: DrawerSize;
  /** Whether to show close button */
  showClose?: boolean;
  /** Custom class names */
  className?: string;
  /** Whether drawer is overlay (blocks content behind) or inline */
  overlay?: boolean;
}

const sizeStyles: Record<DrawerSize, string> = {
  sm: 'w-64',
  md: 'w-80',
  lg: 'w-96',
  xl: 'w-[28rem]',
};

const positionStyles: Record<DrawerPosition, { initial: { x: string }; animate: { x: number }; className: string }> = {
  left: {
    initial: { x: '-100%' },
    animate: { x: 0 },
    className: 'left-0 border-r',
  },
  right: {
    initial: { x: '100%' },
    animate: { x: 0 },
    className: 'right-0 border-l',
  },
};

export const Drawer = forwardRef<HTMLDivElement, DrawerProps>(
  (
    {
      open,
      onClose,
      title,
      children,
      position = 'right',
      size = 'md',
      showClose = true,
      className,
      overlay = false,
    },
    ref
  ) => {
    const prefersReduced = useReducedMotion();
    const posConfig = positionStyles[position];

    return (
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop for overlay mode */}
            {overlay && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
              />
            )}

            {/* Drawer panel */}
            <motion.div
              ref={ref}
              initial={prefersReduced ? { opacity: 0 } : posConfig.initial}
              animate={prefersReduced ? { opacity: 1 } : posConfig.animate}
              exit={prefersReduced ? { opacity: 0 } : posConfig.initial}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className={cn(
                overlay ? 'fixed' : 'absolute',
                'top-0 bottom-0 z-50 flex flex-col',
                'bg-[#0d1117] border-white/10',
                sizeStyles[size],
                posConfig.className,
                className
              )}
            >
              {/* Header */}
              {(title || showClose) && (
                <div className="flex-shrink-0 border-b border-white/10 px-4 py-3">
                  <HStack justify="between" align="center">
                    {title && (
                      <Text variant="h4" color="primary">
                        {title}
                      </Text>
                    )}
                    {showClose && (
                      <button
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white/70 transition-colors"
                        aria-label="Close drawer"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    )}
                  </HStack>
                </div>
              )}

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4">{children}</div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }
);

Drawer.displayName = 'Drawer';

export type { DrawerProps, DrawerPosition, DrawerSize };
