/**
 * AuthSuccess - Success state shown after authentication
 */

import { Check, Loader2 } from 'lucide-react';
import { VStack } from '../../design-system/primitives/Stack';

interface AuthSuccessProps {
  message?: string;
}

export function AuthSuccess({ message = 'Redirecting to dashboard...' }: AuthSuccessProps) {
  return (
    <VStack gap={4} align="center" className="w-full py-8">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
        <Check className="h-8 w-8" />
      </div>

      <VStack gap={1} align="center">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Authentication Complete</h2>
        <p className="text-sm text-zinc-500">{message}</p>
      </VStack>

      <div className="flex items-center gap-2 text-zinc-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-xs">Loading...</span>
      </div>
    </VStack>
  );
}

export type { AuthSuccessProps };
