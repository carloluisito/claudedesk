/**
 * AuthStepper - Orchestrates the authentication flow
 *
 * States: method_selection -> authentication -> success -> pwa_prompt (optional)
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Stepper, StepContent } from '../../design-system/compounds/Stepper';
import { Surface } from '../../design-system/primitives/Surface';
import { VStack } from '../../design-system/primitives/Stack';
import { AuthMethodPicker } from './AuthMethodPicker';
import { TokenAuthForm } from './TokenAuthForm';
import { PinAuthForm } from './PinAuthForm';
import { PWAInstallPrompt } from './PWAInstallPrompt';
import { AuthSuccess } from './AuthSuccess';
import { useAppStore } from '../../store/appStore';
import { usePinPairing } from '../../hooks/usePinPairing';

type AuthMethod = 'token' | 'pin';
type AuthState = 'method_selection' | 'authentication' | 'validating' | 'success' | 'pwa_prompt';

interface AuthStepperProps {
  /** Initial method from URL or default */
  initialMethod?: AuthMethod;
  /** Token from URL (QR code scan) */
  urlToken?: string;
}

const steps = [
  { id: 'method', label: 'Method', description: 'Choose how to connect' },
  { id: 'auth', label: 'Authenticate', description: 'Enter credentials' },
  { id: 'complete', label: 'Complete', description: 'Ready to use' },
];

export function AuthStepper({ initialMethod = 'token', urlToken }: AuthStepperProps) {
  const prefersReduced = useReducedMotion();
  const { setToken: saveToken, loadData } = useAppStore();
  const { validatePin, validating } = usePinPairing();

  const [currentStep, setCurrentStep] = useState(urlToken ? 1 : 0);
  const [authMethod, setAuthMethod] = useState<AuthMethod>(initialMethod);
  const [authState, setAuthState] = useState<AuthState>(urlToken ? 'validating' : 'method_selection');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pwaUrl, setPwaUrl] = useState<string | null>(null);

  // Check if running as standalone PWA
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;

  // Handle method selection
  const handleMethodSelect = useCallback((method: AuthMethod) => {
    setAuthMethod(method);
    setAuthState('authentication');
    setCurrentStep(1);
    setError('');
  }, []);

  // Handle token validation
  const handleTokenValidate = useCallback(
    async (token: string) => {
      setIsLoading(true);
      setError('');

      try {
        const response = await fetch('/api/health', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error('Invalid token');
        }

        saveToken(token);

        // Show PWA prompt if not standalone
        if (!isStandalone) {
          setPwaUrl(window.location.origin);
          setAuthState('pwa_prompt');
          setCurrentStep(2);
        } else {
          setAuthState('success');
          setCurrentStep(2);
          // Clean URL and load data
          const url = new URL(window.location.href);
          url.searchParams.delete('token');
          window.history.replaceState({}, '', url.pathname);
          await loadData();
        }
      } catch (err) {
        setError('Invalid token. Please check and try again.');
      } finally {
        setIsLoading(false);
      }
    },
    [isStandalone, saveToken, loadData]
  );

  // Handle PIN validation
  const handlePinValidate = useCallback(
    async (pin: string) => {
      setError('');

      const result = await validatePin(pin);

      if (result.success && result.token) {
        saveToken(result.token);

        if (!isStandalone) {
          setPwaUrl(window.location.origin);
          setAuthState('pwa_prompt');
          setCurrentStep(2);
        } else {
          setAuthState('success');
          setCurrentStep(2);
          await loadData();
        }
      } else {
        const errorMsg = result.error || 'Invalid PIN. Please try again.';
        const attemptsMsg =
          result.attemptsRemaining !== undefined ? ` (${result.attemptsRemaining} attempts remaining)` : '';
        setError(errorMsg + attemptsMsg);
      }
    },
    [validatePin, isStandalone, saveToken, loadData]
  );

  // Handle continue from PWA prompt
  const handleContinueFromPWA = useCallback(async () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('token');
    window.history.replaceState({}, '', url.pathname);
    await loadData();
  }, [loadData]);

  // Handle going back
  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setAuthState('method_selection');
      setError('');
    }
  }, [currentStep]);

  // Process URL token on mount
  useState(() => {
    if (urlToken) {
      handleTokenValidate(urlToken);
    }
  });

  return (
    <div className="min-h-screen w-full bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
      <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col items-center justify-center px-4 pb-6 pt-4">
        <motion.div
          className="w-full"
          initial={prefersReduced ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Header */}
          <div className="mb-6 text-center">
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Welcome to ClaudeDesk
            </h1>
            <p className="mt-1 text-sm text-zinc-500">Connect to your development server</p>
          </div>

          {/* Stepper with dot indicators */}
          <Stepper
            steps={steps}
            currentStep={currentStep}
            onStepChange={setCurrentStep}
            showIndicators={true}
            indicatorStyle="dots"
          >
            <AnimatePresence mode="wait">
              {/* Step 1: Method Selection */}
              {currentStep === 0 && (
                <motion.div
                  key="method"
                  initial={prefersReduced ? {} : { opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={prefersReduced ? {} : { opacity: 0, x: -20 }}
                >
                  <AuthMethodPicker
                    selectedMethod={authMethod}
                    onSelectMethod={handleMethodSelect}
                  />
                </motion.div>
              )}

              {/* Step 2: Authentication */}
              {currentStep === 1 && (
                <motion.div
                  key="auth"
                  initial={prefersReduced ? {} : { opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={prefersReduced ? {} : { opacity: 0, x: -20 }}
                >
                  {authMethod === 'token' ? (
                    <TokenAuthForm
                      onSubmit={handleTokenValidate}
                      isLoading={isLoading}
                      error={error}
                      onBack={handleBack}
                    />
                  ) : (
                    <PinAuthForm
                      onSubmit={handlePinValidate}
                      isLoading={validating}
                      error={error}
                      onBack={handleBack}
                      onClearError={() => setError('')}
                    />
                  )}
                </motion.div>
              )}

              {/* Step 3: Success / PWA Prompt */}
              {currentStep === 2 && (
                <motion.div
                  key="complete"
                  initial={prefersReduced ? {} : { opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={prefersReduced ? {} : { opacity: 0, x: -20 }}
                >
                  {authState === 'pwa_prompt' && pwaUrl ? (
                    <PWAInstallPrompt pwaUrl={pwaUrl} onContinue={handleContinueFromPWA} />
                  ) : (
                    <AuthSuccess />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </Stepper>
        </motion.div>
      </div>
    </div>
  );
}

export type { AuthStepperProps, AuthMethod, AuthState };
