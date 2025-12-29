import sqlite3InitModule from '@sqlite.org/sqlite-wasm';

let db: any = null;

const initDB = async () => {
    try {
        const sqlite3 = await sqlite3InitModule({
            print: console.log,
            printErr: console.error,
            locateFile: (file: string) => {
                if (file.endsWith('.wasm')) return '/sqlite-wasm/sqlite3.wasm';
                return file;
            }
        });

        console.log('[SQLiteWorker] SQLite WASM initialized. version:', sqlite3.version.libVersion);

        const hasOpfs = !!(sqlite3 as any).opfs;
        const hasFSA = typeof globalThis.FileSystemFileHandle !== 'undefined';
        const isIsolated = globalThis.crossOriginIsolated;

        console.log(`[SQLiteWorker] Environment Status: OPFS=${hasOpfs}, FSA=${hasFSA}, Isolated=${isIsolated}`);

        if (hasOpfs) {
            db = new (sqlite3 as any).oo1.OpfsDb('business-manager.sqlite');
            console.log('[SQLiteWorker] Using OPFS storage via OpfsDb.');
        } else {
            let reason = "Unknown reason";
            if (!isIsolated) reason = "Cross-Origin Isolation not enabled (Missing COOP/COEP headers)";
            else if (!hasFSA) reason = "FileSystem Access API not supported by browser";

            console.warn(`[SQLiteWorker] OPFS not available (${reason}). Using transient (memory) storage.`);
            db = new (sqlite3 as any).oo1.DB();
        }

        // Initialize schema
        db.exec(`
            CREATE TABLE IF NOT EXISTS kv_store (
                collection TEXT,
                id TEXT,
                data TEXT,
                updated_at INTEGER,
                PRIMARY KEY (collection, id)
            )
        `);

        self.postMessage({ type: 'READY' });
    } catch (error: any) {
        console.error('[SQLiteWorker] Initialization failed:', error);
        self.postMessage({ type: 'ERROR', message: error.message });
    }
};

self.onmessage = async (event) => {
    const { type, id, payload } = event.data;

    if (type === 'INIT') {
        await initDB();
        return;
    }

    if (!db) {
        self.postMessage({ type: 'ERROR', id, message: 'Database not initialized' });
        return;
    }

    try {
        switch (type) {
            case 'EXEC':
                db.exec(payload.sql, {
                    bind: payload.params,
                });
                self.postMessage({ type: 'SUCCESS', id });
                break;

            case 'QUERY':
                const results: any[] = [];
                db.exec(payload.sql, {
                    bind: payload.params,
                    rowMode: 'object',
                    callback: (row: any) => {
                        results.push(row);
                    }
                });
                self.postMessage({ type: 'SUCCESS', id, payload: results });
                break;

            case 'UPSERT':
                db.exec(`
                    INSERT INTO kv_store (collection, id, data, updated_at)
                    VALUES (?, ?, ?, ?)
                    ON CONFLICT(collection, id) DO UPDATE SET
                        data = excluded.data,
                        updated_at = excluded.updated_at
                `, {
                    bind: [payload.collection, payload.id, JSON.stringify(payload.data), Date.now()]
                });
                self.postMessage({ type: 'SUCCESS', id });
                break;

            case 'GET_ALL':
                const all: any[] = [];
                db.exec(`SELECT data FROM kv_store WHERE collection = ?`, {
                    bind: [payload.collection],
                    rowMode: 'object',
                    callback: (row: any) => {
                        all.push(JSON.parse(row.data));
                    }
                });
                self.postMessage({ type: 'SUCCESS', id, payload: all });
                break;

            case 'DELETE':
                db.exec(`DELETE FROM kv_store WHERE collection = ? AND id = ?`, {
                    bind: [payload.collection, payload.id]
                });
                self.postMessage({ type: 'SUCCESS', id });
                break;

            case 'CLEAR_COLLECTION':
                db.exec(`DELETE FROM kv_store WHERE collection = ?`, {
                    bind: [payload.collection]
                });
                self.postMessage({ type: 'SUCCESS', id });
                break;

            default:
                self.postMessage({ type: 'ERROR', id, message: 'Unknown command' });
        }
    } catch (error: any) {
        console.error(`[SQLiteWorker] Command ${type} failed:`, error);
        self.postMessage({ type: 'ERROR', id, message: error.message });
    }
};
