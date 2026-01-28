import { memo } from 'react';
import { Terminal, Globe, CheckCircle2, ChevronRight } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { cn } from '../../lib/cn';
import { PredefinedServerTemplate } from '../../types/mcp-catalog';
import { categoryLabels } from '../../constants/mcp-categories';

interface ServerCardProps {
  template: PredefinedServerTemplate;
  isConfigured?: boolean;
  onClick: () => void;
}

const maintainerColors = {
  official: 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/50',
  verified: 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/50',
  community: 'bg-zinc-700/50 text-zinc-400 ring-1 ring-zinc-600',
};

const transportIcons = {
  stdio: Terminal,
  sse: Globe,
};

export const ServerCard = memo(function ServerCard({
  template,
  isConfigured = false,
  onClick,
}: ServerCardProps) {
  // Dynamically get icon component
  const IconComponent = (LucideIcons as Record<string, React.ComponentType<{ className?: string }>>)[template.iconName] || LucideIcons.Puzzle;
  const TransportIcon = transportIcons[template.transport];

  // Determine maintainer badge appearance
  const badgeColor = maintainerColors[template.maintainer];
  const badgeLabel = template.maintainer === 'official' ? 'Official' : template.maintainer === 'verified' ? 'Verified' : 'Community';

  return (
    <button
      onClick={onClick}
      className="group relative rounded-2xl bg-white/5 ring-1 ring-white/10 p-5 hover:bg-white/10 hover:ring-white/20 hover:scale-[1.02] transition-all duration-200 text-left w-full min-w-[280px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
    >
      {/* Configured indicator - top left */}
      {isConfigured && (
        <div className="absolute top-3 left-3">
          <CheckCircle2 className="h-4 w-4 text-purple-400" />
        </div>
      )}

      {/* Maintainer badge - top right */}
      <span className={cn('absolute top-3 right-3 px-2 py-0.5 rounded-md text-xs font-medium', badgeColor)}>
        {badgeLabel}
      </span>

      {/* Header - Icon + Name */}
      <div className="flex items-start gap-3 pb-3 pr-24 pt-6">
        <IconComponent className="h-6 w-6 text-purple-400 flex-shrink-0 mt-0.5" />
        <h3 className="text-base font-semibold text-white leading-tight">{template.name}</h3>
      </div>

      {/* Description - 3 lines */}
      <p className="text-sm text-white/70 line-clamp-3 pb-4 leading-relaxed">
        {template.description}
      </p>

      {/* Footer - Transport + Category + Arrow */}
      <div className="flex items-center gap-3 text-xs text-white/50">
        <span className="flex items-center gap-1.5">
          <TransportIcon className="h-3.5 w-3.5" />
          <span className="uppercase font-medium">{template.transport}</span>
        </span>
        <span className="text-white/30">•</span>
        <span>{categoryLabels[template.category]}</span>
        <ChevronRight className="h-4 w-4 ml-auto text-white/30 group-hover:text-white/50 transition-colors" />
      </div>
    </button>
  );
});
