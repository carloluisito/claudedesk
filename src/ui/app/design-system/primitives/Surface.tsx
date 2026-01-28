/**
 * Surface - Base glass surface component
 * Replaces GlassCard with more flexible API
 */

import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { motion, type HTMLMotionProps, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/cn';

type SurfaceVariant = 'default' | 'elevated' | 'inset' | 'outline';
type SurfaceSize = 'sm' | 'md' | 'lg' | 'xl';

interface SurfaceProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Content inside the surface */
  children: ReactNode;
  /** Visual variant */
  variant?: SurfaceVariant;
  /** Padding size */
  padding?: SurfaceSize | 'none';
  /** Border radius size */
  radius?: SurfaceSize | 'full';
  /** Whether to animate on mount */
  animate?: boolean;
  /** Interactive hover state */
  interactive?: boolean;
  /** Custom class names */
  className?: string;
  /** Whether to use motion div */
  asMotion?: boolean;
}

const variantStyles: Record<SurfaceVariant, string> = {
  default: 'bg-white/5 ring-1 ring-white/10',
  elevated: 'bg-white/8 ring-1 ring-white/12 shadow-lg shadow-black/20',
  inset: 'bg-black/20 ring-1 ring-white/5',
  outline: 'bg-transparent ring-1 ring-white/10',
};

const paddingStyles: Record<SurfaceSize | 'none', string> = {
  none: 'p-0',
  sm: 'p-2',
  md: 'p-4',
  lg: 'p-6',
  xl: 'p-8',
};

const radiusStyles: Record<SurfaceSize | 'full', string> = {
  sm: 'rounded-lg',
  md: 'rounded-xl',
  lg: 'rounded-2xl',
  xl: 'rounded-3xl',
  full: 'rounded-full',
};

const interactiveStyles = 'transition-colors hover:bg-white/8 active:bg-white/10 cursor-pointer';

export const Surface = forwardRef<HTMLDivElement, SurfaceProps>(
  (
    {
      children,
      variant = 'default',
      padding = 'md',
      radius = 'xl',
      animate = false,
      interactive = false,
      className,
      asMotion = false,
      ...props
    },
    ref
  ) => {
    const prefersReduced = useReducedMotion();

    const combinedClassName = cn(
      variantStyles[variant],
      paddingStyles[padding],
      radiusStyles[radius],
      interactive && interactiveStyles,
      className
    );

    if (asMotion && animate && !prefersReduced) {
      return (
        <motion.div
          ref={ref}
          className={combinedClassName}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          {...(props as HTMLMotionProps<'div'>)}
        >
          {children}
        </motion.div>
      );
    }

    return (
      <div ref={ref} className={combinedClassName} {...props}>
        {children}
      </div>
    );
  }
);

Surface.displayName = 'Surface';

export type { SurfaceProps, SurfaceVariant, SurfaceSize };
