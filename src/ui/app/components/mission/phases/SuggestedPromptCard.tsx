import React from 'react';
import { LucideIcon, ArrowUpRight } from 'lucide-react';
import { cn } from '../../../lib/cn';

interface SuggestedPromptCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  promptText: string;
  theme: 'red' | 'blue' | 'emerald' | 'purple';
  onClick: (promptText: string) => void;
}

const themeConfig = {
  red: {
    iconBg: 'bg-red-500/10',
    iconText: 'text-red-400',
    iconRing: 'ring-red-400/20',
  },
  blue: {
    iconBg: 'bg-blue-500/10',
    iconText: 'text-blue-400',
    iconRing: 'ring-blue-400/20',
  },
  emerald: {
    iconBg: 'bg-emerald-500/10',
    iconText: 'text-emerald-400',
    iconRing: 'ring-emerald-400/20',
  },
  purple: {
    iconBg: 'bg-purple-500/10',
    iconText: 'text-purple-400',
    iconRing: 'ring-purple-400/20',
  },
};

export function SuggestedPromptCard({
  title,
  description,
  icon: Icon,
  promptText,
  theme,
  onClick,
}: SuggestedPromptCardProps) {
  const themeStyles = themeConfig[theme];

  return (
    <button
      onClick={() => onClick(promptText)}
      className={cn(
        'group relative rounded-xl p-4 bg-white/[0.02] ring-1 ring-white/[0.08]',
        'hover:bg-white/[0.04] hover:ring-white/[0.15] hover:-translate-y-0.5',
        'transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-[#05070c]',
        'text-left w-full'
      )}
      aria-label={`${title}: ${description}`}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-lg ring-1 flex-shrink-0',
            'transition-colors duration-200',
            themeStyles.iconBg,
            themeStyles.iconRing,
            `group-hover:${themeStyles.iconBg.replace('/10', '/20')}`
          )}
        >
          <Icon className={cn('h-4 w-4', themeStyles.iconText)} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-white/90 mb-1">{title}</h3>
          <p className="text-xs text-white/50 leading-relaxed">{description}</p>
        </div>

        {/* Arrow - appears on hover */}
        <ArrowUpRight
          className={cn(
            'h-4 w-4 text-white/30 flex-shrink-0',
            'opacity-0 group-hover:opacity-100 transition-opacity duration-200',
            'absolute top-4 right-4'
          )}
        />
      </div>
    </button>
  );
}
