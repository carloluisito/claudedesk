/**
 * Stack - Flexible layout component for flex/grid layouts
 */

import { forwardRef, type HTMLAttributes, type ReactNode, type CSSProperties } from 'react';
import { cn } from '@/lib/cn';

type StackDirection = 'row' | 'column' | 'row-reverse' | 'column-reverse';
type StackAlign = 'start' | 'center' | 'end' | 'stretch' | 'baseline';
type StackJustify = 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
type StackWrap = 'wrap' | 'nowrap' | 'wrap-reverse';
type StackGap = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12;

interface StackProps extends HTMLAttributes<HTMLDivElement> {
  /** Content inside the stack */
  children: ReactNode;
  /** Flex direction */
  direction?: StackDirection;
  /** Align items */
  align?: StackAlign;
  /** Justify content */
  justify?: StackJustify;
  /** Gap between items */
  gap?: StackGap;
  /** Flex wrap behavior */
  wrap?: StackWrap;
  /** Whether to take full width */
  fullWidth?: boolean;
  /** Whether to take full height */
  fullHeight?: boolean;
  /** Inline flex */
  inline?: boolean;
  /** Custom class names */
  className?: string;
  /** Element to render as */
  as?: 'div' | 'section' | 'article' | 'nav' | 'header' | 'footer' | 'aside' | 'main';
}

const directionStyles: Record<StackDirection, string> = {
  row: 'flex-row',
  column: 'flex-col',
  'row-reverse': 'flex-row-reverse',
  'column-reverse': 'flex-col-reverse',
};

const alignStyles: Record<StackAlign, string> = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
  baseline: 'items-baseline',
};

const justifyStyles: Record<StackJustify, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around',
  evenly: 'justify-evenly',
};

const wrapStyles: Record<StackWrap, string> = {
  wrap: 'flex-wrap',
  nowrap: 'flex-nowrap',
  'wrap-reverse': 'flex-wrap-reverse',
};

const gapStyles: Record<StackGap, string> = {
  0: 'gap-0',
  1: 'gap-1',
  2: 'gap-2',
  3: 'gap-3',
  4: 'gap-4',
  5: 'gap-5',
  6: 'gap-6',
  8: 'gap-8',
  10: 'gap-10',
  12: 'gap-12',
};

export const Stack = forwardRef<HTMLDivElement, StackProps>(
  (
    {
      children,
      direction = 'column',
      align = 'stretch',
      justify = 'start',
      gap = 0,
      wrap = 'nowrap',
      fullWidth = false,
      fullHeight = false,
      inline = false,
      className,
      as: Component = 'div',
      ...props
    },
    ref
  ) => {
    const combinedClassName = cn(
      inline ? 'inline-flex' : 'flex',
      directionStyles[direction],
      alignStyles[align],
      justifyStyles[justify],
      gapStyles[gap],
      wrapStyles[wrap],
      fullWidth && 'w-full',
      fullHeight && 'h-full',
      className
    );

    return (
      <Component ref={ref} className={combinedClassName} {...props}>
        {children}
      </Component>
    );
  }
);

Stack.displayName = 'Stack';

// Convenience exports for common patterns
export const HStack = forwardRef<HTMLDivElement, Omit<StackProps, 'direction'>>(
  (props, ref) => <Stack ref={ref} direction="row" {...props} />
);
HStack.displayName = 'HStack';

export const VStack = forwardRef<HTMLDivElement, Omit<StackProps, 'direction'>>(
  (props, ref) => <Stack ref={ref} direction="column" {...props} />
);
VStack.displayName = 'VStack';

export type { StackProps, StackDirection, StackAlign, StackJustify, StackGap };
