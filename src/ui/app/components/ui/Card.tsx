import { cn } from '../../lib/cn';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'subtle';
  padding?: 'sm' | 'md' | 'lg';
}

export function Card({
  children,
  className,
  variant = 'default',
  padding = 'md',
}: CardProps) {
  const variants = {
    default: 'border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30',
    subtle: 'border border-zinc-200 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-950/20',
  };

  const paddings = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-5',
  };

  return (
    <div
      className={cn(
        'rounded-2xl',
        variants[variant],
        paddings[padding],
        className
      )}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function CardHeader({ children, className }: CardHeaderProps) {
  return (
    <div className={cn('mb-3 flex items-center justify-between', className)}>
      {children}
    </div>
  );
}

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function CardTitle({ children, className }: CardTitleProps) {
  return (
    <span
      className={cn(
        'text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-500',
        className
      )}
    >
      {children}
    </span>
  );
}

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export function CardContent({ children, className }: CardContentProps) {
  return <div className={cn(className)}>{children}</div>;
}
