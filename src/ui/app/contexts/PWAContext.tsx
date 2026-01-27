import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';

// LocalStorage keys
const STORAGE_KEYS = {
  INSTALLED: 'claudedesk-pwa-installed',
  DISMISSED: 'claudedesk-pwa-install-dismissed',
} as const;

// Types for the BeforeInstallPromptEvent (not in standard TypeScript lib)
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

type DisplayMode = 'standalone' | 'browser';

export interface PWAContextValue {
  canInstall: boolean;
  isInstalled: boolean;
  displayMode: DisplayMode;
  installPromptDismissedAt: number | null;
  promptInstall: () => Promise<boolean>;
  dismissInstallPrompt: () => void;
  updateAvailable: boolean;
  applyUpdate: () => void;
  dismissUpdate: () => void;
}

const PWAContext = createContext<PWAContextValue | null>(null);

// Helper to safely access localStorage
function getStorageItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function setStorageItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore storage errors
  }
}

interface PWAProviderProps {
  children: ReactNode;
  onInstallSuccess?: () => void;
  onBackOnline?: () => void;
}

export function PWAProvider({ children, onInstallSuccess, onBackOnline }: PWAProviderProps) {
  // Install state
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    return getStorageItem(STORAGE_KEYS.INSTALLED) === 'true';
  });
  const [installPromptDismissedAt, setInstallPromptDismissedAt] = useState<number | null>(() => {
    const dismissed = getStorageItem(STORAGE_KEYS.DISMISSED);
    return dismissed ? parseInt(dismissed, 10) : null;
  });

  // Display mode state
  const [displayMode, setDisplayMode] = useState<DisplayMode>(() => {
    if (typeof window === 'undefined') return 'browser';
    return window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser';
  });

  // Service worker update state
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateDismissed, setUpdateDismissed] = useState(false);
  const waitingWorkerRef = useRef<ServiceWorker | null>(null);

  // Track if we were offline
  const wasOfflineRef = useRef(false);

  // Capture beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      // Prevent Chrome 67+ from automatically showing the prompt
      e.preventDefault();
      // Store the event for later use
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Listen for appinstalled event
  useEffect(() => {
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setStorageItem(STORAGE_KEYS.INSTALLED, 'true');
      setDeferredPrompt(null);
      onInstallSuccess?.();
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [onInstallSuccess]);

  // Detect display mode changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(display-mode: standalone)');

    const handleChange = (e: MediaQueryListEvent) => {
      setDisplayMode(e.matches ? 'standalone' : 'browser');
      if (e.matches) {
        // If we're now in standalone mode, mark as installed
        setIsInstalled(true);
        setStorageItem(STORAGE_KEYS.INSTALLED, 'true');
      }
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  // Listen for service worker updates
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleControllerChange = () => {
      // A new service worker has taken control - reload to get new version
      // This happens after SKIP_WAITING is called
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    // Check for waiting service worker
    const checkForWaitingWorker = async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration?.waiting) {
        waitingWorkerRef.current = registration.waiting;
        setUpdateAvailable(true);
      }
    };

    // Listen for new service worker updates
    const handleServiceWorkerUpdate = async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New version available
                waitingWorkerRef.current = newWorker;
                setUpdateAvailable(true);
                setUpdateDismissed(false);
              }
            });
          }
        });
      }
    };

    checkForWaitingWorker();
    handleServiceWorkerUpdate();

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  // Listen for online/offline events to trigger callback
  useEffect(() => {
    const handleOffline = () => {
      wasOfflineRef.current = true;
    };

    const handleOnline = () => {
      if (wasOfflineRef.current) {
        wasOfflineRef.current = false;
        onBackOnline?.();
      }
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [onBackOnline]);

  // Prompt install
  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) {
      return false;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      // Clear the deferred prompt - it can only be used once
      setDeferredPrompt(null);

      if (outcome === 'accepted') {
        setIsInstalled(true);
        setStorageItem(STORAGE_KEYS.INSTALLED, 'true');
        return true;
      }

      return false;
    } catch (error) {
      console.error('[PWA] Install prompt error:', error);
      return false;
    }
  }, [deferredPrompt]);

  // Dismiss install prompt
  const dismissInstallPrompt = useCallback(() => {
    const timestamp = Date.now();
    setInstallPromptDismissedAt(timestamp);
    setStorageItem(STORAGE_KEYS.DISMISSED, timestamp.toString());
  }, []);

  // Apply update
  const applyUpdate = useCallback(() => {
    const waitingWorker = waitingWorkerRef.current;
    if (waitingWorker) {
      // Tell the waiting service worker to skip waiting
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
      // Reload the page to get the new version
      window.location.reload();
    }
  }, []);

  // Dismiss update (session only)
  const dismissUpdate = useCallback(() => {
    setUpdateDismissed(true);
  }, []);

  const value: PWAContextValue = {
    canInstall: deferredPrompt !== null,
    isInstalled,
    displayMode,
    installPromptDismissedAt,
    promptInstall,
    dismissInstallPrompt,
    updateAvailable: updateAvailable && !updateDismissed,
    applyUpdate,
    dismissUpdate,
  };

  return <PWAContext.Provider value={value}>{children}</PWAContext.Provider>;
}

export function usePWA(): PWAContextValue {
  const context = useContext(PWAContext);
  if (!context) {
    throw new Error('usePWA must be used within a PWAProvider');
  }
  return context;
}

// Export a version that doesn't throw if used outside provider (for conditional use)
export function usePWAOptional(): PWAContextValue | null {
  return useContext(PWAContext);
}
