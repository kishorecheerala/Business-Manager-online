import { Action } from "../AppContext";
import { AppState, Sale, AuditLogEntry, TrashItem, Payment, ParkedSale } from "../../types";
import * as db from "../../utils/db";

export const saleReducer = (state: AppState, action: Action): AppState => {
    const touch = { lastLocalUpdate: Date.now() };

    switch (action.type) {
        case 'ADD_SALE': {
            const newSale = action.payload;
            db.upsertItem('sales', newSale);
            const newLog: AuditLogEntry = {
                id: `LOG-${Date.now()}`,
                timestamp: new Date().toISOString(),
                user: state.googleUser?.email || state.profile?.ownerName || 'User',
                action: 'New Sale',
                details: `ID: ${newSale.id}, Amt: ${newSale.totalAmount}`
            };
            db.upsertItem('audit_logs', newLog);
            return { ...state, sales: [...state.sales, newSale], audit_logs: [newLog, ...state.audit_logs], ...touch };
        }

        case 'UPDATE_SALE': {
            const { oldSale, updatedSale } = action.payload;
            const updatedSaleWithTime = { ...updatedSale, updatedAt: new Date().toISOString() };

            const stockMap: Record<string, number> = {};
            oldSale.items.forEach(item => {
                stockMap[item.productId] = (stockMap[item.productId] || 0) + item.quantity;
            });
            updatedSale.items.forEach(item => {
                stockMap[item.productId] = (stockMap[item.productId] || 0) - item.quantity;
            });

            const productsToUpdate: any[] = [];
            const adjustedProducts = state.products.map(p => {
                if (stockMap[p.id] !== undefined) {
                    const updated = { ...p, quantity: p.quantity + stockMap[p.id], updatedAt: new Date().toISOString() };
                    productsToUpdate.push(updated);
                    return updated;
                }
                return p;
            });

            db.upsertItem('sales', updatedSaleWithTime);
            db.upsertMany('products', productsToUpdate);

            const newLog: AuditLogEntry = {
                id: `LOG-${Date.now()}`,
                timestamp: new Date().toISOString(),
                user: state.googleUser?.email || state.profile?.ownerName || 'User',
                action: 'Updated Sale',
                details: `ID: ${updatedSale.id}`
            };
            db.upsertItem('audit_logs', newLog);

            return {
                ...state,
                sales: state.sales.map(s => s.id === updatedSale.id ? updatedSaleWithTime : s),
                products: adjustedProducts,
                audit_logs: [newLog, ...state.audit_logs],
                ...touch
            };
        }

        case 'DELETE_SALE': {
            const saleToDelete = state.sales.find(s => s.id === action.payload);
            if (!saleToDelete) return state;

            const productsToUpdate: any[] = [];
            const restoredProducts = state.products.map(p => {
                const item = saleToDelete.items.find(i => i.productId === p.id);
                if (item) {
                    const updated = { ...p, quantity: p.quantity + item.quantity, updatedAt: new Date().toISOString() };
                    productsToUpdate.push(updated);
                    return updated;
                }
                return p;
            });

            const trashSale: TrashItem = {
                id: saleToDelete.id,
                originalStore: 'sales',
                data: saleToDelete,
                deletedAt: new Date().toISOString()
            };

            db.addToTrash(trashSale);
            db.deleteFromStore('sales', saleToDelete.id);
            db.upsertMany('products', productsToUpdate);

            const newLog: AuditLogEntry = {
                id: `LOG-${Date.now()}`,
                timestamp: new Date().toISOString(),
                user: state.googleUser?.email || state.profile?.ownerName || 'User',
                action: 'Deleted Sale',
                details: `ID: ${action.payload}`
            };
            db.upsertItem('audit_logs', newLog);

            return {
                ...state,
                sales: state.sales.filter(s => s.id !== action.payload),
                products: restoredProducts,
                trash: [trashSale, ...state.trash],
                audit_logs: [newLog, ...state.audit_logs],
                ...touch
            };
        }

        case 'ADD_PAYMENT_TO_SALE': {
            const sale = state.sales.find(s => s.id === action.payload.saleId);
            if (!sale) return state;

            const updatedSale = {
                ...sale,
                payments: [...(sale.payments || []), action.payload.payment],
                updatedAt: new Date().toISOString()
            };
            db.upsertItem('sales', updatedSale);

            const newLog: AuditLogEntry = {
                id: `LOG-${Date.now()}`,
                timestamp: new Date().toISOString(),
                user: state.googleUser?.email || state.profile?.ownerName || 'User',
                action: 'Payment Added',
                details: `Sale ID: ${action.payload.saleId}, Amount: ${action.payload.payment.amount}`
            };
            db.upsertItem('audit_logs', newLog);

            return {
                ...state,
                sales: state.sales.map(s => s.id === action.payload.saleId ? updatedSale : s),
                audit_logs: [newLog, ...state.audit_logs],
                ...touch
            };
        }

        case 'UPDATE_PAYMENT_IN_SALE': {
            const { saleId, payment } = action.payload;
            const sale = state.sales.find(s => s.id === saleId);
            if (!sale) return state;

            const updatedSale = {
                ...sale,
                payments: sale.payments.map((p: any) => p.id === payment.id ? payment : p),
                updatedAt: new Date().toISOString()
            };
            db.upsertItem('sales', updatedSale);

            return {
                ...state,
                sales: state.sales.map(s => s.id === saleId ? updatedSale : s),
                ...touch
            };
        }

        case 'UPDATE_CURRENT_SALE':
            return { ...state, currentSale: { ...state.currentSale, ...action.payload } };

        case 'PARK_CURRENT_SALE': {
            const newParkedSale: ParkedSale = {
                ...state.currentSale,
                id: `PARK-${Date.now()}`,
                parkedAt: Date.now()
            };
            const updatedParkedSales = [newParkedSale, ...state.parkedSales];
            localStorage.setItem('parked_sales', JSON.stringify(updatedParkedSales));
            return { ...state, parkedSales: updatedParkedSales, currentSale: (action as any).payload || state.currentSale, ...touch };
        }

        case 'CLEAR_CURRENT_SALE':
            return { ...state, currentSale: (action as any).payload || state.currentSale };

        case 'RESUME_PARKED_SALE': {
            const filteredParkedSales = state.parkedSales.filter(ps => ps.id !== action.payload.id);
            localStorage.setItem('parked_sales', JSON.stringify(filteredParkedSales));
            return { ...state, parkedSales: filteredParkedSales, currentSale: action.payload, ...touch };
        }

        case 'DELETE_PARKED_SALE': {
            const filteredParkedSales = state.parkedSales.filter(ps => ps.id !== action.payload);
            localStorage.setItem('parked_sales', JSON.stringify(filteredParkedSales));
            return { ...state, parkedSales: filteredParkedSales, ...touch };
        }

        case 'ADD_PARKED_SALES': {
            const updatedParkedSales = [...action.payload, ...state.parkedSales];
            localStorage.setItem('parked_sales', JSON.stringify(updatedParkedSales));
            return { ...state, parkedSales: updatedParkedSales, ...touch };
        }

        case 'UPDATE_CURRENT_SALE':
            return { ...state, currentSale: { ...state.currentSale, ...action.payload }, ...touch };

        case 'PARK_CURRENT_SALE': {
            const newParked = { ...state.currentSale, id: `PARKED-${Date.now()}`, parkedAt: Date.now() };
            const updatedParked = [newParked, ...state.parkedSales];
            localStorage.setItem('parked_sales', JSON.stringify(updatedParked));
            return { ...state, parkedSales: updatedParked, currentSale: { customerId: '', items: [], discount: '0', date: state.currentSale.date, paymentDetails: { amount: '', method: 'CASH', date: state.currentSale.date, reference: '' } }, ...touch };
        }

        case 'CLEAR_CURRENT_SALE':
            return { ...state, currentSale: { customerId: '', items: [], discount: '0', date: state.currentSale.date, paymentDetails: { amount: '', method: 'CASH', date: state.currentSale.date, reference: '' } }, ...touch };

        case 'RESUME_PARKED_SALE':
            return { ...state, currentSale: { ...action.payload }, parkedSales: state.parkedSales.filter(s => s.id !== action.payload.id), ...touch };

        case 'DELETE_PARKED_SALE': {
            const filteredParked = state.parkedSales.filter(s => s.id !== action.payload);
            localStorage.setItem('parked_sales', JSON.stringify(filteredParked));
            return { ...state, parkedSales: filteredParked, ...touch };
        }

        case 'ADD_PARKED_SALES': {
            const combinedParked = [...action.payload, ...state.parkedSales];
            localStorage.setItem('parked_sales', JSON.stringify(combinedParked));
            return { ...state, parkedSales: combinedParked, ...touch };
        }

        default:
            return state;
    }
};
