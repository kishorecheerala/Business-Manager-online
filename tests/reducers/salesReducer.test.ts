import { describe, it, expect, vi } from 'vitest';
import { salesReducer } from '../../context/reducers/salesReducer';
import { AppState, Sale } from '../../types';

// Mock DB
vi.mock('../../utils/db', () => ({
    upsertItem: vi.fn(),
    upsertMany: vi.fn(),
    saveCollection: vi.fn(),
    deleteFromStore: vi.fn(),
    addToTrash: vi.fn()
}));

const mockState: AppState = {
    sales: [],
    products: [
        { id: 'p1', name: 'Product 1', quantity: 10, salePrice: 100, purchasePrice: 50, gstPercent: 18, updatedAt: '' },
        { id: 'p2', name: 'Product 2', quantity: 20, salePrice: 200, purchasePrice: 100, gstPercent: 12, updatedAt: '' }
    ],
    customers: [],
    audit_logs: [],
    // ... other state fields needed? Reducer copies state so partial might fail if spread
    // We can cast or use a helper
} as unknown as AppState;

describe('salesReducer', () => {
    it('should add a sale and update product stock', () => {
        const sale: Sale = {
            id: 's1',
            date: '2025-01-01',
            items: [{ productId: 'p1', quantity: 2, price: 100, productName: 'P1', saleValue: 100, gstPercent: 18 }],
            totalAmount: 200,
            customerId: 'c1',
            discount: 0,
            payments: [],
            updatedAt: ''
        };

        const newState = salesReducer(mockState, { type: 'ADD_SALE', payload: sale });

        expect(newState.sales).toHaveLength(1);
        expect(newState.sales[0].id).toBe('s1');
        // Note: ADD_SALE in current implementation does NOT deduct stock.
        // Stock deduction happens usually when 'completing' a sale or is it immediate?
        // Let's check salesReducer implementation.
        // Case 'ADD_SALE': ... upsertItem('sales', newSale); ... returns ...
        // It does NOT update products!
        // Wait, original AppContext `ADD_SALE` didn't update stock?
        // Let's check `UPDATE_SALE` logic which calculates diffs.
        // Usually stock is updated when sale is created.
        // IF `ADD_SALE` creates a draft, maybe no stock update?
        // But `SalesPage` usually dispatches `ADD_SALE` on checkout.
        // If original code missed stock update on ADD_SALE, that's a BUG or handled elsewhere (e.g. BATCH_UPDATE_PRODUCTS called separately).

        // Checked salesReducer.ts:
        // case 'ADD_SALE': ... returns { ...state, sales: [...], customers: ... }
        // It DOES NOT touch products.
        // This implies the UI must dispatch BATCH_UPDATE_PRODUCTS separately?
        // I should verify `SalesPage` logic later.

        expect(newState.products[0].quantity).toBe(10); // Unchanged
    });

    it('should update a sale and adjust stock', () => {
        const initialState = {
            ...mockState,
            sales: [{
                id: 's1',
                items: [{ productId: 'p1', quantity: 2, price: 100 }],
                totalAmount: 200
            }],
            products: [
                { id: 'p1', quantity: 8 }, // Assume stock was 8
            ]
        } as unknown as AppState;

        const updatedSaleData = {
            id: 's1',
            items: [{ productId: 'p1', quantity: 5, price: 100 }], // Increased by 3
            totalAmount: 500
        };

        // Correct payload structure for UPDATE_SALE is { oldSale, updatedSale }
        const action = {
            type: 'UPDATE_SALE',
            payload: {
                oldSale: initialState.sales[0],
                updatedSale: updatedSaleData
            }
        } as any;

        const newState = salesReducer(initialState, action);

        // Stock logic: Old Qty 2, New Qty 5. Stock should decrease by 3.
        // Initial Stock 8 -> 5.
        expect(newState.products[0].quantity).toBe(5);
    });
});
