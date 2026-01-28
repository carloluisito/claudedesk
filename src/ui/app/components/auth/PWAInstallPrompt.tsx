/**
 * PWAInstallPrompt - Non-blocking prompt to install as PWA
 */

import { useState } from 'react';
import { ArrowRight, Smartphone, Share, Check } from 'lucide-react';
import { cn } from '../../lib/cn';
import { VStack, HStack } from '../../design-system/primitives/Stack';

interface PWAInstallPromptProps {
  pwaUrl: string;
  onContinue: () => void;
}

export function PWAInstallPrompt({ pwaUrl, onContinue }: PWAInstallPromptProps) {
  const [copied, setCopied] = useState(false);

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(pwaUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <VStack gap={4} className="w-full">
      {/* Success indicator */}
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
          <Check className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Successfully Connected!</h2>
        <p className="text-sm text-zinc-500 mt-0.5">Your device is now authenticated</p>
      </div>

      {/* PWA Install Card */}
      <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
        <HStack gap={3} align="start" className="mb-3">
          <Smartphone className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              Install as App (Recommended)
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400/80 mt-1">
              Add ClaudeDesk to your home screen to use it like a native app. This keeps you logged in.
            </p>
          </div>
        </HStack>

        <VStack gap={3}>
          {/* URL with copy button */}
          <HStack gap={2}>
            <div className="flex-1 rounded-lg bg-white dark:bg-zinc-800 px-3 py-2 text-[10px] font-mono text-zinc-600 dark:text-zinc-400 break-all border border-amber-200 dark:border-amber-700 overflow-hidden">
              <span className="line-clamp-2">{pwaUrl}</span>
            </div>
            <button
              onClick={copyUrl}
              className="p-2 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-lg transition flex-shrink-0"
              title="Copy URL"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Share className="h-4 w-4" />}
            </button>
          </HStack>

          {/* Instructions */}
          <div className="text-[11px] text-amber-700 dark:text-amber-400/70">
            <p className="font-medium mb-1">How to install:</p>
            <ol className="list-decimal list-inside space-y-0.5">
              <li>
                Tap the <strong>Share</strong> button in Safari
              </li>
              <li>
                Scroll down and tap <strong>"Add to Home Screen"</strong>
              </li>
              <li>
                Tap <strong>"Add"</strong> in the top right
              </li>
            </ol>
          </div>
        </VStack>
      </div>

      {/* Continue button */}
      <button
        onClick={onContinue}
        className={cn(
          'flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold transition-all',
          'bg-blue-600 text-white shadow-lg shadow-blue-600/20',
          'hover:bg-blue-700 active:scale-[0.99]'
        )}
      >
        Continue to ClaudeDesk
        <ArrowRight className="h-4 w-4" />
      </button>

      <p className="text-center text-xs text-zinc-500 dark:text-zinc-600">
        You can skip this and continue using the browser
      </p>
    </VStack>
  );
}

export type { PWAInstallPromptProps };
