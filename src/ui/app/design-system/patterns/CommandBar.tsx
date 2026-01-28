/**
 * CommandBar - Unified command input pattern
 * Used for message composer, search, and command palette input
 */

import { forwardRef, useRef, type KeyboardEvent, type ChangeEvent, type ReactNode } from 'react';
import { Send, Loader2, Paperclip, AtSign } from 'lucide-react';
import { cn } from '@/lib/cn';
import { HStack } from '../primitives/Stack';

interface CommandBarProps {
  /** Current input value */
  value: string;
  /** Callback when value changes */
  onChange: (value: string) => void;
  /** Callback when command is submitted */
  onSubmit?: () => void;
  /** Placeholder text */
  placeholder?: string;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Whether a submission is in progress */
  isLoading?: boolean;
  /** Left side actions (before input) */
  leftActions?: ReactNode;
  /** Right side actions (before submit) */
  rightActions?: ReactNode;
  /** Whether to show the submit button */
  showSubmit?: boolean;
  /** Submit button icon */
  submitIcon?: ReactNode;
  /** Keyboard shortcut hint */
  shortcutHint?: string;
  /** Whether to auto-focus the input */
  autoFocus?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Custom class names */
  className?: string;
  /** Callback when input is focused */
  onFocus?: () => void;
  /** Callback when input is blurred */
  onBlur?: () => void;
  /** Called on keydown */
  onKeyDown?: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  /** Whether to use textarea for multiline */
  multiline?: boolean;
  /** Max height for multiline mode */
  maxHeight?: number;
}

const sizeStyles = {
  sm: {
    container: 'py-2 px-3',
    input: 'text-sm',
    button: 'p-1.5',
    icon: 'h-4 w-4',
  },
  md: {
    container: 'py-3 px-4',
    input: 'text-sm',
    button: 'p-2',
    icon: 'h-5 w-5',
  },
  lg: {
    container: 'py-4 px-5',
    input: 'text-base',
    button: 'p-2.5',
    icon: 'h-5 w-5',
  },
};

export const CommandBar = forwardRef<HTMLTextAreaElement, CommandBarProps>(
  (
    {
      value,
      onChange,
      onSubmit,
      placeholder = 'Type a message...',
      disabled = false,
      isLoading = false,
      leftActions,
      rightActions,
      showSubmit = true,
      submitIcon,
      shortcutHint,
      autoFocus = false,
      size = 'md',
      className,
      onFocus,
      onBlur,
      onKeyDown,
      multiline = true,
      maxHeight = 200,
    },
    ref
  ) => {
    const internalRef = useRef<HTMLTextAreaElement>(null);
    const inputRef = (ref as React.RefObject<HTMLTextAreaElement>) || internalRef;
    const styles = sizeStyles[size];

    const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
      // Auto-resize textarea
      if (multiline && inputRef.current) {
        inputRef.current.style.height = 'auto';
        inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, maxHeight) + 'px';
      }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
      onKeyDown?.(e);

      // Submit on Enter (without Shift)
      if (e.key === 'Enter' && !e.shiftKey && !isLoading && onSubmit) {
        e.preventDefault();
        onSubmit();
      }
    };

    const handleSubmitClick = () => {
      if (!isLoading && onSubmit && value.trim()) {
        onSubmit();
      }
    };

    const canSubmit = value.trim().length > 0 && !disabled && !isLoading;

    return (
      <div
        className={cn(
          'relative flex items-end rounded-2xl',
          'bg-white/5 ring-1 ring-white/10',
          'focus-within:ring-white/20 transition-shadow',
          disabled && 'opacity-50 cursor-not-allowed',
          styles.container,
          className
        )}
      >
        {/* Left actions */}
        {leftActions && (
          <HStack gap={1} className="mr-2 mb-0.5">
            {leftActions}
          </HStack>
        )}

        {/* Input */}
        <textarea
          ref={inputRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          rows={1}
          className={cn(
            'flex-1 bg-transparent resize-none',
            'text-white placeholder-white/40',
            'focus:outline-none',
            'disabled:cursor-not-allowed',
            multiline ? 'min-h-[1.5em] overflow-y-auto' : 'h-[1.5em] overflow-hidden',
            styles.input
          )}
          style={{ maxHeight: multiline ? maxHeight : undefined }}
        />

        {/* Right actions */}
        <HStack gap={1} className="ml-2 mb-0.5">
          {rightActions}

          {/* Submit button */}
          {showSubmit && (
            <button
              onClick={handleSubmitClick}
              disabled={!canSubmit}
              className={cn(
                'rounded-xl transition-colors',
                canSubmit
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-white/10 text-white/30 cursor-not-allowed',
                styles.button
              )}
              title={shortcutHint || 'Send (Enter)'}
            >
              {isLoading ? (
                <Loader2 className={cn(styles.icon, 'animate-spin')} />
              ) : (
                submitIcon || <Send className={styles.icon} />
              )}
            </button>
          )}
        </HStack>
      </div>
    );
  }
);

CommandBar.displayName = 'CommandBar';

// Quick action buttons for CommandBar
interface QuickActionProps {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export function QuickAction({ icon, label, onClick, disabled }: QuickActionProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'rounded-lg p-1.5 text-white/50 transition-colors',
        'hover:bg-white/10 hover:text-white/70',
        'disabled:opacity-50 disabled:cursor-not-allowed'
      )}
      title={label}
    >
      {icon}
    </button>
  );
}

// Pre-built quick actions
export const AttachAction = ({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) => (
  <QuickAction icon={<Paperclip className="h-4 w-4" />} label="Attach file" onClick={onClick} disabled={disabled} />
);

export const MentionAction = ({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) => (
  <QuickAction icon={<AtSign className="h-4 w-4" />} label="Mention" onClick={onClick} disabled={disabled} />
);

export type { CommandBarProps, QuickActionProps };
