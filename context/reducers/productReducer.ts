import { AppState, Action, Product } from '../../types';
import * as db from '../../utils/db';
import { logAction } from './helpers';

export const productReducer = (state: AppState, action: Action): AppState => {
    let newLog: any;
    const touch = { lastLocalUpdate: Date.now() };

    switch (action.type) {
        case 'ADD_PRODUCT':
            const newProduct = { ...action.payload, updatedAt: new Date().toISOString() };
            const existingProductIndex = state.products.findIndex(p => p.id === newProduct.id);
            let productsList;
            if (existingProductIndex >= 0) {
                const existing = state.products[existingProductIndex];
                const updatedProduct = { ...existing, quantity: existing.quantity + newProduct.quantity, updatedAt: new Date().toISOString() };
                productsList = state.products.map((p, i) => i === existingProductIndex ? updatedProduct : p);
                db.upsertItem('products', updatedProduct);
            } else {
                productsList = [...state.products, newProduct];
                db.upsertItem('products', newProduct);
            }
            return { ...state, products: productsList, ...touch };

        case 'UPDATE_PRODUCT_STOCK':
            const prodToUpdate = state.products.find(p => p.id === action.payload.productId);
            if (!prodToUpdate) return state;

            const updatedStockProduct = { ...prodToUpdate, quantity: prodToUpdate.quantity + action.payload.change, updatedAt: new Date().toISOString() };
            const updatedStockProducts = state.products.map(p =>
                p.id === action.payload.productId ? updatedStockProduct : p
            );
            db.upsertItem('products', updatedStockProduct);
            return { ...state, products: updatedStockProducts, ...touch };

        case 'BATCH_UPDATE_PRODUCTS':
            const productsToUpdateBatch: Product[] = [];
            const batchUpdatedProducts = state.products.map(p => {
                const update = action.payload.find(u => u.id === p.id);
                if (update) {
                    const up = { ...update, updatedAt: new Date().toISOString() };
                    productsToUpdateBatch.push(up);
                    return up;
                }
                return p;
            });
            if (productsToUpdateBatch.length > 0) db.upsertMany('products', productsToUpdateBatch);
            return { ...state, products: batchUpdatedProducts, ...touch };

        case 'RENAME_PRODUCT_ID': {
            const { oldId, newId } = action.payload;
            if (oldId === newId) return state;

            // 1. Update Products
            const renamedProducts = state.products.map(p =>
                p.id === oldId ? { ...p, id: newId, updatedAt: new Date().toISOString() } : p
            );
            db.saveCollection('products', renamedProducts);

            // 2. Cascade to Sales
            const updatedSales = state.sales.map(sale => ({
                ...sale,
                items: sale.items.map(item =>
                    item.productId === oldId ? { ...item, productId: newId, updatedAt: new Date().toISOString() } : item
                )
            }));
            db.saveCollection('sales', updatedSales);

            // 3. Cascade to Purchases
            const updatedPurchases = state.purchases.map(purchase => ({
                ...purchase,
                items: purchase.items.map(item =>
                    item.productId === oldId ? { ...item, productId: newId, updatedAt: new Date().toISOString() } : item
                )
            }));
            db.saveCollection('purchases', updatedPurchases);

            // 4. Cascade to Quotes
            const updatedQuotes = state.quotes.map(quote => ({
                ...quote,
                items: quote.items.map(item =>
                    item.productId === oldId ? { ...item, productId: newId } : item
                )
            }));
            db.saveCollection('quotes', updatedQuotes);

            // 5. Cascade to Returns
            const updatedReturns = state.returns.map(ret => ({
                ...ret,
                items: ret.items.map(item =>
                    item.productId === oldId ? { ...item, productId: newId } : item
                )
            }));
            db.saveCollection('returns', updatedReturns);

            newLog = logAction(state, 'Product ID Renamed', `${oldId} -> ${newId} `);
            db.saveCollection('audit_logs', [newLog, ...state.audit_logs]);

            return {
                ...state,
                products: renamedProducts,
                sales: updatedSales,
                purchases: updatedPurchases,
                quotes: updatedQuotes,
                returns: updatedReturns,
                audit_logs: [newLog, ...state.audit_logs],
                ...touch
            };
        }

        default:
            return state;
    }
};
