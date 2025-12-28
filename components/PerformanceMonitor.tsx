import { useEffect } from 'react';
import { onCLS, onINP, onLCP, onFCP, onTTFB } from 'web-vitals';

const PerformanceMonitor = () => {
    useEffect(() => {
        // Only log in production or if specifically enabled
        // For now, we'll log to console but this can be connected to an analytics endpoint

        const logMetric = (metric: any) => {
            // Use requestIdleCallback if available to avoid blocking main thread
            const report = () => console.log('[Web Vitals]', metric);

            if ((window as any).requestIdleCallback) {
                (window as any).requestIdleCallback(report);
            } else {
                setTimeout(report, 0);
            }
        };

        onCLS(logMetric);
        onINP(logMetric);
        onLCP(logMetric);
        onFCP(logMetric);
        onTTFB(logMetric);
    }, []);

    return null;
};

export default PerformanceMonitor;
