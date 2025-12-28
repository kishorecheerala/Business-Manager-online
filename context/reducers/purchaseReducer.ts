import { AppState, Action, Product, TrashItem } from '../../types';
import * as db from '../../utils/db';
import { logAction } from './helpers';

export const purchaseReducer = (state: AppState, action: Action): AppState => {
    let newLog: any;
    const touch = { lastLocalUpdate: Date.now() };

    switch (action.type) {
        case 'ADD_PURCHASE':
            const newPurchase = { ...action.payload, updatedAt: new Date().toISOString() };
            const productsToUpsertPurchase: Product[] = [];

            const prodsAfterPurchase = state.products.map(p => {
                const item = newPurchase.items.find(i => i.productId === p.id);
                if (item) {
                    const up = {
                        ...p,
                        quantity: p.quantity + item.quantity,
                        purchasePrice: item.price,
                        salePrice: item.saleValue,
                        gstPercent: item.gstPercent,
                        updatedAt: new Date().toISOString()
                    };
                    productsToUpsertPurchase.push(up);
                    return up;
                }
                return p;
            });

            // Handle new products created during purchase
            newPurchase.items.forEach(item => {
                if (!state.products.find(p => p.id === item.productId)) {
                    const newProd = {
                        id: item.productId,
                        name: item.productName,
                        quantity: item.quantity,
                        purchasePrice: item.price,
                        salePrice: item.saleValue,
                        gstPercent: item.gstPercent,
                        updatedAt: new Date().toISOString()
                    };
                    prodsAfterPurchase.push(newProd);
                    productsToUpsertPurchase.push(newProd);
                }
            });

            db.upsertItem('purchases', newPurchase);
            if (productsToUpsertPurchase.length > 0) db.upsertMany('products', productsToUpsertPurchase);

            newLog = logAction(state, 'New Purchase', `ID: ${newPurchase.id}, Amt: ${newPurchase.totalAmount} `);
            db.upsertItem('audit_logs', newLog);

            return {
                ...state,
                purchases: [newPurchase, ...state.purchases],
                products: prodsAfterPurchase,
                audit_logs: [newLog, ...state.audit_logs],
                ...touch
            };

        case 'UPDATE_PURCHASE':
            const { updatedPurchase } = action.payload;
            const updatedPurchaseWithTime = { ...updatedPurchase, updatedAt: new Date().toISOString() };
            const updatedPurchasesList = state.purchases.map(p => p.id === updatedPurchaseWithTime.id ? updatedPurchaseWithTime : p);
            db.upsertItem('purchases', updatedPurchaseWithTime);
            return { ...state, purchases: updatedPurchasesList, ...touch };

        case 'DELETE_PURCHASE': {
            const purchaseToDelete = state.purchases.find(p => p.id === action.payload);
            if (!purchaseToDelete) return state;

            // Reduce Stock
            const affectedProducts: Product[] = [];
            const reducedProducts = state.products.map(p => {
                const item = purchaseToDelete.items.find(i => i.productId === p.id);
                if (item) {
                    const up = { ...p, quantity: Math.max(0, p.quantity - item.quantity), updatedAt: new Date().toISOString() };
                    affectedProducts.push(up);
                    return up;
                }
                return p;
            });

            // Trash Logic
            const trashPurchase: TrashItem = {
                id: purchaseToDelete.id,
                originalStore: 'purchases',
                data: purchaseToDelete,
                deletedAt: new Date().toISOString()
            };

            db.addToTrash(trashPurchase);
            db.deleteFromStore('purchases', purchaseToDelete.id);
            if (affectedProducts.length > 0) db.upsertMany('products', affectedProducts);

            newLog = logAction(state, 'Deleted Purchase', `ID: ${action.payload} `);
            db.upsertItem('audit_logs', newLog);

            return {
                ...state,
                purchases: state.purchases.filter(p => p.id !== action.payload),
                products: reducedProducts,
                trash: [trashPurchase, ...state.trash],
                audit_logs: [newLog, ...state.audit_logs],
                ...touch
            };
        }

        case 'ADD_PAYMENT_TO_PURCHASE':
            const purchasesWithPayment = state.purchases.map(p =>
                p.id === action.payload.purchaseId
                    ? { ...p, payments: [...(p.payments || []), action.payload.payment], updatedAt: new Date().toISOString() }
                    : p
            );
            db.saveCollection('purchases', purchasesWithPayment);
            newLog = logAction(state, 'Payment Added (Purchase)', `Purchase ID: ${action.payload.purchaseId} `);
            db.saveCollection('audit_logs', [newLog, ...state.audit_logs]);
            return { ...state, purchases: purchasesWithPayment, audit_logs: [newLog, ...state.audit_logs], ...touch };

        case 'UPDATE_PAYMENT_IN_PURCHASE':
            const { purchaseId, payment } = action.payload;
            const purchasesWithUpdatedPayment = state.purchases.map(p => {
                if (p.id === purchaseId) {
                    return { ...p, payments: p.payments.map((py: any) => py.id === payment.id ? payment : py), updatedAt: new Date().toISOString() };
                }
                return p;
            });
            db.saveCollection('purchases', purchasesWithUpdatedPayment);
            return { ...state, purchases: purchasesWithUpdatedPayment, ...touch };

        default:
            return state;
    }
};
