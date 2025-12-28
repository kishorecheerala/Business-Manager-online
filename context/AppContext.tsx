import React, { createContext, useReducer, useContext, useEffect, ReactNode, useState, useCallback, useRef } from 'react';
import {
    Customer, Supplier, Product, Sale, Purchase, Return, Expense, Quote,
    AppMetadata, AppMetadataTheme, AppMetadataPin, AppMetadataUIPreferences,
    Notification, ProfileData, InvoiceTemplateConfig, Budget, FinancialScenario,
    AuditLogEntry, SaleDraft, ParkedSale, Page, ExpenseCategory, Theme,
    GoogleUser, SyncStatus, AppMetadataInvoiceSettings, CustomFont, PurchaseItem, AppMetadataNavOrder, AppMetadataQuickActions, TrashItem, AppState, ToastState, BankAccount, Payment, AppMetadataDashboardConfig, FinancialGoal, AppMetadataAutoCleanup
} from '../types';
import * as db from '../utils/db';
import { StoreName } from '../utils/db';
import { rootReducer } from './reducers/rootReducer';
import { Action } from '../types';
import { DriveService, initGoogleAuth, getUserInfo, loadGoogleScript, downloadFile } from '../utils/googleDrive';
import { fetchDeveloperMessages, markDeveloperMessageAsRead } from '../utils/adminNotifications';
import { getLocalDateString } from '../utils/dateUtils';

// Default Template to prevent crashes
const DEFAULT_TEMPLATE: InvoiceTemplateConfig = {
    id: 'defaultConfig',
    currencySymbol: '₹',
    dateFormat: 'DD/MM/YYYY',
    colors: { primary: '#0d9488', secondary: '#333333', text: '#000000', tableHeaderBg: '#0d9488', tableHeaderText: '#ffffff', bannerBg: '#0d9488', bannerText: '#ffffff', footerBg: '#f3f4f6', footerText: '#374151', borderColor: '#e5e7eb', alternateRowBg: '#f9fafb' },
    fonts: { headerSize: 22, bodySize: 10, titleFont: 'helvetica', bodyFont: 'helvetica' },
    layout: { margin: 10, logoSize: 25, logoPosition: 'center', logoOffsetX: 0, logoOffsetY: 0, headerAlignment: 'center', headerStyle: 'standard', footerStyle: 'standard', showWatermark: false, watermarkOpacity: 0.1, tableOptions: { hideQty: false, hideRate: false, stripedRows: false, bordered: false, compact: false } },
    content: { titleText: 'TAX INVOICE', showTerms: true, showQr: true, termsText: '', footerText: 'Thank you for your business', showBusinessDetails: true, showCustomerDetails: true, showSignature: true, showAmountInWords: false, showStatusStamp: false, showTaxBreakdown: false, showGst: true }
};

const DEFAULT_NAV_ORDER = [
    'DASHBOARD', 'CUSTOMERS', 'SALES', 'PURCHASES', 'PRODUCTS',
    'REPORTS', 'EXPENSES', 'RETURNS', 'QUOTATIONS',
    'INSIGHTS', 'INVOICE_DESIGNER', 'FINANCIAL_PLANNING'
];

const DEFAULT_QUICK_ACTIONS = [
    'add_sale', 'add_customer', 'add_expense', 'add_purchase', 'add_quote', 'add_return'
];

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

// Default empty sale draft
const DEFAULT_SALE_DRAFT: SaleDraft = {
    customerId: '',
    items: [],
    discount: '0',
    date: getLocalDateString(),
    paymentDetails: {
        amount: '',
        method: 'CASH',
        date: getLocalDateString(),
        reference: ''
    }
};

