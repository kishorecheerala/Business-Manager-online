import * as db from './db';

export interface IntegrityIssue {
    store: db.StoreName;
    id?: string;
    type: 'missing_id' | 'invalid_date' | 'orphan_reference' | 'corrupt_data';
    message: string;
    severity: 'high' | 'medium' | 'low';
}

export interface IntegrityResult {
    passed: boolean;
    issues: IntegrityIssue[];
    scannedCount: number;
    timestamp: number;
}

export async function runFullIntegrityCheck(): Promise<IntegrityResult> {
    const stores: db.StoreName[] = ['customers', 'products', 'sales', 'purchases', 'expenses', 'audit_logs', 'notifications'];
    const issues: IntegrityIssue[] = [];
    let scannedCount = 0;

    for (const storeName of stores) {
        const data = await db.getAll(storeName);

        for (const item of data) {
            scannedCount++;

            // 1. Basic ID check
            if (!item.id) {
                issues.push({
                    store: storeName,
                    type: 'missing_id',
                    message: `Item in ${storeName} is missing a unique identifier.`,
                    severity: 'high'
                });
            }

            // 2. Date validation
            const dateFields = ['createdAt', 'updatedAt', 'date'];
            for (const field of dateFields) {
                if (item[field]) {
                    const date = new Date(item[field]);
                    if (isNaN(date.getTime())) {
                        issues.push({
                            store: storeName,
                            id: item.id,
                            type: 'invalid_date',
                            message: `Invalid date format in field "${field}". Value: ${item[field]}`,
                            severity: 'medium'
                        });
                    }
                }
            }

            // 3. Logic-specific checks
            if (storeName === 'sales' && (!item.customerId || !item.items || item.items.length === 0)) {
                issues.push({
                    store: storeName,
                    id: item.id,
                    type: 'corrupt_data',
                    message: "Sale record missing customer or item data.",
                    severity: 'high'
                });
            }
        }
    }

    return {
        passed: issues.length === 0,
        issues,
        scannedCount,
        timestamp: Date.now()
    };
}
