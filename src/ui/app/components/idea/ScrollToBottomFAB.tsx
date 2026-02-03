/**
 * ScrollToBottomFAB - Floating Action Button for scrolling to latest message
 *
 * Features:
 * - Larger button with rounded corners
 * - Gradient background with backdrop blur
 * - Ring and shadow effects
 * - Entry/exit animations
 * - Hover and tap scale effects
 * - Accessibility features
 */
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/cn';

interface ScrollToBottomFABProps {
  onClick: () => void;
}

export function ScrollToBottomFAB({ onClick }: ScrollToBottomFABProps) {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.8, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: 10 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{
        duration: 0.2,
        ease: [0.4, 0, 0.2, 1]
      }}
      onClick={onClick}
      aria-label="Scroll to latest message"
      className={cn(
        'flex items-center justify-center rounded-xl backdrop-blur-sm',
        'h-10 w-10 sm:h-9 sm:w-9',
        'bg-gradient-to-br from-purple-500/15 via-purple-500/10 to-purple-600/10',
        'ring-1 ring-purple-500/25',
        'shadow-lg shadow-purple-500/10',
        'hover:ring-purple-500/35 hover:shadow-xl hover:shadow-purple-500/15',
        'focus:outline-none focus:ring-2 focus:ring-purple-500/40',
        'transition-all duration-200',
        'touch-manipulation'
      )}
    >
      <ChevronDown className="h-5 w-5 text-purple-300" />
    </motion.button>
  );
}
