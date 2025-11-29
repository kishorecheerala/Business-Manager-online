
// Utility to dynamically load Google Maps API
// This avoids putting the script tag in index.html which would fail if the API Key is restricted or missing.

const GOOGLE_MAPS_SCRIPT_ID = 'google-maps-script';

export const loadMapsApi = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        if ((window as any).google && (window as any).google.maps && (window as any).google.maps.places) {
            resolve();
            return;
        }

        if (document.getElementById(GOOGLE_MAPS_SCRIPT_ID)) {
            // Script already loading, just check intermittently? 
            // Or assume if it failed before, it failed. 
            // For robustness, if it exists but google.maps isn't there, maybe it's still loading.
            // Simplified: reject if we try to load again while it exists but failed.
            const script = document.getElementById(GOOGLE_MAPS_SCRIPT_ID) as HTMLScriptElement;
            script.addEventListener('load', () => resolve());
            script.addEventListener('error', () => reject(new Error("Maps Script Failed to Load")));
            return;
        }

        const apiKey = process.env.API_KEY || (import.meta as any).env?.VITE_API_KEY;
        
        if (!apiKey) {
            reject(new Error("Maps API Key missing"));
            return;
        }

        const script = document.createElement('script');
        script.id = GOOGLE_MAPS_SCRIPT_ID;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        
        script.onload = () => {
            resolve();
        };
        
        script.onerror = (e) => {
            console.error("Google Maps Load Error:", e);
            reject(new Error("Failed to load Google Maps API. Check your API Key configuration."));
        };

        document.head.appendChild(script);
    });
};
