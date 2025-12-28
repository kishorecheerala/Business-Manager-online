import { Action } from "../AppContext";
import { AppState, Notification, ToastState } from "../../types";
import * as db from "../../utils/db";

export const uiReducer = (state: AppState, action: Action): AppState => {
    const touch = { lastLocalUpdate: Date.now() };

    switch (action.type) {
        case 'SET_THEME':
            localStorage.setItem('theme', action.payload);
            return { ...state, theme: action.payload, ...touch };
        case 'SET_THEME_COLOR':
            localStorage.setItem('themeColor', action.payload);
            return { ...state, themeColor: action.payload, ...touch };
        case 'SET_HEADER_COLOR':
            localStorage.setItem('headerColor', action.payload);
            return { ...state, headerColor: action.payload, ...touch };
        case 'SET_THEME_GRADIENT':
            localStorage.setItem('themeGradient', action.payload);
            return { ...state, themeGradient: action.payload, ...touch };
        case 'SET_FONT':
            localStorage.setItem('appFont', action.payload);
            return { ...state, font: action.payload, ...touch };

        case 'SET_SELECTION':
            return { ...state, selection: action.payload };

        case 'CLEAR_SELECTION':
            return { ...state, selection: null };

        case 'SHOW_TOAST':
            return { ...state, toast: { message: action.payload.message, type: action.payload.type || 'info', show: true } };

        case 'HIDE_TOAST':
            return { ...state, toast: { ...state.toast, show: false } };

        case 'UPDATE_UI_PREFERENCES': {
            const updated = { ...state.uiPreferences, ...action.payload, updatedAt: new Date().toISOString() };
            db.upsertItem('app_metadata', updated);
            return { ...state, uiPreferences: updated, ...touch };
        }

        case 'UPDATE_NAV_ORDER': {
            const updated = { id: 'navOrder', order: action.payload, updatedAt: new Date().toISOString() };
            db.upsertItem('app_metadata', updated as any);
            return { ...state, navOrder: action.payload, ...touch };
        }

        case 'RESET_NAV_ORDER': {
            return { ...state, navOrder: [], ...touch };
        }

        case 'UPDATE_QUICK_ACTIONS': {
            const updated = { id: 'quickActions', actions: action.payload, updatedAt: new Date().toISOString() };
            db.upsertItem('app_metadata', updated as any);
            return { ...state, quickActions: action.payload, ...touch };
        }

        case 'SET_PIN':
            return { ...state, pin: action.payload, ...touch };

        case 'LOCK_APP':
            return { ...state, isLocked: true };

        case 'UNLOCK_APP':
            return { ...state, isLocked: false };

        case 'SET_AUTHENTICATED':
            return { ...state, isAuthenticated: action.payload };

        case 'TOGGLE_STAFF_MODE':
            return { ...state, isStaffMode: action.payload };

        case 'TOGGLE_PERFORMANCE_MODE':
            return { ...state, performanceMode: !state.performanceMode, ...touch };

        case 'SET_ONLINE_STATUS':
            return { ...state, isOnline: action.payload };

        case 'UPDATE_INVOICE_SETTINGS': {
            const updated = { ...state.invoiceSettings, ...action.payload, updatedAt: new Date().toISOString() } as any;
            db.upsertItem('app_metadata', updated);
            return { ...state, invoiceSettings: updated, ...touch };
        }

        case 'UPDATE_AUTO_CLEANUP_SETTINGS': {
            const updated = { ...state.autoCleanupSettings, ...action.payload, updatedAt: new Date().toISOString() };
            db.upsertItem('app_metadata', updated);
            return { ...state, autoCleanupSettings: updated, ...touch };
        }

        case 'SET_GOOGLE_USER': {
            const user = action.payload;
            if (user) {
                db.upsertItem('app_metadata', { ...user, id: 'googleUser' });
            } else {
                db.deleteFromStore('app_metadata', 'googleUser');
            }
            return { ...state, googleUser: user };
        }

        case 'SET_SYNC_STATUS':
            return { ...state, syncStatus: action.payload };

        case 'SET_LAST_SYNC_TIME': {
            db.upsertItem('app_metadata', { id: 'lastSyncTime', value: action.payload });
            return { ...state, lastSyncTime: action.payload };
        }

        case 'SET_LAST_BACKUP_DATE': {
            // Updated to use the correct lastLocalUpdate via touch
            db.upsertItem('app_metadata', { id: 'lastBackup', date: action.payload });
            return { ...state, ...touch };
        }

        case 'ADD_NOTIFICATION': {
            const newNotif: Notification = {
                ...action.payload,
                id: `NOTIF-${Date.now()}`,
                createdAt: new Date().toISOString(),
                read: false
            };
            db.upsertItem('notifications', newNotif);
            return { ...state, notifications: [newNotif, ...state.notifications], ...touch };
        }

        case 'MARK_NOTIFICATION_AS_READ': {
            const updatedNotifications = state.notifications.map(n => n.id === action.payload ? { ...n, read: true } : n);
            const target = updatedNotifications.find(n => n.id === action.payload);
            if (target) db.upsertItem('notifications', target);
            return { ...state, notifications: updatedNotifications };
        }

        default:
            return state;
    }
};
