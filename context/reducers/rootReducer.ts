import { AppState, Action } from '../../types';
import { customerReducer } from './customerReducer';
import { productReducer } from './productReducer';
import { salesReducer } from './salesReducer';
import { purchaseReducer } from './purchaseReducer';
import { returnReducer } from './returnReducer';
import { expenseReducer } from './expenseReducer';
import { quoteReducer } from './quoteReducer';
import { financeReducer } from './financeReducer';
import { commonReducer } from './commonReducer';

export const rootReducer = (state: AppState, action: Action): AppState => {
    // 1. Global overwrites
    if (action.type === 'SET_STATE') {
        return { ...state, ...action.payload };
    }

    if (action.type === 'RESTORE_SNAPSHOT') {
        // Payload is Partial<AppState>
        // We probably need to merge or replace?
        // Usually full replace of data keys.
        return { ...state, ...action.payload, lastLocalUpdate: Date.now() };
    }

    // 2. Delegate to Domain Reducers
    // We pass the full state to each reducer, and they return the full state.
    // This allows reducers to read/write across domains if necessary (like Sales updating Products).
    // We use a chain or switch. A switch is more efficient if actions are disjoint.

    switch (action.type) {
        case 'ADD_CUSTOMER':
        case 'UPDATE_CUSTOMER':
        case 'ADD_SUPPLIER':
        case 'UPDATE_SUPPLIER':
            return customerReducer(state, action);

        case 'ADD_PRODUCT':
        case 'UPDATE_PRODUCT_STOCK':
        case 'BATCH_UPDATE_PRODUCTS':
        case 'RENAME_PRODUCT_ID':
            return productReducer(state, action);

        case 'ADD_SALE':
        case 'UPDATE_SALE':
        case 'DELETE_SALE':
        case 'ADD_PAYMENT_TO_SALE':
        case 'UPDATE_PAYMENT_IN_SALE':
        case 'UPDATE_CURRENT_SALE':
        case 'PARK_CURRENT_SALE':
        case 'CLEAR_CURRENT_SALE':
        case 'RESUME_PARKED_SALE':
        case 'DELETE_PARKED_SALE':
        case 'ADD_PARKED_SALES':
            return salesReducer(state, action);

        case 'ADD_PURCHASE':
        case 'UPDATE_PURCHASE':
        case 'DELETE_PURCHASE':
        case 'ADD_PAYMENT_TO_PURCHASE':
        case 'UPDATE_PAYMENT_IN_PURCHASE':
            return purchaseReducer(state, action);

        case 'ADD_RETURN':
        case 'UPDATE_RETURN':
        case 'DELETE_RETURN':
            return returnReducer(state, action);

        case 'ADD_EXPENSE':
        case 'UPDATE_EXPENSE':
        case 'DELETE_EXPENSE':
            return expenseReducer(state, action);

        case 'ADD_QUOTE':
        case 'UPDATE_QUOTE':
        case 'DELETE_QUOTE':
            return quoteReducer(state, action);

        case 'ADD_BANK_ACCOUNT':
        case 'UPDATE_BANK_ACCOUNT':
        case 'DELETE_BANK_ACCOUNT':
        case 'ADD_BUDGET':
        case 'UPDATE_BUDGET':
        case 'DELETE_BUDGET':
        case 'ADD_FINANCIAL_SCENARIO':
        case 'UPDATE_FINANCIAL_SCENARIO':
        case 'DELETE_FINANCIAL_SCENARIO':
        case 'ADD_GOAL':
        case 'UPDATE_GOAL':
        case 'DELETE_GOAL':
            return financeReducer(state, action);

        default:
            return commonReducer(state, action);
    }
};
