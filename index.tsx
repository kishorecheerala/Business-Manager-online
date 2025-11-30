import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Service Worker Registration
if ('serviceWorker' in navigator && 'caches' in window) {
  window.addEventListener('load', () => {
    // Construct absolute URL using the current window location to ensure origin matching.
    // This fixes the "origin mismatch" error in preview environments (like AI Studio)
    // where relative paths might resolve to the editor's domain instead of the preview frame.
    const basePath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
    const swUrl = new URL('sw.js', window.location.origin + basePath).href;

    navigator.serviceWorker
      .register(swUrl, { scope: './' })
      .then((registration) => {
        console.log('✅ SW registered at scope:', registration.scope);
        
        // Check for updates every 10 minutes
        setInterval(() => {
          registration.update();
        }, 600000);
      })
      .catch((err) => {
        // Log gracefully; offline mode might be unavailable in some previews
        console.warn('SW registration warning:', err.message);
      });
  });
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);