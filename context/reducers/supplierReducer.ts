import { Action } from "../AppContext";
import { AppState, Supplier } from "../../types";
import * as db from "../../utils/db";

export const supplierReducer = (state: AppState, action: Action): AppState => {
    const touch = { lastLocalUpdate: Date.now() };

    switch (action.type) {
        case 'ADD_SUPPLIER': {
            const newSupplier = { ...action.payload, updatedAt: new Date().toISOString() };
            db.upsertItem('suppliers', newSupplier);
            return { ...state, suppliers: [newSupplier, ...state.suppliers], ...touch };
        }

        case 'UPDATE_SUPPLIER': {
            const updatedSupplier = { ...action.payload, updatedAt: new Date().toISOString() };
            const updatedSuppliers = state.suppliers.map(s => s.id === updatedSupplier.id ? updatedSupplier : s);
            db.upsertItem('suppliers', updatedSupplier);
            return { ...state, suppliers: updatedSuppliers, ...touch };
        }

        default:
            return state;
    }
};
