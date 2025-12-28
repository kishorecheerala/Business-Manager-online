
import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom';
import App from './App'
import { UIProvider } from './context/UIContext';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { DialogProvider } from './context/DialogContext';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css'

// ... (omitted)

// ...

try {
  const rootElement = document.getElementById('root');
  if (!rootElement) throw new Error("Root element 'root' not found");

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <UIProvider>
          <AuthProvider>
            <DataProvider>
              <DialogProvider>
                <HashRouter>
                  <App />
                </HashRouter>
              </DialogProvider>
            </DataProvider>
          </AuthProvider>
        </UIProvider>
      </ErrorBoundary>
    </React.StrictMode>,
  );
} catch (e: any) {
  document.body.innerHTML = `<div style="padding:20px;color:red"><h1>Fatal Startup Error</h1><pre>${e.toString()}</pre></div>`;
  console.error("Fatal startup error:", e);
}
