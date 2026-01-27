import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion, PanInfo } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';

interface MobileBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  height?: 'auto' | 'half' | 'full';
  showCloseButton?: boolean;
}

export function MobileBottomSheet({
  isOpen,
  onClose,
  title,
  children,
  height = 'auto',
  showCloseButton = true,
}: MobileBottomSheetProps) {
  const prefersReduced = useReducedMotion();

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleEscape]);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y > 100 || info.velocity.y > 500) {
      onClose();
    }
  };

  const heightClasses = {
    auto: 'max-h-[85vh]',
    half: 'h-[50vh]',
    full: 'h-[90vh]',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 sm:hidden">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReduced ? 0 : 0.2 }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            className={cn(
              'absolute bottom-0 left-0 right-0 rounded-t-3xl bg-white dark:bg-zinc-900',
              'border-t border-zinc-200 dark:border-zinc-800',
              'flex flex-col',
              heightClasses[height]
            )}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{
              type: prefersReduced ? 'tween' : 'spring',
              damping: 30,
              stiffness: 300,
              duration: prefersReduced ? 0.2 : undefined,
            }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={handleDragEnd}
          >
            {/* Drag Handle */}
            <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
            </div>

            {/* Header */}
            {(title || showCloseButton) && (
              <div className="flex items-center justify-between px-4 pb-3 border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0">
                {title && (
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                    {title}
                  </h3>
                )}
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className="ml-auto p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                    aria-label="Close"
                  >
                    <X className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
                  </button>
                )}
              </div>
            )}

            {/* Content */}
            <div
              className="flex-1 overflow-y-auto overscroll-contain pb-safe"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
