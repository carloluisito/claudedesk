import { cn } from '../../lib/cn';
import { haptics } from '../../lib/haptics';
import { Check } from 'lucide-react';

interface TouchCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  onClick?: (e: React.MouseEvent) => void;
  disabled?: boolean;
  color?: 'green' | 'orange' | 'purple' | 'blue';
  className?: string;
  size?: 'sm' | 'md';
}

const COLOR_CLASSES = {
  green: {
    checked: 'bg-green-500 border-green-500',
    unchecked: 'border-zinc-600 bg-zinc-800',
    checkmark: 'text-white',
  },
  orange: {
    checked: 'bg-orange-500 border-orange-500',
    unchecked: 'border-zinc-600 bg-zinc-800',
    checkmark: 'text-white',
  },
  purple: {
    checked: 'bg-purple-500 border-purple-500',
    unchecked: 'border-zinc-600 bg-zinc-800',
    checkmark: 'text-white',
  },
  blue: {
    checked: 'bg-blue-500 border-blue-500',
    unchecked: 'border-zinc-600 bg-zinc-800',
    checkmark: 'text-white',
  },
};

export function TouchCheckbox({
  checked,
  onChange,
  onClick,
  disabled = false,
  color = 'blue',
  className,
  size = 'md',
}: TouchCheckboxProps) {
  const colorClasses = COLOR_CLASSES[color];
  const sizeClasses = size === 'sm' ? 'h-9 w-9' : 'h-11 w-11';
  const checkboxSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  const checkmarkSize = size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5';

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;

    haptics.light();
    onChange(!checked);
    onClick?.(e);
  };

  return (
    <label
      className={cn(
        'relative flex items-center justify-center cursor-pointer touch-manipulation',
        sizeClasses,
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      onClick={handleClick}
    >
      <div
        className={cn(
          'flex items-center justify-center rounded border-2 transition-colors',
          checkboxSize,
          checked ? colorClasses.checked : colorClasses.unchecked
        )}
      >
        {checked && <Check className={cn(checkmarkSize, colorClasses.checkmark)} strokeWidth={3} />}
      </div>
      {/* Hidden input for accessibility */}
      <input
        type="checkbox"
        checked={checked}
        onChange={() => {}}
        disabled={disabled}
        className="sr-only"
        tabIndex={-1}
      />
    </label>
  );
}
