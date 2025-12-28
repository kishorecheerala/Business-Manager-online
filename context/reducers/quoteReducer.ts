import { DataState, Action } from '../../types';
import * as db from '../../utils/db';
import { logAction } from './helpers';

export const quoteReducer = (state: DataState, action: Action): DataState => {
    let newLog: any;
    const touch = { lastLocalUpdate: Date.now() };

    switch (action.type) {
        case 'ADD_QUOTE':
            const newQuote = { ...action.payload, updatedAt: new Date().toISOString() };
            db.upsertItem('quotes', newQuote);
            newLog = logAction(state, 'New Quote', `ID: ${newQuote.id}, Amt: ${newQuote.totalAmount} `);
            db.upsertItem('audit_logs', newLog);
            return { ...state, quotes: [newQuote, ...state.quotes], audit_logs: [newLog, ...state.audit_logs], ...touch };

        case 'UPDATE_QUOTE':
            const updatedQuote = { ...action.payload, updatedAt: new Date().toISOString() };
            const updatedQuotes = state.quotes.map(q => q.id === updatedQuote.id ? updatedQuote : q);
            db.upsertItem('quotes', updatedQuote);
            return { ...state, quotes: updatedQuotes, ...touch };

        case 'DELETE_QUOTE':
            const quoteToDelete = state.quotes.find(q => q.id === action.payload);
            if (quoteToDelete) {
                db.deleteFromStore('quotes', action.payload);
                db.addToTrash({
                    id: quoteToDelete.id,
                    originalStore: 'quotes',
                    data: quoteToDelete,
                    deletedAt: new Date().toISOString()
                });
                newLog = logAction(state, 'Quote Deleted', `ID: ${action.payload} `);
                db.upsertItem('audit_logs', newLog);
                return {
                    ...state,
                    quotes: state.quotes.filter(q => q.id !== action.payload),
                    audit_logs: [newLog, ...state.audit_logs],
                    ...touch
                };
            }
            return state;

        default:
            return state;
    }
};
