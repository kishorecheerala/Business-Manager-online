
import { APP_CONFIG } from '../config/appConfig';

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
    level: LogLevel;
    message: string;
    details?: any;
    timestamp: string;
    context?: string;
    persistent?: boolean;
}

class Logger {
    private static instance: Logger;

    private constructor() { }

    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    private log(level: LogLevel, message: string, details?: any, context?: string, persistent: boolean = true) {
        if (APP_CONFIG.DEV_MODE) {
            const consoleMethod = level === 'debug' ? 'debug' : level;
            console[consoleMethod](`[${level.toUpperCase()}]${context ? ` [${context}]` : ''} ${message}`, details || '');
        }

        const entry: LogEntry = {
            level,
            message,
            details,
            context,
            persistent,
            timestamp: new Date().toISOString()
        };

        // Dispatch custom event for DataContext to pick up and save to DB
        const event = new CustomEvent('APP_LOG_EVENT', { detail: entry });
        window.dispatchEvent(event);
    }

    public info(message: string, details?: any, context?: string, persistent: boolean = true) {
        this.log('info', message, details, context, persistent);
    }

    public warn(message: string, details?: any, context?: string, persistent: boolean = true) {
        this.log('warn', message, details, context, persistent);
    }

    public error(message: string, details?: any, context?: string, persistent: boolean = true) {
        this.log('error', message, details, context, persistent);
    }

    public debug(message: string, details?: any, context?: string) {
        if (APP_CONFIG.DEV_MODE) {
            this.log('debug', message, details, context, false); // Debug logs are never persistent
        }
    }
}

export const logger = Logger.getInstance();
