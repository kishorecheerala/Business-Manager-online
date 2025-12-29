import * as idb from './idbUtils';
import SQLiteManager from './sqliteManager';

export async function migrateIndexedDBToSQLite(): Promise<boolean> {
    const sqlite = SQLiteManager.getInstance();

    // Check if migration already happened
    const migrationStatus = localStorage.getItem('sqlite_migration_status');
    if (migrationStatus === 'completed') {
        return false;
    }

    console.log('[Migration] Starting migration from IndexedDB to SQLite...');

    try {
        // 1. Get all data from IndexedDB
        // We use silent: true to avoid reload loops if IndexedDB is corrupt
        const allData = await idb.getAllCollections({ silent: true });

        // 2. Insert into SQLite
        for (const [storeName, items] of Object.entries(allData)) {
            console.log(`[Migration] Migrating ${storeName} (${items.length} items)...`);

            // We use a transaction-like approach by batching or just sequential upserts
            // (SQLiteWorker's UPSERT is fast enough for typical local data sizes)
            for (const item of items) {
                const id = item.id || 'singleton'; // Handle singleton stores like 'profile'
                await sqlite.upsert(storeName, id, item);
            }
        }

        // 3. Mark as completed
        localStorage.setItem('sqlite_migration_status', 'completed');
        console.log('[Migration] Migration completed successfully.');
        return true;
    } catch (error) {
        console.error('[Migration] Migration failed:', error);
        // We don't mark as completed, so it can retry or fallback
        throw error;
    }
}

/**
 * Checks if the browser supports OPFS.
 * This can be used to decide whether to use SQLite or stick with IndexedDB.
 * Most modern browsers do, but some older or privacy-locked ones might not.
 */
export async function checkOPFSSupport(): Promise<boolean> {
    try {
        if (!navigator.storage || !navigator.storage.getDirectory) return false;
        const root = await navigator.storage.getDirectory();
        return !!root;
    } catch (e) {
        return false;
    }
}
