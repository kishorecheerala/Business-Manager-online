import React, { createContext, useContext, useReducer, useEffect, ReactNode, useCallback } from 'react';
import { AppMetadataUIPreferences, AppMetadataDashboardConfig, Theme, ToastState, AppMetadataTheme, AppMetadataNavOrder, AppMetadataQuickActions } from '../types';
import * as db from '../utils/db';

// --- Types ---
interface UIState {
    theme: Theme;
    themeColor: string;
    themeGradient: string;
    headerColor: string;
    font: string;
    uiPreferences: AppMetadataUIPreferences;
    dashboardConfig: AppMetadataDashboardConfig;
    navOrder: string[];
    quickActions: string[];
    toast: ToastState;
}

type UIAction =
    | { type: 'SET_THEME'; payload: Theme }
    | { type: 'SET_THEME_COLOR'; payload: string }
    | { type: 'SET_THEME_GRADIENT'; payload: string }
    | { type: 'SET_HEADER_COLOR'; payload: string }
    | { type: 'SET_FONT'; payload: string }
    | { type: 'UPDATE_UI_PREFS'; payload: Partial<AppMetadataUIPreferences> }
    | { type: 'UPDATE_DASHBOARD_CONFIG'; payload: Partial<AppMetadataDashboardConfig> }
    | { type: 'UPDATE_NAV_ORDER'; payload: string[] }
    | { type: 'UPDATE_QUICK_ACTIONS'; payload: string[] }
    | { type: 'SHOW_TOAST'; payload: { message: string, type?: 'success' | 'info' | 'error' } }
    | { type: 'HIDE_TOAST' };

// --- Defaults ---
const DEFAULT_UI_PREFS: AppMetadataUIPreferences = {
    id: 'uiPreferences',
    buttonStyle: 'rounded',
    cardStyle: 'glass',
    toastPosition: 'bottom-center',
    density: 'comfortable',
    navStyle: 'floating',
    fontSize: 'normal',
    toastOpacity: 0.95
};

const DEFAULT_DASHBOARD_CONFIG: AppMetadataDashboardConfig = {
    id: 'dashboardConfig',
    greetingText: '🕉 Om Namo Venkatesaya 🕉',
    showGreeting: true,
    showLogo: true,
    titleText: 'Business Insights',
    logoSize: 1.0,
    customLogo: '',
    useCustomLogo: false,
    uppercaseGreeting: false,
    matchThemeColor: true,
    greetingColor: '',
    greetingFontSize: 'sm',
    logoSizeMobile: 1.0,
    logoSizeDesktop: 1.0,
    logoFillMobile: false,
    logoFillDesktop: false,
    logoPositionMobile: { x: 50, y: 50 },
    logoPositionDesktop: { x: 50, y: 50 },
    logoSettingsTab: 'mobile'
};

const DEFAULT_NAV_ORDER = [
    'DASHBOARD', 'CUSTOMERS', 'SALES', 'PURCHASES', 'PRODUCTS',
    'REPORTS', 'EXPENSES', 'RETURNS', 'QUOTATIONS',
    'INSIGHTS', 'INVOICE_DESIGNER', 'FINANCIAL_PLANNING'
];

const DEFAULT_QUICK_ACTIONS = [
    'add_sale', 'add_customer', 'add_expense', 'add_purchase', 'add_quote', 'add_return'
];

const getLocalStorageUI = (): Partial<UIState> => {
    if (typeof window === 'undefined') return {};
    let theme = (localStorage.getItem('theme') as Theme) || 'light';
    if (theme.includes(' ') || theme.length > 20) theme = 'light';

    return {
        theme,
        themeColor: localStorage.getItem('themeColor') || '#8b5cf6',
        themeGradient: localStorage.getItem('themeGradient') || 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)',
        headerColor: localStorage.getItem('headerColor') || '',
        font: localStorage.getItem('font') || 'Inter'
    };
};

const localDefaults = getLocalStorageUI();

const initialState: UIState = {
    theme: localDefaults.theme || 'light',
    themeColor: localDefaults.themeColor || '#8b5cf6',
    themeGradient: localDefaults.themeGradient || 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)',
    headerColor: localDefaults.headerColor || '',
    font: localDefaults.font || 'Inter',
    uiPreferences: DEFAULT_UI_PREFS,
    dashboardConfig: DEFAULT_DASHBOARD_CONFIG,
    navOrder: DEFAULT_NAV_ORDER,
    quickActions: DEFAULT_QUICK_ACTIONS,
    toast: { message: '', show: false, type: 'info' }
};

