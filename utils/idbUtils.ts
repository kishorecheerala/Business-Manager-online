
import { openDB, deleteDB, DBSchema, IDBPDatabase, wrap } from 'idb';
import IndexedDBManager from './indexedDBManager';
import { Customer, Supplier, Product, Sale, Purchase, Return, Notification, ProfileData, AppMetadata, AuditLogEntry, Expense, Quote, CustomFont, Snapshot, TrashItem, Budget, FinancialScenario, AppState, BankAccount, FinancialGoal } from '../types';

const DB_NAME = 'business-manager-db';
const DB_VERSION = 16; // Bumped for Parked Sales migration

export type StoreName = 'customers' | 'suppliers' | 'products' | 'sales' | 'purchases' | 'returns' | 'app_metadata' | 'notifications' | 'profile' | 'audit_logs' | 'expenses' | 'quotes' | 'custom_fonts' | 'snapshots' | 'trash' | 'budgets' | 'financial_scenarios' | 'bank_accounts' | 'goals' | 'parked_sales';
const STORE_NAMES: StoreName[] = ['customers', 'suppliers', 'products', 'sales', 'purchases', 'returns', 'app_metadata', 'notifications', 'profile', 'audit_logs', 'expenses', 'quotes', 'custom_fonts', 'snapshots', 'trash', 'budgets', 'financial_scenarios', 'bank_accounts', 'goals', 'parked_sales'];

interface BusinessManagerDB extends DBSchema {
    customers: { key: string; value: Customer; };
    suppliers: { key: string; value: Supplier; };
    products: { key: string; value: Product; };
    sales: { key: string; value: Sale; };
    purchases: { key: string; value: Purchase; };
    returns: { key: string; value: Return; };
    app_metadata: { key: string; value: AppMetadata; };
    notifications: { key: string; value: Notification; };
    profile: { key: string; value: ProfileData; };
    audit_logs: { key: string; value: AuditLogEntry; };
    expenses: { key: string; value: Expense; };
    quotes: { key: string; value: Quote; };
    custom_fonts: { key: string; value: CustomFont; };
    snapshots: { key: string; value: Snapshot; };
    trash: { key: string; value: TrashItem; };
    budgets: { key: string; value: Budget; };
    financial_scenarios: { key: string; value: FinancialScenario; };
    bank_accounts: { key: string; value: BankAccount };
    goals: { key: string; value: FinancialGoal; };
    parked_sales: { key: string; value: any; };
}

/**
 * Completely deletes the database without trying to open it first.
 * Useful for recovering from 'Internal error opening backing store' loops.
 */
export async function deleteDatabase(): Promise<void> {
    try {
        // Close any existing connection if possible
        if (dbPromise) {
            const db = await dbPromise.catch(() => null);
            db?.close();
        }
    } catch (e) { /* ignore */ }

    // Reset the promise so next call opens a new one
    dbPromise = undefined;

    // Nuke it
    await deleteDB(DB_NAME);
}

/**
 * Perform a full factory reset: delete DB, clear localStorage, and reload.
 * This is the ultimate "fix everything" button.
 */
export async function forceEmergencyReset(): Promise<void> {
    try {
        await deleteDatabase();
        localStorage.clear();
        sessionStorage.clear();
        console.log('[DB] Factory reset triggered. Reloading...');
        window.location.reload();
    } catch (e) {
        console.error('[DB] Factory reset failed:', e);
        // Fallback reload anyway
        window.location.reload();
    }
}

// Generate Config for Manager
const storeConfig: Record<string, string> = {};
STORE_NAMES.forEach(name => storeConfig[name] = 'id');

let dbPromise: Promise<IDBPDatabase<BusinessManagerDB>> | undefined;

async function getDb(options: { silent?: boolean } = {}): Promise<IDBPDatabase<BusinessManagerDB>> {
    if (!dbPromise) {
        dbPromise = (async () => {
            const manager = IndexedDBManager.getInstance();
            try {
                const nativeDb = await manager.openDatabase<IDBDatabase>({
                    dbName: DB_NAME,
                    version: DB_VERSION,
                    stores: storeConfig,
                    silent: options.silent
                });

                nativeDb.onclose = () => {
                    dbPromise = undefined;
                };

                return wrap(nativeDb) as unknown as IDBPDatabase<BusinessManagerDB>;
            } catch (e) {
                dbPromise = undefined;
                throw e;
            }
        })();
    }
    return dbPromise;
}

export async function getAll<T extends StoreName>(storeName: T): Promise<BusinessManagerDB[T]['value'][]> {
    try {
        const db = await getDb();
        return db.getAll(storeName);
    } catch (e) {
        console.error(`Failed to getAll from ${storeName}`, e);
        return [];
    }
}

/**
 * Retrieves all collections in a single transaction to reduce connection overhead.
 * This prevents "Internal error opening backing store" during initial load (hydration).
 */
