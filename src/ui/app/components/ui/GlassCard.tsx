import { ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
  hover?: boolean;
}

export function GlassCard({
  children,
  className,
  padding = 'md',
  hover = false,
}: GlassCardProps) {
  const paddingClasses = {
    sm: 'p-2',
    md: 'p-3',
    lg: 'p-4',
  };

  return (
    <div
      className={cn(
        'rounded-3xl bg-white/5 ring-1 ring-white/10',
        paddingClasses[padding],
        hover && 'hover:bg-white/10 transition-colors cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  );
}

interface GlassPanelHeaderProps {
  title: string;
  right?: ReactNode;
}

export function GlassPanelHeader({ title, right }: GlassPanelHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-sm font-semibold text-white">{title}</div>
      {right}
    </div>
  );
}
