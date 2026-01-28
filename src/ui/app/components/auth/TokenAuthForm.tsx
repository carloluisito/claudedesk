/**
 * TokenAuthForm - Token input form for authentication
 */

import { useState } from 'react';
import { ArrowLeft, ArrowRight, Key, Loader2, Eye, EyeOff } from 'lucide-react';
import { cn } from '../../lib/cn';
import { VStack, HStack } from '../../design-system/primitives/Stack';

interface TokenAuthFormProps {
  onSubmit: (token: string) => void;
  isLoading?: boolean;
  error?: string;
  onBack?: () => void;
}

export function TokenAuthForm({ onSubmit, isLoading = false, error, onBack }: TokenAuthFormProps) {
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (token.trim()) {
      onSubmit(token.trim());
    }
  };

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
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
            <Key className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Enter Access Token</h2>
            <p className="text-xs text-zinc-500">From your terminal output</p>
          </div>
        </div>
      </HStack>

      {/* Form */}
      <form onSubmit={handleSubmit} className="w-full">
        <VStack gap={3}>
          <div className="relative">
            <input
              type={showToken ? 'text' : 'password'}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste your access token..."
              className={cn(
                'w-full rounded-xl border px-4 py-3 pr-12 font-mono text-sm',
                'bg-white dark:bg-zinc-800/50',
                'text-zinc-900 dark:text-zinc-100',
                'placeholder-zinc-400 dark:placeholder-zinc-600',
                'focus:outline-none focus:ring-2 focus:ring-blue-500/50',
                error
                  ? 'border-red-300 dark:border-red-800'
                  : 'border-zinc-300 dark:border-zinc-700'
              )}
              autoComplete="off"
              autoFocus
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
            >
              {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={isLoading || !token.trim()}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all',
              'bg-blue-600 text-white shadow-lg shadow-blue-600/20',
              'hover:bg-blue-700 active:scale-[0.99]',
              'disabled:cursor-not-allowed disabled:bg-zinc-300 dark:disabled:bg-zinc-700 disabled:shadow-none'
            )}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Continue
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </VStack>
      </form>

      {/* Help text */}
      <p className="text-center text-xs text-zinc-500 dark:text-zinc-600">
        The token is displayed when you start the ClaudeDesk server
      </p>
    </VStack>
  );
}

export type { TokenAuthFormProps };