// --- Initial State Helper ---
const getLocalStorageState = () => {
    if (typeof window === 'undefined') return {};

    let theme = (localStorage.getItem('theme') as Theme) || 'light';
    // SANITIZATION: If theme contains spaces or is suspiciously long, reset it.
    // This fixes issues where 'dark bg-gradient-...' got saved as the theme name.
    if (theme.includes(' ') || theme.length > 20) {
        console.warn('Detected corrupted theme state. Resetting to light.');
        theme = 'light';
        localStorage.setItem('theme', 'light');
    }
    const themeColor = localStorage.getItem('themeColor') || '#8b5cf6';
    const font = localStorage.getItem('font') || 'Inter';

    let themeGradient = localStorage.getItem('themeGradient');
    // FIX: Do NOT default to a gradient if missing. Missing means "No Gradient" (Solid Color).
    if (themeGradient === null) {
        // Default to Nebula (Violet) as requested
        themeGradient = 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)';
    }

    if (themeGradient === 'none') {
        themeGradient = '';
    }
    // REMOVED MIGRATION TO DEEP BLUE - User reverted to Nebula
    /* else if (themeGradient === 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)') {
        // MIGRATION: Old Violet -> New Deep Blue
        themeGradient = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        localStorage.setItem('themeColor', '#667eea');
        localStorage.setItem('themeGradient', themeGradient);
    } */
    else if (themeGradient === 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' && themeColor === '#8b5cf6') {
        // FIX: Detect "Half-Migrated" state (Deep Blue BG but old Violet Accent)
        // Force update the color to match
        localStorage.setItem('themeColor', '#667eea');
        // We can't easily update the const `themeColor` here without reloading or reducer, 
        // but Since this runs in getLocalStorageState, we can return the fixed value if we refactor slightly,
        // OR rely on the useEffect dispatch. 
        // Best approach: Just update the localStorage here so next reload is clean, 
        // AND handle it in the Effect below which dispatches.
    }

    let googleUser = null;
    try {
        const storedUser = localStorage.getItem('googleUser');
        if (storedUser) googleUser = JSON.parse(storedUser);
    } catch (e) { }

    let lastSyncTime = null;
    try {
        const storedTime = localStorage.getItem('lastSyncTime');
        if (storedTime) lastSyncTime = parseInt(storedTime, 10);
    } catch (e) { }

    let parkedSales = [];
    try {
        const storedDrafts = localStorage.getItem('parked_sales');
        if (storedDrafts) parkedSales = JSON.parse(storedDrafts);
    } catch (e) { }

    return { theme, themeColor, themeGradient, font, googleUser, lastSyncTime, parkedSales };
};

const localDefaults = getLocalStorageState();

const initialAutoCleanup: AppMetadataAutoCleanup = {
    id: 'autoCleanupSettings',
    enabled: false,
    logsRetentionDays: 30,
    notificationsRetentionDays: 30,
    trashRetentionDays: 30
};

const initialState: AppState = {
    customers: [],
    suppliers: [],
    products: [],
    sales: [],
    purchases: [],
    returns: [],
    expenses: [],
    quotes: [],
    customFonts: [],
    app_metadata: [],
    notifications: [],
    audit_logs: [],
    profile: null,
    invoiceTemplate: DEFAULT_TEMPLATE,
    estimateTemplate: { ...DEFAULT_TEMPLATE, content: { ...DEFAULT_TEMPLATE.content, titleText: 'ESTIMATE' } },
    debitNoteTemplate: { ...DEFAULT_TEMPLATE, content: { ...DEFAULT_TEMPLATE.content, titleText: 'DEBIT NOTE' } },
    receiptTemplate: { ...DEFAULT_TEMPLATE, content: { ...DEFAULT_TEMPLATE.content, titleText: 'RECEIPT' } },
    reportTemplate: { ...DEFAULT_TEMPLATE, content: { ...DEFAULT_TEMPLATE.content, titleText: 'REPORT' } },
    uiPreferences: DEFAULT_UI_PREFS,
    dashboardConfig: DEFAULT_DASHBOARD_CONFIG,
    toast: { message: '', show: false, type: 'info' },
    selection: null,
    pin: null,

    theme: localDefaults.theme || 'light',
    themeColor: localDefaults.themeColor || '#667eea',
    headerColor: '',
    themeGradient: localDefaults.themeGradient ?? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    font: localDefaults.font || 'Inter',
    googleUser: localDefaults.googleUser || null,
    lastSyncTime: localDefaults.lastSyncTime || null,

    syncStatus: 'idle',
    lastLocalUpdate: 0,
    devMode: false,
    performanceMode: false,
    navOrder: DEFAULT_NAV_ORDER,
    quickActions: DEFAULT_QUICK_ACTIONS,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,

    currentSale: DEFAULT_SALE_DRAFT,
    parkedSales: localDefaults.parkedSales || [],
    trash: [],

    budgets: [],
    financialScenarios: [],
    autoCleanupSettings: initialAutoCleanup,
    isLocked: false,
    isAuthenticated: false, // Default false, requires auth if accessing protected pages
    protectedPages: [], // Will load from DB
    bankAccounts: [],
    goals: [],
    isStaffMode: false
};

