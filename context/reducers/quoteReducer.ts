import { Action } from "../AppContext";
import { AppState } from "../../types";
import * as db from "../../utils/db";

export const quoteReducer = (state: AppState, action: Action): AppState => {
    const touch = { lastLocalUpdate: Date.now() };

    switch (action.type) {
        case 'ADD_QUOTE': {
            const newQuote = { ...action.payload, updatedAt: new Date().toISOString() };
            db.upsertItem('quotes', newQuote);
            return { ...state, quotes: [...state.quotes, newQuote], ...touch };
        }

        case 'UPDATE_QUOTE': {
            const updatedQuote = { ...action.payload, updatedAt: new Date().toISOString() };
            db.upsertItem('quotes', updatedQuote);
            return {
                ...state,
                quotes: state.quotes.map(q => q.id === updatedQuote.id ? updatedQuote : q),
                ...touch
            };
        }

        case 'DELETE_QUOTE': {
            db.deleteFromStore('quotes', action.payload);
            return { ...state, quotes: state.quotes.filter(q => q.id !== action.payload), ...touch };
        }

        default:
            return state;
    }
};
