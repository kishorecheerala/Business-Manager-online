
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

const isAIStudioEnvironment = () => {
  const hostname = window.location.hostname
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('preview') || hostname.includes('staging') || hostname.includes('ai.studio') || hostname.includes('usercontent.goog') || hostname.includes('webcontainer.io');
}

if ('serviceWorker' in navigator && !isAIStudioEnvironment()) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(reg => console.log('✅ SW registered'))
      .catch(err => console.warn('⚠️ SW registration failed (expected in dev):', err))
  })
} else {
  console.log('Skipping service worker registration in this environment.');
}

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
        <App />
      </ErrorBoundary>
    </React.StrictMode>,
  );
} catch (e: any) {
  document.body.innerHTML = `<div style="padding:20px;color:red"><h1>Fatal Startup Error</h1><pre>${e.toString()}</pre></div>`;
  console.error("Fatal startup error:", e);
}
