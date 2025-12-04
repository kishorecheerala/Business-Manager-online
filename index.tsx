import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import './index.css'
import { pwaManager } from './src/utils/pwa-register';

// Initialize PWA Manager
// Checks for service worker support and handles registration
// Skip in preview environments to prevent errors
const isPreview = window.location.origin.includes('ai.studio') || 
                  window.location.origin.includes('usercontent.goog') ||
                  window.location.origin.includes('webcontainer.io');

if (!isPreview) {
  pwaManager.init();
} else {
  console.log('Skipping PWA init in preview environment');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)