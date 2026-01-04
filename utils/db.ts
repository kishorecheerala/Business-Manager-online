import { openDB, deleteDB, DBSchema, IDBPDatabase, wrap } from 'idb';
import IndexedDBManager from './indexedDBManager';
import { Customer, Supplier, Product, Sale, Purchase, Return, Notification, ProfileData, AppMetadata, AuditLogEntry, Expense, Quote, CustomFont, Snapshot, TrashItem, Budget, FinancialScenario, BankAccount, FinancialGoal, DataState, Page, Action } from '../types';

const DB_NAME = 'business-manager-db';
const DB_VERSION = 16; // Kept as 16 to match previous attempts

export type StoreName = 'customers' | 'suppliers' | 'products' | 'sales' | 'purchases' | 'returns' | 'app_metadata' | 'notifications' | 'profile' | 'audit_logs' | 'expenses' | 'quotes' | 'custom_fonts' | 'snapshots' | 'trash' | 'budgets' | 'financial_scenarios' | 'bank_accounts' | 'goals' | 'parked_sales' | 'sync_metadata';

export const STORE_NAMES: StoreName[] = ['customers', 'suppliers', 'products', 'sales', 'purchases', 'returns', 'app_metadata', 'notifications', 'profile', 'audit_logs', 'expenses', 'quotes', 'custom_fonts', 'snapshots', 'trash', 'budgets', 'financial_scenarios', 'bank_accounts', 'goals', 'parked_sales', 'sync_metadata'];

interface SyncMetadata {
    id: string; // storeName
    lastModified: number;
    lastSynced: number;
}

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
    sync_metadata: { key: string; value: SyncMetadata; };
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
                // We use the IDBManager to handle open logic (including recovery/corruption checks)
                const nativeDb = await manager.openDatabase<IDBDatabase>({
                    dbName: DB_NAME,
                    version: DB_VERSION,
                    stores: storeConfig,
                    silent: options.silent
                });

                nativeDb.onclose = () => {
                    dbPromise = undefined;
                };

                // Wrap the native DB with idb for promise support
                return wrap(nativeDb) as unknown as IDBPDatabase<BusinessManagerDB>;
            } catch (e) {
                dbPromise = undefined;
                throw e;
            }
        })();
    }
    return dbPromise;
}

// --- Basic Data Retrieval ---

export async function getAll<T extends StoreName>(storeName: T): Promise<any[]> {
    try {
        const db = await getDb();
        return await db.getAll(storeName as any);
    } catch (e) {
        console.error(`Failed to getAll from ${storeName} `, e);
        return [];
    }
}

/**
 * Retrieves all collections. optimized with a single transaction where possible.
 */
export async function getAllCollections(options: { silent?: boolean } = {}): Promise<Record<StoreName, any[]>> {
    try {
        const db = await getDb(options);
        const result: Partial<Record<StoreName, any[]>> = {};

        // Use a single transaction for all stores to ensure consistency and speed
        const tx = db.transaction(STORE_NAMES, 'readonly');

        await Promise.all(STORE_NAMES.map(async (storeName) => {
            result[storeName] = await tx.objectStore(storeName as any).getAll();
        }));

        await tx.done;
        return result as Record<StoreName, any[]>;
    } catch (error) {
        console.error("Failed to getAllCollections:", error);
        const empty: any = {};
        STORE_NAMES.forEach(s => empty[s] = []);
        return empty;
    }
}

// --- Data Modification ---

export async function saveCollection<T extends StoreName>(storeName: T, data: any[]) {
    try {
        const db = await getDb();
        const tx = db.transaction(storeName as any, 'readwrite');
        const store = tx.objectStore(storeName as any);
        await store.clear();

        // Chunking prevents blocking the UI thread for large collections
        const CHUNK_SIZE = 500;
        for (let i = 0; i < data.length; i += CHUNK_SIZE) {
            const chunk = data.slice(i, i + CHUNK_SIZE);
            await Promise.all(chunk.map(item => store.put(item)));
        }

        await tx.done;
        await markStoreModified(storeName);
    } catch (error: any) {
        // Ignore specific internal error that can happen during page unload/close
        const msg = String(error);
        if (msg.includes('Internal error opening backing store') || msg.includes('The database connection is closing')) {
            console.warn(`Supressed DB Error in ${storeName}: `, msg);
            return;
        }
        console.error(`Failed to save collection ${storeName}: `, error);
        throw error;
    }
}

