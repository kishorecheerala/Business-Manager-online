
import { onCLS, onINP, onLCP, onFCP, onTTFB, Metric } from 'web-vitals';
import { logger } from './logger';
import { APP_CONFIG } from '../config/appConfig';

class PerformanceReporter {
    private static instance: PerformanceReporter;

    private constructor() { }

    public static getInstance(): PerformanceReporter {
        if (!PerformanceReporter.instance) {
            PerformanceReporter.instance = new PerformanceReporter();
        }
        return PerformanceReporter.instance;
    }

    public init() {
        if (!APP_CONFIG.PERFORMANCE.REPORTING_ENABLED) return;

        // Sample reporting for production to avoid excessive logs
        if (Math.random() > APP_CONFIG.PERFORMANCE.SAMPLE_RATE) return;

        const reportMetric = (metric: Metric) => {
            const { name, value, delta, id, entries } = metric;

            // Determine if the metric is within acceptable range
            let status = 'good';
            if (name === 'LCP' && value > 2500) status = 'needs-improvement';
            if (name === 'LCP' && value > 4000) status = 'poor';
            if (name === 'CLS' && value > 0.1) status = 'needs-improvement';
            if (name === 'CLS' && value > 0.25) status = 'poor';
            if (name === 'INP' && value > 200) status = 'needs-improvement';
            if (name === 'INP' && value > 500) status = 'poor';

            logger.info(`Web Vital: ${name}`, {
                value: Math.round(value * 100) / 100,
                delta: Math.round(delta * 100) / 100,
                id,
                status,
                rating: metric.rating
            }, 'PERFORMANCE');
        };

        onCLS(reportMetric);
        onINP(reportMetric);
        onLCP(reportMetric);
        onFCP(reportMetric);
        onTTFB(reportMetric);

        logger.info('Performance reporting initialized', {
            sampleRate: APP_CONFIG.PERFORMANCE.SAMPLE_RATE
        }, 'SYSTEM');
    }
}

export const performanceReporter = PerformanceReporter.getInstance();
