import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '../../lib/cn';

interface BadgeProps {
  variant?: 'default' | 'running' | 'success' | 'error' | 'warning' | 'info';
  size?: 'sm' | 'md';
  pulse?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function Badge({
  variant = 'default',
  size = 'md',
  pulse = false,
  children,
  className,
}: BadgeProps) {
  const prefersReduced = useReducedMotion();

  const variants = {
    default: 'border-zinc-300 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950/30 text-zinc-600 dark:text-zinc-300',
    running: 'border-blue-300 dark:border-blue-500/50 bg-blue-100 dark:bg-blue-600/15 text-blue-700 dark:text-blue-200',
    success: 'border-emerald-300 dark:border-emerald-500/40 bg-emerald-100 dark:bg-emerald-600/10 text-emerald-700 dark:text-emerald-200',
    error: 'border-red-300 dark:border-red-500/40 bg-red-100 dark:bg-red-600/10 text-red-700 dark:text-red-200',
    warning: 'border-amber-300 dark:border-amber-500/40 bg-amber-100 dark:bg-amber-600/10 text-amber-700 dark:text-amber-200',
    info: 'border-blue-300 dark:border-blue-500/40 bg-blue-100 dark:bg-blue-600/10 text-blue-700 dark:text-blue-200',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-[11px]',
  };

  const content = (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-medium uppercase tracking-wide',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </span>
  );

  if (pulse && !prefersReduced) {
    return (
      <div className="relative inline-flex">
        <motion.span
          className={cn(
            'absolute inset-0 rounded-full',
            variant === 'running' && 'bg-blue-500/20',
            variant === 'success' && 'bg-emerald-500/20',
            variant === 'error' && 'bg-red-500/20'
          )}
          animate={{
            opacity: [0.16, 0.28, 0.16],
            scale: [1, 1.04, 1],
          }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        {content}
      </div>
    );
  }

  return content;
}

interface StatusBadgeProps {
  status: 'QUEUED' | 'RUNNING' | 'AWAITING_APPROVAL' | 'READY_FOR_REVIEW' | 'PUSHED' | 'MERGED' | 'CONFLICT' | 'DISCARDED' | 'FAILED' | 'CANCELLED';
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = {
    QUEUED: { variant: 'default' as const, label: 'Queued', pulse: false },
    RUNNING: { variant: 'running' as const, label: 'Running', pulse: true },
    AWAITING_APPROVAL: { variant: 'warning' as const, label: 'Awaiting Approval', pulse: false },
    READY_FOR_REVIEW: { variant: 'success' as const, label: 'Ready', pulse: false },
    PUSHED: { variant: 'success' as const, label: 'Pushed', pulse: false },
    MERGED: { variant: 'success' as const, label: 'Merged', pulse: false },
    CONFLICT: { variant: 'error' as const, label: 'Conflict', pulse: false },
    DISCARDED: { variant: 'default' as const, label: 'Discarded', pulse: false },
    FAILED: { variant: 'error' as const, label: 'Failed', pulse: false },
    CANCELLED: { variant: 'warning' as const, label: 'Cancelled', pulse: false },
  };

  const { variant, label, pulse } = config[status];

  return (
    <Badge variant={variant} pulse={pulse} className={className}>
      {label}
    </Badge>
  );
}

interface StepBadgeProps {
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'SKIPPED';
  className?: string;
}

export function StepBadge({ status, className }: StepBadgeProps) {
  const config = {
    PENDING: { variant: 'default' as const, label: 'Pending' },
    RUNNING: { variant: 'running' as const, label: 'Running' },
    SUCCESS: { variant: 'success' as const, label: 'Done' },
    FAILED: { variant: 'error' as const, label: 'Failed' },
    SKIPPED: { variant: 'default' as const, label: 'Skipped' },
  };

  const { variant, label } = config[status];

  return (
    <Badge variant={variant} size="sm" className={className}>
      {label}
    </Badge>
  );
}