export async function getAllCollections(options: { silent?: boolean } = {}): Promise<Record<StoreName, any[]>> {
    try {
        const db = await getDb(options);
        const result: Partial<Record<StoreName, any[]>> = {};

        // Use a single transaction for all stores
        const tx = db.transaction(STORE_NAMES, 'readonly');

        await Promise.all(STORE_NAMES.map(async (storeName) => {
            result[storeName] = await tx.objectStore(storeName).getAll();
        }));

        await tx.done;
        return result as Record<StoreName, any[]>;
    } catch (error) {
        console.error("Failed to getAllCollections:", error);
        // Auto-recovery attempt? If this fails, hydrateState will fail.
        // Pass empty objects to let app load in worst case
        const empty: any = {};
        STORE_NAMES.forEach(s => empty[s] = []);
        return empty;
    }
}

export async function saveCollection<T extends StoreName>(storeName: T, data: BusinessManagerDB[T]['value'][]) {
    try {
        const db = await getDb();
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        await store.clear();

        const CHUNK_SIZE = 500;
        for (let i = 0; i < data.length; i += CHUNK_SIZE) {
            const chunk = data.slice(i, i + CHUNK_SIZE);
            await Promise.all(chunk.map(item => store.put(item)));
        }

        await tx.done;
    } catch (error) {
        // Ignore specific internal error that happens on race conditions/closing
        const msg = String(error);
        if (msg.includes('Internal error opening backing store') || msg.includes('The database connection is closing')) {
            console.warn(`Supressed DB Error in ${storeName}:`, msg);
            return;
        }
        console.error(`Failed to save collection ${storeName}:`, error);
        throw error; // Propagate error
    }
}

/**
 * Updates or inserts a single item in a store.
 * More efficient than saveCollection for single updates.
 */
export async function upsertItem<T extends StoreName>(storeName: T, item: BusinessManagerDB[T]['value']) {
    try {
        const db = await getDb();
        await db.put(storeName, item);
    } catch (error) {
        console.error(`Failed to upsert item in ${storeName}:`, error);
    }
}

/**
 * Updates or inserts multiple items in a store.
 */
export async function upsertMany<T extends StoreName>(storeName: T, items: BusinessManagerDB[T]['value'][]) {
    try {
        const db = await getDb();
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);

        await Promise.all(items.map(item => store.put(item)));

        await tx.done;
    } catch (error) {
        console.error(`Failed to upsert many in ${storeName}:`, error);
    }
}

export async function addToTrash(item: TrashItem) {
    try {
        const db = await getDb();
        await db.put('trash', item);
    } catch (error) {
        console.error('Failed to add to trash:', error);
    }
}

export async function deleteFromTrash(id: string) {
    try {
        const db = await getDb();
        await db.delete('trash', id);
    } catch (error) {
        console.error('Failed to delete from trash:', error);
    }
}

export async function deleteFromStore<T extends StoreName>(storeName: T, id: string) {
    try {
        const db = await getDb();
        await db.delete(storeName, id);
    } catch (error) {
        console.error(`Failed to delete from store ${storeName}:`, error);
    }
}

export async function getLastBackupDate(): Promise<string | null> {
    const db = await getDb();
    const result = await db.get('app_metadata', 'lastBackup');
    if (result && result.id === 'lastBackup') {
        return (result as any).date;
    }
    return null;
}

export async function setLastBackupDate(): Promise<void> {
    const db = await getDb();
    const now = new Date().toISOString();
    await db.put('app_metadata', { id: 'lastBackup', date: now });
}

export async function exportData(): Promise<Omit<AppState, 'toast' | 'selection' | 'pin' | 'googleUser' | 'syncStatus'>> {
    const db = await getDb();
    const data: any = {};
    for (const storeName of STORE_NAMES) {
        // Include Trash in backup so deletions sync across devices
        if (storeName === 'notifications' || storeName === 'snapshots') continue;
        data[storeName] = await db.getAll(storeName);
    }
    return data;
}

export async function mergeData(cloudData: any): Promise<void> {
    try {
        const db = await getDb();

        // REFACTOR: Sequential transactions to avoid "Internal error opening backing store"
        // 1. Process Trash First
        const cloudTrash = cloudData['trash'] || [];
        if (cloudTrash.length > 0) {
            const trashTx = db.transaction(['trash', ...STORE_NAMES.filter(s => s !== 'trash')], 'readwrite');
            const trashStore = trashTx.objectStore('trash');

            for (const item of cloudTrash) {
                await trashStore.put(item);
                if (item.originalStore && item.id) {
                    try {
                        const originalStore = trashTx.objectStore(item.originalStore as StoreName);
                        // Check if exists before delete to avoid errors? IDB delete is idempotent usually
                        try {
                            const exists = await originalStore.get(item.id);
                            if (exists) await originalStore.delete(item.id);
                        } catch (e) { }
                    } catch (e) {
                        // Store might be invalid in metadata
                    }
                }
            }
            await trashTx.done;
        }

        // 2. Refresh Trash Set for lookup
        const trashKeys = await db.getAllKeys('trash');
        const trashIdSet = new Set(trashKeys.map(k => String(k)));

        // 3. Sequential Sync for each store
        for (const storeName of STORE_NAMES) {
            if (storeName === 'notifications' || storeName === 'snapshots' || storeName === 'trash') continue;

            const remoteItems = cloudData[storeName];
            if (!remoteItems || !Array.isArray(remoteItems) || remoteItems.length === 0) continue;

            // Single transaction per store
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);

            for (const item of remoteItems) {
                if (item && item.id) {
                    // Filter out trashed items
                    if (trashIdSet.has(item.id)) {
                        try {
                            const exists = await store.get(item.id);
                            if (exists) await store.delete(item.id);
                        } catch (e) { }
                        continue;
                    }

                    try {
                        const localItem = await store.get(item.id);

                        if (!localItem) {
                            await store.put(item);
                        } else {
                            const remoteTime = (item as any).updatedAt ? new Date((item as any).updatedAt).getTime() : 0;
                            const localTime = (localItem as any).updatedAt ? new Date((localItem as any).updatedAt).getTime() : 0;

                            if (remoteTime > localTime) {
                                await store.put(item);
                            }
                        }
                    } catch (e) {
                        console.warn(`Error processing item ${item.id} in ${storeName}:`, e);
                    }
                }
            }
            await tx.done;
        }

    } catch (error) {
        console.error("Merge Failed:", error);
        throw error; // Stop the sync process on error
    }
}

