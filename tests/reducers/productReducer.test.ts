import { describe, it, expect, vi } from 'vitest';
import { productReducer } from '../../context/reducers/productReducer';
import { AppState, Product } from '../../types';
import * as db from '../../utils/db'; // We mock this

vi.mock('../../utils/db', () => ({
    upsertItem: vi.fn(),
    upsertMany: vi.fn(),
    saveCollection: vi.fn(),
    deleteFromStore: vi.fn(),
    addToTrash: vi.fn()
}));

const mockState: AppState = {
    products: [{ id: 'p1', name: 'Original', quantity: 10, updatedAt: '' }],
    sales: [{ id: 's1', items: [{ productId: 'p1', quantity: 1 }] }],
    purchases: [{ id: 'pu1', items: [{ productId: 'p1', quantity: 1 }] }],
    quotes: [{ id: 'q1', items: [{ productId: 'p1', quantity: 1 }] }],
    returns: [{ id: 'r1', items: [{ productId: 'p1', quantity: 1 }] }],
    audit_logs: []
} as unknown as AppState;

describe('productReducer', () => {
    it('should rename product id and cascade to all collections', () => {
        const action = {
            type: 'RENAME_PRODUCT_ID',
            payload: { oldId: 'p1', newId: 'p_new' }
        } as any;

        const newState = productReducer(mockState, action);

        // 1. Verify Product
        expect(newState.products[0].id).toBe('p_new');

        // 2. Verify Cascade
        // Sales
        expect(newState.sales[0].items[0].productId).toBe('p_new');
        // Purchases
        expect(newState.purchases[0].items[0].productId).toBe('p_new');

        // 3. Verify DB calls
        // Since we mocked db, distinct calls should be made
        expect(db.saveCollection).toHaveBeenCalledWith('products', expect.any(Array));
        expect(db.saveCollection).toHaveBeenCalledWith('sales', expect.any(Array));
        expect(db.saveCollection).toHaveBeenCalledWith('purchases', expect.any(Array));
    });

    it('should handle batch update', () => {
        const action = {
            type: 'BATCH_UPDATE_PRODUCTS',
            payload: [{ id: 'p1', quantity: 20 }]
        } as any;

        const newState = productReducer(mockState, action);
        expect(newState.products[0].quantity).toBe(20);
        expect(db.upsertMany).toHaveBeenCalledWith('products', expect.any(Array));
    });
});
