import { AppState, Action } from '../../types';
import * as db from '../../utils/db';

export const financeReducer = (state: AppState, action: Action): AppState => {
    const touch = { lastLocalUpdate: Date.now() };

    switch (action.type) {
        // Bank Accounts
        case 'ADD_BANK_ACCOUNT':
            const newBank = { ...action.payload, updatedAt: new Date().toISOString() };
            db.upsertItem('bank_accounts', newBank);
            return { ...state, bankAccounts: [...state.bankAccounts, newBank], ...touch };
        case 'UPDATE_BANK_ACCOUNT':
            const updatedBank = { ...action.payload, updatedAt: new Date().toISOString() };
            const updatedBanks = state.bankAccounts.map(b => b.id === updatedBank.id ? updatedBank : b);
            db.upsertItem('bank_accounts', updatedBank);
            return { ...state, bankAccounts: updatedBanks, ...touch };
        case 'DELETE_BANK_ACCOUNT':
            db.deleteFromStore('bank_accounts', action.payload);
            return { ...state, bankAccounts: state.bankAccounts.filter(b => b.id !== action.payload), ...touch };

        // Budgets
        case 'ADD_BUDGET':
            const newBudget = { ...action.payload, updatedAt: new Date().toISOString() };
            db.upsertItem('budgets', newBudget);
            return { ...state, budgets: [...state.budgets, newBudget], ...touch };
        case 'UPDATE_BUDGET':
            const updatedBudget = { ...action.payload, updatedAt: new Date().toISOString() };
            const updatedBudgets = state.budgets.map(b => b.id === updatedBudget.id ? updatedBudget : b);
            db.upsertItem('budgets', updatedBudget);
            return { ...state, budgets: updatedBudgets, ...touch };
        case 'DELETE_BUDGET':
            db.deleteFromStore('budgets', action.payload);
            return { ...state, budgets: state.budgets.filter(b => b.id !== action.payload), ...touch };

        // Financial Scenarios
        case 'ADD_FINANCIAL_SCENARIO':
            const newScenario = { ...action.payload, updatedAt: new Date().toISOString() };
            db.upsertItem('financial_scenarios', newScenario);
            return { ...state, financialScenarios: [...state.financialScenarios, newScenario], ...touch };
        case 'UPDATE_FINANCIAL_SCENARIO':
            const updatedScenario = { ...action.payload, updatedAt: new Date().toISOString() };
            const updatedScenarios = state.financialScenarios.map(s => s.id === updatedScenario.id ? updatedScenario : s);
            db.upsertItem('financial_scenarios', updatedScenario);
            return { ...state, financialScenarios: updatedScenarios, ...touch };
        case 'DELETE_FINANCIAL_SCENARIO':
            db.deleteFromStore('financial_scenarios', action.payload);
            return { ...state, financialScenarios: state.financialScenarios.filter(s => s.id !== action.payload), ...touch };

        // Goals
        case 'ADD_GOAL':
            const newGoal = { ...action.payload, updatedAt: new Date().toISOString() };
            db.upsertItem('goals', newGoal);
            return { ...state, goals: [...state.goals, newGoal], ...touch };
        case 'UPDATE_GOAL':
            const updatedGoal = { ...action.payload, updatedAt: new Date().toISOString() };
            const updatedGoals = state.goals.map(g => g.id === updatedGoal.id ? updatedGoal : g);
            db.upsertItem('goals', updatedGoal);
            return { ...state, goals: updatedGoals, ...touch };
        case 'DELETE_GOAL':
            db.deleteFromStore('goals', action.payload);
            return { ...state, goals: state.goals.filter(g => g.id !== action.payload), ...touch };

        default:
            return state;
    }
};
