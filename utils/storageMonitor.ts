type StorageChangeListener = (event: StorageChangeEvent) => void;

interface StorageChangeEvent {
    type: 'clear' | 'indexeddb-error' | 'sqlite-error' | 'recovery' | 'health-check' | 'storage-low';
    timestamp: number;
    details?: Record<string, unknown>;
}

class StorageMonitor {
    private static instance: StorageMonitor;
    private listeners: Set<StorageChangeListener> = new Set();
    private checkInterval: any = null;
    private lastStorageSize = 0;
    private healthCheckPassed = true;

    private constructor() {
        this.setupListeners();
    }

    static getInstance(): StorageMonitor {
        if (!StorageMonitor.instance) {
            StorageMonitor.instance = new StorageMonitor();
        }
        return StorageMonitor.instance;
    }

    private setupListeners(): void {
        console.log('[StorageMonitor] Initializing...');

        this.setupBroadcastListener();
        this.monitorIndexedDBHealth();

        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                console.log('[StorageMonitor] Page became visible, checking storage...');
                this.checkStorageState();
            }
        });

        this.checkInterval = setInterval(() => {
            this.checkStorageState();
        }, 30000);

        console.log('[StorageMonitor] Initialized successfully');
    }

    private setupBroadcastListener(): void {
        try {
            if ('BroadcastChannel' in window) {
                const recoveryChannel = new BroadcastChannel('indexeddb-recovery');
                recoveryChannel.addEventListener('message', (event) => {
                    console.log('[StorageMonitor] Recovery event received:', event.data);
                    this.notifyListeners({
                        type: 'recovery',
                        timestamp: event.data.timestamp,
                        details: {
                            eventType: event.data.type,
                            dbName: event.data.dbName,
                        },
                    });
                });
            }
        } catch (error) {
            console.warn('[StorageMonitor] Could not set up BroadcastChannel:', error);
        }
    }

    private monitorIndexedDBHealth(): void {
        const testDBName = '__storage_monitor_health_check__';

        const checkHealth = async () => {
            try {
                const request = indexedDB.open(testDBName, 1);

                request.onerror = () => {
                    const errorMsg = request.error?.message || 'Unknown error';

                    if (errorMsg.includes('Internal error')) {
                        this.healthCheckPassed = false;
                        console.warn('[StorageMonitor] Health check failed - IndexedDB corruption detected');

                        this.notifyListeners({
                            type: 'indexeddb-error',
                            timestamp: Date.now(),
                            details: {
                                error: errorMsg,
                                dbName: testDBName,
                            },
                        });
                    }
                };

                request.onsuccess = () => {
                    const db = request.result;
                    this.healthCheckPassed = true;
                    db.close();
                    this.cleanupTestDatabase(testDBName);
                };
            } catch (error) {
                console.warn('[StorageMonitor] Health check exception:', error);
            }
        };

        setTimeout(checkHealth, 5000);
    }

    private cleanupTestDatabase(dbName: string): void {
        try {
            const deleteRequest = indexedDB.deleteDatabase(dbName);
            deleteRequest.onsuccess = () => {
                console.log(`[StorageMonitor] Cleaned up test database`);
            };
        } catch (error) {
            // Ignore errors in cleanup
        }
    }

    private checkStorageState(): void {
        if (navigator.storage?.estimate) {
            navigator.storage.estimate().then((estimate) => {
                const currentSize = estimate.usage || 0;

                if (
                    this.lastStorageSize > 1000000 &&
                    currentSize < this.lastStorageSize * 0.1
                ) {
                    console.warn(
                        '[StorageMonitor] Storage usage dropped significantly',
                        {
                            before: this.lastStorageSize,
                            after: currentSize,
                            percentRetained: ((currentSize / this.lastStorageSize) * 100).toFixed(2) + '%',
                        }
                    );

                    this.notifyListeners({
                        type: 'clear',
                        timestamp: Date.now(),
                        details: {
                            storageBefore: this.lastStorageSize,
                            storageAfter: currentSize,
                        },
                    });
                }

                this.lastStorageSize = currentSize;

                const quota = estimate.quota || 1;
                const percentUsed = (currentSize / quota) * 100;

                if (percentUsed > 90) {
                    this.notifyListeners({
                        type: 'storage-low',
                        timestamp: Date.now(),
                        details: {
                            usage: currentSize,
                            quota: quota,
                            percent: percentUsed.toFixed(2)
                        }
                    });
                }

                this.notifyListeners({
                    type: 'health-check',
                    timestamp: Date.now(),
                    details: {
                        storageUsage: currentSize,
                        percentageUsed: percentUsed.toFixed(2),
                        healthy: this.healthCheckPassed
                    },
                });
            }).catch((error) => {
                console.warn('[StorageMonitor] Could not check storage state:', error);
            });
        }
    }

    subscribe(listener: StorageChangeListener): () => void {
        this.listeners.add(listener);
        console.log(`[StorageMonitor] Listener registered (total: ${this.listeners.size})`);

        return () => {
            this.listeners.delete(listener);
            console.log(`[StorageMonitor] Listener removed (total: ${this.listeners.size})`);
        };
    }

    private notifyListeners(event: StorageChangeEvent): void {
        this.listeners.forEach((listener) => {
            try {
                listener(event);
            } catch (error) {
                console.error('[StorageMonitor] Error in listener:', error);
            }
        });
    }

    destroy(): void {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
        this.listeners.clear();
        console.log('[StorageMonitor] Destroyed');
    }
}

export default StorageMonitor;
