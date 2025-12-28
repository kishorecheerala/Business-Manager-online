import { Action, DataState, AuditLogEntry, BankAccount } from "../../types";
import * as db from "../../utils/db";

export const bankReducer = (state: DataState, action: Action): DataState => {
    const touch = { lastLocalUpdate: Date.now() };

    switch (action.type) {
        case 'ADD_BANK_ACCOUNT': {
            const newAccount = { ...action.payload, updatedAt: new Date().toISOString() };
            db.upsertItem('bank_accounts', newAccount);
            return { ...state, bankAccounts: [newAccount, ...state.bankAccounts], ...touch };
        }

        case 'UPDATE_BANK_ACCOUNT': {
            const updatedAccount = { ...action.payload, updatedAt: new Date().toISOString() };
            const updatedAccounts = state.bankAccounts.map(b => b.id === updatedAccount.id ? updatedAccount : b);
            db.upsertItem('bank_accounts', updatedAccount);
            return { ...state, bankAccounts: updatedAccounts, ...touch };
        }

        case 'DELETE_BANK_ACCOUNT': {
            db.deleteFromStore('bank_accounts', action.payload);
            return { ...state, bankAccounts: state.bankAccounts.filter(b => b.id !== action.payload), ...touch };
        }

        default:
            return state;
    }
};
