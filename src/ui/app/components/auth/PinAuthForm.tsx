/**
 * PinAuthForm - PIN entry form for authentication
 * Uses existing PinEntry component
 */

import { ArrowLeft, Hash } from 'lucide-react';
import { VStack, HStack } from '../../design-system/primitives/Stack';
import { PinEntry } from './PinEntry';

interface PinAuthFormProps {
  onSubmit: (pin: string) => void;
  isLoading?: boolean;
  error?: string;
  onBack?: () => void;
  onClearError?: () => void;
}

export function PinAuthForm({
  onSubmit,
  isLoading = false,
  error,
  onBack,
  onClearError,
}: PinAuthFormProps) {
  return (
    <VStack gap={4} className="w-full">
      {/* Header with back button */}
      <HStack gap={2} align="center">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400">
            <Hash className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Enter Pairing PIN</h2>
            <p className="text-xs text-zinc-500">6-digit code from settings</p>
          </div>
        </div>
      </HStack>

      {/* PIN Entry component */}
      <div className="w-full">
        <PinEntry
          onSubmit={onSubmit}
          isLoading={isLoading}
          error={error}
          onClear={onClearError}
        />
      </div>

      {/* Help text */}
      <p className="text-center text-xs text-zinc-500 dark:text-zinc-600">
        Get your PIN from Remote Access settings on the desktop app
      </p>
    </VStack>
  );
}

export type { PinAuthFormProps };
