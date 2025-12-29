
import SQLiteManager from './sqliteManager';
import {
    Customer, Supplier, Product, Sale, Purchase, Return, Notification,
    ProfileData, AppMetadata, AuditLogEntry, Expense, Quote, CustomFont,
    Snapshot, TrashItem, Budget, FinancialScenario, DataState, BankAccount,
    FinancialGoal, ParkedSale
} from '../types';

export type StoreName = 'customers' | 'suppliers' | 'products' | 'sales' | 'purchases' | 'returns' | 'app_metadata' | 'notifications' | 'profile' | 'audit_logs' | 'expenses' | 'quotes' | 'custom_fonts' | 'snapshots' | 'trash' | 'budgets' | 'financial_scenarios' | 'bank_accounts' | 'goals' | 'parked_sales' | 'sync_metadata';

export const STORE_NAMES: StoreName[] = ['customers', 'suppliers', 'products', 'sales', 'purchases', 'returns', 'app_metadata', 'notifications', 'profile', 'audit_logs', 'expenses', 'quotes', 'custom_fonts', 'snapshots', 'trash', 'budgets', 'financial_scenarios', 'bank_accounts', 'goals', 'parked_sales', 'sync_metadata'];

const sqlite = SQLiteManager.getInstance();

/**
 * Basic data retrieval
 */
export async function getAll<T extends StoreName>(storeName: T): Promise<any[]> {
    try {
        return await sqlite.getAll(storeName);
    } catch (e) {
        console.error(`Failed to getAll from ${storeName}`, e);
        return [];
    }
}

export async function getAllCollections(): Promise<Record<StoreName, any[]>> {
    try {
        const result: any = {};
        await Promise.all(STORE_NAMES.map(async (storeName) => {
            result[storeName] = await sqlite.getAll(storeName);
        }));
        return result;
    } catch (error) {
        console.error("Failed to getAllCollections from SQLite:", error);
        const empty: any = {};
        STORE_NAMES.forEach(s => empty[s] = []);
        return empty;
    }
}

/**
 * Data Modification
 */
export async function saveCollection<T extends StoreName>(storeName: T, data: any[]) {
    try {
        await sqlite.clearCollection(storeName);
        if (data.length > 0) {
            await sqlite.upsertMany(storeName, data);
        }
        await markStoreModified(storeName);
    } catch (error) {
        console.error(`Failed to save collection ${storeName}:`, error);
        throw error;
    }
}

export async function upsertItem<T extends StoreName>(storeName: T, item: any) {
    try {
        const id = item.id || 'singleton';
        await sqlite.upsert(storeName, id, item);
        await markStoreModified(storeName);
    } catch (error) {
        console.error(`Failed to upsert item in ${storeName}:`, error);
    }
}

export async function upsertMany<T extends StoreName>(storeName: T, items: any[]) {
    if (!items || items.length === 0) return;
    try {
        await sqlite.upsertMany(storeName, items);
        await markStoreModified(storeName);
    } catch (error) {
        console.error(`Failed to upsert many in ${storeName}:`, error);
        throw error; // Propagate error
    }
}

export async function deleteFromStore<T extends StoreName>(storeName: T, id: string) {
    try {
        await sqlite.delete(storeName, id);
        await markStoreModified(storeName);
    } catch (error) {
        console.error(`Failed to delete from store ${storeName}:`, error);
    }
}

/**
 * Trash handling
 */
export async function addToTrash(item: TrashItem) {
    await upsertItem('trash', item);
}

export async function deleteFromTrash(id: string) {
    await deleteFromStore('trash', id);
}

/**
 * Sync Metadata helpers (adapted to SQLite)
 */
