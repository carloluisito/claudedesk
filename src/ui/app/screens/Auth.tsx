import { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Key, ArrowRight, Loader2, Smartphone, Share, Check, Hash } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { PinEntry } from '../components/auth/PinEntry';
import { usePinPairing } from '../hooks/usePinPairing';

export default function Auth() {
  const [authMode, setAuthMode] = useState<'token' | 'pin'>('token');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAutoAuth, setIsAutoAuth] = useState(false);
  const [showPwaPrompt, setShowPwaPrompt] = useState(false);
  const [pwaUrl, setPwaUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const prefersReduced = useReducedMotion();
  const { setToken: saveToken, loadData } = useAppStore();
  const { validatePin, validating } = usePinPairing();

  // Detect if running as standalone PWA
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;

  // Check for token in URL query params (from QR code scan)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');

    if (urlToken) {
      setIsAutoAuth(true);
      handleAutoAuth(urlToken);
    }
  }, []);

  const handleAutoAuth = async (urlToken: string) => {
    try {
      // Test the token by making a request
      const response = await fetch('/api/health', {
        headers: {
          Authorization: `Bearer ${urlToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Invalid token');
      }

      // Save the token first
      saveToken(urlToken);

      // If not already in standalone mode (PWA), show the install prompt
      // This gives users a chance to add to home screen with the token
      if (!isStandalone) {
        setPwaUrl(window.location.href); // Keep the full URL with token
        setShowPwaPrompt(true);
        setIsAutoAuth(false);
      } else {
        // Already in PWA mode, just proceed
        // Remove token from URL for security
        const url = new URL(window.location.href);
        url.searchParams.delete('token');
        window.history.replaceState({}, '', url.pathname);
        await loadData();
      }
    } catch (err) {
      setIsAutoAuth(false);
      setError('Invalid or expired token. Please enter manually.');
      // Remove token from URL
      const url = new URL(window.location.href);
      url.searchParams.delete('token');
      window.history.replaceState({}, '', url.pathname);
    }
  };

  const handleContinueToApp = async () => {
    // Remove token from URL for security
    const url = new URL(window.location.href);
    url.searchParams.delete('token');
    window.history.replaceState({}, '', url.pathname);
    await loadData();
  };

  const copyPwaUrl = async () => {
    if (pwaUrl) {
      try {
        await navigator.clipboard.writeText(pwaUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      setError('Please enter a token');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Test the token by making a request
      const response = await fetch('/api/health', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Invalid token');
      }

      saveToken(token);
      await loadData();
    } catch (err) {
      setError('Invalid token. Please check and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinSubmit = async (pin: string) => {
    setError('');

    const result = await validatePin(pin);

    if (result.success && result.token) {
      saveToken(result.token);
      await loadData();
    } else {
      const errorMsg = result.error || 'Invalid PIN. Please try again.';
      const attemptsMsg = result.attemptsRemaining !== undefined
        ? ` (${result.attemptsRemaining} attempts remaining)`
        : '';
      setError(errorMsg + attemptsMsg);
    }
  };

  // Show loading state during auto-auth from QR code
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

  // Show PWA install prompt after successful authentication
  if (showPwaPrompt) {
    return (
      <div className="min-h-screen w-full bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
        <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col items-center justify-center px-4 pb-6 pt-4">
          <motion.div
            className="w-full"
            initial={prefersReduced ? {} : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/40">
                <Check className="h-7 w-7 text-emerald-500 dark:text-emerald-400" />
              </div>
              <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                Successfully Connected!
              </h1>
              <p className="mt-1 text-sm text-zinc-500">
                Your device is now authenticated
              </p>
            </div>

            {/* Add to Home Screen Card */}
            <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 mb-4">
              <div className="flex items-start gap-3 mb-3">
                <Smartphone className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                    Install as App (Recommended)
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-400/80 mt-1">
                    Add ClaudeDesk to your home screen to use it like a native app. This will keep you logged in.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex-1 rounded-lg bg-white dark:bg-zinc-800 px-3 py-2 text-[10px] font-mono text-zinc-600 dark:text-zinc-400 break-all border border-amber-200 dark:border-amber-700">
                    {pwaUrl}
                  </div>
                  <button
                    onClick={copyPwaUrl}
                    className="p-2 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-lg transition flex-shrink-0"
                    title="Copy URL"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Share className="h-4 w-4" />
                    )}
                  </button>
                </div>

                <div className="text-[11px] text-amber-700 dark:text-amber-400/70">
                  <p className="font-medium mb-1">How to install:</p>
                  <ol className="list-decimal list-inside space-y-0.5">
                    <li>Tap the <strong>Share</strong> button in Safari</li>
                    <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
                    <li>Tap <strong>"Add"</strong> in the top right</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Continue Button */}
            <button
              onClick={handleContinueToApp}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 active:scale-[0.99]"
            >
              Continue to ClaudeDesk
              <ArrowRight className="h-4 w-4" />
            </button>

            <p className="mt-4 text-center text-[11px] text-zinc-500 dark:text-zinc-600">
              You can skip this and continue using the browser
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
      <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col items-center justify-center px-4 pb-6 pt-4">
        <motion.div
          className="w-full"
          initial={prefersReduced ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40">
              {authMode === 'pin' ? (
                <Hash className="h-7 w-7 text-blue-500 dark:text-blue-400" />
              ) : (
                <Key className="h-7 w-7 text-blue-500 dark:text-blue-400" />
              )}
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Welcome to ClaudeDesk
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              {authMode === 'pin' ? 'Enter your pairing PIN' : 'Enter your access token to continue'}
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 p-4">
            {authMode === 'token' ? (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label
                    htmlFor="token"
                    className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-zinc-500"
                  >
                    Access Token
                  </label>
                  <input
                    id="token"
                    type="password"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Enter your token..."
                    className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 px-3 py-2.5 font-mono text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 focus:border-zinc-400 dark:focus:border-zinc-600 focus:outline-none"
                    autoComplete="off"
                  />
                  {error && (
                    <p className="mt-1.5 text-xs text-red-500 dark:text-red-400">{error}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-zinc-300 dark:disabled:bg-zinc-700 disabled:shadow-none"
                >
                  {isLoading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="space-y-3">
                <PinEntry
                  onSubmit={handlePinSubmit}
                  isLoading={validating}
                  error={error}
                  onClear={() => setError('')}
                />
              </div>
            )}

            {/* Mode Toggle */}
            <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <button
                onClick={() => {
                  setAuthMode(authMode === 'token' ? 'pin' : 'token');
                  setError('');
                  setToken('');
                }}
                className="w-full text-center text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
              >
                {authMode === 'token' ? (
                  <span className="flex items-center justify-center gap-1.5">
                    <Hash className="h-3.5 w-3.5" />
                    Enter Pairing PIN
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-1.5">
                    <Key className="h-3.5 w-3.5" />
                    Use Access Token Instead
                  </span>
                )}
              </button>
            </div>
          </div>

          <p className="mt-5 text-center text-[11px] text-zinc-500 dark:text-zinc-600">
            {authMode === 'token'
              ? 'The token is displayed in the terminal when you start ClaudeDesk'
              : 'Get your PIN from the desktop Remote Access settings'}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
