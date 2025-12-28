import { Action } from "../AppContext";
import { AppState, AuditLogEntry, TrashItem } from "../../types";
import * as db from "../../utils/db";

export const returnReducer = (state: AppState, action: Action): AppState => {
    const touch = { lastLocalUpdate: Date.now() };

    switch (action.type) {
        case 'ADD_RETURN': {
            const newReturn = { ...action.payload, updatedAt: new Date().toISOString() };
            const productsToUpdate: any[] = [];

            let stockAdjProducts = state.products.map(p => {
                const item = newReturn.items.find((i: any) => i.productId === p.id);
                if (item) {
                    const quantityChange = newReturn.type === 'CUSTOMER' ? item.quantity : -item.quantity;
                    const updated = { ...p, quantity: Math.max(0, p.quantity + quantityChange), updatedAt: new Date().toISOString() };
                    productsToUpdate.push(updated);
                    return updated;
                }
                return p;
            });

            db.upsertItem('returns', newReturn);
            db.upsertMany('products', productsToUpdate);

            const newLog: AuditLogEntry = {
                id: `LOG-${Date.now()}`,
                timestamp: new Date().toISOString(),
                user: state.googleUser?.email || state.profile?.ownerName || 'User',
                action: 'Return Processed',
                details: `Type: ${newReturn.type}, ID: ${newReturn.id}`
            };
            db.upsertItem('audit_logs', newLog);

            return { ...state, returns: [...state.returns, newReturn], products: stockAdjProducts, audit_logs: [newLog, ...state.audit_logs], ...touch };
        }

        case 'UPDATE_RETURN': {
            const updatedReturn = { ...action.payload.updatedReturn, updatedAt: new Date().toISOString() };
            db.upsertItem('returns', updatedReturn);
            return {
                ...state,
                returns: state.returns.map(r => r.id === updatedReturn.id ? updatedReturn : r),
                ...touch
            };
        }

        case 'DELETE_RETURN': {
            const returnToDelete = state.returns.find(r => r.id === action.payload);
            if (!returnToDelete) return state;

            const productsToUpdate: any[] = [];
            let reversedStockProducts = state.products.map(p => {
                const item = returnToDelete.items.find((i: any) => i.productId === p.id);
                if (item) {
                    const quantityChange = returnToDelete.type === 'CUSTOMER' ? -item.quantity : item.quantity;
                    const updated = { ...p, quantity: Math.max(0, p.quantity + quantityChange), updatedAt: new Date().toISOString() };
                    productsToUpdate.push(updated);
                    return updated;
                }
                return p;
            });

            const trashReturn: TrashItem = {
                id: returnToDelete.id,
                originalStore: 'returns',
                data: returnToDelete,
                deletedAt: new Date().toISOString()
            };

            db.addToTrash(trashReturn);
            db.deleteFromStore('returns', returnToDelete.id);
            db.upsertMany('products', productsToUpdate);

            const newLog: AuditLogEntry = {
                id: `LOG-${Date.now()}`,
                timestamp: new Date().toISOString(),
                user: state.googleUser?.email || state.profile?.ownerName || 'User',
                action: 'Deleted Return',
                details: `ID: ${action.payload}`
            };
            db.upsertItem('audit_logs', newLog);

            return {
                ...state,
                returns: state.returns.filter(r => r.id !== action.payload),
                products: reversedStockProducts,
                trash: [trashReturn, ...state.trash],
                audit_logs: [newLog, ...state.audit_logs],
                ...touch
            };
        }

        default:
            return state;
    }
};
