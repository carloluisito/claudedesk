import { forwardRef } from 'react';
import { cn } from '../../lib/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const variants = {
      primary: cn(
        'bg-blue-600 text-white',
        'shadow-[0_16px_60px_rgba(59,130,246,0.25)]',
        'disabled:cursor-not-allowed disabled:bg-zinc-300 dark:disabled:bg-zinc-700/60 disabled:text-zinc-500 dark:disabled:text-zinc-300 disabled:shadow-none'
      ),
      secondary: cn(
        'border border-zinc-300 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900/30 text-zinc-700 dark:text-zinc-200',
        'hover:bg-zinc-200 dark:hover:bg-zinc-900/50'
      ),
      danger: cn(
        'border border-red-300 dark:border-red-500/35 bg-red-50 dark:bg-red-600/10 text-red-600 dark:text-red-200',
        'hover:bg-red-100 dark:hover:bg-red-600/20'
      ),
      success: cn(
        'bg-emerald-600 text-white',
        'shadow-[0_16px_60px_rgba(16,185,129,0.22)]',
        'disabled:cursor-not-allowed disabled:bg-zinc-300 dark:disabled:bg-zinc-700/60 disabled:text-zinc-500 dark:disabled:text-zinc-300 disabled:shadow-none'
      ),
      ghost: cn(
        'text-zinc-500 dark:text-zinc-400',
        'hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'
      ),
    };

    const sizes = {
      sm: 'px-3 py-2 text-sm rounded-xl',
      md: 'px-4 py-3 text-base rounded-2xl',
      lg: 'px-5 py-4 text-lg rounded-2xl',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-semibold transition-all',
          'active:scale-[0.99]',
          'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-950',
          variants[variant],
          sizes[size],
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <svg
            className="h-5 w-5 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : leftIcon}
        {children}
        {rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';
