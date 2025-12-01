
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

// Register Service Worker FIRST - before anything else
// This ensures the install script runs as early as possible for PWA capabilities
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Use relative path for SW to ensure it works even if not at domain root
    // This fixes the "scriptURL does not match origin" error when served from subpaths
    navigator.serviceWorker
      .register('./sw.js', { scope: './' })
      .then((registration) => {
        console.log('✅ Service Worker registered with scope:', registration.scope);
      })
      .catch((err) => {
        console.error('❌ Service Worker registration failed:', err);
      });
  });
}

const rootElement = document.getElementById('root');

// Safe Render
// Wrap in try-catch to log render errors preventing blank screens
if (rootElement) {
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </React.StrictMode>
    );
  } catch (error) {
    console.error('App render error:', error);
  }
} else {
  console.error("Could not find root element to mount to");
}
