import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
}

const sizeClasses = {
  sm: 'max-w-sm',      // 384px
  md: 'max-w-md',      // 448px
  lg: 'max-w-2xl',     // 672px
  xl: 'max-w-4xl',     // 896px
  '2xl': 'max-w-5xl',  // 1024px
  full: 'max-w-6xl',   // 1152px
};

export function Modal({ isOpen, onClose, title, children, className, size = 'md' }: ModalProps) {
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

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReduced ? 0 : 0.2 }}
            onClick={onClose}
          />

          <motion.div
            className={cn(
              'relative z-10 w-full rounded-t-3xl bg-[#0b0f16] ring-1 ring-white/10 sm:rounded-3xl',
              'max-h-[90vh] flex flex-col',
              sizeClasses[size],
              className
            )}
            initial={{ opacity: 0, y: prefersReduced ? 0 : 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: prefersReduced ? 0 : 100 }}
            transition={{ duration: prefersReduced ? 0 : 0.25, ease: 'easeOut' }}
          >
            {/* Fixed Header */}
            <div className="flex-shrink-0 px-5 pt-5 pb-4 flex items-center justify-between border-b border-white/10">
              {title && (
                <h2 className="text-lg font-semibold tracking-tight text-white">
                  {title}
                </h2>
              )}
              <button
                onClick={onClose}
                className={cn(
                  "inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10 transition hover:bg-white/10",
                  !title && "ml-auto"
                )}
                aria-label="Close"
              >
                <X className="h-5 w-5 text-white/60" />
              </button>
            </div>
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-5 pb-5 pt-4 min-h-0">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
