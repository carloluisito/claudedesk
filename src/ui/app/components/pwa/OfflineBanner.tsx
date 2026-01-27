import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { WifiOff, Signal } from 'lucide-react';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { cn } from '../../lib/cn';

export function OfflineBanner() {
  const prefersReduced = useReducedMotion();
  const { isOnline, isSlowConnection } = useNetworkStatus();

  // Determine what to show
  const isOffline = !isOnline;
  const shouldShow = isOffline || isSlowConnection;

  // Determine message and icon
  const message = isOffline
    ? "You're offline. Some features are unavailable."
    : 'Slow connection detected. Some features may be delayed.';
  const Icon = isOffline ? WifiOff : Signal;

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ opacity: 0, y: prefersReduced ? 0 : -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: prefersReduced ? 0 : -20 }}
          transition={{ duration: prefersReduced ? 0 : 0.2, ease: 'easeOut' }}
          role="alert"
          aria-live="assertive"
          className={cn(
            'fixed top-0 left-0 right-0 z-40',
            'bg-amber-500/10 ring-1 ring-amber-500/30',
            'px-4 py-3 safe-area-inset-top'
          )}
        >
          <div className="flex items-center justify-center gap-3 max-w-screen-lg mx-auto">
            <Icon
              className="h-5 w-5 shrink-0 text-amber-400"
              aria-hidden="true"
            />
            <p className="text-sm font-medium text-amber-300">{message}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