async function markStoreModified(storeName: StoreName) {
    if (storeName === 'sync_metadata' || storeName === 'snapshots') return;
    try {
        const results = await sqlite.getAll('sync_metadata');
        const existing = results.find(m => m.id === storeName);
        await sqlite.upsert('sync_metadata', storeName, {
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
        const all = await sqlite.getAll('sync_metadata');
        return all
            .filter(m => m.lastModified > m.lastSynced)
            .map(m => ({ storeName: m.id as StoreName, lastModified: m.lastModified }));
    } catch (e) {
        return [];
    }
}

export async function markStoreSynced(storeName: StoreName, timestamp: number) {
    try {
        const results = await sqlite.getAll('sync_metadata');
        const existing = results.find(m => m.id === storeName);
        await sqlite.upsert('sync_metadata', storeName, {
            id: storeName,
            lastModified: existing?.lastModified || timestamp,
            lastSynced: timestamp
        });
    } catch (e) {
        console.warn("Failed to mark store synced", e);
    }
}

/**
 * Backup / Restore
 */
export async function getLastBackupDate(): Promise<string | null> {
    const metas = await sqlite.getAll('app_metadata');
    const result = metas.find(m => m.id === 'lastBackup');
    return result ? (result as any).date : null;
}

export async function setLastBackupDate(): Promise<void> {
    const now = new Date().toISOString();
    await sqlite.upsert('app_metadata', 'lastBackup', { id: 'lastBackup', date: now });
}

export async function exportData(): Promise<any> {
    const data: any = {};
    for (const storeName of STORE_NAMES) {
        if (storeName === 'notifications' || storeName === 'snapshots' || storeName === 'sync_metadata') continue;
        data[storeName] = await sqlite.getAll(storeName);
    }
    return data;
}

export async function mergeData(cloudData: any): Promise<void> {
    try {
        // Handle trash first
        const cloudTrash = cloudData['trash'] || [];
        for (const item of cloudTrash) {
            await upsertItem('trash', item);
            if (item.originalStore && item.id) {
                await sqlite.delete(item.originalStore as StoreName, item.id);
            }
        }

        const trashItems = await sqlite.getAll('trash');
        const trashIdSet = new Set(trashItems.map(t => String(t.id)));

        for (const storeName of STORE_NAMES) {
            if (storeName === 'notifications' || storeName === 'snapshots' || storeName === 'trash' || storeName === 'sync_metadata') continue;

            const remoteItems = cloudData[storeName];
            if (!remoteItems || !Array.isArray(remoteItems)) continue;

            const localItems = await sqlite.getAll(storeName);
            const localMap = new Map(localItems.map(l => [String(l.id), l]));
            const itemsToUpsert: any[] = [];

            for (const item of remoteItems) {
                if (item && item.id) {
                    const itemId = String(item.id);
                    if (trashIdSet.has(itemId)) {
                        await sqlite.delete(storeName, itemId);
                        continue;
                    }

                    const localItem = localMap.get(itemId);

                    if (!localItem) {
                        itemsToUpsert.push(item);
                    } else {
                        const remoteTime = (item as any).updatedAt ? new Date((item as any).updatedAt).getTime() : 0;
                        const localTime = (localItem as any).updatedAt ? new Date((localItem as any).updatedAt).getTime() : 0;

                        if (remoteTime >= localTime) {
                            itemsToUpsert.push(item);
                        }
                    }
                }
            }

            if (itemsToUpsert.length > 0) {
                await sqlite.upsertMany(storeName, itemsToUpsert);
            }
        }
    } catch (error) {
        console.error("Merge Failed in SQLite:", error);
        throw error;
    }
}

export async function importData(data: any, merge: boolean = false): Promise<void> {
    if (!merge) {
        // Clear sync metadata on full import
        await sqlite.clearCollection('sync_metadata');
    }

    for (const storeName of STORE_NAMES) {
        if (storeName === 'notifications' || storeName === 'snapshots' || storeName === 'sync_metadata') continue;

        let items = (data as any)[storeName] || [];
        if (!Array.isArray(items) && items && typeof items === 'object') {
            items = [items];
        }

        if (!merge) {
            await saveCollection(storeName, items);
        } else {
            await upsertMany(storeName, items);
        }
    }
}

/**
 * Snapshots
 */
export async function createSnapshot(name: string = 'Auto Checkpoint'): Promise<string> {
    const data = await exportData();
    const id = `snap-${Date.now()}`;
    const snapshot: Snapshot = {
        id,
        timestamp: new Date().toISOString(),
        name,
        data
    };
    await upsertItem('snapshots', snapshot);
    return id;
}

export async function getSnapshots(): Promise<Snapshot[]> {
    const snaps = await sqlite.getAll('snapshots');
    return snaps.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export async function restoreSnapshot(id: string): Promise<void> {
    const snaps = await sqlite.getAll('snapshots');
    const snap = snaps.find(s => s.id === id);
    if (snap) {
        await importData(snap.data, false);
    } else {
        throw new Error("Snapshot not found");
    }
}

export async function deleteSnapshot(id: string): Promise<void> {
    await sqlite.delete('snapshots', id);
}

/**
 * System Management
 */
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
    const stats: Record<string, number> = {};
    for (const storeName of STORE_NAMES) {
        const items = await sqlite.getAll(storeName);
        stats[storeName] = items.length;
    }
    return stats;
}

export async function clearDatabase(): Promise<void> {
    for (const storeName of STORE_NAMES) {
        await sqlite.clearCollection(storeName);
    }
}

export async function deleteDatabase(): Promise<void> {
    await clearDatabase();
}

export async function forceEmergencyReset(): Promise<void> {
    localStorage.clear();
    sessionStorage.clear();
    await clearDatabase();
    window.location.reload();
}
