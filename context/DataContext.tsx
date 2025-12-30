import React, { createContext, useReducer, useContext, useEffect, ReactNode, useState, useCallback, useRef } from 'react';
import {
    Customer, Supplier, Product, Sale, Purchase, Return, Expense, Quote,
    AppMetadata, AppMetadataTheme, AppMetadataPin, AppMetadataUIPreferences,
    Notification, ProfileData, InvoiceTemplateConfig, Budget, FinancialScenario,
    AuditLogEntry, SaleDraft, ParkedSale, Page, ExpenseCategory, Theme,
    GoogleUser, SyncStatus, AppMetadataInvoiceSettings, CustomFont, PurchaseItem, AppMetadataNavOrder, AppMetadataQuickActions, TrashItem, DataState, ToastState, BankAccount, Payment, AppMetadataDashboardConfig, FinancialGoal, AppMetadataAutoCleanup
} from '../types';
import * as db from '../utils/db';
import { rootReducer } from './reducers/rootReducer';
import { Action } from '../types';
import { getModifiedStores, markStoreSynced } from '../utils/db';
import { DriveService, loadGoogleScript, downloadFile } from '../utils/googleDrive';
import { fetchDeveloperMessages, markDeveloperMessageAsRead } from '../utils/adminNotifications';
import { getLocalDateString } from '../utils/dateUtils';
import { useUI } from './UIContext';
import { useAuth } from './AuthContext';

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

const initialAutoCleanup: AppMetadataAutoCleanup = {
    id: 'autoCleanupSettings',
    enabled: false,
    logsRetentionDays: 30,
    notificationsRetentionDays: 30,
    trashRetentionDays: 30
};

const initialState: DataState = {
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

    // UI/Auth Configs moved to respective contexts
    // Access them via useUI() and useAuth() hooks

    selection: null,

    syncStatus: 'idle',
    lastSyncTime: 0,
    lastLocalUpdate: 0,
    devMode: false,
    performanceMode: false,

    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,

    currentSale: DEFAULT_SALE_DRAFT,
    parkedSales: [],
    trash: [],

    budgets: [],
    financialScenarios: [],
    autoCleanupSettings: initialAutoCleanup,

    bankAccounts: [],
    goals: [],

    isLocked: false,
    isAuthenticated: false,
    protectedPages: [],
    isStaffMode: false,
    dbError: null,
};

const appReducer = rootReducer;

