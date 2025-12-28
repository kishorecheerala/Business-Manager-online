import { Action } from "../AppContext";
import { AppState, Customer, AuditLogEntry } from "../../types";
import * as db from "../../utils/db";

export const customerReducer = (state: AppState, action: Action): AppState => {
    const touch = { lastLocalUpdate: Date.now() };

    switch (action.type) {
        case 'ADD_CUSTOMER': {
            const newCustomer = { ...action.payload, updatedAt: new Date().toISOString() };
            db.upsertItem('customers', newCustomer);
            const newLog: AuditLogEntry = {
                id: `LOG-${Date.now()}`,
                timestamp: new Date().toISOString(),
                user: state.googleUser?.email || state.profile?.ownerName || 'User',
                action: 'Customer Added',
                details: newCustomer.name
            };
            db.upsertItem('audit_logs', newLog);
            return {
                ...state,
                customers: [newCustomer, ...state.customers],
                audit_logs: [newLog, ...state.audit_logs],
                ...touch
            };
        }

        case 'UPDATE_CUSTOMER': {
            const updatedCustomer: Customer = { ...action.payload, updatedAt: new Date().toISOString() };
            const updatedCustomers = state.customers.map(c => c.id === updatedCustomer.id ? updatedCustomer : c);
            db.upsertItem('customers', updatedCustomer);
            const newLog: AuditLogEntry = {
                id: `LOG-${Date.now()}`,
                timestamp: new Date().toISOString(),
                user: state.googleUser?.email || state.profile?.ownerName || 'User',
                action: 'Updated Customer',
                details: `ID: ${updatedCustomer.id}`
            };
            db.upsertItem('audit_logs', newLog);
            return {
                ...state,
                customers: updatedCustomers,
                audit_logs: [newLog, ...state.audit_logs],
                ...touch
            };
        }

        default:
            return state;
    }
};
