import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { initTheme } from './store/themeStore';
import { PWAProvider } from './contexts/PWAContext';
import { useToast } from './hooks/useToast';
import { ToastContainer } from './components/pwa';

// Initialize theme and listen for system preference changes
initTheme();

// Register service worker for offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('[SW] Registered:', registration.scope);

        // Check for updates periodically
        setInterval(() => {
          registration.update();
        }, 60000); // Check every minute

        // Handle updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New version available - PWAContext will handle showing the update banner
                console.log('[SW] New version available');
              }
            });
          }
        });
      })
      .catch((error) => {
        console.warn('[SW] Registration failed:', error);
      });
  });
}

// Root component that wraps the app with PWA provider and toast callbacks
function Root() {
  const { success, info } = useToast();

  return (
    <PWAProvider
      onInstallSuccess={() => success('ClaudeDesk installed successfully')}
      onBackOnline={() => info("You're back online")}
    >
      <App />
      <ToastContainer />
    </PWAProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Root />
    </BrowserRouter>
  </React.StrictMode>
);