export async function importData(data: any, merge: boolean = false): Promise<void> {
    // If overwrite (merge=false), use sequential saveCollection calls which are robust
    if (!merge) {
        for (const storeName of STORE_NAMES) {
            if (storeName === 'notifications' || storeName === 'snapshots') continue;

            let items = (data as any)[storeName] || [];
            if (!Array.isArray(items) && items && typeof items === 'object') {
                items = [items];
            }

            // saveCollection internally handles clearing and chunked saving with error suppression
            // It expects an array. If items is empty/undefined, it clears the store (which is correct for overwrite)
            if (Array.isArray(items)) {
                await saveCollection(storeName, items as any);
            } else {
                await saveCollection(storeName, []);
            }
        }
        return;
    }

    // If merge=true, process sequentially to avoid "Internal error" from massive transaction
    const db = await getDb();
    for (const storeName of STORE_NAMES) {
        if (storeName === 'notifications' || storeName === 'snapshots') continue;

        let items = (data as any)[storeName] || [];
        if (!Array.isArray(items) && items && typeof items === 'object') {
            items = [items];
        }

        if (Array.isArray(items) && items.length > 0) {
            try {
                const tx = db.transaction(storeName, 'readwrite');
                const store = tx.objectStore(storeName);

                // No clear(), just append/update
                const CHUNK_SIZE = 500;
                for (let i = 0; i < items.length; i += CHUNK_SIZE) {
                    const chunk = items.slice(i, i + CHUNK_SIZE);
                    await Promise.all(chunk.map(item => {
                        if (item && typeof item === 'object' && 'id' in item) {
                            return store.put(item);
                        }
                        return Promise.resolve();
                    }));
                }
                await tx.done;
            } catch (error) {
                // Ignore specific internal error that happens on race conditions/closing
                const msg = String(error);
                if (msg.includes('Internal error opening backing store') || msg.includes('The database connection is closing')) {
                    console.warn(`Supressed DB Error in merge ${storeName}:`, msg);
                    continue;
                }
                console.error(`Failed to merge store ${storeName}:`, error);
            }
        }
    }
}

export async function clearDatabase(): Promise<void> {
    const db = await getDb();
    const tx = db.transaction(STORE_NAMES, 'readwrite');
    await Promise.all(STORE_NAMES.map(storeName => tx.objectStore(storeName).clear()));
    await tx.done;
}

// --- Snapshot Functions ---

export async function createSnapshot(name: string = 'Auto Checkpoint'): Promise<string> {
    const data = await exportData();
    const db = await getDb();
    const id = `snap-${Date.now()}`;
    const snapshot: Snapshot = {
        id,
        timestamp: new Date().toISOString(),
        name,
        data
    };
    await db.put('snapshots', snapshot);
    return id;
}

export async function getSnapshots(): Promise<Snapshot[]> {
    const db = await getDb();
    const snaps = await db.getAll('snapshots');
    return snaps.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export async function restoreSnapshot(id: string): Promise<void> {
    const db = await getDb();
    const snap = await db.get('snapshots', id);
    if (snap) {
        await importData(snap.data, false);
    } else {
        throw new Error("Snapshot not found");
    }
}

export async function deleteSnapshot(id: string): Promise<void> {
    const db = await getDb();
    await db.delete('snapshots', id);
}

export async function getStorageStats() {
    if (navigator.storage && navigator.storage.estimate) {
        const { usage, quota } = await navigator.storage.estimate();
        return {
            usage: usage || 0,
            quota: quota || 0,
            percent: quota ? Math.round((usage || 0) / quota * 100) : 0
        };
    }
    return { usage: 0, quota: 0, percent: 0 };
}

export async function getDetailedStats() {
    const db = await getDb();
    const stats: Record<string, number> = {};
    for (const storeName of STORE_NAMES) {
        stats[storeName] = await db.count(storeName);
    }
    return stats;
}
