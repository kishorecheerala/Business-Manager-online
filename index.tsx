import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { BeforeInstallPromptEvent } from './types';

// --- PWA Install Prompt Handling ---
// We capture the event outside of React's lifecycle to ensure it's not missed,
// especially with React.StrictMode's double-invocation behavior in development.
window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent the default mini-infobar from appearing on mobile
  e.preventDefault();
  // Stash the event so it can be triggered later by the React app.
  (window as any).deferredInstallPrompt = e as BeforeInstallPromptEvent;
});
// --- End PWA Handling ---


// Register Service Worker for PWA
const registerServiceWorker = () => {
  if ('serviceWorker' in navigator) {
    try {
        // Explicitly construct the URL based on current origin to avoid mismatch errors
        // in preview environments where base tags or iframes might confuse the browser.
        const swUrl = new URL('/sw.js', window.location.origin).href;
        
        navigator.serviceWorker.register(swUrl).then(registration => {
          console.log('ServiceWorker registration successful with scope: ', registration.scope);
        }).catch(error => {
          // Suppress "invalid state" errors common in previews/iframes
          if (error.message && (error.message.includes('invalid state') || error.message.includes('origin'))) {
             console.log('ServiceWorker registration skipped (preview environment restriction)');
          } else {
             console.warn('ServiceWorker registration failed:', error);
          }
        });
    } catch (e) {
        console.error("SW Setup Error:", e);
    }
  }
};

// Check if the page is already loaded before attaching listener
// This prevents the "invalid state" or missed registration if the script runs late
if (document.readyState === 'complete') {
  registerServiceWorker();
} else {
  window.addEventListener('load', registerServiceWorker);
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);