import { describe, it, expect } from 'vitest';
import { calculateTotals } from '../../utils/calculations';
import { Product } from '../../types';

describe('calculateTotals', () => {
    const products: Product[] = [
        { id: 'p1', name: 'Product 1', gstPercent: 18, price: 100 } as any,
        { id: 'p2', name: 'Product 2', gstPercent: 0, price: 50 } as any
    ];

    it('should calculate totals correctly for sales/quotes items (using product lookup)', () => {
        const items: any[] = [
            { productId: 'p1', quantity: 2, price: 118 }, // 236 total, inclusive 18% GST -> ~36 GST
            { productId: 'p2', quantity: 1, price: 50 }   // 50 total, 0 GST
        ];

        const result = calculateTotals(items, 0, products); // No discount

        expect(result.subTotal).toBe(286); // 236 + 50
        // GST Calc for item 1: 236 - (236 / 1.18) = 236 - 200 = 36
        expect(result.gstAmount).toBe(36);
        expect(result.totalAmount).toBe(286);
    });

    it('should calculate totals for purchases (using item gstPercent)', () => {
        const items: any[] = [
            { productId: 'p1', quantity: 1, price: 100, gstPercent: 5 }
        ];

        // Should ignore product list GST and use item GST
        const result = calculateTotals(items, 0, products);

        // 100 total. GST at 5% inclusive. 100 - (100/1.05) = 100 - 95.238... = 4.76
        expect(result.subTotal).toBe(100);
        expect(result.gstAmount).toBeCloseTo(4.76, 2);
    });

    it('should handle discount', () => {
        const items: any[] = [
            { productId: 'p2', quantity: 2, price: 50 } // 100 total
        ];
        const result = calculateTotals(items, 10, products); // 10 discount

        expect(result.subTotal).toBe(100);
        expect(result.totalAmount).toBe(90);
    });
});
