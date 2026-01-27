import { Smartphone, Tablet, Monitor } from 'lucide-react';
import { cn } from '../../lib/cn';

export type ViewportSize = 'mobile' | 'tablet' | 'desktop';

export const VIEWPORT_DIMENSIONS = {
  mobile: { width: 375, label: 'Mobile' },
  tablet: { width: 768, label: 'Tablet' },
  desktop: { width: '100%' as const, label: 'Desktop' },
} as const;

interface DeviceViewportSelectorProps {
  value: ViewportSize;
  onChange: (viewport: ViewportSize) => void;
  size?: 'sm' | 'md';
  className?: string;
}

export function DeviceViewportSelector({
  value,
  onChange,
  size = 'md',
  className,
}: DeviceViewportSelectorProps) {
  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  const buttonPadding = size === 'sm' ? 'p-1.5' : 'p-2';

  const viewports: { id: ViewportSize; icon: typeof Smartphone; label: string }[] = [
    { id: 'mobile', icon: Smartphone, label: 'Mobile (375px)' },
    { id: 'tablet', icon: Tablet, label: 'Tablet (768px)' },
    { id: 'desktop', icon: Monitor, label: 'Desktop (100%)' },
  ];

  return (
    <div className={cn('flex items-center gap-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 p-0.5', className)}>
      {viewports.map((viewport) => (
        <button
          key={viewport.id}
          onClick={() => onChange(viewport.id)}
          className={cn(
            'rounded-md transition-colors',
            buttonPadding,
            value === viewport.id
              ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
              : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
          )}
          title={viewport.label}
        >
          <viewport.icon className={iconSize} />
        </button>
      ))}
    </div>
  );
}
