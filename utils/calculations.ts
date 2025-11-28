
import { SaleItem, QuoteItem, PurchaseItem, Product } from '../types';

export const calculateTotals = (
    items: (SaleItem | QuoteItem | PurchaseItem)[], 
    discount: number, 
    products: Product[] = []
) => {
    let subTotal = 0;
    let gstAmount = 0;

    items.forEach(item => {
        const quantity = Number(item.quantity) || 0;
        const price = Number(item.price) || 0;
        const lineTotal = price * quantity;
        subTotal += lineTotal;

        let gstPercent = 0;
        
        // Determine GST Percent
        if ('gstPercent' in item && typeof (item as PurchaseItem).gstPercent === 'number') {
            // PurchaseItem has own GST percent
            gstPercent = Number((item as PurchaseItem).gstPercent) || 0;
        } else {
            // Sale/Quote Item looks up GST from product catalog
            const product = products.find(p => p.id === item.productId);
            gstPercent = product ? Number(product.gstPercent) || 0 : 0;
        }

        // Inclusive GST Calculation: Tax = Total - (Total / (1 + Rate/100))
        if (gstPercent > 0) {
            const itemGst = lineTotal - (lineTotal / (1 + (gstPercent / 100)));
            gstAmount += itemGst;
        }
    });

    const totalAmount = subTotal - discount;
    // Round GST for display consistency (2 decimal places)
    const roundedGstAmount = Math.round(gstAmount * 100) / 100;

    return { 
        subTotal, 
        discountAmount: discount, 
        gstAmount: roundedGstAmount, 
        totalAmount 
    };
};
