import React, { createContext, useReducer, useContext, useEffect, ReactNode, useState, useCallback, useRef, useMemo } from 'react';
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
    syncMessage: undefined,
    syncLogs: [],
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
    syncData: (overrideToken?: string, isManual?: boolean, reason?: string, silent?: boolean) => Promise<void>;
    restoreFromFileId?: (fileId: string) => Promise<void>;
    googleSignIn: (options?: any) => void;
    showToast: (message: string, type?: ToastState['type']) => void;
    googleUser: any;
} | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(appReducer, initialState);
    const [isDbLoaded, setIsDbLoaded] = useState(false);
    const stateRef = useRef(state);
    const isSyncingRef = useRef(false);

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
                        id: `recurring_draft_${Date.now().toString()}_${sale.id}`,
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
        let inactivityTimer: any;
        const resetTimer = () => {
            clearTimeout(inactivityTimer);
            inactivityTimer = setTimeout(() => {
                dispatch({ type: 'CLEAR_SYNC_LOGS' });
            }, 5 * 60 * 1000); // 5 minutes
        };

        window.addEventListener('mousemove', resetTimer);
        window.addEventListener('keydown', resetTimer);
        resetTimer();

        return () => {
            window.removeEventListener('mousemove', resetTimer);
            window.removeEventListener('keydown', resetTimer);
            clearTimeout(inactivityTimer);
        };
    }, [dispatch]);

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
                        userId: googleUser?.email || 'Anonymous',
                        persistent: entry.persistent
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
            const uiMeta = app_metadata.find(m => m.id === 'uiPreferences') as AppMetadataUIPreferences;
            const dashMeta = app_metadata.find(m => m.id === 'dashboardConfig') as AppMetadataDashboardConfig;
            const navMeta = app_metadata.find(m => m.id === 'navOrder') as AppMetadataNavOrder;
            const qaMeta = app_metadata.find(m => m.id === 'quickActions') as AppMetadataQuickActions;
            const cleanupMeta = app_metadata.find(m => m.id === 'autoCleanupSettings') as AppMetadataAutoCleanup;

            // --- SYNC UI STATE WITH DB/CLOUD ---
            if (uiMeta) uiDispatch({ type: 'UPDATE_UI_PREFS', payload: uiMeta });
            if (dashMeta) uiDispatch({ type: 'UPDATE_DASHBOARD_CONFIG', payload: dashMeta });
            if (navMeta && navMeta.order) uiDispatch({ type: 'UPDATE_NAV_ORDER', payload: navMeta.order });
            if (qaMeta && qaMeta.actions) uiDispatch({ type: 'UPDATE_QUICK_ACTIONS', payload: qaMeta.actions });

            if (themeMeta) {
                if (themeMeta.theme) uiDispatch({ type: 'SET_THEME', payload: themeMeta.theme });
                if (themeMeta.color) uiDispatch({ type: 'SET_THEME_COLOR', payload: themeMeta.color });
                if (themeMeta.gradient) uiDispatch({ type: 'SET_THEME_GRADIENT', payload: themeMeta.gradient });
                if (themeMeta.headerColor) uiDispatch({ type: 'SET_HEADER_COLOR', payload: themeMeta.headerColor });
                if (themeMeta.font) uiDispatch({ type: 'SET_FONT', payload: themeMeta.font });
            }

            let finalProfile = null;
            if (profile && profile.length > 0) {
                finalProfile = (profile as any[]).sort((a, b) =>
                    new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
                )[0];
            }

            const finalBankAccounts = Array.isArray(bankAccountsData) ? (bankAccountsData as unknown as BankAccount[]) : [];
            const lastSyncMeta = app_metadata.find(m => m.id === 'lastSyncTime');

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

                lastSyncTime: lastSyncMeta ? (lastSyncMeta.value as number) : 0,
                app_metadata: app_metadata as AppMetadata[],
                customFonts: customFonts as CustomFont[],
                autoCleanupSettings: cleanupMeta ? { ...initialAutoCleanup, ...cleanupMeta } : initialAutoCleanup,

                // PRESERVE RUNTIME STATE
                syncStatus: stateRef.current.syncStatus,
                syncMessage: stateRef.current.syncMessage,
                syncLogs: stateRef.current.syncLogs,
                isOnline: stateRef.current.isOnline,
                dbError: stateRef.current.dbError,
                isAuthenticated: stateRef.current.isAuthenticated,
                isLocked: stateRef.current.isLocked,
                isStaffMode: stateRef.current.isStaffMode,
                protectedPages: stateRef.current.protectedPages,
                googleUser: stateRef.current.googleUser // Although managed by AuthContext, some state might rely on it if copied
            };

            dispatch({
                type: 'SET_STATE',
                payload: { ...newState, lastLocalUpdate: stateRef.current.lastLocalUpdate }
            });

            return newState;
        } finally {
            setIsDbLoaded(true);
        }
    }, [uiDispatch, dispatch]);

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
        if (!googleUser?.accessToken) return;

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
    const syncData = useCallback(async (overrideToken?: string, isManual: boolean = false, reason: string = 'system', silent: boolean = false) => {
        if (isSyncingRef.current) {
            if (isManual) showToast("Sync already in progress...", 'info');
            if (stateRef.current.devMode) console.warn("Sync already in progress. Skipping.");
            return;
        }

        let token = overrideToken || googleUser?.accessToken;

        if (!token) {
            if (isManual) showToast("Cloud connection required. Please sign in.", 'info');
            return;
        }

        if (googleUser && googleUser.expiresAt && googleUser.expiresAt <= Date.now()) {
            console.warn('[SYNC] Token expired.');
            if (isManual) {
                authDispatch({ type: 'SET_GOOGLE_USER', payload: null });
                showToast("Session expired. Please sign in again.", 'info');
                return;
            } else {
                if (stateRef.current.devMode) console.log("Background sync skipped: Token expired.");
                return;
            }
        }

        const logEntry = (action: string, details: string, persistent: boolean = false) => {
            const timestamp = new Date().toISOString();
            const logString = `[${timestamp}] ${action}: ${details}`;

            if (persistent) {
                dispatch({
                    type: 'ADD_AUDIT_LOG',
                    payload: {
                        id: `sync-log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                        action,
                        details,
                        timestamp,
                        user: googleUser?.email || 'Anonymous'
                    }
                });
            }

            dispatch({ type: 'ADD_SYNC_LOG', payload: logString });
            if (stateRef.current.devMode) console.log(logString);
        };

        isSyncingRef.current = true;
        dispatch({ type: 'SET_SYNC_STATUS', payload: 'syncing' });

        const onProgress = (msg: string) => {
            dispatch({ type: 'SET_SYNC_MESSAGE', payload: msg });
            logEntry('SYNC_STEP', msg, false);
        };

        console.log(`[SYNC] Starting sync process (Reason: ${reason})...`);
        try {
            logEntry('SYNC_START', `Sync process initiated (Reason: ${reason})`, false);

            const lastSyncTimeVal = typeof stateRef.current.lastSyncTime === 'number' ? stateRef.current.lastSyncTime : undefined;

            const SYNC_TIMEOUT = 45000; // 45 seconds timeout
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Sync Request Timed Out')), SYNC_TIMEOUT));

            const cloudData = await Promise.race([
                DriveService.read(token, {
                    lastSyncedTime: lastSyncTimeVal,
                    onProgress
                }),
                timeoutPromise
            ]);

            let freshState: DataState | undefined;
            let cloudDataMerged = false;
            if (cloudData && Object.keys(cloudData).length > 0) {
                logEntry('SYNC_MERGE', `Merging data from cloud (${Object.keys(cloudData).length} stores)`, true);
                await db.mergeData(cloudData);
                cloudDataMerged = true;

                const result = await hydrateState();
                if (result) {
                    freshState = result as DataState;
                    dispatch({ type: 'SET_FULL_STATE', payload: result });
                }
            }

            const modifiedInfo = await getModifiedStores();
            const currentState = freshState || stateRef.current;

            if (modifiedInfo.length > 0) {
                logEntry('SYNC_UPLOAD', `Uploading ${modifiedInfo.length} changed stores`, false);
                const changedCollections: Record<string, any[]> = {};
                for (const info of modifiedInfo) {
                    const storeName = info.storeName;
                    let stateKey = storeName as string;
                    if (storeName === 'custom_fonts') stateKey = 'customFonts';
                    else if (storeName === 'bank_accounts') stateKey = 'bankAccounts';
                    else if (storeName === 'financial_scenarios') stateKey = 'financialScenarios';

                    let data = (currentState as any)[stateKey];
                    if (storeName === 'profile' && data) data = [data];
                    changedCollections[storeName] = data || [];
                }

                const manifestMetadata = {
                    lastSyncTime: Date.now(),
                    appVersion: (window as any).APP_VERSION || '1.0.0'
                };

                await Promise.race([
                    DriveService.writeIncremental(token, changedCollections, {
                        metadata: manifestMetadata,
                        onProgress
                    }),
                    timeoutPromise
                ]);

                const now = Date.now();
                for (const info of modifiedInfo) {
                    await markStoreSynced(info.storeName, now);
                }

                dispatch({ type: 'SET_LAST_SYNC_TIME', payload: now });
                showToast(`Sync completed: ${modifiedInfo.length} sections updated.`, 'success');
                logEntry('SYNC_SUCCESS', `Sync complete. ${modifiedInfo.length} stores uploaded.`, true);
            } else {
                logEntry('SYNC_COMPLETE', cloudDataMerged ? 'Cloud data merged successfully' : 'Everything up to date', false);
                const now = Date.now();
                dispatch({ type: 'SET_LAST_SYNC_TIME', payload: now });

                if (cloudDataMerged) {
                    showToast("Sync completed: Cloud updates applied.", 'success');
                } else if (isManual) {
                    showToast("Sync: Everything up to date.", 'info');
                }
            }

            dispatch({ type: 'SET_SYNC_STATUS', payload: 'success' });
            dispatch({ type: 'SET_SYNC_MESSAGE', payload: 'Sync Complete' });

            setTimeout(() => {
                dispatch({ type: 'SET_SYNC_STATUS', payload: 'idle' });
                dispatch({ type: 'SET_SYNC_MESSAGE', payload: undefined });
            }, 2000);
        } catch (error: any) {
            console.error("Sync Failed:", error);
            try {
                dispatch({ type: 'SET_SYNC_STATUS', payload: 'error' });
                setTimeout(() => {
                    dispatch({ type: 'SET_SYNC_STATUS', payload: 'idle' });
                }, 5000);
                if (!silent || isManual) {
                    showToast(`Sync failed: ${error.message || 'Unknown error'}`, 'error');
                }
            } catch (dispatchError) {
                console.error('Error in sync error handling:', dispatchError);
            }
        } finally {
            isSyncingRef.current = false;
        }
    }, [googleUser, authDispatch, dispatch, showToast, hydrateState]);

    useEffect(() => {
        if (googleUser?.accessToken) {
            syncData(undefined, false, 'auth_init', true);
        }
    }, [googleUser?.accessToken, syncData]);

    useEffect(() => {
        if (!googleUser?.accessToken || !state.lastLocalUpdate) return;
        const isMobile = DriveService.isMobile() && window.innerWidth < 500;
        const debounceTime = isMobile ? 20000 : 10000;
        const timeout = setTimeout(() => {
            syncData(undefined, false, 'local_update', true);
        }, debounceTime);
        return () => clearTimeout(timeout);
    }, [state.lastLocalUpdate, googleUser?.accessToken, syncData]);

    useEffect(() => {
        const isMobile = DriveService.isMobile() && window.innerWidth < 500;
        if (!googleUser?.accessToken) return;
        const pollInterval = setInterval(() => {
            syncData(undefined, false, 'periodic_poll', true);
        }, isMobile ? 10 * 60 * 1000 : 5 * 60 * 1000);
        return () => clearInterval(pollInterval);
    }, [googleUser?.accessToken, syncData]);

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

    const providerValue = useMemo(() => ({
        state,
        dispatch,
        isDbLoaded,
        syncData,
        restoreFromFileId,
        googleSignIn,
        showToast,
        googleUser
    }), [state, isDbLoaded, googleUser, googleSignIn, showToast, restoreFromFileId, syncData]);

    return (
        <DataContext.Provider value={providerValue}>
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
