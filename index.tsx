
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { AppProvider } from './context/AppContext';
import { DialogProvider } from './context/DialogContext';
import './index.css'

const isAIStudioEnvironment = () => {
  const hostname = window.location.hostname
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('preview') || hostname.includes('staging') || hostname.includes('ai.studio') || hostname.includes('usercontent.goog') || hostname.includes('webcontainer.io');
}

// P0 CRITICAL FIX: FORCE UNREGISTER ALL SERVICE WORKERS
// The previous SW implementation caused production freezes. 
// We are aggressively removing it to restore stability.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function (registrations) {
    for (let registration of registrations) {
      console.log('🚨 Emergency Unregistering SW:', registration);
      registration.unregister();
    }
  }).catch(function (err) {
    console.error('Service Worker unregistration failed: ', err);
  });
}

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

class ErrorBoundary extends React.Component<any, any> {
  public state: any = { hasError: false, error: null, errorInfo: null };

  constructor(props: any) {
    super(props);
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif', maxWidth: '800px', margin: '0 auto' }}>
          <h1 style={{ color: '#dc2626' }}>Application Crashed</h1>
          <p>Something went wrong during startup.</p>
          <div style={{ backgroundColor: '#f1f5f9', padding: '15px', borderRadius: '8px', overflowX: 'auto', border: '1px solid #cbd5e1' }}>
            <h3 style={{ marginTop: 0, color: '#334155' }}>Error:</h3>
            <pre style={{ color: '#b91c1c', fontWeight: 'bold' }}>{this.state.error && this.state.error.toString()}</pre>
            <h3 style={{ color: '#334155' }}>Component Stack:</h3>
            <pre style={{ fontSize: '12px', color: '#475569' }}>{this.state.errorInfo && this.state.errorInfo.componentStack}</pre>
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: '20px', padding: '10px 20px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

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
