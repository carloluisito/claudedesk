import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { usePWA } from '../../contexts/PWAContext';
import { cn } from '../../lib/cn';

export function UpdateBanner() {
  const prefersReduced = useReducedMotion();
  const { updateAvailable, applyUpdate, dismissUpdate } = usePWA();

  return (
    <AnimatePresence>
      {updateAvailable && (
        <motion.div
          initial={{ opacity: 0, y: prefersReduced ? 0 : 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: prefersReduced ? 0 : 100 }}
          transition={{ duration: prefersReduced ? 0 : 0.3, ease: 'easeOut' }}
          className="fixed bottom-4 left-4 right-4 z-50 flex justify-center pointer-events-none"
        >
          <div
            className={cn(
              'pointer-events-auto w-full max-w-md',
              'bg-[#0b0f16] rounded-2xl ring-1 ring-blue-500/30',
              'p-4 shadow-2xl shadow-black/50'
            )}
          >
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 ring-1 ring-blue-500/30">
                <RefreshCw className="h-5 w-5 text-blue-400" aria-hidden="true" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">
                  A new version is available
                </p>
                <p className="mt-1 text-xs text-white/50">
                  Update now to get the latest features and fixes
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={dismissUpdate}
                className={cn(
                  'flex-1 px-4 py-2.5 text-sm font-medium rounded-xl transition-colors',
                  'text-white/60 hover:text-white/80 hover:bg-white/5'
                )}
              >
                Later
              </button>
              <button
                type="button"
                onClick={applyUpdate}
                className={cn(
                  'flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all',
                  'bg-blue-600 text-white',
                  'hover:bg-blue-500 active:scale-[0.98]',
                  'flex items-center justify-center gap-2'
                )}
              >
                Update now
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
