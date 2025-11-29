
// Simple internal analytics logger
// In a production app, this would send data to GA4 or Firebase Analytics
// Currently logs to console for debugging and potentially to internal Audit Logs if connected

export const logEvent = (eventName: string, params?: Record<string, any>) => {
    try {
        // Log to console for dev visibility
        console.groupCollapsed(`📊 Analytics: ${eventName}`);
        if (params) console.table(params);
        console.groupEnd();

        // Check for Google Analytics (GA4) global tag
        // If the user manually adds the GA4 script to index.html later, this will just work.
        if ((window as any).gtag) {
            (window as any).gtag('event', eventName, params);
        }
    } catch (e) {
        console.warn("Analytics logging failed", e);
    }
};

export const logPageView = (pageName: string) => {
    logEvent('page_view', { page_title: pageName });
};