export async function upsertItem<T extends StoreName>(storeName: T, item: any) {
    try {
        const db = await getDb();
        // Ensure ID
        if (!item.id) item.id = 'singleton';
        await db.put(storeName as any, item);
        await markStoreModified(storeName);
    } catch (error) {
        console.error(`Failed to upsert item in ${storeName}: `, error);
    }
}

export async function upsertMany<T extends StoreName>(storeName: T, items: any[]) {
    if (!items || items.length === 0) return;
    try {
        const db = await getDb();
        const tx = db.transaction(storeName as any, 'readwrite');
        const store = tx.objectStore(storeName as any);

        await Promise.all(items.map(item => store.put(item)));
        await tx.done;
        await markStoreModified(storeName);
    } catch (error) {
        console.error(`Failed to upsert many in ${storeName}: `, error);
    }
}

export async function deleteFromStore<T extends StoreName>(storeName: T, id: string) {
    try {
        const db = await getDb();
        await db.delete(storeName as any, id);
        await markStoreModified(storeName);
    } catch (error) {
        console.error(`Failed to delete from store ${storeName}: `, error);
    }
}

// --- Trash Handling ---

export async function addToTrash(item: TrashItem) {
    try {
        await upsertItem('trash', item);
    } catch (error) {
        console.error('Failed to add to trash:', error);
    }
}

export async function deleteFromTrash(id: string) {
    try {
        await deleteFromStore('trash', id);
    } catch (error) {
        console.error('Failed to delete from trash:', error);
    }
}

// --- Sync Metadata & Logic ---

