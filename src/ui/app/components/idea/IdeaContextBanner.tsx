/**
 * IdeaContextBanner - Enhanced warning banner for context utilization
 *
 * Features:
 * - AlertTriangle icon in rounded badge
 * - Gradient background for depth
 * - Enhanced spacing and responsive layout
 * - Close button with hover effects
 * - Entry/exit animations
 * - Accessibility features (role="alert", ARIA labels)
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import { cn } from '../../lib/cn';

interface IdeaContextBannerProps {
  utilizationPercent: number;
}

export function IdeaContextBanner({ utilizationPercent }: IdeaContextBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -12, height: 0 }}
        animate={{ opacity: 1, y: 0, height: 'auto' }}
        exit={{ opacity: 0, y: -12, height: 0 }}
        transition={{
          duration: 0.3,
          ease: [0.4, 0, 0.2, 1]
        }}
        role="alert"
        aria-live="polite"
        aria-label={`Context is ${utilizationPercent}% full`}
        className={cn(
          'mx-6 mt-2 mb-1 rounded-xl px-5 sm:px-6 py-3.5 flex items-center gap-3.5 ring-1',
          'bg-gradient-to-br from-amber-500/15 via-amber-500/10 to-amber-500/5',
          'ring-amber-500/30'
        )}
      >
        {/* Icon badge */}
        <div className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-lg bg-amber-500/20">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
        </div>

        {/* Message */}
        <p className="flex-1 text-sm font-medium text-amber-300 leading-relaxed">
          Context is <span className="font-semibold text-amber-200">{utilizationPercent}%</span> full.
          Consider starting a new idea to keep responses sharp.
        </p>

        {/* Close button */}
        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          aria-label="Dismiss context warning"
          className={cn(
            'flex-shrink-0 flex items-center justify-center h-7 w-7 rounded-lg',
            'transition-colors duration-200',
            'hover:bg-amber-500/20',
            'focus:outline-none focus:ring-2 focus:ring-amber-500/40'
          )}
        >
          <X className="h-4 w-4 text-amber-400" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
