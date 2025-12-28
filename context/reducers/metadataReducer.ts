import { Action } from "../AppContext";
import { AppState, Notification, ProfileData } from "../../types";
import * as db from "../../utils/db";

export const metadataReducer = (state: AppState, action: Action): AppState => {
    const touch = { lastLocalUpdate: Date.now() };

    switch (action.type) {
        case 'SET_PROFILE': {
            const updatedProfile = { ...action.payload, updatedAt: new Date().toISOString() };
            db.upsertItem('profile', updatedProfile);
            return { ...state, profile: updatedProfile, ...touch };
        }

        case 'UPDATE_PROFILE': {
            const updatedProfile = { ...state.profile, ...action.payload, updatedAt: new Date().toISOString() };
            db.upsertItem('profile', updatedProfile);
            return { ...state, profile: updatedProfile, ...touch };
        }

        case 'ADD_CUSTOM_FONT': {
            const newFonts = [...state.customFonts, action.payload];
            db.saveCollection('custom_fonts', newFonts);
            return { ...state, customFonts: newFonts, ...touch };
        }

        case 'REMOVE_CUSTOM_FONT': {
            const updatedFonts = state.customFonts.filter(f => f.id !== action.payload);
            db.saveCollection('custom_fonts', updatedFonts);
            return { ...state, customFonts: updatedFonts, ...touch };
        }

        case 'SET_DOCUMENT_TEMPLATE': {
            const { type, config } = action.payload;
            const key = `${type}Template` as keyof AppState;
            db.upsertItem('app_metadata', { id: `template_${type}`, ...config } as any);
            return { ...state, [key]: config, ...touch };
        }

        case 'CLEANUP_OLD_DATA': {
            return { ...state, ...touch };
        }

        case 'UPDATE_SECURITY_CONFIG': {
            const updated = { id: 'securityPin', security: action.payload, updatedAt: new Date().toISOString() };
            db.upsertItem('app_metadata', updated as any);
            return { ...state, pin: action.payload.pin, ...touch };
        }

        case 'UPDATE_PROTECTED_PAGES': {
            const updated = { id: 'securityPin', protectedPages: action.payload, updatedAt: new Date().toISOString() };
            db.upsertItem('app_metadata', updated as any);
            return { ...state, protectedPages: action.payload, ...touch };
        }

        case 'UPDATE_DASHBOARD_CONFIG': {
            const updated = { ...state.dashboardConfig, ...action.payload, updatedAt: new Date().toISOString() };
            db.upsertItem('app_metadata', updated);
            return { ...state, dashboardConfig: updated, ...touch };
        }

        case 'CLEAR_NOTIFICATIONS': {
            db.saveCollection('notifications', []);
            return { ...state, notifications: [], ...touch };
        }

        case 'CLEAR_AUDIT_LOGS': {
            db.saveCollection('audit_logs', []);
            return { ...state, audit_logs: [], ...touch };
        }

        default:
            return state;
    }
};
