import { useState, useRef, useEffect, KeyboardEvent, ClipboardEvent } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Check, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/cn';

interface PinEntryProps {
  onSubmit: (pin: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  onClear?: () => void;
}

export function PinEntry({ onSubmit, isLoading, error, onClear }: PinEntryProps) {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [isSuccess, setIsSuccess] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto-focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Trigger shake animation on error
  useEffect(() => {
    if (error) {
      setShake(true);
      // Clear inputs on error
      setDigits(['', '', '', '', '', '']);
      // Reset shake animation
      setTimeout(() => setShake(false), 400);
      // Focus first input
      setTimeout(() => inputRefs.current[0]?.focus(), 400);
      // Call onClear if provided
      if (onClear) {
        onClear();
      }
    }
  }, [error, onClear]);

  const handleChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(-1);

    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);

    // Auto-advance to next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits entered
    if (digit && index === 5 && newDigits.every((d) => d !== '')) {
      const pin = newDigits.join('');
      handleSubmit(pin);
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    // Move to previous input on backspace if current is empty
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '');

    // Only process if it's exactly 6 digits
    if (pastedData.length === 6) {
      const newDigits = pastedData.split('');
      setDigits(newDigits);
      // Focus last input
      inputRefs.current[5]?.focus();
      // Auto-submit
      handleSubmit(pastedData);
    }
  };

  const handleSubmit = async (pin: string) => {
    if (pin.length === 6 && !isLoading) {
      try {
        await onSubmit(pin);
        setIsSuccess(true);
      } catch (error) {
        // Error is handled by parent
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* PIN Input Grid */}
      <motion.div
        animate={shake ? { x: [-8, 8, -8, 8, 0] } : {}}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="grid grid-cols-3 gap-3"
      >
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={index === 0 ? handlePaste : undefined}
            disabled={isLoading || isSuccess}
            className={cn(
              'w-full h-16 text-center text-2xl font-mono rounded-xl transition-all',
              'bg-white/5 text-white',
              'focus:outline-none focus:ring-2',
              // Default state
              !error && !isSuccess && 'ring-1 ring-white/20 focus:ring-blue-500',
              // Error state
              error && 'ring-2 ring-red-500 bg-red-500/10',
              // Success state
              isSuccess && 'ring-2 ring-emerald-500 bg-emerald-500/10',
              // Disabled state
              (isLoading || isSuccess) && 'opacity-60 cursor-not-allowed'
            )}
          />
        ))}
      </motion.div>

      {/* Status Messages */}
      <div className="min-h-[24px]">
        {isLoading && (
          <div className="flex items-center justify-center gap-2 text-sm text-white/60">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Validating PIN...</span>
          </div>
        )}
        {isSuccess && !isLoading && (
          <div className="flex items-center justify-center gap-2 text-sm text-emerald-400">
            <Check className="h-4 w-4" />
            <span>Success! Redirecting...</span>
          </div>
        )}
        {error && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-2 text-sm text-red-400"
          >
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </motion.div>
        )}
      </div>

      {/* Helper Text */}
      {!error && !isLoading && !isSuccess && (
        <p className="text-center text-xs text-white/50">
          Enter the 6-digit PIN from your desktop
        </p>
      )}
    </div>
  );
}
