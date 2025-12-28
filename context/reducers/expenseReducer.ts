import { Action } from "../AppContext";
import { AppState, AuditLogEntry, TrashItem } from "../../types";
import * as db from "../../utils/db";

export const expenseReducer = (state: AppState, action: Action): AppState => {
    const touch = { lastLocalUpdate: Date.now() };

    switch (action.type) {
        case 'ADD_EXPENSE': {
            const newExpense = { ...action.payload, updatedAt: new Date().toISOString() };
            db.upsertItem('expenses', newExpense);
            return { ...state, expenses: [...state.expenses, newExpense], ...touch };
        }

        case 'UPDATE_EXPENSE': {
            const updatedExpense = { ...action.payload, updatedAt: new Date().toISOString() };
            db.upsertItem('expenses', updatedExpense);
            const newLog: AuditLogEntry = {
                id: `LOG-${Date.now()}`,
                timestamp: new Date().toISOString(),
                user: state.googleUser?.email || state.profile?.ownerName || 'User',
                action: 'Expense Updated',
                details: `${updatedExpense.category} - ${updatedExpense.amount}`
            };
            db.upsertItem('audit_logs', newLog);
            return {
                ...state,
                expenses: state.expenses.map(e => e.id === updatedExpense.id ? updatedExpense : e),
                audit_logs: [newLog, ...state.audit_logs],
                ...touch
            };
        }

        case 'DELETE_EXPENSE': {
            const expenseToDelete = state.expenses.find(e => e.id === action.payload);
            if (!expenseToDelete) return state;

            const trashExpense: TrashItem = {
                id: expenseToDelete.id,
                originalStore: 'expenses',
                data: expenseToDelete,
                deletedAt: new Date().toISOString()
            };

            db.addToTrash(trashExpense);
            db.deleteFromStore('expenses', expenseToDelete.id);

            return {
                ...state,
                expenses: state.expenses.filter(e => e.id !== action.payload),
                trash: [trashExpense, ...state.trash],
                ...touch
            };
        }

        default:
            return state;
    }
};
