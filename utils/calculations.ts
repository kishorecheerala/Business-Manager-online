
import { SaleItem, QuoteItem, PurchaseItem, Product } from '../types';
import { safeNumber } from './mathUtils';

export const calculateTotals = (
    items: (SaleItem | QuoteItem | PurchaseItem)[],
    discount: number,
    products: Product[] | Map<string, Product> = []
) => {
    let subTotal = 0;
    let gstAmount = 0;

    // Helper to find product from Array or Map
    const findProduct = (id: string): Product | undefined => {
        if (Array.isArray(products)) {
            return products.find(p => p.id === id);
        } else if (products instanceof Map) {
            return products.get(id);
        }
        return undefined;
    };

    const safeDiscount = safeNumber(discount);

    items.forEach(item => {
        const quantity = safeNumber(item.quantity);
        const price = safeNumber(item.price);
        const lineTotal = price * quantity;
        subTotal += lineTotal;

        let gstPercent = 0;

        // Determine GST Percent
        if ('gstPercent' in item && typeof (item as PurchaseItem).gstPercent === 'number') {
            // PurchaseItem has own GST percent
            gstPercent = safeNumber((item as PurchaseItem).gstPercent);
        } else {
            // Sale/Quote Item looks up GST from product catalog
            const product = findProduct(item.productId);
            gstPercent = product ? safeNumber(product.gstPercent) : 0;
        }

        // Inclusive GST Calculation: Tax = Total - (Total / (1 + Rate/100))
        if (gstPercent > 0) {
            const itemGst = lineTotal - (lineTotal / (1 + (gstPercent / 100)));
            gstAmount += itemGst;
        }
    });

    const totalAmount = subTotal - safeDiscount;
    // Round GST for display consistency (2 decimal places)
    const roundedGstAmount = Math.round(gstAmount * 100) / 100;

    return {
        subTotal,
        discountAmount: safeDiscount,
        gstAmount: roundedGstAmount,
        totalAmount
    };
};
