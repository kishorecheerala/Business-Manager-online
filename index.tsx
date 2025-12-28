
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { AppProvider } from './context/AppContext';
import { DialogProvider } from './context/DialogContext';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css'

const isAIStudioEnvironment = () => {
  const hostname = window.location.hostname
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('preview') || hostname.includes('staging') || hostname.includes('ai.studio') || hostname.includes('usercontent.goog') || hostname.includes('webcontainer.io');
}

// Global Dev Mode check for utilities
(window as any).devMode = isAIStudioEnvironment();



import { deleteDatabase } from './utils/db';

// Expose emergency reset for console access
(window as any).emergencyReset = async () => {
  if (confirm('EMERGENCY RESET: This will delete the internal database to fix startup crashes. All local data will be lost. Continue?')) {
    console.log('Resetting database...');
    await deleteDatabase();
    localStorage.clear();
    console.log('Database reset complete. Reloading...');
    window.location.reload();
  }
};

// Add global error handler for top-level crashes
window.onerror = function (message, source, lineno, colno, error) {
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="padding: 20px; color: #b91c1c; font-family: sans-serif;">
        <h1>Critical Startup Error</h1>
        <p>${message}</p>
        <pre>${source}:${lineno}:${colno}</pre>
        <pre>${error?.stack || ''}</pre>
      </div>
    `;
  }
};



try {
  const rootElement = document.getElementById('root');
  if (!rootElement) throw new Error("Root element 'root' not found");

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <AppProvider>
          <DialogProvider>
            <App />
          </DialogProvider>
        </AppProvider>
      </ErrorBoundary>
    </React.StrictMode>,
  );
} catch (e: any) {
  document.body.innerHTML = `<div style="padding:20px;color:red"><h1>Fatal Startup Error</h1><pre>${e.toString()}</pre></div>`;
  console.error("Fatal startup error:", e);
}
