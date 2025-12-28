import { Action } from "../AppContext";
import { AppState, Product, AuditLogEntry } from "../../types";
import * as db from "../../utils/db";

export const productReducer = (state: AppState, action: Action): AppState => {
    const touch = { lastLocalUpdate: Date.now() };

    switch (action.type) {
        case 'ADD_PRODUCT': {
            const newProduct = { ...action.payload, updatedAt: new Date().toISOString() };
            const existingProductIndex = state.products.findIndex(p => p.id === newProduct.id);
            let productsList;
            if (existingProductIndex >= 0) {
                productsList = state.products.map((p, i) => i === existingProductIndex ? { ...p, quantity: p.quantity + newProduct.quantity, updatedAt: new Date().toISOString() } : p);
                const updatedProduct = productsList[existingProductIndex];
                db.upsertItem('products', updatedProduct);
            } else {
                productsList = [...state.products, newProduct];
                db.upsertItem('products', newProduct);
            }
            return { ...state, products: productsList, ...touch };
        }

        case 'UPDATE_PRODUCT_STOCK': {
            const updatedStockProducts = state.products.map(p => {
                if (p.id === action.payload.productId) {
                    const updated = { ...p, quantity: p.quantity + action.payload.change, updatedAt: new Date().toISOString() };
                    db.upsertItem('products', updated);
                    return updated;
                }
                return p;
            });
            return { ...state, products: updatedStockProducts, ...touch };
        }

        case 'BATCH_UPDATE_PRODUCTS': {
            const updates: Product[] = [];
            const batchUpdatedProducts = state.products.map(p => {
                const update = action.payload.find(u => u.id === p.id);
                if (update) {
                    const updated = { ...update, updatedAt: new Date().toISOString() };
                    updates.push(updated);
                    return updated;
                }
                return p;
            });
            db.upsertMany('products', updates);
            return { ...state, products: batchUpdatedProducts, ...touch };
        }

        case 'RENAME_PRODUCT_ID': {
            const { oldId, newId } = action.payload;
            if (oldId === newId) return state;

            // 1. Update Products
            const renamedProducts = state.products.map(p => {
                if (p.id === oldId) {
                    const updated = { ...p, id: newId, updatedAt: new Date().toISOString() };
                    // We need to delete old and add new
                    db.deleteFromStore('products', oldId);
                    db.upsertItem('products', updated);
                    return updated;
                }
                return p;
            });

            // 2. Cascade to Sales
            const salesToUpdate: any[] = [];
            const updatedSales = state.sales.map(sale => {
                let changed = false;
                const newItems = sale.items.map(item => {
                    if (item.productId === oldId) {
                        changed = true;
                        return { ...item, productId: newId };
                    }
                    return item;
                });
                if (changed) {
                    const updated = { ...sale, items: newItems, updatedAt: new Date().toISOString() };
                    salesToUpdate.push(updated);
                    return updated;
                }
                return sale;
            });
            db.upsertMany('sales', salesToUpdate);

            // 3. Cascade to Purchases
            const purchasesToUpdate: any[] = [];
            const updatedPurchases = state.purchases.map(purchase => {
                let changed = false;
                const newItems = purchase.items.map(item => {
                    if (item.productId === oldId) {
                        changed = true;
                        return { ...item, productId: newId };
                    }
                    return item;
                });
                if (changed) {
                    const updated = { ...purchase, items: newItems, updatedAt: new Date().toISOString() };
                    purchasesToUpdate.push(updated);
                    return updated;
                }
                return purchase;
            });
            db.upsertMany('purchases', purchasesToUpdate);

            // 4. Cascade to Quotes
            const quotesToUpdate: any[] = [];
            const updatedQuotes = state.quotes.map(quote => {
                let changed = false;
                const newItems = quote.items.map(item => {
                    if (item.productId === oldId) {
                        changed = true;
                        return { ...item, productId: newId };
                    }
                    return item;
                });
                if (changed) {
                    const updated = { ...quote, items: newItems, updatedAt: new Date().toISOString() };
                    quotesToUpdate.push(updated);
                    return updated;
                }
                return quote;
            });
            db.upsertMany('quotes', quotesToUpdate);

            // 5. Cascade to Returns
            const returnsToUpdate: any[] = [];
            const updatedReturns = state.returns.map(ret => {
                let changed = false;
                const newItems = ret.items.map(item => {
                    if (item.productId === oldId) {
                        changed = true;
                        return { ...item, productId: newId };
                    }
                    return item;
                });
                if (changed) {
                    const updated = { ...ret, items: newItems, updatedAt: new Date().toISOString() };
                    returnsToUpdate.push(updated);
                    return updated;
                }
                return ret;
            });
            db.upsertMany('returns', returnsToUpdate);

            const newLog: AuditLogEntry = {
                id: `LOG-${Date.now()}`,
                timestamp: new Date().toISOString(),
                user: state.googleUser?.email || state.profile?.ownerName || 'User',
                action: 'Product ID Renamed',
                details: `${oldId} -> ${newId}`
            };
            db.upsertItem('audit_logs', newLog);

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