export const DataContext = createContext<{
    state: DataState;
    dispatch: React.Dispatch<any>;
    isDbLoaded: boolean;
    syncData: (overrideToken?: string, isManual?: boolean) => Promise<void>;
    restoreFromFileId?: (fileId: string) => Promise<void>;
    googleSignIn: (options?: any) => void;
    showToast: (message: string, type?: ToastState['type']) => void;
    googleUser: any;
} | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(appReducer, initialState);
    const [isDbLoaded, setIsDbLoaded] = useState(false);
    const stateRef = useRef(state);

    // Inject Dependencies
    const { showToast, uiDispatch } = useUI();
    const { authState, authDispatch, googleSignIn, refreshGoogleToken } = useAuth();
    const { googleUser } = authState;

    useEffect(() => {
        stateRef.current = state;
    }, [state]);



    const handleAutoCleanup = useCallback(async () => {
        const { enabled, logsRetentionDays, notificationsRetentionDays, trashRetentionDays } = state.autoCleanupSettings;
        if (!enabled) return;

        console.log("Auto-Cleanup: Running...");
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;

        // 1. Cleanup Logs
        const logs = await db.getAll('audit_logs');
        const logsThreshold = now - (logsRetentionDays * oneDay);
        const logsToDelete = logs.filter(l => new Date(l.timestamp).getTime() < logsThreshold);
        if (logsToDelete.length > 0) {
            for (const log of logsToDelete) await db.deleteFromStore('audit_logs', log.id);
            dispatch({ type: 'SET_STATE', payload: { audit_logs: state.audit_logs.filter(l => !logsToDelete.find(d => d.id === l.id)) } });
        }

        // 2. Cleanup Notifications
        const notifs = await db.getAll('notifications');
        const notifsThreshold = now - (notificationsRetentionDays * oneDay);
        const notifsToDelete = notifs.filter(n => new Date(n.createdAt).getTime() < notifsThreshold);
        if (notifsToDelete.length > 0) {
            for (const notif of notifsToDelete) await db.deleteFromStore('notifications', notif.id);
            dispatch({ type: 'SET_STATE', payload: { notifications: state.notifications.filter(n => !notifsToDelete.find(d => d.id === n.id)) } });
        }

        // 3. Cleanup Trash
        const trash = await db.getAll('trash');
        const trashThreshold = now - (trashRetentionDays * oneDay);
        const trashToDelete = trash.filter(t => new Date(t.deletedAt).getTime() < trashThreshold);
        if (trashToDelete.length > 0) {
            for (const item of trashToDelete) await db.deleteFromTrash(item.id);
            dispatch({ type: 'SET_STATE', payload: { trash: state.trash.filter(t => !trashToDelete.find(d => d.id === t.id)) } });
        }

        if (logsToDelete.length || notifsToDelete.length || trashToDelete.length) {
            showToast(`Auto-Cleanup: Removed ${logsToDelete.length} logs, ${notifsToDelete.length} notifications, and ${trashToDelete.length} trash items.`, 'info');
        }
    }, [state.autoCleanupSettings, state.audit_logs, state.notifications, state.trash, dispatch, showToast]);

    useEffect(() => {
        if (!isDbLoaded) return;
        // Run cleanup 10 seconds after load to avoid taxing the initial load
        const timer = setTimeout(handleAutoCleanup, 10000);
        return () => clearTimeout(timer);
    }, [isDbLoaded, handleAutoCleanup]);

    const checkRecurringSales = useCallback((sales: Sale[]) => {
        const today = new Date().toISOString().split('T')[0];
        let hasChanges = false;
        const updatedSales = [...sales];
        const newDrafts: ParkedSale[] = [];
        const changedSales: Sale[] = [];

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

                    const updatedSale = {
                        ...sale,
                        recurring: {
                            ...sale.recurring,
                            nextOccurrence: nextDate.toISOString()
                        }
                    };

                    updatedSales[index] = updatedSale;
                    changedSales.push(updatedSale);
                    hasChanges = true;
                }
            }
        });

        if (hasChanges) {
            db.upsertMany('sales', changedSales);
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
    }, [showToast]);

    // --- Structured Logging Listener ---
    useEffect(() => {
        const handleLogEvent = (e: any) => {
            const entry = e.detail;
            if (entry) {
                dispatch({
                    type: 'ADD_AUDIT_LOG',
                    payload: {
                        id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        action: entry.message,
                        details: JSON.stringify(entry.details || {}),
                        timestamp: entry.timestamp,
                        module: entry.context || 'SYSTEM',
                        userId: googleUser?.email || 'Anonymous'
                    }
                });
            }
        };

        window.addEventListener('APP_LOG_EVENT', handleLogEvent);
        return () => window.removeEventListener('APP_LOG_EVENT', handleLogEvent);
    }, [dispatch, googleUser]);

    const hydrateState = useCallback(async () => {
        try {
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
                setTimeout(() => resolve('TIMEOUT'), 10000); // Increased timeout to 10 seconds to handle larger datasets
            });

            const results = await Promise.race([loadPromise, timeoutPromise]);

            if (results === 'TIMEOUT') {
                console.error("DB Load Timed Out - Forcing Empty State");
                showToast("Data load timed out. Please refresh or check connection.", 'error');
                setIsDbLoaded(true);
                return;
            }

            // Safely extract results with error handling
            let [
                customers, suppliers, products, sales, purchases, returns, expenses, quotes,
                customFonts, app_metadata, notifications, audit_logs, profile,
                budget, scenarios, trashData, bankAccountsData, goalsData
            ] = results as any[];
            
            // Handle potential errors in individual results
            customers = Array.isArray(customers) ? customers : [];
            suppliers = Array.isArray(suppliers) ? suppliers : [];
            products = Array.isArray(products) ? products : [];
            sales = Array.isArray(sales) ? sales : [];
            purchases = Array.isArray(purchases) ? purchases : [];
            returns = Array.isArray(returns) ? returns : [];
            expenses = Array.isArray(expenses) ? expenses : [];
            quotes = Array.isArray(quotes) ? quotes : [];
            customFonts = Array.isArray(customFonts) ? customFonts : [];
            app_metadata = Array.isArray(app_metadata) ? app_metadata : [];
            notifications = Array.isArray(notifications) ? notifications : [];
            audit_logs = Array.isArray(audit_logs) ? audit_logs : [];
            profile = Array.isArray(profile) ? profile : [];
            budget = Array.isArray(budget) ? budget : [];
            scenarios = Array.isArray(scenarios) ? scenarios : [];
            trashData = Array.isArray(trashData) ? trashData : [];
            bankAccountsData = Array.isArray(bankAccountsData) ? bankAccountsData : [];
            goalsData = Array.isArray(goalsData) ? goalsData : [];

            // Process Metadata
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

            // Dispatch to UI Context
            if (themeMeta) {
                uiDispatch({ type: 'SET_THEME', payload: themeMeta.theme });
                uiDispatch({ type: 'SET_THEME_COLOR', payload: themeMeta.color });
                if (themeMeta.gradient) uiDispatch({ type: 'SET_THEME_GRADIENT', payload: themeMeta.gradient });
                if (themeMeta.font) uiDispatch({ type: 'SET_FONT', payload: themeMeta.font });
            }
            if (uiMeta) uiDispatch({ type: 'UPDATE_UI_PREFS', payload: uiMeta });
            if (dashMeta) uiDispatch({ type: 'UPDATE_DASHBOARD_CONFIG', payload: dashMeta });
            if (navMeta?.order) uiDispatch({ type: 'UPDATE_NAV_ORDER', payload: navMeta.order });
            if (qaMeta?.actions) uiDispatch({ type: 'UPDATE_QUICK_ACTIONS', payload: qaMeta.actions });

            // Dispatch to Auth Context
            if (pinMeta?.security?.enabled) authDispatch({ type: 'SET_PIN', payload: pinMeta.security.pin });
            if (staffModeMeta?.value) authDispatch({ type: 'SET_STAFF_MODE', payload: staffModeMeta.value });
            if (pinMeta?.protectedPages) authDispatch({ type: 'SET_PROTECTED_PAGES', payload: pinMeta.protectedPages });

            // Data State
            const dbUser = (googleUserMeta as any);
            if (dbUser) authDispatch({ type: 'SET_GOOGLE_USER', payload: dbUser });

            let finalProfile = null;
            if (profile && profile.length > 0) {
                finalProfile = (profile as any[]).sort((a, b) =>
                    new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
                )[0];
            }

            const finalBankAccounts = Array.isArray(bankAccountsData) ? (bankAccountsData as unknown as BankAccount[]) : [];

            const newState: DataState = {
                ...initialState,
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

                lastSyncTime: 0, // Fallback, likely unused in types now? No, kept in types/State but not initialState?
                app_metadata: app_metadata as AppMetadata[],
                customFonts: customFonts as CustomFont[],
                autoCleanupSettings: cleanupMeta ? { ...initialAutoCleanup, ...cleanupMeta } : initialAutoCleanup,
            };

            dispatch({
                type: 'SET_STATE',
                payload: newState
            });

            return newState;
        } finally {
            setIsDbLoaded(true);
        }
    }, [uiDispatch, authDispatch, showToast]);

    // Initial Load
    useEffect(() => {
        hydrateState().then((data) => {
            if (data) {
                db.getAll('sales').then(sales => {
                    checkRecurringSales(sales);
                });
            }
        });
    }, [hydrateState, checkRecurringSales]);

    // Poll for developer messages
    useEffect(() => {
        if (!googleUser?.accessToken || !state.isOnline) return;

        const pollDeveloperMessages = async () => {
            try {
                const messages = await fetchDeveloperMessages(googleUser.accessToken);
                if (messages.length > 0) {
                    messages.forEach(msg => {
                        dispatch({ type: 'ADD_NOTIFICATION', payload: msg });
                        markDeveloperMessageAsRead(msg.id);
                        if (msg.priority === 'urgent' || msg.priority === 'high') {
                            showToast(msg.title, 'info');
                        }
                    });
                }
            } catch (error) {
                console.error('Failed to poll developer messages:', error);
            }
        };

        pollDeveloperMessages();
        const interval = setInterval(pollDeveloperMessages, 10 * 60 * 1000);
        return () => clearInterval(interval);
    }, [googleUser, state.isOnline, dispatch, showToast]);

    // Sync Data
    const syncData = async (overrideToken?: string, isManual: boolean = false) => {
        if (!stateRef.current.isOnline) return;

        if (stateRef.current.syncStatus === 'syncing') {
            if (state.devMode) console.warn("Sync already in progress. Skipping.");
            return;
        }

        let token = overrideToken || googleUser?.accessToken;

        if (!token) {
            if (isManual) showToast("Cloud connection required. Please sign in.", 'info');
            return;
        }

        // NEW: Check if token is expired before attempting sync
        if (googleUser && googleUser.expiresAt && googleUser.expiresAt <= Date.now()) {
            console.warn('[SYNC] Token expired, attempting refresh...');
            if (isManual) {
                // If manual sync and token is expired, trigger auth refresh
                authDispatch({ type: 'SET_GOOGLE_USER', payload: null });
                showToast("Session expired. Please sign in again.", 'info');
                return;
            } else {
                // For automatic sync, try to refresh token
                try {
                    refreshGoogleToken();
                    return; // Exit and wait for token refresh to complete
                } catch (err) {
                    console.error('[SYNC] Failed to refresh token:', err);
                    return;
                }
            }
        }

        const logEntry = (action: string, details: string) => {
            dispatch({
                type: 'ADD_AUDIT_LOG',
                payload: {
                    id: `sync-log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                    action,
                    details,
                    timestamp: new Date().toISOString(),
                    user: googleUser?.email || 'Anonymous'
                }
            });
        };

        dispatch({ type: 'SET_SYNC_STATUS', payload: 'syncing' });
        console.log('[SYNC] Starting sync process...');
        try {
            logEntry('SYNC_START', 'Sync process initiated');

            // 1. Read Cloud Data (Manifest-based)
            console.log('[SYNC] Step 1: Reading cloud data...');
            if (state.devMode) console.log("Sync: Reading cloud data...");
            const cloudData = await DriveService.read(token);

            // 2. Merge Cloud -> Local
            let freshState: DataState | undefined;
            let cloudDataMerged = false;
            if (cloudData && Object.keys(cloudData).length > 0) {
                logEntry('SYNC_MERGE', `Merging data from cloud (${Object.keys(cloudData).length} stores)`);
                if (state.devMode) console.log("Sync: Merging cloud data...", Object.keys(cloudData));

                await db.mergeData(cloudData);
                cloudDataMerged = true;

                // Force full re-hydration to ensure UI reflects DB
                const result = await hydrateState();
                if (result) {
                    freshState = result as DataState;
                    // Explicitly dispatch to ensure UI update
                    dispatch({ type: 'SET_FULL_STATE', payload: result });
                }
            }

            // 3. Local -> Cloud (Incremental)
            console.log('[SYNC] Step 2: Checking for local changes...');
            if (state.devMode) console.log("Sync: Identifying modified collections...");
            const modifiedInfo = await getModifiedStores();
            console.log(`[SYNC] Found ${modifiedInfo.length} modified stores:`, modifiedInfo.map(m => m.storeName));
            const currentState = freshState || stateRef.current;

            if (modifiedInfo.length > 0) {
                console.log('[SYNC] Step 3: Uploading local changes...');
                logEntry('SYNC_UPLOAD', `Uploading ${modifiedInfo.length} changed stores`);
                const changedCollections: Record<string, any[]> = {};
                for (const info of modifiedInfo) {
                    const storeName = info.storeName;
                    let stateKey = storeName as string;
                    if (storeName === 'custom_fonts') stateKey = 'customFonts';
                    else if (storeName === 'bank_accounts') stateKey = 'bankAccounts';
                    else if (storeName === 'financial_scenarios') stateKey = 'financialScenarios';

                    let data = (currentState as any)[stateKey];
                    if (storeName === 'profile' && data) data = [data]; // Force array for sync consistency
                    changedCollections[storeName] = data || [];
                }

                const manifestMetadata = {
                    lastSyncTime: Date.now(),
                    appVersion: (window as any).APP_VERSION || '1.0.0'
                };

                await DriveService.writeIncremental(token, changedCollections, manifestMetadata);

                // 4. Mark Synced
                const now = Date.now();
                console.log('[SYNC] Step 4: Marking stores as synced...', now);
                for (const info of modifiedInfo) {
                    await markStoreSynced(info.storeName, now);
                }

                dispatch({ type: 'SET_LAST_SYNC_TIME', payload: now });
                console.log('[SYNC] ✓ Sync completed successfully! Last sync:', new Date(now).toLocaleTimeString());
                showToast(`Sync completed: ${modifiedInfo.length} sections updated.`, 'success');
                logEntry('SYNC_SUCCESS', `Sync complete. ${modifiedInfo.length} stores uploaded.`);
            } else {
                // No local changes, but update sync time if we pulled cloud data
                const now = Date.now();
                console.log('[SYNC] No local changes to upload. Updating sync time...', now);
                dispatch({ type: 'SET_LAST_SYNC_TIME', payload: now });
                console.log('[SYNC] ✓ Sync completed! Last sync:', new Date(now).toLocaleTimeString());
                
                logEntry('SYNC_COMPLETE', cloudDataMerged ? 'Cloud data merged successfully' : 'Everything up to date');
                if (state.devMode) console.log("Sync: No local changes to upload.");
                
                if (cloudDataMerged) {
                    showToast("Sync completed: Cloud updates applied.", 'success');
                } else {
                    showToast("Sync: Everything up to date.", 'info');
                }
            }

            dispatch({ type: 'SET_SYNC_STATUS', payload: 'success' });
            
            // Reset sync status after 2 seconds to avoid stuck 'success' state
            setTimeout(() => {
                dispatch({ type: 'SET_SYNC_STATUS', payload: 'idle' });
            }, 2000);
        } catch (error: any) {
            console.error("Sync Failed:", error);
            
            // NEW: More robust error handling to prevent crashes
            try {
                dispatch({ type: 'SET_SYNC_STATUS', payload: 'error' });
                
                // Reset error status after 5 seconds
                setTimeout(() => {
                    dispatch({ type: 'SET_SYNC_STATUS', payload: 'idle' });
                }, 5000);

                // Log error for debugging
                dispatch({
                    type: 'ADD_AUDIT_LOG',
                    payload: {
                        id: `sync-err-${Date.now()}`,
                        action: 'SYNC_FAILED',
                        details: error.message || 'Unknown error',
                        timestamp: new Date().toISOString(),
                        user: googleUser?.email || 'Anonymous'
                    }
                });

                const isAuthError = error.message?.includes('401') || error.message?.includes('Unauthorized') || error.message?.includes('invalid_grant') || error.message?.includes('access_denied') || error.message?.includes('Expired');

                if (isAuthError) {
                    console.warn("Auth Error detected.");
                    // Clear invalid token immediately to prevent loop
                    authDispatch({ type: 'SET_GOOGLE_USER', payload: null });

                    if (isManual) {
                        showToast("Session expired. Please sign in again.", 'info');
                    } else {
                        if (state.devMode) console.log("Background sync paused: Auth required.");
                    }
                } else {
                    showToast(`Sync failed: ${error.message || 'Unknown error'} `, 'error');
                }
            } catch (dispatchError) {
                // If error handling itself fails, at least log it and don't crash the app
                console.error('Error in sync error handling:', dispatchError);
            }
        }
    };

    // Trigger sync on login/token refresh
    useEffect(() => {
        if (googleUser?.accessToken && state.isOnline) {
            syncData();
        }
    }, [googleUser?.accessToken, state.isOnline]);

    // Auto-Sync on local changes
    useEffect(() => {
        if (!googleUser?.accessToken || !state.isOnline || !state.lastLocalUpdate) return;

        const isMobile = /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent);
        const debounceTime = isMobile ? 30000 : 10000;

        const timeout = setTimeout(() => {
            syncData();
        }, debounceTime);

        return () => clearTimeout(timeout);
    }, [state.lastLocalUpdate, googleUser?.accessToken, state.isOnline]);

    // Periodic Poll for Desktop (Pull cloud changes)
    useEffect(() => {
        const isMobile = /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent);
        if (isMobile || !googleUser?.accessToken || !state.isOnline) return;

        const pollInterval = setInterval(() => {
            if (state.devMode) console.log("Desktop Poll: Checking cloud for updates...");
            syncData();
        }, 5 * 60 * 1000); // 5 minutes

        return () => clearInterval(pollInterval);
    }, [googleUser?.accessToken, state.isOnline]);

    // Restore helper (injected into state for compatibility)
    const restoreFromFileId = async (fileId: string) => {
        if (!googleUser?.accessToken) return;
        try {
            const data = await downloadFile(googleUser.accessToken, fileId);
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

    return (
        <DataContext.Provider value={{ state, dispatch, isDbLoaded, syncData, restoreFromFileId, googleSignIn, showToast, googleUser }}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within an DataProvider');
    }
    return context;
};
