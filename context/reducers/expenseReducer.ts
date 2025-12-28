import { DataState, Action } from '../../types';
import * as db from '../../utils/db';
import { logAction } from './helpers';

export const expenseReducer = (state: DataState, action: Action): DataState => {
    let newLog: any;
    const touch = { lastLocalUpdate: Date.now() };

    switch (action.type) {
        case 'ADD_EXPENSE':
            const newExpense = { ...action.payload, updatedAt: new Date().toISOString() };
            db.upsertItem('expenses', newExpense);
            newLog = logAction(state, 'Expense Added', `${newExpense.category}: ${newExpense.amount} `);
            db.upsertItem('audit_logs', newLog);
            return { ...state, expenses: [newExpense, ...state.expenses], audit_logs: [newLog, ...state.audit_logs], ...touch };

        case 'UPDATE_EXPENSE':
            const updatedExpense = { ...action.payload, updatedAt: new Date().toISOString() };
            const updatedExpenses = state.expenses.map(e => e.id === updatedExpense.id ? updatedExpense : e);
            db.upsertItem('expenses', updatedExpense);
            return { ...state, expenses: updatedExpenses, ...touch };

        case 'DELETE_EXPENSE':
            const expenseToDelete = state.expenses.find(e => e.id === action.payload);
            if (expenseToDelete) {
                db.deleteFromStore('expenses', action.payload);
                db.addToTrash({
                    id: expenseToDelete.id,
                    originalStore: 'expenses',
                    data: expenseToDelete,
                    deletedAt: new Date().toISOString()
                });
                newLog = logAction(state, 'Expense Deleted', `ID: ${action.payload} `);
                db.upsertItem('audit_logs', newLog);
                return {
                    ...state,
                    expenses: state.expenses.filter(e => e.id !== action.payload),
                    audit_logs: [newLog, ...state.audit_logs],
                    ...touch
                };
            }
            return state;

        default:
            return state;
    }
};