// Logging helper
// --- LocalStorage Helpers ---
const safeSetItem = (key: string, value: string) => {
    try {
        localStorage.setItem(key, value);
    } catch (e) {
        console.warn(`Failed to set ${key} in localStorage`, e);
    }
};

const safeRemoveItem = (key: string) => {
    try {
        localStorage.removeItem(key);
    } catch (e) {
        console.warn(`Failed to remove ${key} from localStorage`, e);
    }
};

const appReducer = rootReducer;

export const AppContext = createContext<{
    state: AppState;
    dispatch: React.Dispatch<any>;
    isDbLoaded: boolean;
    showToast: (message: string, type?: 'success' | 'info' | 'error') => void;
    googleSignIn: (options?: { forceConsent?: boolean }) => void;
    googleSignOut: () => void;
    syncData: () => Promise<void>;
    unlockApp: () => void;
    lockApp: () => void;
    updateSecurity: (config: AppMetadataPin['security']) => void;
} | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(appReducer, initialState);
    const [isDbLoaded, setIsDbLoaded] = useState(false);
    const tokenClientRef = useRef<any>(null);
    const stateRef = useRef(state);

    // MIGRATION & SYNC EFFECT
    useEffect(() => {
        const themeGradient = localStorage.getItem('themeGradient');
        const themeColor = localStorage.getItem('themeColor');

        // REVERT FIX: If user is on "Deep Blue" (Night) which was briefly forced as default,
        // but now we are reverting to "Nebula" (Violet), we might want to offer a choice or just leave it.
        // However, if the user specifically asked for "Nebula", we can force it back if they are on the "wrong" default.
        // For now, removing the forced migration to Deep Blue.

        /* 
        // REMOVED: Migration to Deep Blue
        if (themeGradient === 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)' && themeColor === '#8b5cf6') {
             // ...
        }
        */
    }, []);

    useEffect(() => {
        stateRef.current = state;
    }, [state]);

    useEffect(() => {
        const root = window.document.documentElement;
        // Remove ALL possible theme classes first to prevent accumulation
        root.classList.remove('blue', 'dark', 'purple', 'green', 'orange', 'material', 'fluent', 'from-purple-900', 'to-indigo-900', 'bg-gradient-to-br');

        // Also clean up any potential lingering gradient classes if they were applied to root previously
        // Check if any class starts with 'bg-' or 'from-' or 'to-' and remove it? 
        // Safer to just remove all classes except standard ones, but that's risky.
        // Let's rely on standard removal for known themes.

        // Add current theme class
        if (state.theme) {
            // Handle special cases or default mapping
            if (state.theme === 'system') {
                if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                    root.classList.add('dark');
                }
                // 'system' itself isn't a CSS class typically, just logic
            } else {
                root.classList.add(state.theme);
            }
        }
    }, [state.theme]);

    const showToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'info') => {
        dispatch({ type: 'SHOW_TOAST', payload: { message, type } });
    }, []);

    const checkRecurringSales = useCallback((sales: Sale[]) => {
        const today = new Date().toISOString().split('T')[0];
        let hasChanges = false;
        const updatedSales = [...sales];
        const newDrafts: ParkedSale[] = [];

        sales.forEach((sale, index) => {
            if (sale.recurring && sale.recurring.active) {
                const nextOcc = sale.recurring.nextOccurrence.split('T')[0];
                if (nextOcc <= today) {
                    const draft: ParkedSale = {
                        id: `recurring_draft_${Date.now().toString()}_${sale.id} `,
                        customerId: sale.customerId,
                        items: sale.items,
                        discount: (sale.discount || 0).toString(),
                        date: new Date().toISOString(),
                        paymentDetails: {
                            amount: (sale.totalAmount || 0).toString(),
                            method: (sale.payments && sale.payments[0]) ? (sale.payments[0].method as any) : 'CASH',
                            date: new Date().toISOString(),
                            reference: ''
                        },
                        parkedAt: Date.now(),
                        recurring: { ...sale.recurring, active: false }
                    };
                    newDrafts.push(draft);

                    const nextDate = new Date(sale.recurring.nextOccurrence);
                    if (sale.recurring.frequency === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
                    else if (sale.recurring.frequency === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
                    else if (sale.recurring.frequency === 'quarterly') nextDate.setMonth(nextDate.getMonth() + 4);

                    updatedSales[index] = {
                        ...sale,
                        recurring: {
                            ...sale.recurring,
                            nextOccurrence: nextDate.toISOString()
                        }
                    };
                    hasChanges = true;
                }
            }
        });

        if (hasChanges) {
            db.saveCollection('sales', updatedSales);
            dispatch({ type: 'SET_STATE', payload: { sales: updatedSales } });
            dispatch({ type: 'ADD_PARKED_SALES', payload: newDrafts });
            showToast(`${newDrafts.length} Recurring Invoices generated as drafts!`, "info");
        }
    }, [dispatch, showToast]);

    useEffect(() => {
        const handleOnline = () => dispatch({ type: 'SET_ONLINE_STATUS', payload: true });
        const handleOffline = () => {
            dispatch({ type: 'SET_ONLINE_STATUS', payload: false });
            showToast("You are offline. Sync and AI features are unavailable.", "info");
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // 4. Preload Google Identity Services script
    useEffect(() => {
        // Always attempt to preload Google Script on mount
        loadGoogleScript()
            .then(() => {
                if (!tokenClientRef.current) {
                    tokenClientRef.current = initGoogleAuth(handleGoogleLoginResponse, (err) => {
                        console.error("Auth Init Error (Preload):", err);
                        // silent fail for preload
                    });
                    if (state.devMode) console.log("Google Auth initialized via preload.");
                }
            })
            .catch(err => {
                console.error("Preload Google Script failed", err);
            });
    }, []);


    const hydrateState = useCallback(async () => {
        try {
            // Load all collections
            // Load all collections with a TIMEOUT to prevent freeze
            // If DB hangs for > 3 seconds, we proceed with empty data to show UI
            const loadPromise = Promise.all([
                db.getAll('customers'),
                db.getAll('suppliers'),
                db.getAll('products'),
                db.getAll('sales'),
                db.getAll('purchases'),
                db.getAll('returns'),
                db.getAll('expenses'),
                db.getAll('quotes'),
                db.getAll('custom_fonts'),
                db.getAll('app_metadata'),
                db.getAll('notifications'),
                db.getAll('audit_logs'),
                db.getAll('profile'),
                db.getAll('budgets'),
                db.getAll('financial_scenarios'),
                db.getAll('trash'),
                db.getAll('bank_accounts'),
                db.getAll('goals'),
            ]);

            const timeoutPromise = new Promise((resolve) => {
                setTimeout(() => resolve('TIMEOUT'), 3000);
            });

            const results = await Promise.race([loadPromise, timeoutPromise]);

            if (results === 'TIMEOUT') {
                console.error("DB Load Timed Out - Forcing Empty State");
                showToast("Data load timed out. Please refresh or check connection.", 'error');
                setIsDbLoaded(true);
                return;
            }

            const [
                customers, suppliers, products, sales, purchases, returns, expenses, quotes,
                customFonts, app_metadata, notifications, audit_logs, profile,
                budget, scenarios, trashData, bankAccountsData, goalsData
            ] = results as any[];

            // Process Metadata
            // Parse Metadata
            const themeMeta = app_metadata.find(m => m.id === 'themeSettings') as AppMetadataTheme;
            const pinMeta = app_metadata.find(m => m.id === 'securityPin') as AppMetadataPin;
            const uiMeta = app_metadata.find(m => m.id === 'uiPreferences') as AppMetadataUIPreferences;
            const dashMeta = app_metadata.find(m => m.id === 'dashboardConfig') as AppMetadataDashboardConfig;
            const invoiceMeta = app_metadata.find(m => m.id === 'invoiceSettings') as AppMetadataInvoiceSettings;
            const navMeta = app_metadata.find(m => m.id === 'navOrder') as AppMetadataNavOrder;
            const qaMeta = app_metadata.find(m => m.id === 'quickActions') as AppMetadataQuickActions;
            const cleanupMeta = app_metadata.find(m => m.id === 'autoCleanupSettings') as AppMetadataAutoCleanup;
            const staffModeMeta = app_metadata.find(m => m.id === 'staffMode') as any;
            const googleUserMeta = app_metadata.find(m => m.id === 'googleUser');

            // Backup Metadata
            const lastBackupMeta = app_metadata.find(m => m.id === 'lastBackup');

            // Profile processing: Resolve conflicts by taking the most recently updated
            let finalProfile = null;
            if (profile && profile.length > 0) {
                finalProfile = (profile as any[]).sort((a, b) =>
                    new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
                )[0];
            }

            // Bank Accounts
            const finalBankAccounts = Array.isArray(bankAccountsData) ? (bankAccountsData as unknown as BankAccount[]) : [];

            // ------------------------------------------------------------------
            // REFACTOR: Construct the full new state object explicitly
            // so we can return it to the caller (syncData) immediately.
            // ------------------------------------------------------------------
            const newState: AppState = {
                ...initialState, // Start with defaults
                customers: customers as Customer[],
                suppliers: suppliers as Supplier[],
                products: products as Product[],
                sales: sales as Sale[],
                purchases: purchases as Purchase[],
                returns: returns as Return[],
                expenses: expenses as Expense[],
                quotes: quotes as Quote[],
                notifications: notifications as Notification[],
                audit_logs: audit_logs as AuditLogEntry[],

                profile: finalProfile,

                trash: trashData as TrashItem[],
                bankAccounts: finalBankAccounts,

                budgets: budget as Budget[],
                financialScenarios: scenarios as FinancialScenario[],
                goals: (goalsData as FinancialGoal[]) || [],

                // Metadata Hydration
                theme: themeMeta?.theme || localDefaults.theme || 'light',
                themeColor: themeMeta?.color || localDefaults.themeColor || '#8b5cf6',
                headerColor: themeMeta?.headerColor || '',
                themeGradient: themeMeta?.gradient ?? (localDefaults.themeGradient || ''),
                font: themeMeta?.font || localDefaults.font || 'Inter',

                uiPreferences: uiMeta ? { ...DEFAULT_UI_PREFS, ...uiMeta } : DEFAULT_UI_PREFS,
                dashboardConfig: dashMeta ? { ...DEFAULT_DASHBOARD_CONFIG, ...dashMeta } : DEFAULT_DASHBOARD_CONFIG,
                invoiceSettings: invoiceMeta,
                navOrder: navMeta?.order || DEFAULT_NAV_ORDER,
                quickActions: qaMeta?.actions || DEFAULT_QUICK_ACTIONS,

                lastSyncTime: localDefaults.lastSyncTime || 0,
                app_metadata: app_metadata as AppMetadata[],
                customFonts: customFonts as CustomFont[],

                // FIX: Load Google User from DB to prevent logout during sync/hydration
                googleUser: (googleUserMeta as any) || stateRef.current.googleUser || localDefaults.googleUser || null,

                // Security
                pin: pinMeta?.security?.enabled ? pinMeta.security.pin : null,
                isLocked: false, // Don't auto-lock on load - only lock via manual lock or idle timeout
                protectedPages: pinMeta?.protectedPages || [],
                autoCleanupSettings: cleanupMeta ? { ...initialAutoCleanup, ...cleanupMeta } : initialAutoCleanup,

                // Staff Mode
                isStaffMode: staffModeMeta?.value || false
            };

            dispatch({
                type: 'SET_STATE',
                payload: newState
            });

            return newState;
        } finally {
            setIsDbLoaded(true);
        }
    }, []); // Empty dependency array as db functions are stable

    // Initial Load
    useEffect(() => {
        hydrateState().then((data) => {
            // Check recurring sales after data is loaded
            // We need to wait for hydrateState to finish
            db.getAll('sales').then(sales => {
                checkRecurringSales(sales);
            });
        });
    }, [hydrateState]);

    // Poll for developer messages every 10 minutes
    useEffect(() => {
        if (!state.googleUser?.accessToken || !state.isOnline) return;

        const pollDeveloperMessages = async () => {
            try {
                const messages = await fetchDeveloperMessages(state.googleUser!.accessToken);

                if (messages.length > 0) {
                    // Add new messages to notifications
                    messages.forEach(msg => {
                        dispatch({ type: 'ADD_NOTIFICATION', payload: msg });

                        // Mark as read in our tracking
                        markDeveloperMessageAsRead(msg.id);

                        // Show toast for urgent messages
                        if (msg.priority === 'urgent' || msg.priority === 'high') {
                            showToast(msg.title, 'info');
                        }
                    });
                }
            } catch (error) {
                console.error('Failed to poll developer messages:', error);
            }
        };

        // Poll immediately on mount
        pollDeveloperMessages();

        // Then poll every 10 minutes
        const interval = setInterval(pollDeveloperMessages, 10 * 60 * 1000);

        return () => clearInterval(interval);
    }, [state.googleUser, state.isOnline, dispatch, showToast]);

    // --- SYNC DATA FUNCTION (Moved Up for Scope) ---
    const syncData = async (overrideToken?: string) => {
        // Prevent concurrent syncs
        if (stateRef.current.syncStatus === 'syncing') {
            if (state.devMode) console.warn("Sync already in progress. Skipping.");
            return;
        }

        // Use override token (from login) OR state token
        const currentUser = stateRef.current.googleUser;
        let token = overrideToken || currentUser?.accessToken;

        if (!token) {
            if (!overrideToken) showToast("Please sign in to sync.", 'error');
            return;
        }

        // 0. AUTO-REFRESH CHECK
        // If using stored token (not override), check if it is expiring soon (within 5 mins)
        if (!overrideToken && currentUser?.expiresAt) {
            const fiveMinutes = 5 * 60 * 1000;
            if (Date.now() > currentUser.expiresAt - fiveMinutes) {
                if (state.devMode) console.log("Token expiring or expired. Initiating Auto-Refresh...");

                // If we have the client, refresh it
                if (tokenClientRef.current) {
                    // This triggers the popup/flow, which eventually calls handleGoogleLoginResponse
                    // handleGoogleLoginResponse will then call syncData() again with the new token.
                    tokenClientRef.current.requestAccessToken({ prompt: '' });
                    return; // Abort this stale sync attempt
                } else {
                    // If client lost, try fully signing in
                    googleSignIn();
                    return;
                }
            }
        }

        dispatch({ type: 'SET_SYNC_STATUS', payload: 'syncing' });
        try {
            // 1. Read Cloud Data
            if (state.devMode) console.log("Sync: Reading cloud data...");
            const cloudData = await DriveService.read(token);

            // 2. Merge Strategies
            let freshState: AppState | undefined;
            if (cloudData) {
                if (state.devMode) console.log("Sync: Merging cloud data...");
                await db.mergeData(cloudData);

                // IMPORTANT: Re-hydrate immediately to reflect incoming changes in UI
                // We capture the fresh state directly to avoid race conditions with stateRef
                freshState = await hydrateState();
            }

            // 3. Export & Upload (FROM MEMORY, NOT DB)
            if (state.devMode) console.log("Sync: Exporting local data (Memory)...");

            // Use fresh state if available (from merge), otherwise fall back to current ref
            const currentState = freshState || stateRef.current;

            const exportPayload: any = {
                customers: currentState.customers,
                suppliers: currentState.suppliers,
                products: currentState.products,
                sales: currentState.sales,
                purchases: currentState.purchases,
                returns: currentState.returns,
                expenses: currentState.expenses,
                quotes: currentState.quotes,
                custom_fonts: currentState.customFonts,
                app_metadata: currentState.app_metadata,
                audit_logs: currentState.audit_logs,
                profile: currentState.profile ? [currentState.profile] : [], // Store as array
                budgets: currentState.budgets,
                financial_scenarios: currentState.financialScenarios,
                trash: currentState.trash,
                bank_accounts: currentState.bankAccounts
            };

            if (state.devMode) console.log("Sync: Uploading to cloud...");
            const fileId = await DriveService.write(token, exportPayload);

            if (state.devMode) console.log("Sync: Success!", fileId);
            dispatch({ type: 'SET_SYNC_STATUS', payload: 'success' });

            // Explicitly set Sync Time logic
            const now = Date.now();
            db.saveCollection('app_metadata', [...stateRef.current.app_metadata.filter(m => m.id !== 'lastSyncTime'), { id: 'lastSyncTime', value: now }]);
            dispatch({ type: 'SET_LAST_SYNC_TIME', payload: now });

            showToast("Sync completed successfully!", 'success');
        } catch (error: any) {
            console.error("Sync Failed:", error);
            dispatch({ type: 'SET_SYNC_STATUS', payload: 'error' });

            const isAuthError = error.message?.includes('401') || error.message?.includes('Unauthorized') || error.message?.includes('invalid_grant');

            if (isAuthError) {
                console.warn("Auth Error 401 detected. Attempting recovery...");

                // Instead of clearing user immediately, try ONE refresh if we haven't looped
                // But syncData is async, hard to track loop. 
                // Simplest fallback: Just ask user to sign in, but don't clear data immediately if possible?
                // Actually, clearing is safer to avoid bad state. 
                // But let's trigger the refresh popup instead of dying.

                if (tokenClientRef.current) {
                    showToast("Session expired. Refreshing...", 'info');
                    tokenClientRef.current.requestAccessToken({ prompt: '' });
                } else {
                    showToast("Session expired. Please sign in again.", 'error');
                    dispatch({ type: 'SET_GOOGLE_USER', payload: null });
                    try { localStorage.removeItem('google_user'); } catch (e) { }
                }
            } else {
                showToast(`Sync failed: ${error.message || 'Unknown error'} `, 'error');
            }
        }
    };

    // Auto-Sync Logic (Dynamic Sync)
    // Debounce to prevent syncing on every keystroke/minor update
    useEffect(() => {
        if (!state.lastLocalUpdate || !state.googleUser?.accessToken) return;

        const timeout = setTimeout(() => {
            if (state.devMode) console.log("Auto-Sync Triggered...");
            syncData(); // No need to await here, it's fire-and-forget
        }, 5000); // 5 second debounce

        return () => clearTimeout(timeout);
    }, [state.lastLocalUpdate, state.googleUser]);

    const handleGoogleLoginResponse = async (response: any) => {
        if (response.access_token) {
            const userInfo = await getUserInfo(response.access_token);
            const expiresAt = Date.now() + (response.expires_in * 1000);

            const user: GoogleUser = {
                name: userInfo.name,
                email: userInfo.email,
                picture: userInfo.picture,
                accessToken: response.access_token,
                expiresAt: expiresAt
            };

            // 1. Save User to DB & State
            await db.saveCollection('app_metadata', [...state.app_metadata.filter(m => m.id !== 'googleUser'), { id: 'googleUser', ...user }]);
            dispatch({ type: 'SET_GOOGLE_USER', payload: user });

            // 2. Check Logic: Is this a new user / restore scenario?
            const profileExists = stateRef.current.profile && stateRef.current.profile.name;

            if (!profileExists) {
                showToast("Checking for cloud backup...", 'info');
                try {
                    const cloudData = await DriveService.read(user.accessToken);
                    if (cloudData && cloudData.profile && cloudData.profile.length > 0) {
                        showToast("Backup found! Restoring data...", 'success');
                        await db.importData(cloudData);
                        setTimeout(() => hydrateState(), 1500);
                    } else {
                        // No backup, clean start.
                        showToast(`Welcome, ${user.name} !Setup your profile to start.`, 'success');
                    }
                } catch (e) {
                    console.error("Restore check failed", e);
                    showToast("Could not check for backup.", 'error');
                }
            } else {
                // Regular Login - Just Sync
                showToast(`Welcome back, ${user.name} !`, 'success');
                setTimeout(() => {
                    if (state.devMode) console.log("Triggering Post-Login Sync...");
                    syncData(response.access_token);
                }, 100);
            }
        } else {
            showToast("Google Sign-In failed.", 'error');
        }
    };

    const googleSignIn = (options?: { forceConsent?: boolean }) => {
        // Validation check for online status
        if (!state.isOnline) {
            showToast("Internet connection required to sign in.", 'error');
            return;
        }

        const performSignIn = () => {
            if (!tokenClientRef.current) {
                showToast("Sign-in client is initializing. Please try again in a moment.", 'info');
                // Try to initialize it now if it didn't happen on mount
                loadGoogleScript().then(() => {
                    tokenClientRef.current = initGoogleAuth(handleGoogleLoginResponse, (err) => {
                        console.error("Auth Init Error:", err);
                        showToast("Google Auth Error", 'error');
                    });
                });
                return;
            }

            if (state.googleUser?.accessToken && !options?.forceConsent) {
                syncData();
            } else {
                const prompt = options?.forceConsent ? 'consent' : '';
                tokenClientRef.current.requestAccessToken({ prompt });
            }
        };

        performSignIn();
    };

    const googleSignOut = () => {
        if ((window as any).google) {
            (window as any).google.accounts.oauth2.revoke(state.googleUser?.accessToken, () => {
                if (state.devMode) console.log('Consent revoked');
            });
        }
        dispatch({ type: 'SET_GOOGLE_USER', payload: null });
        showToast("Signed out.", 'info');
    };

    const restoreFromFileId = async (fileId: string) => {
        if (!stateRef.current.googleUser?.accessToken) return;
        try {
            const data = await downloadFile(stateRef.current.googleUser.accessToken, fileId);
            if (data) {
                await db.importData(data);
                await hydrateState();
                showToast("Data restored successfully.", 'success');
            }
        } catch (e) {
            console.error(e);
            showToast("Restore failed", 'error');
        }
    };

    const unlockApp = useCallback(() => {
        dispatch({ type: 'UNLOCK_APP' });
    }, []);

    const updateSecurity = useCallback((config: AppMetadataPin['security']) => {
        dispatch({ type: 'UPDATE_SECURITY_CONFIG', payload: config });
    }, []);

    const lockApp = useCallback(() => {
        dispatch({ type: 'LOCK_APP' });
    }, []);

    return (
        <AppContext.Provider value={{ state: { ...state, restoreFromFileId }, dispatch, isDbLoaded, showToast, googleSignIn, googleSignOut, syncData, unlockApp, lockApp, updateSecurity }}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};