async function markStoreModified(storeName: StoreName) {
    if (storeName === 'sync_metadata' || storeName === 'snapshots') return;

    // NOTE: We still mark audit_logs as modified so they eventually sync, 
    // but we will refine syncData to not trigger JUST because of audit_logs.
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
        const db = await getDb(); // Using getDb() ensures we wait for connection
        const allMetadata = await db.getAll('sync_metadata');

        // Add a small buffer (500ms) to avoid race conditions with quick successions
        const buffer = 500;

        return allMetadata
            .filter(m => m.lastModified > (m.lastSynced + buffer))
            .map(m => ({ storeName: m.id as StoreName, lastModified: m.lastModified }));
    } catch (e) {
        console.error("Failed to get modified stores", e);
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

export async function mergeData(cloudData: any): Promise<void> {
    try {
        const db = await getDb();

        // 1. Process Trash First
        const cloudTrash = cloudData['trash'] || [];
        if (cloudTrash.length > 0) {
            // Transaction across all stores to handle deletions
            const trashTx = db.transaction(['trash', ...STORE_NAMES.filter(s => s !== 'trash')] as any, 'readwrite');
            const trashStore = trashTx.objectStore('trash');

            for (const item of cloudTrash) {
                await trashStore.put(item);
                if (item.originalStore && item.id) {
                    try {
                        const originalStore = trashTx.objectStore(item.originalStore as any);
                        await originalStore.delete(item.id);
                    } catch (e) {
                        // Store might be invalid in metadata or already deleted
                    }
                }
            }
            await trashTx.done;
        }

        // 2. Refresh Trash Set for lookup
        const trashKeys = await db.getAllKeys('trash');
        const trashIdSet = new Set(trashKeys.map(k => String(k)));

        // 3. Sync stores
        for (const storeName of STORE_NAMES) {
            if (storeName === 'notifications' || storeName === 'snapshots' || storeName === 'trash' || storeName === 'sync_metadata') continue;

            const remoteItems = cloudData[storeName];
            if (!remoteItems || !Array.isArray(remoteItems) || remoteItems.length === 0) continue;

            const tx = db.transaction(storeName as any, 'readwrite');
            const store = tx.objectStore(storeName as any);

            const promises = remoteItems.map(async (item) => {
                if (item && item.id) {
                    const itemId = String(item.id);

                    if (trashIdSet.has(itemId)) {
                        // Item is in trash locally, ensure it's deleted
                        await store.delete(itemId);
                        return;
                    }

                    try {
                        const localItem = await store.get(itemId);

                        if (!localItem) {
                            await store.put(item);
                        } else {
                            const remoteTime = (item as any).updatedAt ? new Date((item as any).updatedAt).getTime() : 0;
                            const localTime = (localItem as any).updatedAt ? new Date((localItem as any).updatedAt).getTime() : 0;

                            if (remoteTime >= localTime) {
                                await store.put(item);
                            }
                        }
                    } catch (e) {
                        console.warn(`Error processing item ${itemId} in ${storeName}: `, e);
                    }
                }
            });

            await Promise.all(promises);
            await tx.done;
            // Mark as synced so we don't immediately push it back? 
            // Actually, we usually rely on 'getModifiedStores' which compares timestamps. 
            // If we just updated it, lastModified is now. 
            // If we markStoreSynced now, it might prevent push. 
            // Ideally, successful merge means we are in sync with cloud state as of NOW.
        }

    } catch (error) {
        console.error("Merge Failed:", error);
        throw error;
    }
}

export async function importData(data: any, merge: boolean = false): Promise<void> {
    if (!merge) {
        await clearDatabase(); // Start fresh
    }

    const db = await getDb();

    for (const storeName of STORE_NAMES) {
        if (storeName === 'notifications' || storeName === 'snapshots' || storeName === 'sync_metadata') continue;

        let items = (data as any)[storeName] || [];
        if (!Array.isArray(items) && items && typeof items === 'object') {
            items = [items];
        }

        if (Array.isArray(items) && items.length > 0) {
            await upsertMany(storeName as StoreName, items);
        }
    }
}

// --- Snapshots ---

export async function createSnapshot(name: string = 'Auto Checkpoint'): Promise<string> {
    const data = await exportData();
    const db = await getDb();
    const id = `snap - ${Date.now()} `;
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

// --- Backup & Export ---

export async function getLastBackupDate(): Promise<string | null> {
    try {
        const db = await getDb();
        const result = await db.get('app_metadata', 'lastBackup');
        return result ? (result as any).date : null;
    } catch { return null; }
}

export async function setLastBackupDate(): Promise<void> {
    try {
        const db = await getDb();
        const now = new Date().toISOString();
        await db.put('app_metadata', { id: 'lastBackup', date: now });
    } catch { }
}

export async function exportData(): Promise<any> {
    const db = await getDb();
    const data: any = {};
    for (const storeName of STORE_NAMES) {
        if (storeName === 'notifications' || storeName === 'snapshots' || storeName === 'sync_metadata') continue;
        data[storeName] = await db.getAll(storeName as any);
    }
    return data;
}

// --- System ---

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
        stats[storeName] = await db.count(storeName as any);
    }
    return stats;
}

export async function clearDatabase(): Promise<void> {
    const db = await getDb();
    // Clear all stores except metadata if needed, but 'clearDatabase' implies everything
    const tx = db.transaction(STORE_NAMES, 'readwrite');
    await Promise.all(STORE_NAMES.map(storeName => tx.objectStore(storeName as any).clear()));
    await tx.done;
}

export async function deleteDatabase(): Promise<void> {
    try {
        if (dbPromise) {
            const db = await dbPromise.catch(() => null);
            db?.close();
        }
    } catch { }
    dbPromise = undefined;
    await deleteDB(DB_NAME);
}

export async function forceEmergencyReset(): Promise<void> {
    try {
        await deleteDatabase();
        localStorage.clear();
        sessionStorage.clear();
        console.log('[DB] Factory reset triggered. Reloading...');
        window.location.reload();
    } catch (e) {
        console.error('[DB] Factory reset failed:', e);
        window.location.reload();
    }
}
