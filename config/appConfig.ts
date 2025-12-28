
export const APP_CONFIG = {
    VERSION: '1.2.0',
    NAME: 'Business Manager Online',
    DEV_MODE: import.meta.env.DEV,
    PROD_MODE: import.meta.env.PROD,
    PERFORMANCE: {
        SAMPLE_RATE: import.meta.env.PROD ? 0.1 : 1.0, // Sample 10% in prod
        REPORTING_ENABLED: true,
    },
    STORAGE: {
        DB_NAME: 'business-manager-db',
        DB_VERSION: 16,
    },
    LOGGING: {
        RETENTION_DAYS: 30,
        LEVELS: {
            INFO: 'info',
            WARN: 'warn',
            ERROR: 'error',
            DEBUG: 'debug'
        }
    }
};
