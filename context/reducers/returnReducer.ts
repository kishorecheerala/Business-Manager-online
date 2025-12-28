import { AppState, Action, Product, TrashItem } from '../../types';
import * as db from '../../utils/db';
import { logAction } from './helpers';

export const returnReducer = (state: AppState, action: Action): AppState => {
    let newLog: any;
    const touch = { lastLocalUpdate: Date.now() };

    switch (action.type) {
        case 'ADD_RETURN':
            const newReturn = { ...action.payload, updatedAt: new Date().toISOString() };
            const productsToUpsertReturn: Product[] = [];

            const stockAdjProducts = state.products.map(p => {
                let updatedInfo: Partial<Product> | null = null;
                const item = newReturn.items.find(i => i.productId === p.id);

                if (item) {
                    if (newReturn.type === 'CUSTOMER') {
                        updatedInfo = { quantity: p.quantity + item.quantity };
                    } else {
                        updatedInfo = { quantity: Math.max(0, p.quantity - item.quantity) };
                    }
                    const up = { ...p, ...updatedInfo, updatedAt: new Date().toISOString() };
                    productsToUpsertReturn.push(up);
                    return up;
                }
                return p;
            });

            db.upsertItem('returns', newReturn);
            if (productsToUpsertReturn.length > 0) db.upsertMany('products', productsToUpsertReturn);

            newLog = logAction(state, 'Return Processed', `Type: ${newReturn.type}, ID: ${newReturn.id} `);
            db.upsertItem('audit_logs', newLog);

            return { ...state, returns: [...state.returns, newReturn], products: stockAdjProducts, audit_logs: [newLog, ...state.audit_logs], ...touch };

        case 'UPDATE_RETURN':
            const updatedReturn = { ...action.payload.updatedReturn, updatedAt: new Date().toISOString() };
            const updatedReturns = state.returns.map(r => r.id === updatedReturn.id ? updatedReturn : r);
            db.upsertItem('returns', updatedReturn);
            return { ...state, returns: updatedReturns, ...touch };

        case 'DELETE_RETURN': {
            const returnToDelete = state.returns.find(r => r.id === action.payload);
            if (!returnToDelete) return state;

            // Reverse Stock Logic
            const productsToUpsertRev: Product[] = [];
            const reversedStockProducts = state.products.map(p => {
                const item = returnToDelete.items.find(i => i.productId === p.id);
                if (item) {
                    let newQty = p.quantity;
                    if (returnToDelete.type === 'CUSTOMER') {
                        // Original: Added. Now: Subtract.
                        newQty = Math.max(0, p.quantity - item.quantity);
                    } else {
                        // Original: Subtracted. Now: Add.
                        newQty = p.quantity + item.quantity;
                    }
                    const up = { ...p, quantity: newQty, updatedAt: new Date().toISOString() };
                    productsToUpsertRev.push(up);
                    return up;
                }
                return p;
            });

            // Trash Logic
            const trashReturn: TrashItem = {
                id: returnToDelete.id,
                originalStore: 'returns',
                data: returnToDelete,
                deletedAt: new Date().toISOString()
            };

            db.addToTrash(trashReturn);
            db.deleteFromStore('returns', returnToDelete.id);
            if (productsToUpsertRev.length > 0) db.upsertMany('products', productsToUpsertRev);

            newLog = logAction(state, 'Deleted Return', `ID: ${action.payload} `);
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
