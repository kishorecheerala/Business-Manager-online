import { Action } from "../AppContext";
import { AppState } from "../../types";
import * as db from "../../utils/db";

export const financialReducer = (state: AppState, action: Action): AppState => {
    const touch = { lastLocalUpdate: Date.now() };

    switch (action.type) {
        case 'ADD_BUDGET': {
            const newBudget = { ...action.payload, updatedAt: new Date().toISOString() };
            db.upsertItem('budgets', newBudget);
            return { ...state, budgets: [newBudget, ...state.budgets], ...touch };
        }

        case 'UPDATE_BUDGET': {
            const updatedBudget = { ...action.payload, updatedAt: new Date().toISOString() };
            const updatedBudgets = state.budgets.map(b => b.id === updatedBudget.id ? updatedBudget : b);
            db.upsertItem('budgets', updatedBudget);
            return { ...state, budgets: updatedBudgets, ...touch };
        }

        case 'DELETE_BUDGET': {
            db.deleteFromStore('budgets', action.payload);
            return { ...state, budgets: state.budgets.filter(b => b.id !== action.payload), ...touch };
        }

        case 'ADD_GOAL': {
            const newGoal = { ...action.payload, updatedAt: new Date().toISOString() };
            db.upsertItem('goals', newGoal);
            return { ...state, goals: [newGoal, ...state.goals], ...touch };
        }

        case 'UPDATE_GOAL': {
            const updatedGoal = { ...action.payload, updatedAt: new Date().toISOString() };
            const updatedGoals = state.goals.map(g => g.id === updatedGoal.id ? updatedGoal : g);
            db.upsertItem('goals', updatedGoal);
            return { ...state, goals: updatedGoals, ...touch };
        }

        case 'DELETE_GOAL': {
            db.deleteFromStore('goals', action.payload);
            return { ...state, goals: state.goals.filter(g => g.id !== action.payload), ...touch };
        }

        case 'ADD_FINANCIAL_SCENARIO': {
            const newScenario = { ...action.payload, updatedAt: new Date().toISOString() };
            db.upsertItem('financial_scenarios', newScenario);
            return { ...state, financialScenarios: [newScenario, ...state.financialScenarios], ...touch };
        }

        case 'UPDATE_FINANCIAL_SCENARIO': {
            const updatedScenario = { ...action.payload, updatedAt: new Date().toISOString() };
            const updatedScenarios = state.financialScenarios.map(s => s.id === updatedScenario.id ? updatedScenario : s);
            db.upsertItem('financial_scenarios', updatedScenario);
            return { ...state, financialScenarios: updatedScenarios, ...touch };
        }

        case 'DELETE_FINANCIAL_SCENARIO': {
            db.deleteFromStore('financial_scenarios', action.payload);
            return { ...state, financialScenarios: state.financialScenarios.filter(s => s.id !== action.payload), ...touch };
        }

        default:
            return state;
    }
};
