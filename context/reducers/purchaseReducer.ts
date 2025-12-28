import { Action } from "../AppContext";
import { AppState, AuditLogEntry, Payment, Purchase } from "../../types";
import * as db from "../../utils/db";

export const purchaseReducer = (state: AppState, action: Action): AppState => {
    const touch = { lastLocalUpdate: Date.now() };

    switch (action.type) {
        case 'ADD_PURCHASE': {
            const newPurchase = { ...action.payload, updatedAt: new Date().toISOString() };
            const productsToUpdate: any[] = [];

            const prodsAfterPurchase = state.products.map(p => {
                const item = newPurchase.items.find((i: any) => i.productId === p.id);
                if (item) {
                    const updated = {
                        ...p,
                        quantity: p.quantity + item.quantity,
                        purchasePrice: item.price,
                        salePrice: item.saleValue,
                        gstPercent: item.gstPercent,
                        updatedAt: new Date().toISOString()
                    };
                    productsToUpdate.push(updated);
                    return updated;
                }
                return p;
            });

            newPurchase.items.forEach((item: any) => {
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
                    productsToUpdate.push(newProd);
                }
            });

            db.upsertItem('purchases', newPurchase);
            db.upsertMany('products', productsToUpdate);

            const newLog: AuditLogEntry = {
                id: `LOG-${Date.now()}`,
                timestamp: new Date().toISOString(),
                user: state.googleUser?.email || state.profile?.ownerName || 'User',
                action: 'New Purchase',
                details: `ID: ${newPurchase.id}, Amt: ${newPurchase.totalAmount}`
            };
            db.upsertItem('audit_logs', newLog);

            return {
                ...state,
                purchases: [newPurchase, ...state.purchases],
                products: prodsAfterPurchase,
                audit_logs: [newLog, ...state.audit_logs],
                ...touch
            };
        }

        case 'UPDATE_PURCHASE': {
            const { updatedPurchase } = action.payload;
            const updatedPurchaseWithTime = { ...updatedPurchase, updatedAt: new Date().toISOString() };
            db.upsertItem('purchases', updatedPurchaseWithTime);
            return {
                ...state,
                purchases: state.purchases.map(p => p.id === updatedPurchaseWithTime.id ? updatedPurchaseWithTime : p),
                ...touch
            };
        }

        case 'DELETE_PURCHASE': {
            const purchaseToDelete = state.purchases.find(p => p.id === action.payload);
            if (!purchaseToDelete) return state;

            const productsToUpdate: any[] = [];
            const reducedProducts = state.products.map(p => {
                const item = purchaseToDelete.items.find((i: any) => i.productId === p.id);
                if (item) {
                    const updated = { ...p, quantity: Math.max(0, p.quantity - item.quantity), updatedAt: new Date().toISOString() };
                    productsToUpdate.push(updated);
                    return updated;
                }
                return p;
            });

            const trashPurchase = {
                id: purchaseToDelete.id,
                originalStore: 'purchases',
                data: purchaseToDelete,
                deletedAt: new Date().toISOString()
            };

            db.addToTrash(trashPurchase);
            db.deleteFromStore('purchases', purchaseToDelete.id);
            db.upsertMany('products', productsToUpdate);

            const newLog: AuditLogEntry = {
                id: `LOG-${Date.now()}`,
                timestamp: new Date().toISOString(),
                user: state.googleUser?.email || state.profile?.ownerName || 'User',
                action: 'Deleted Purchase',
                details: `ID: ${action.payload}`
            };
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

        case 'ADD_PAYMENT_TO_PURCHASE': {
            const purchase = state.purchases.find(p => p.id === action.payload.purchaseId);
            if (!purchase) return state;

            const updatedPurchase = {
                ...purchase,
                payments: [...(purchase.payments || []), action.payload.payment],
                updatedAt: new Date().toISOString()
            };
            db.upsertItem('purchases', updatedPurchase);

            const newLog: AuditLogEntry = {
                id: `LOG-${Date.now()}`,
                timestamp: new Date().toISOString(),
                user: state.googleUser?.email || state.profile?.ownerName || 'User',
                action: 'Payment Added (Purchase)',
                details: `Purchase ID: ${action.payload.purchaseId}`
            };
            db.upsertItem('audit_logs', newLog);

            return {
                ...state,
                purchases: state.purchases.map(p => p.id === action.payload.purchaseId ? updatedPurchase : p),
                audit_logs: [newLog, ...state.audit_logs],
                ...touch
            };
        }

        case 'UPDATE_PAYMENT_IN_PURCHASE': {
            const { purchaseId, payment } = action.payload;
            const targetPurchase = state.purchases.find(p => p.id === purchaseId);
            if (!targetPurchase) return state;

            const updatedPurchase = {
                ...targetPurchase,
                payments: targetPurchase.payments.map((p: Payment) => p.id === payment.id ? { ...payment } : p),
                updatedAt: new Date().toISOString()
            };
            db.upsertItem('purchases', updatedPurchase);

            const newLog: AuditLogEntry = {
                id: `LOG-${Date.now()}`,
                timestamp: new Date().toISOString(),
                user: state.googleUser?.email || state.profile?.ownerName || 'User',
                action: 'Purchase Payment Updated',
                details: `Purch: ${purchaseId}, Amt: ${payment.amount}`
            };
            db.upsertItem('audit_logs', newLog);

            return {
                ...state,
                purchases: state.purchases.map(p => p.id === purchaseId ? updatedPurchase : p),
                audit_logs: [newLog, ...state.audit_logs],
                ...touch
            };
        }

        default:
            return state;
    }
};
