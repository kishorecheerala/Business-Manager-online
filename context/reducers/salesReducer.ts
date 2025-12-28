import { AppState, Action, Product, SaleDraft, TrashItem } from '../../types';
import * as db from '../../utils/db';
import { logAction } from './helpers';
import { getLocalDateString } from '../../utils/dateUtils';

// Helper to get default draft
const DEFAULT_SALE_DRAFT: SaleDraft = {
    customerId: '',
    items: [],
    discount: '0',
    date: getLocalDateString(),
    paymentDetails: {
        amount: '',
        method: 'CASH',
        date: getLocalDateString(),
        reference: ''
    }
};

export const salesReducer = (state: AppState, action: Action): AppState => {
    let newLog: any;
    const touch = { lastLocalUpdate: Date.now() };

    switch (action.type) {
        case 'ADD_SALE':
            const newSale = action.payload;
            let customersAfterSale = [...state.customers];

            db.upsertItem('sales', newSale);

            newLog = logAction(state, 'New Sale', `ID: ${newSale.id}, Amt: ${newSale.totalAmount} `);
            db.upsertItem('audit_logs', newLog);
            return { ...state, sales: [...state.sales, newSale], customers: customersAfterSale, audit_logs: [newLog, ...state.audit_logs], ...touch };

        case 'UPDATE_SALE':
            const { oldSale, updatedSale } = action.payload;

            const stockMap: Record<string, number> = {};
            oldSale.items.forEach(item => {
                stockMap[item.productId] = (stockMap[item.productId] || 0) + item.quantity;
            });

            updatedSale.items.forEach(item => {
                stockMap[item.productId] = (stockMap[item.productId] || 0) - item.quantity;
            });

            // Only update products that changed
            const productsToUpdateSale: Product[] = [];
            const adjustedProducts = state.products.map(p => {
                if (stockMap[p.id] !== undefined && stockMap[p.id] !== 0) {
                    const up = { ...p, quantity: p.quantity + stockMap[p.id], updatedAt: new Date().toISOString() };
                    productsToUpdateSale.push(up);
                    return up;
                }
                return p;
            });

            const updatedSalesList = state.sales.map(s => s.id === updatedSale.id ? { ...updatedSale, updatedAt: new Date().toISOString() } : s);

            db.upsertItem('sales', { ...updatedSale, updatedAt: new Date().toISOString() });
            if (productsToUpdateSale.length > 0) db.upsertMany('products', productsToUpdateSale);

            newLog = logAction(state, 'Updated Sale', `ID: ${updatedSale.id} `);
            db.upsertItem('audit_logs', newLog);

            return { ...state, sales: updatedSalesList, products: adjustedProducts, audit_logs: [newLog, ...state.audit_logs], ...touch };

        case 'DELETE_SALE': {
            const saleToDelete = state.sales.find(s => s.id === action.payload);
            if (!saleToDelete) return state;

            // Restore Stock
            const productsToUpdateDelete: Product[] = [];
            const restoredProducts = state.products.map(p => {
                const item = saleToDelete.items.find(i => i.productId === p.id);
                if (item) {
                    const up = { ...p, quantity: p.quantity + item.quantity, updatedAt: new Date().toISOString() };
                    productsToUpdateDelete.push(up);
                    return up;
                }
                return p;
            });

            const customersAfterDelete = state.customers;

            // Create Trash Item
            const trashSale: TrashItem = {
                id: saleToDelete.id,
                originalStore: 'sales',
                data: saleToDelete,
                deletedAt: new Date().toISOString()
            };

            db.addToTrash(trashSale);
            db.deleteFromStore('sales', saleToDelete.id);
            if (productsToUpdateDelete.length > 0) db.upsertMany('products', productsToUpdateDelete);

            newLog = logAction(state, 'Deleted Sale', `ID: ${action.payload} `);
            db.upsertItem('audit_logs', newLog);

            return {
                ...state,
                sales: state.sales.filter(s => s.id !== action.payload),
                products: restoredProducts,
                customers: customersAfterDelete,
                trash: [trashSale, ...state.trash],
                audit_logs: [newLog, ...state.audit_logs],
                ...touch
            };
        }

        case 'ADD_PAYMENT_TO_SALE':
            const targetSaleForPayment = state.sales.find(s => s.id === action.payload.saleId);
            if (!targetSaleForPayment) return state;

            const updatedSaleWithPayment = {
                ...targetSaleForPayment,
                payments: [...(targetSaleForPayment.payments || []), action.payload.payment],
                updatedAt: new Date().toISOString()
            };

            const salesWithPayment = state.sales.map(s =>
                s.id === action.payload.saleId ? updatedSaleWithPayment : s
            );

            db.upsertItem('sales', updatedSaleWithPayment);
            newLog = logAction(state, 'Payment Added', `Sale ID: ${action.payload.saleId}, Amount: ${action.payload.payment.amount} `);
            db.upsertItem('audit_logs', newLog);
            return { ...state, sales: salesWithPayment, audit_logs: [newLog, ...state.audit_logs], ...touch };

        case 'UPDATE_PAYMENT_IN_SALE': {
            const { saleId, payment } = action.payload;
            const salesWithUpdatedPayment = state.sales.map(s => {
                if (s.id === saleId) {
                    return { ...s, payments: s.payments.map((p: any) => p.id === payment.id ? payment : p), updatedAt: new Date().toISOString() };
                }
                return s;
            });
            db.saveCollection('sales', salesWithUpdatedPayment);
            return { ...state, sales: salesWithUpdatedPayment, ...touch };
        }

        // --- Sale Draft / Parked Logic ---
        case 'UPDATE_CURRENT_SALE':
            return { ...state, currentSale: { ...state.currentSale, ...action.payload } };

        case 'PARK_CURRENT_SALE':
            const parkedSale = {
                id: Date.now().toString(),
                ...state.currentSale,
                parkedAt: new Date().toISOString()
            };
            const newParkedSales = [parkedSale, ...state.parkedSales];
            localStorage.setItem('parked_sales', JSON.stringify(newParkedSales));
            return {
                ...state,
                parkedSales: newParkedSales,
                currentSale: DEFAULT_SALE_DRAFT
            };

        case 'CLEAR_CURRENT_SALE':
            return { ...state, currentSale: DEFAULT_SALE_DRAFT };

        case 'RESUME_PARKED_SALE':
            const { id, parkedAt, ...saleData } = action.payload;
            const remainingParked = state.parkedSales.filter(p => p.id !== id);
            localStorage.setItem('parked_sales', JSON.stringify(remainingParked));
            return {
                ...state,
                currentSale: saleData,
                parkedSales: remainingParked
            };

        case 'DELETE_PARKED_SALE':
            const filteredParked = state.parkedSales.filter(p => p.id !== action.payload);
            localStorage.setItem('parked_sales', JSON.stringify(filteredParked));
            return { ...state, parkedSales: filteredParked };

        case 'ADD_PARKED_SALES':
            return { ...state, parkedSales: [...action.payload, ...state.parkedSales] };

        default:
            return state;
    }
};
