/**
 * AuthV2.tsx - Redesigned authentication screen with stepper flow
 *
 * Key improvements:
 * - Single-page stepper flow: Method Selection -> Authentication -> PWA Prompt
 * - Secure token handling (no URL exposure after validation)
 * - Non-blocking PWA install prompt
 * - Reduced cognitive load with clear progression
 */

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { AuthStepper } from '../components/auth';
import { useAppStore } from '../store/appStore';

export default function AuthV2() {
  const prefersReduced = useReducedMotion();
  const { setToken: saveToken, loadData } = useAppStore();

  // Check for token in URL (from QR code scan)
  const [urlToken, setUrlToken] = useState<string | null>(null);
  const [isAutoAuth, setIsAutoAuth] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (token) {
      setUrlToken(token);
      setIsAutoAuth(true);

      // Validate token immediately
      (async () => {
        try {
          const response = await fetch('/api/health', {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (response.ok) {
            // Token is valid - continue to stepper
            setIsAutoAuth(false);
          } else {
            // Invalid token - show stepper with error
            setUrlToken(null);
            setIsAutoAuth(false);
          }
        } catch {
          setUrlToken(null);
          setIsAutoAuth(false);
        }
      })();
    }
  }, []);

  // Show loading while auto-authenticating
  if (isAutoAuth) {
    return (
      <div className="min-h-screen w-full bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
        <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col items-center justify-center px-4 pb-6 pt-4">
          <motion.div
            className="text-center"
            initial={prefersReduced ? {} : { opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40">
              <Loader2 className="h-7 w-7 text-blue-500 dark:text-blue-400 animate-spin" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Authenticating...
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Please wait while we verify your access
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  // Main stepper flow
  return <AuthStepper urlToken={urlToken || undefined} />;
}
