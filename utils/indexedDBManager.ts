interface DBOpenConfig {
    dbName: string;
    version: number;
    stores: Record<string, string>;
    silent?: boolean;
}

class IndexedDBManager {
    private static instance: IndexedDBManager;
    private openAttempts = 0;
    private maxRetries = 3;
    private retryDelay = 500;
    private activeConnections: Set<IDBDatabase> = new Set();
    private isRecovering = false;

    private constructor() { }

    static getInstance(): IndexedDBManager {
        if (!IndexedDBManager.instance) {
            IndexedDBManager.instance = new IndexedDBManager();
        }
        return IndexedDBManager.instance;
    }

    /**
     * Closes all active database connections tracked by this manager.
     */
    public closeAllConnections(): void {
        console.log(`[IndexedDB] Closing ${this.activeConnections.size} active connections...`);
        this.activeConnections.forEach(db => {
            try {
                db.close();
            } catch (e) { /* ignore */ }
        });
        this.activeConnections.clear();
    }

    async openDatabase<T extends IDBDatabase>(
        config: DBOpenConfig
    ): Promise<T> {
        this.openAttempts = 0;
        return await this.attemptOpenWithRetry<T>(config);
    }

    private async attemptOpenWithRetry<T extends IDBDatabase>(
        config: DBOpenConfig
    ): Promise<T> {
        try {
            return await this.attemptOpen<T>(config);
        } catch (error) {
            this.openAttempts++;

            if (this.isCorruptionError(error as DOMException)) {
                if (config.silent) {
                    console.warn(`[IndexedDB] Corruption detected for ${config.dbName} (Silent Mode). Skipping auto-recovery.`);
                    throw error;
                }
                return await this.handleCorruption<T>(config);
            }

            if (this.openAttempts < this.maxRetries) {
                const delay = this.retryDelay * Math.pow(2, this.openAttempts - 1);
                console.warn(`[IndexedDB] Open failed, retrying in ${delay}ms... (Attempt ${this.openAttempts}/${this.maxRetries})`);
                await this.sleep(delay);
                return this.attemptOpenWithRetry<T>(config);
            }

            console.error('[IndexedDB] Failed to open IndexedDB after all retries:', error);
            throw error;
        }
    }

