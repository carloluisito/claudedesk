import { LucideIcon } from 'lucide-react';

interface FeatureHighlightProps {
  label: string;
  icon?: LucideIcon;
}

export function FeatureHighlight({ label, icon: Icon }: FeatureHighlightProps) {
  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.03] ring-1 ring-white/[0.08] text-xs text-white/50">
      {Icon && <Icon className="h-3 w-3" />}
      <span>{label}</span>
    </div>
  );
}
