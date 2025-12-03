import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

// Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        console.log('✅ SW registered successfully');
      })
      .catch((err) => {
        // Skip origin mismatch errors as this is expected in some development/preview environments
        // but works correctly in production/PWA mode.
        if (err.message && (err.message.includes('origin') || err.message.includes('Origin'))) {
            // console.warn('⚠️ Service Worker origin mismatch detected. This is expected in preview environments. Ignoring.');
            return;
        }
        console.error('❌ SW registration failed:', err.message);
      });
  });
}

const rootElement = document.getElementById('root');

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