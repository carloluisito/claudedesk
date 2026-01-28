/**
 * Text - Typography component with semantic styling
 */

import { forwardRef, type HTMLAttributes, type ReactNode, type ElementType } from 'react';
import { cn } from '@/lib/cn';
import { textStyles, type TextStyle } from '../tokens/typography';

type TextColor = 'primary' | 'secondary' | 'tertiary' | 'muted' | 'error' | 'success' | 'warning' | 'info';
type TextAlign = 'left' | 'center' | 'right';
type TextTruncate = 'none' | 'truncate' | 'clamp-2' | 'clamp-3';

interface TextProps extends HTMLAttributes<HTMLElement> {
  /** Content inside the text element */
  children: ReactNode;
  /** Text style variant */
  variant?: TextStyle;
  /** Text color */
  color?: TextColor;
  /** Text alignment */
  align?: TextAlign;
  /** Truncation behavior */
  truncate?: TextTruncate;
  /** Whether to use monospace font */
  mono?: boolean;
  /** Whether to use uppercase */
  uppercase?: boolean;
  /** Custom class names */
  className?: string;
  /** Element to render as */
  as?: ElementType;
}

const colorStyles: Record<TextColor, string> = {
  primary: 'text-white',
  secondary: 'text-white/70',
  tertiary: 'text-white/50',
  muted: 'text-white/35',
  error: 'text-red-400',
  success: 'text-emerald-400',
  warning: 'text-amber-400',
  info: 'text-blue-400',
};

const alignStyles: Record<TextAlign, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

const truncateStyles: Record<TextTruncate, string> = {
  none: '',
  truncate: 'truncate',
  'clamp-2': 'line-clamp-2',
  'clamp-3': 'line-clamp-3',
};

// Map variants to default HTML elements
const variantElements: Partial<Record<TextStyle, ElementType>> = {
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  body: 'p',
  bodySm: 'p',
  bodyXs: 'p',
  label: 'span',
  labelSm: 'span',
  code: 'code',
  codeSm: 'code',
  button: 'span',
  buttonSm: 'span',
};

export const Text = forwardRef<HTMLElement, TextProps>(
  (
    {
      children,
      variant = 'body',
      color = 'primary',
      align = 'left',
      truncate = 'none',
      mono = false,
      uppercase = false,
      className,
      as,
      ...props
    },
    ref
  ) => {
    const Component = as || variantElements[variant] || 'span';
    const style = textStyles[variant];

    const combinedClassName = cn(
      // Font size
      style.fontSize === '24px' && 'text-2xl',
      style.fontSize === '20px' && 'text-xl',
      style.fontSize === '18px' && 'text-lg',
      style.fontSize === '16px' && 'text-base',
      style.fontSize === '14px' && 'text-sm',
      style.fontSize === '13px' && 'text-[13px]',
      style.fontSize === '11px' && 'text-[11px]',
      style.fontSize === '10px' && 'text-[10px]',
      // Font weight
      style.fontWeight === '400' && 'font-normal',
      style.fontWeight === '500' && 'font-medium',
      style.fontWeight === '600' && 'font-semibold',
      style.fontWeight === '700' && 'font-bold',
      // Line height
      style.lineHeight === '1' && 'leading-none',
      style.lineHeight === '1.25' && 'leading-tight',
      style.lineHeight === '1.375' && 'leading-snug',
      style.lineHeight === '1.5' && 'leading-normal',
      // Letter spacing
      'letterSpacing' in style && style.letterSpacing === '-0.025em' && 'tracking-tight',
      'letterSpacing' in style && style.letterSpacing === '0.025em' && 'tracking-wide',
      // Monospace
      (mono || 'fontFamily' in style) && 'font-mono',
      // Uppercase
      (uppercase || ('textTransform' in style && style.textTransform === 'uppercase')) && 'uppercase',
      // Color
      colorStyles[color],
      // Alignment
      alignStyles[align],
      // Truncation
      truncateStyles[truncate],
      className
    );

    return (
      <Component ref={ref} className={combinedClassName} {...props}>
        {children}
      </Component>
    );
  }
);

Text.displayName = 'Text';

export type { TextProps, TextColor, TextAlign, TextTruncate };
