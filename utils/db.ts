
import { openDB, deleteDB, DBSchema, IDBPDatabase } from 'idb';
import { Customer, Supplier, Product, Sale, Purchase, Return, Notification, ProfileData, AppMetadata, AuditLogEntry, Expense, Quote, CustomFont, Snapshot, TrashItem, Budget, FinancialScenario, DataState, BankAccount, FinancialGoal } from '../types';

const DB_NAME = 'business-manager-db';
const DB_VERSION = 17; // Bumped for indices

export type StoreName = 'customers' | 'suppliers' | 'products' | 'sales' | 'purchases' | 'returns' | 'app_metadata' | 'notifications' | 'profile' | 'audit_logs' | 'expenses' | 'quotes' | 'custom_fonts' | 'snapshots' | 'trash' | 'budgets' | 'financial_scenarios' | 'bank_accounts' | 'goals' | 'sync_metadata';
const STORE_NAMES: StoreName[] = ['customers', 'suppliers', 'products', 'sales', 'purchases', 'returns', 'app_metadata', 'notifications', 'profile', 'audit_logs', 'expenses', 'quotes', 'custom_fonts', 'snapshots', 'trash', 'budgets', 'financial_scenarios', 'bank_accounts', 'goals', 'sync_metadata'];

interface BusinessManagerDB extends DBSchema {
    customers: {
        key: string;
        value: Customer;
        indexes: { 'name': string; 'phone': string };
    };
    suppliers: { key: string; value: Supplier; };
    products: {
        key: string;
        value: Product;
        indexes: { 'name': string; 'category': string; 'barcode': string };
    };
    sales: {
        key: string;
        value: Sale;
        indexes: { 'date': string; 'customerId': string };
    };
    purchases: {
        key: string;
        value: Purchase;
        indexes: { 'date': string; 'supplierId': string };
    };
    returns: { key: string; value: Return; };
    app_metadata: { key: string; value: AppMetadata; };
    notifications: { key: string; value: Notification; };
    profile: { key: string; value: ProfileData; };
    audit_logs: {
        key: string;
        value: AuditLogEntry;
        indexes: { 'timestamp': string };
    };
    expenses: {
        key: string;
        value: Expense;
        indexes: { 'date': string; 'category': string };
    };
    quotes: { key: string; value: Quote; };
    custom_fonts: { key: string; value: CustomFont; };
    snapshots: { key: string; value: Snapshot; };
    trash: { key: string; value: TrashItem; };
    budgets: { key: string; value: Budget; };
    financial_scenarios: { key: string; value: FinancialScenario; };
    bank_accounts: { key: string; value: BankAccount };
    goals: { key: string; value: FinancialGoal; };
    sync_metadata: { key: string; value: { id: string; lastModified: number; lastSynced: number }; };
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

let dbPromise: Promise<IDBPDatabase<BusinessManagerDB>> | undefined;

function getDb(): Promise<IDBPDatabase<BusinessManagerDB>> {
    if (!dbPromise) {
        dbPromise = openDB<BusinessManagerDB>(DB_NAME, DB_VERSION, {
            upgrade(db, oldVersion) {
                for (const storeName of STORE_NAMES) {
                    if (!db.objectStoreNames.contains(storeName)) {
                        const store = db.createObjectStore(storeName, { keyPath: 'id' });

                        // Add indices for performance
                        const anyStore = store as any;
                        if (storeName === 'customers') {
                            anyStore.createIndex('name', 'name');
                            anyStore.createIndex('phone', 'phone');
                        } else if (storeName === 'products') {
                            anyStore.createIndex('name', 'name');
                            anyStore.createIndex('category', 'category');
                            anyStore.createIndex('barcode', 'barcode');
                        } else if (storeName === 'sales') {
                            anyStore.createIndex('date', 'date');
                            anyStore.createIndex('customerId', 'customerId');
                        } else if (storeName === 'purchases') {
                            anyStore.createIndex('date', 'date');
                            anyStore.createIndex('supplierId', 'supplierId');
                        } else if (storeName === 'audit_logs') {
                            anyStore.createIndex('timestamp', 'timestamp');
                        } else if (storeName === 'expenses') {
                            anyStore.createIndex('date', 'date');
                            anyStore.createIndex('category', 'category');
                        }
                    } else if (oldVersion < 17) {
                        // Migration for existing stores
                        const tx = db.transaction(storeName, 'versionchange');
                        const store = tx.objectStore(storeName) as any;

                        if (storeName === 'customers') {
                            if (!store.indexNames.contains('name')) store.createIndex('name', 'name');
                            if (!store.indexNames.contains('phone')) store.createIndex('phone', 'phone');
                        } else if (storeName === 'products') {
                            if (!store.indexNames.contains('name')) store.createIndex('name', 'name');
                            if (!store.indexNames.contains('category')) store.createIndex('category', 'category');
                            if (!store.indexNames.contains('barcode')) store.createIndex('barcode', 'barcode');
                        } else if (storeName === 'sales') {
                            if (!store.indexNames.contains('date')) store.createIndex('date', 'date');
                            if (!store.indexNames.contains('customerId')) store.createIndex('customerId', 'customerId');
                        } else if (storeName === 'purchases') {
                            if (!store.indexNames.contains('date')) store.createIndex('date', 'date');
                            if (!store.indexNames.contains('supplierId')) store.createIndex('supplierId', 'supplierId');
                        } else if (storeName === 'audit_logs') {
                            if (!store.indexNames.contains('timestamp')) store.createIndex('timestamp', 'timestamp');
                        } else if (storeName === 'expenses') {
                            if (!store.indexNames.contains('date')) store.createIndex('date', 'date');
                            if (!store.indexNames.contains('category')) store.createIndex('category', 'category');
                        }
                    }
                }
            },
            blocked() {
                if ((window as any).devMode) console.warn('Database blocked: closing connection to allow upgrade.');
            },
            blocking() {
                if ((window as any).devMode) console.warn('Database blocking: closing connection.');
                dbPromise?.then(db => db.close());
                dbPromise = undefined;
            },
            terminated() {
                // Connection was forcibly closed
                console.error('Database connection terminated abnormally.');
                dbPromise = undefined;
            }
        });
    }
    return dbPromise;
}

export async function getAll<T extends StoreName>(storeName: T): Promise<BusinessManagerDB[T]['value'][]> {
    const db = await getDb();
    return db.getAll(storeName);
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
        await markStoreModified(storeName);
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
        await markStoreModified(storeName);
    } catch (error) {
        console.error(`Failed to upsert many in ${storeName}:`, error);
    }
}

