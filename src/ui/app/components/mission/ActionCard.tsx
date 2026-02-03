import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface ActionCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
  shortcut: string;
  theme: 'purple' | 'blue';
}

export function ActionCard({
  title,
  description,
  icon: Icon,
  onClick,
  shortcut,
  theme,
}: ActionCardProps) {
  const themeStyles = {
    purple: {
      gradient: 'bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent',
      ring: 'ring-purple-500/20',
      iconGlow: 'bg-purple-500/20',
      iconColor: 'text-purple-300',
      titleColor: 'text-purple-100',
      hoverGlow: 'group-hover:bg-purple-500/30',
      focusRing: 'focus-visible:ring-purple-400',
    },
    blue: {
      gradient: 'bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent',
      ring: 'ring-blue-500/20',
      iconGlow: 'bg-blue-500/20',
      iconColor: 'text-blue-300',
      titleColor: 'text-blue-100',
      hoverGlow: 'group-hover:bg-blue-500/30',
      focusRing: 'focus-visible:ring-blue-400',
    },
  };

  const styles = themeStyles[theme];

  return (
    <motion.button
      onClick={onClick}
      className={`group relative flex flex-col items-start text-left rounded-2xl p-6 ring-1 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-${theme}-500/10 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#05070c] ${styles.gradient} ${styles.ring} ${styles.focusRing}`}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      aria-label={`${title}: ${description}`}
    >
      {/* Icon with glow */}
      <div className="mb-4">
        <div className={`relative inline-flex items-center justify-center h-12 w-12 rounded-xl ${styles.iconGlow} ${styles.hoverGlow} transition-colors duration-300`}>
          <Icon className={`h-6 w-6 ${styles.iconColor}`} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1">
        <h3 className={`text-lg font-semibold mb-2 ${styles.titleColor}`}>
          {title}
        </h3>
        <p className="text-sm text-white/60 leading-relaxed mb-4">
          {description}
        </p>
      </div>

      {/* Keyboard shortcut hint */}
      <div className="flex items-center gap-1.5 text-xs text-white/30">
        <kbd className="px-2 py-1 rounded bg-white/5 text-white/40 font-mono text-[10px] ring-1 ring-white/10">
          {shortcut}
        </kbd>
      </div>
    </motion.button>
  );
}
