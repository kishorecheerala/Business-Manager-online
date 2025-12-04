import { useState, useEffect } from 'react';
import { pwaManager } from '../src/utils/pwa-register';

export const usePWAInstall = () => {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iOS);

    // Initial State Check
    const checkStandalone = () => {
       const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
       setIsInstalled(!!isStandalone);
    };
    checkStandalone();
    window.matchMedia('(display-mode: standalone)').addEventListener('change', checkStandalone);

    // Event Listeners for PWA Manager
    const handleInstallReady = () => {
        console.log("Hook: Install Ready");
        setIsInstallable(true);
    };
    
    const handleInstalled = () => {
        setIsInstalled(true);
        setIsInstallable(false);
    };

    window.addEventListener('pwa-install-ready', handleInstallReady);
    window.addEventListener('pwa-installed', handleInstalled);

    // Check if prompt was already captured before component mounted
    if (pwaManager.deferredPrompt) {
        setIsInstallable(true);
    }

    return () => {
        window.matchMedia('(display-mode: standalone)').removeEventListener('change', checkStandalone);
        window.removeEventListener('pwa-install-ready', handleInstallReady);
        window.removeEventListener('pwa-installed', handleInstalled);
    };
  }, []);

  const install = async () => {
      const success = await pwaManager.promptInstall();
      if (success) {
          setIsInstallable(false);
      }
  };

  return { isInstallable, isInstalled, isIOS, install };
};