export async function addToTrash(item: TrashItem) {
    try {
        const db = await getDb();
        await db.put('trash', item);
        await markStoreModified('trash');
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
        await markStoreModified(storeName);
    } catch (error) {
        console.error(`Failed to delete from store ${storeName}:`, error);
    }
}

async function markStoreModified(storeName: StoreName) {
    if (storeName === 'sync_metadata' || storeName === 'snapshots') return;
    try {
        const db = await getDb();
        const existing = await db.get('sync_metadata', storeName);
        await db.put('sync_metadata', {
            id: storeName,
            lastModified: Date.now(),
            lastSynced: existing?.lastSynced || 0
        });
    } catch (e) {
        console.warn("Failed to mark store modified", e);
    }
}

export async function getModifiedStores(): Promise<{ storeName: StoreName, lastModified: number }[]> {
    try {
        const db = await getDb();
        const all = await db.getAll('sync_metadata');
        return all
            .filter(m => m.lastModified > m.lastSynced)
            .map(m => ({ storeName: m.id as StoreName, lastModified: m.lastModified }));
    } catch (e) {
        return [];
    }
}

export async function markStoreSynced(storeName: StoreName, timestamp: number) {
    try {
        const db = await getDb();
        const existing = await db.get('sync_metadata', storeName);
        await db.put('sync_metadata', {
            id: storeName,
            lastModified: existing?.lastModified || timestamp,
            lastSynced: timestamp
        });
    } catch (e) {
        console.warn("Failed to mark store synced", e);
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

export async function exportData(): Promise<Omit<DataState, 'toast' | 'selection' | 'pin' | 'googleUser' | 'syncStatus'>> {
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
        const tx = db.transaction(STORE_NAMES, 'readwrite');

        // 1. Process Trash First
        // We need to know what has been deleted to ensure we don't re-add it from cloud
        // and to remove it locally if it was deleted on another device.
        const cloudTrash = cloudData['trash'] || [];
        const trashStore = tx.objectStore('trash');

        for (const item of cloudTrash) {
            // Add to local trash
            await trashStore.put(item);

            // If item exists in its original store locally, DELETE it.
            // This syncs the deletion from other devices.
            if (item.originalStore && item.id) {
                try {
                    const originalStore = tx.objectStore(item.originalStore as StoreName);
                    const exists = await originalStore.get(item.id);
                    if (exists) {
                        await originalStore.delete(item.id);
                    }
                } catch (e) {
                    // Store might not exist or be valid, ignore
                }
            }
        }

        // Get all trash IDs to verify against other collections
        const allTrashKeys = await trashStore.getAllKeys();
        const trashIdSet = new Set(allTrashKeys.map(k => String(k)));

        for (const storeName of STORE_NAMES) {
            if (storeName === 'notifications' || storeName === 'snapshots' || storeName === 'trash') continue;

            const remoteItems = cloudData[storeName];
            if (!remoteItems || !Array.isArray(remoteItems)) continue;

            const store = tx.objectStore(storeName);

            if (remoteItems.length > 0) {
                for (const item of remoteItems) {
                    if (item && item.id) {
                        // Check Trash
                        if (trashIdSet.has(item.id)) {
                            const exists = await store.get(item.id);
                            if (exists) await store.delete(item.id);
                            continue;
                        }

                        const localItem = await store.get(item.id);

                        if (!localItem) {
                            // 1. New -> Add
                            await store.put(item);
                        } else {
                            // 2. Conflict: Compare timestamps
                            const remoteTime = (item as any).updatedAt ? new Date((item as any).updatedAt).getTime() : 0;
                            const localTime = (localItem as any).updatedAt ? new Date((localItem as any).updatedAt).getTime() : 0;

                            if (remoteTime > localTime) {
                                await store.put(item);
                            }
                        }
                    }
                }
            }
        }
        await tx.done;
    } catch (error) {
        console.error("Merge Failed:", error);
        throw error; // Stop the sync process on error
    }
}

export async function importData(data: any, merge: boolean = false): Promise<void> {
    // If overwrite (merge=false), use sequential saveCollection calls which are robust
    if (!merge) {
        // Clear sync metadata on full import
        const db = await getDb();
        await db.clear('sync_metadata');
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
    const db2 = await getDb();
    await db2.clear('sync_metadata');
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
