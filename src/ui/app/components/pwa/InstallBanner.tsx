import { useState, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Download, X } from 'lucide-react';
import { usePWA } from '../../contexts/PWAContext';
import { cn } from '../../lib/cn';

// 30 days in milliseconds
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function InstallBanner() {
  const prefersReduced = useReducedMotion();
  const {
    canInstall,
    isInstalled,
    displayMode,
    installPromptDismissedAt,
    promptInstall,
    dismissInstallPrompt,
  } = usePWA();

  const [isInstalling, setIsInstalling] = useState(false);

  // Determine if the banner should be shown
  const shouldShow = useMemo(() => {
    // Don't show if can't install, already installed, or in standalone mode
    if (!canInstall || isInstalled || displayMode === 'standalone') {
      return false;
    }

    // Check if dismissed within the last 30 days
    if (installPromptDismissedAt !== null) {
      const timeSinceDismissed = Date.now() - installPromptDismissedAt;
      if (timeSinceDismissed < THIRTY_DAYS_MS) {
        return false;
      }
    }

    return true;
  }, [canInstall, isInstalled, displayMode, installPromptDismissedAt]);

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      await promptInstall();
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    dismissInstallPrompt();
  };

  return (
    <AnimatePresence>
      {shouldShow && (
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
              'bg-[#0b0f16] rounded-2xl ring-1 ring-white/10',
              'p-4 shadow-2xl shadow-black/50'
            )}
          >
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10">
                <Download className="h-5 w-5 text-white/80" aria-hidden="true" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">
                  Install ClaudeDesk for faster access
                </p>
                <p className="mt-1 text-xs text-white/50">
                  Get quick access from your home screen
                </p>
              </div>

              {/* Dismiss X button */}
              <button
                type="button"
                onClick={handleDismiss}
                className={cn(
                  'shrink-0 p-1.5 rounded-lg transition-colors',
                  'text-white/40 hover:text-white/70 hover:bg-white/5'
                )}
                aria-label="Dismiss install prompt"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {/* Action buttons */}
            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={handleDismiss}
                className={cn(
                  'flex-1 px-4 py-2.5 text-sm font-medium rounded-xl transition-colors',
                  'text-white/60 hover:text-white/80 hover:bg-white/5'
                )}
              >
                Not now
              </button>
              <button
                type="button"
                onClick={handleInstall}
                disabled={isInstalling}
                className={cn(
                  'flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all',
                  'bg-white text-[#0b0f16]',
                  'hover:bg-white/90 active:scale-[0.98]',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'flex items-center justify-center gap-2'
                )}
              >
                {isInstalling ? (
                  <>
                    <svg
                      className="h-4 w-4 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Installing...
                  </>
                ) : (
                  'Install'
                )}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
