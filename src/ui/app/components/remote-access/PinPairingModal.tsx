import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, RefreshCw, Loader2, Clock, Smartphone } from 'lucide-react';
import { cn } from '../../lib/cn';
import { usePinPairing } from '../../hooks/usePinPairing';

interface PinPairingModalProps {
  onClose: () => void;
}

export function PinPairingModal({ onClose }: PinPairingModalProps) {
  const { generatePin, generating } = usePinPairing();
  const [pin, setPin] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  // Format PIN as XXX-XXX
  const formatPin = (pin: string): string => {
    return `${pin.slice(0, 3)}-${pin.slice(3, 6)}`;
  };

  // Generate PIN on mount
  useEffect(() => {
    const loadPin = async () => {
      const result = await generatePin();
      if (result) {
        setPin(result.pin);
        setExpiresAt(result.expiresAt);
        setError(null);
      } else {
        setError('Failed to generate PIN. Please try again.');
      }
    };

    loadPin();
  }, [generatePin]);

  // Update countdown timer
  useEffect(() => {
    if (!expiresAt) return;

    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
      setTimeRemaining(remaining);

      if (remaining === 0) {
        setIsExpired(true);
      }
    };

    // Update immediately
    updateTimer();

    // Update every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const handleCopyPin = async () => {
    if (pin) {
      try {
        await navigator.clipboard.writeText(pin);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('Failed to copy PIN:', error);
      }
    }
  };

  const handleRegenerate = async () => {
    setIsExpired(false);
    setError(null);
    const result = await generatePin();
    if (result) {
      setPin(result.pin);
      setExpiresAt(result.expiresAt);
    } else {
      setError('Failed to generate PIN. Please try again.');
    }
  };

  // Format time remaining as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Determine timer color based on time remaining
  const getTimerColor = (): string => {
    if (timeRemaining === 0) return 'text-red-400';
    if (timeRemaining < 10) return 'text-red-400';
    if (timeRemaining < 60) return 'text-amber-400';
    return 'text-white/60';
  };

  const shouldPulse = timeRemaining > 0 && timeRemaining < 10;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-md mx-4 rounded-3xl bg-zinc-900 shadow-2xl ring-1 ring-white/10"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <h3 className="text-lg font-semibold text-white">Pairing PIN</h3>
            <button
              onClick={onClose}
              className="text-white/40 hover:text-white/70 transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {generating && !pin ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-white/40 mb-3" />
                <p className="text-sm text-white/60">Generating PIN...</p>
              </div>
            ) : error ? (
              <div className="rounded-2xl bg-red-500/10 p-4 ring-1 ring-red-500/20">
                <p className="text-sm text-red-400">{error}</p>
                <button
                  onClick={handleRegenerate}
                  disabled={generating}
                  className="mt-3 flex items-center gap-2 rounded-2xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Try Again
                </button>
              </div>
            ) : pin ? (
              <>
                {/* PIN Display */}
                <div className="flex flex-col items-center space-y-4">
                  <div className="rounded-2xl bg-white/5 p-6 ring-1 ring-white/10 w-full">
                    <div className="text-center">
                      <p className="text-xs text-white/50 mb-3 uppercase tracking-wider font-medium">
                        Enter this PIN on your mobile device
                      </p>
                      <div
                        className={cn(
                          'font-mono text-5xl tracking-widest text-white font-bold',
                          isExpired && 'opacity-50'
                        )}
                      >
                        {formatPin(pin)}
                      </div>
                    </div>
                  </div>

                  {/* Timer */}
                  <div className="flex items-center gap-2">
                    <Clock
                      className={cn(
                        'h-4 w-4',
                        getTimerColor(),
                        shouldPulse && 'animate-pulse'
                      )}
                    />
                    <span
                      className={cn(
                        'text-sm font-mono',
                        getTimerColor(),
                        shouldPulse && 'animate-pulse'
                      )}
                    >
                      {isExpired ? 'Expired' : formatTime(timeRemaining)}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={handleCopyPin}
                    disabled={isExpired}
                    className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 py-2.5 text-sm font-medium text-white/70 ring-1 ring-white/10 hover:bg-white/15 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 text-emerald-400" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy PIN
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleRegenerate}
                    disabled={generating}
                    className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Regenerate
                  </button>
                </div>

                {/* Instructions */}
                <div className="rounded-2xl bg-blue-500/10 p-4 ring-1 ring-blue-500/20 space-y-3">
                  <div className="flex items-start gap-2">
                    <Smartphone className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-blue-400 font-medium mb-2">How to pair:</p>
                      <ol className="text-xs text-blue-400/80 space-y-1 list-decimal list-inside">
                        <li>Open ClaudeDesk on your mobile device</li>
                        <li>Tap "Enter Pairing PIN"</li>
                        <li>Enter the 6-digit PIN shown above</li>
                        <li>You'll be automatically authenticated</li>
                      </ol>
                    </div>
                  </div>
                </div>

                {/* Security Note */}
                <div className="rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
                  <p className="text-xs text-white/50">
                    <strong className="text-white/70">Security:</strong> This PIN expires in 5 minutes and can only
                    be used once. After 5 failed attempts, you'll need to generate a new PIN.
                  </p>
                </div>
              </>
            ) : null}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-white/10">
            <button
              onClick={onClose}
              className="w-full rounded-2xl bg-white/5 px-4 py-2.5 text-sm font-medium text-white/70 ring-1 ring-white/10 hover:bg-white/10 transition-colors"
            >
              Close
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