// --- Reducer ---
const uiReducer = (state: UIState, action: UIAction): UIState => {
    switch (action.type) {
        case 'SET_THEME':
            localStorage.setItem('theme', action.payload);
            db.upsertItem('app_metadata', {
                id: 'themeSettings',
                theme: action.payload,
                color: state.themeColor,
                gradient: state.themeGradient,
                font: state.font,
                headerColor: state.headerColor,
                updatedAt: new Date().toISOString()
            } as AppMetadataTheme);
            return { ...state, theme: action.payload };
        case 'SET_THEME_COLOR':
            localStorage.setItem('themeColor', action.payload);
            db.upsertItem('app_metadata', {
                id: 'themeSettings',
                theme: state.theme,
                color: action.payload,
                gradient: state.themeGradient,
                font: state.font,
                headerColor: state.headerColor,
                updatedAt: new Date().toISOString()
            } as AppMetadataTheme);
            return { ...state, themeColor: action.payload };
        case 'SET_THEME_GRADIENT':
            localStorage.setItem('themeGradient', action.payload);
            db.upsertItem('app_metadata', {
                id: 'themeSettings',
                theme: state.theme,
                color: state.themeColor,
                gradient: action.payload,
                font: state.font,
                headerColor: state.headerColor,
                updatedAt: new Date().toISOString()
            } as AppMetadataTheme);
            return { ...state, themeGradient: action.payload };
        case 'SET_HEADER_COLOR':
            localStorage.setItem('headerColor', action.payload);
            db.upsertItem('app_metadata', {
                id: 'themeSettings',
                theme: state.theme,
                color: state.themeColor,
                gradient: state.themeGradient,
                font: state.font,
                headerColor: action.payload,
                updatedAt: new Date().toISOString()
            } as AppMetadataTheme);
            return { ...state, headerColor: action.payload };
        case 'SET_FONT':
            localStorage.setItem('font', action.payload);
            db.upsertItem('app_metadata', {
                id: 'themeSettings',
                theme: state.theme,
                color: state.themeColor,
                gradient: state.themeGradient,
                font: action.payload,
                headerColor: state.headerColor,
                updatedAt: new Date().toISOString()
            } as AppMetadataTheme);
            return { ...state, font: action.payload };
        case 'UPDATE_UI_PREFS':
            const newPrefs = { ...state.uiPreferences, ...action.payload };
            db.upsertItem('app_metadata', { id: 'uiPreferences', ...newPrefs, updatedAt: new Date().toISOString() });
            return { ...state, uiPreferences: newPrefs };
        case 'UPDATE_DASHBOARD_CONFIG':
            const newDash = { ...state.dashboardConfig, ...action.payload };
            db.upsertItem('app_metadata', { id: 'dashboardConfig', ...newDash, updatedAt: new Date().toISOString() });
            return { ...state, dashboardConfig: newDash };
        case 'UPDATE_NAV_ORDER':
            db.upsertItem('app_metadata', { id: 'navOrder', order: action.payload, updatedAt: new Date().toISOString() } as AppMetadataNavOrder);
            return { ...state, navOrder: action.payload };
        case 'UPDATE_QUICK_ACTIONS':
            db.upsertItem('app_metadata', { id: 'quickActions', actions: action.payload, updatedAt: new Date().toISOString() } as AppMetadataQuickActions);
            return { ...state, quickActions: action.payload };
        case 'SHOW_TOAST':
            return { ...state, toast: { show: true, message: action.payload.message, type: action.payload.type || 'info' } };
        case 'HIDE_TOAST':
            return { ...state, toast: { ...state.toast, show: false } };
        default:
            return state;
    }
};

// --- Context ---
export const UIContext = createContext<{
    uiState: UIState;
    uiDispatch: React.Dispatch<UIAction>;
    showToast: (message: string, type?: 'success' | 'info' | 'error') => void;
} | undefined>(undefined);

export const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [uiState, uiDispatch] = useReducer(uiReducer, initialState);

    // Theme Application Effect
    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('blue', 'dark', 'purple', 'green', 'orange');

        if (uiState.theme === 'system') {
            if (window.matchMedia('(prefers-color-scheme: dark)').matches) root.classList.add('dark');
        } else {
            root.classList.add(uiState.theme);
        }
    }, [uiState.theme]);

    // Hydrate UI State from DB on mount
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const metadata = await db.getAll('app_metadata');
                if (metadata && metadata.length > 0) {
                    metadata.forEach(item => {
                        switch (item.id) {
                            case 'uiPreferences':
                                uiDispatch({ type: 'UPDATE_UI_PREFS', payload: item });
                                break;
                            case 'dashboardConfig':
                                uiDispatch({ type: 'UPDATE_DASHBOARD_CONFIG', payload: item });
                                break;
                            case 'navOrder':
                                if (item.order) uiDispatch({ type: 'UPDATE_NAV_ORDER', payload: item.order });
                                break;
                            case 'quickActions':
                                if (item.actions) uiDispatch({ type: 'UPDATE_QUICK_ACTIONS', payload: item.actions });
                                break;
                            case 'themeSettings':
                                if (item.theme) uiDispatch({ type: 'SET_THEME', payload: item.theme });
                                if (item.color) uiDispatch({ type: 'SET_THEME_COLOR', payload: item.color });
                                if (item.gradient) uiDispatch({ type: 'SET_THEME_GRADIENT', payload: item.gradient });
                                if (item.headerColor) uiDispatch({ type: 'SET_HEADER_COLOR', payload: item.headerColor });
                                if (item.font) uiDispatch({ type: 'SET_FONT', payload: item.font });
                                break;
                        }
                    });
                }
            } catch (e) {
                console.error("Failed to load UI settings from DB", e);
            }
        };
        loadSettings();
    }, []);

    const showToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'info') => {
        uiDispatch({ type: 'SHOW_TOAST', payload: { message, type } });
    }, []);

    return (
        <UIContext.Provider value={{ uiState, uiDispatch, showToast }}>
            {children}
        </UIContext.Provider>
    );
};

export const useUI = () => {
    const context = useContext(UIContext);
    if (!context) throw new Error('useUI must be used within a UIProvider');
    return context;
};
