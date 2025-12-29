class SQLiteManager {
    private static instance: SQLiteManager;
    private worker: Worker | null = null;
    private readyPromise: Promise<void> | null = null;
    private pendingRequests: Map<string, { resolve: Function, reject: Function }> = new Map();

    private constructor() {
        this.init();
    }

    static getInstance(): SQLiteManager {
        if (!SQLiteManager.instance) {
            SQLiteManager.instance = new SQLiteManager();
        }
        return SQLiteManager.instance;
    }

    private init() {
        this.readyPromise = new Promise((resolve, reject) => {
            try {
                // Using Vite's worker import syntax
                this.worker = new Worker(new URL('./sqliteWorker.ts', import.meta.url), {
                    type: 'module'
                });

                this.worker.onmessage = (event) => {
                    const { type, id, payload, message } = event.data;

                    if (type === 'READY') {
                        console.log('[SQLiteManager] Worker Ready');
                        resolve();
                        return;
                    }

                    if (type === 'ERROR' && !id) {
                        console.error('[SQLiteManager] Worker Global Error:', message);
                        reject(new Error(message));
                        return;
                    }

                    const pending = this.pendingRequests.get(id);
                    if (pending) {
                        if (type === 'SUCCESS') {
                            pending.resolve(payload);
                        } else {
                            pending.reject(new Error(message));
                        }
                        this.pendingRequests.delete(id);
                    }
                };

                this.worker.postMessage({ type: 'INIT' });
            } catch (error) {
                console.error('[SQLiteManager] Failed to start worker:', error);
                reject(error);
            }
        });
    }

    public async waitReady(): Promise<void> {
        return this.readyPromise || Promise.reject('Worker not initialized');
    }

    private sendCommand(type: string, payload: any): Promise<any> {
        return new Promise((resolve, reject) => {
            const id = Math.random().toString(36).substring(7);
            this.pendingRequests.set(id, { resolve, reject });
            this.worker?.postMessage({ type, id, payload });
        });
    }

    public async upsert(collection: string, id: string, data: any): Promise<void> {
        await this.waitReady();
        return this.sendCommand('UPSERT', { collection, id, data });
    }

    public async getAll(collection: string): Promise<any[]> {
        await this.waitReady();
        return this.sendCommand('GET_ALL', { collection });
    }

    public async delete(collection: string, id: string): Promise<void> {
        await this.waitReady();
        return this.sendCommand('DELETE', { collection, id });
    }

    public async clearCollection(collection: string): Promise<void> {
        await this.waitReady();
        return this.sendCommand('CLEAR_COLLECTION', { collection });
    }

    public async query(sql: string, params: any[] = []): Promise<any[]> {
        await this.waitReady();
        return this.sendCommand('QUERY', { sql, params });
    }

    public async execute(sql: string, params: any[] = []): Promise<void> {
        await this.waitReady();
        return this.sendCommand('EXEC', { sql, params });
    }
}

export default SQLiteManager;