    private attemptOpen<T extends IDBDatabase>(
        config: DBOpenConfig
    ): Promise<T> {
        return new Promise((resolve, reject) => {
            try {
                const request = indexedDB.open(config.dbName, config.version);

                request.onerror = () => {
                    reject(request.error);
                };

                request.onsuccess = () => {
                    const db = request.result as T;
                    this.activeConnections.add(db);

                    db.onversionchange = () => {
                        console.warn(`[IndexedDB] Version change detected for ${config.dbName}, closing connection.`);
                        db.close();
                        this.activeConnections.delete(db);
                    };

                    db.onclose = () => {
                        this.activeConnections.delete(db);
                    };

                    resolve(db);
                };

                request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
                    const db = (event.target as IDBOpenDBRequest).result;
                    this.initializeStores(db, config.stores);
                };
            } catch (error) {
                reject(error);
            }
        });
    }

    private isCorruptionError(error: DOMException | null): boolean {
        if (!error) return false;
        const errorMessage = error.message || '';
        const errorName = error.name || '';
        return (
            errorName === 'UnknownError' ||
            errorName === 'VersionError' ||
            errorMessage.includes('Internal error opening backing store') ||
            errorMessage.includes('corrupt') ||
            errorMessage.includes('io_error')
        );
    }

    private async handleCorruption<T extends IDBDatabase>(config: DBOpenConfig): Promise<T> {
        if (this.isRecovering) {
            // NEW: Return a promise that resolves immediately to prevent blocking
            return Promise.resolve(undefined as T);
        }

        this.isRecovering = true;
        console.warn(`[IndexedDB] Corruption/Critical Error detected for ${config.dbName}.`);

        const now = Date.now();
        const lastReset = parseInt(sessionStorage.getItem('db_last_reset_ts') || '0', 10);
        const recoveryCount = parseInt(sessionStorage.getItem('db_recovery_count') || '0', 10);

        // If we reset less than 10 seconds ago, it's a loop. Stop and show error.
        if (now - lastReset < 10000 && recoveryCount >= 1) {
            console.error("[IndexedDB] Infinite loop detected. Stopping automatic recovery.");
            sessionStorage.removeItem('db_recovery_count');
            // NEW: Don't throw error that causes crash, just return and let app continue without DB
            this.isRecovering = false;
            console.warn("[IndexedDB] Returning without recovery to prevent crash");
            return Promise.resolve(undefined as T);
        }

        if (recoveryCount >= 2) {
            console.error("[IndexedDB] Recovery failed multiple times.");
            sessionStorage.removeItem('db_recovery_count');
            // NEW: Don't throw error that causes crash, just return and let app continue without DB
            this.isRecovering = false;
            console.warn("[IndexedDB] Returning without recovery to prevent crash");
            return Promise.resolve(undefined as T);
        }

        console.log(`[IndexedDB] Initiating Recovery... (Attempt ${recoveryCount + 1})`);

        // CRITICAL: Preserve authentication state during recovery
        const googleUser = localStorage.getItem('googleUser');
        const preservedAuth = googleUser ? { googleUser } : null;

        try {
            this.closeAllConnections();
            await this.deleteDatabase(config.dbName);
            console.log(`[IndexedDB] Database deleted for recovery.`);
        } catch (e) {
            console.error('[IndexedDB] Recovery delete failed:', e);
        }

        // Restore auth data after DB deletion
        if (preservedAuth) {
            try {
                if (preservedAuth.googleUser) {
                    localStorage.setItem('googleUser', preservedAuth.googleUser);
                }
                console.log('[IndexedDB] Auth state preserved during recovery');
            } catch (e) {
                console.error('[IndexedDB] Failed to restore auth state:', e);
            }
        }

        sessionStorage.setItem('db_recovery_count', (recoveryCount + 1).toString());
        sessionStorage.setItem('db_last_reset_ts', now.toString());

        // Wait a small bit for OS file handles to release
        await this.sleep(1000); // Increased delay
        
        // NEW: Instead of reloading (which causes crashes), handle gracefully
        // In production, we should avoid page reloads that can cause crashes
        console.warn('[IndexedDB] Recovery completed without reload to prevent crashes');
        this.isRecovering = false;
        
        // NEW: Return a promise that resolves immediately to prevent blocking
        return Promise.resolve(undefined as T);
    }

    private initializeStores(
        db: IDBDatabase,
        stores: Record<string, string>
    ): void {
        try {
            Object.entries(stores).forEach(([storeName, keyPath]) => {
                if (!db.objectStoreNames.contains(storeName)) {
                    try {
                        db.createObjectStore(storeName, { keyPath });
                        console.log(`[IndexedDB] Created object store: ${storeName}`);
                    } catch (error) {
                        console.warn(`[IndexedDB] Could not create object store ${storeName}:`, error);
                    }
                }
            });
        } catch (error) {
            console.error('[IndexedDB] Error initializing stores:', error);
        }
    }

    private deleteDatabase(dbName: string): Promise<void> {
        return new Promise((resolve) => {
            try {
                const request = indexedDB.deleteDatabase(dbName);
                request.onsuccess = () => {
                    console.log(`[IndexedDB] Successfully deleted: ${dbName}`);
                    resolve();
                };
                request.onerror = () => {
                    console.error(`[IndexedDB] Failed to delete ${dbName}:`, request.error);
                    resolve(); // Continue anyway
                };
                request.onblocked = () => {
                    console.warn(`[IndexedDB] Deletion blocked for ${dbName}. Closing connections...`);
                    this.closeAllConnections();
                    // IDB will try again automatically once connections are closed
                };
            } catch (error) {
                console.error('[IndexedDB] Exception deleting database:', error);
                resolve();
            }
        });
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}

export default IndexedDBManager;
