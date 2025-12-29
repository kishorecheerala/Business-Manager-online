import React, { useState, useRef, useEffect, useMemo, useLayoutEffect, Suspense } from 'react';
import { useNavigate, useLocation, Routes, Route, Navigate } from 'react-router-dom';
import {
    Home, Users, ShoppingCart, Package, Menu, Plus, UserPlus, PackagePlus,
    Receipt, Undo2, FileText, BarChart2, Settings, PenTool, Gauge, Search,
    Sparkles, Bell, HelpCircle, Cloud, CloudOff, RefreshCw, Layout, Edit,
    X, Download, Sun, Moon, CalendarClock, WifiOff, Database, PauseCircle, Trash2
} from 'lucide-react';
import { useData } from './context/DataContext';
import { useUI } from './context/UIContext';
import { useAuth } from './context/AuthContext';
import { useDialog } from './context/DialogContext';
import { Page } from './types';
import { ICON_MAP } from './utils/iconMap';

// Components (Eager Load)
import Card from './components/Card';
import Button from './components/Button';
import OnboardingScreen from './components/OnboardingScreen';
import DevineLoader from './components/DevineLoader';
import Toast from './components/Toast';
import AppLayout from './components/AppLayout';
import ErrorBoundary from './components/ErrorBoundary';
import CriticalErrorScreen from './components/CriticalErrorScreen';

// Hooks
import { useHotkeys } from './hooks/useHotkeys';
import { logPageView } from './utils/analyticsLogger';
import { APP_VERSION } from './utils/changelogData';
import { performanceReporter } from './utils/performanceReporter';
import StorageMonitor from './utils/storageMonitor';

// Pages (Lazy Load)
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const CustomersPage = React.lazy(() => import('./pages/CustomersPage'));
const SalesPage = React.lazy(() => import('./pages/SalesPage'));
const PurchasesPage = React.lazy(() => import('./pages/PurchasesPage'));
const ProductsPage = React.lazy(() => import('./pages/ProductsPage'));
const ReportsPage = React.lazy(() => import('./pages/ReportsPageV2'));
const ReturnsPage = React.lazy(() => import('./pages/ReturnsPage'));
const InsightsPage = React.lazy(() => import('./pages/InsightsPage'));
const ExpensesPage = React.lazy(() => import('./pages/ExpensesPage'));
const QuotationsPage = React.lazy(() => import('./pages/QuotationsPage'));
const InvoiceDesigner = React.lazy(() => import('./pages/InvoiceDesigner'));
const SystemOptimizerPage = React.lazy(() => import('./pages/SystemOptimizerPage'));
const SQLAssistantPage = React.lazy(() => import('./pages/SQLAssistantPage'));
const TrashPage = React.lazy(() => import('./pages/TrashPage'));
const FinancialPlanningPage = React.lazy(() => import('./pages/FinancialPlanningPage'));
const AnalyticsPage = React.lazy(() => import('./pages/AnalyticsPage'));


import PinLock from './components/PinLock';
import PinModal from './components/PinModal';

import CommandPalette from './components/CommandPalette';
const PerformanceMonitor = React.lazy(() => import('./components/PerformanceMonitor'));


import { QUICK_ACTION_REGISTRY, QUICK_ACTION_SHORTCUTS } from './utils/quickActions';

// Root Component
const App: React.FC = () => {
    // Initialize Storage Monitor
    useEffect(() => {
        const monitor = StorageMonitor.getInstance();
        const unsubscribe = monitor.subscribe((event) => {
            if (event.type === 'sqlite-error' || event.type === 'indexeddb-error') {
                console.warn("Monitor detected DB error:", event.details);
            }
        });
        return () => unsubscribe();
    }, []);

    const { state, dispatch, isDbLoaded } = useData();
    const { uiState, showToast } = useUI();
    const { theme, themeColor, themeGradient, font, uiPreferences } = uiState;
    const { authState, authDispatch, unlockApp } = useAuth();
    const { isLocked, pin } = authState;
    const { showConfirm } = useDialog();



    // --- Routing State ---
    const navigate = useNavigate();
    const location = useLocation();

    // Route Mapping
    const ROUTE_MAP: Record<string, string> = {
        'DASHBOARD': '/',
        'CUSTOMERS': '/customers',
        'SALES': '/sales',
        'PURCHASES': '/purchases',
        'PRODUCTS': '/products',
        'REPORTS': '/reports',
        'RETURNS': '/returns',
        'INSIGHTS': '/insights',
        'EXPENSES': '/expenses',
        'QUOTATIONS': '/quotations',
        'INVOICE_DESIGNER': '/invoice-designer',
        'SYSTEM_OPTIMIZER': '/system-optimizer',
        'SQL_ASSISTANT': '/sql-assistant',
        'TRASH': '/trash',
        'FINANCIAL_PLANNING': '/financial-planning',
        'ANALYTICS': '/analytics'
    };

    const REVERSE_ROUTE_MAP = useMemo(() => {
        const map: Record<string, Page> = {};
        Object.entries(ROUTE_MAP).forEach(([k, v]) => map[v] = k as Page);
        return map;
    }, []);

    const currentPage = useMemo<Page>(() => {
        return REVERSE_ROUTE_MAP[location.pathname] || 'DASHBOARD';
    }, [location.pathname]);

    // --- UI State ---
    const [isDirty, setIsDirty] = useState(false);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [parkModalState, setParkModalState] = useState<{ isOpen: boolean, targetPage: Page | null }>({ isOpen: false, targetPage: null });

    // --- Effects ---


    // Performance Initialization
    useEffect(() => {
        performanceReporter.init();
    }, []);

    // Action Params Effect
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const action = params.get('action');

        if (action === 'new_customer') {
            dispatch({ type: 'SET_SELECTION', payload: { page: 'CUSTOMERS', id: 'new' } });
            try {
                const newUrl = window.location.pathname;
                window.history.replaceState({}, '', newUrl);
            } catch (e) {
                if (state.devMode) console.warn('Could not clean URL history', e);
            }
        }
    }, [dispatch, state.devMode]);

    // --- Command Palette State ---
    const [isCmdOpen, setIsCmdOpen] = useState(false);

    // Toggle Command Palette
    useHotkeys('k', () => {
        setIsCmdOpen(prev => !prev);
    }, { ctrl: true, preventDefault: true });

    // Also support Cmd+K on Mac (which often maps to Meta, but useHotkeys might treat 'ctrl' as meta on mac if typed correctly, or we add another hook)
    // The current hook implementation checks: "if (ctrl && !event.ctrlKey && !event.metaKey) return;"
    // So { ctrl: true } actually supports BOTH Ctrl OR Cmd (Meta) key! Perfect.


    // Selection Effect
    useEffect(() => {
        if (state.selection && state.selection.page) {
            navigate(ROUTE_MAP[state.selection.page] || '/');
        }
    }, [state.selection]);

    // Onboarding Effect
    useEffect(() => {
        if (isDbLoaded && (!state.profile || !state.profile.name)) {
            const timer = setTimeout(() => setShowOnboarding(true), 500);
            return () => clearTimeout(timer);
        }
    }, [isDbLoaded, state.profile]);

    // Persistence Effect
    useLayoutEffect(() => {
        localStorage.setItem('business_manager_last_page', currentPage);
        window.scrollTo(0, 0);
    }, [currentPage]);

    // Check for share_target action and redirect to magic paste.
    useEffect(() => {
        const handleShareTarget = () => {
            const params = new URLSearchParams(window.location.search);
            const action = params.get('action');
            if (action === 'share_target') {
                const text = params.get('text') || params.get('title') || params.get('url');
                if (text) {
                    dispatch({ type: 'SET_SELECTION', payload: { page: 'SALES', id: null } });
                    // Use a small timeout to allow state update
                    setTimeout(() => {
                        window.dispatchEvent(new CustomEvent('OPEN_MAGIC_PASTE', { detail: { text } }));
                    }, 500);
                    // Clean URL
                    window.history.replaceState({}, '', '/');
                }
            }
        };

        handleShareTarget();
    }, [dispatch]);

    // Remove loader ONLY when DB is loaded
    useEffect(() => {
        if (isDbLoaded) {
            const loader = document.getElementById('initial-loader');
            if (loader) {
                loader.style.opacity = '0';
                loader.style.transition = 'opacity 0.5s ease';
                setTimeout(() => {
                    loader.remove();
                }, 500);
            }
        }
    }, [isDbLoaded]);

    // Back Button Handling
    useEffect(() => {
        const safePushState = (data: any, title: string, url?: string | null) => {
            try {
                window.history.pushState(data, title, url);
            } catch (e) {
                if (state.devMode) console.debug('History pushState restricted');
            }
        };

        safePushState(null, '', null);

        let backPressCount = 0;
        let backPressTimer: any;

        const handlePopState = (event: PopStateEvent) => {
            backPressCount++;

            if (backPressCount === 1) {
                showToast("Press back again to exit", "info");
                safePushState(null, '', null);

                backPressTimer = setTimeout(() => {
                    backPressCount = 0;
                }, 2000);
            } else {
                clearTimeout(backPressTimer);
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => {
            window.removeEventListener('popstate', handlePopState);
            clearTimeout(backPressTimer);
        };
    }, []);

    // Theme Effect
    useEffect(() => {
        const root = document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }

        const hex = themeColor.replace(/^#/, '');
        if (/^[0-9A-F]{6}$/i.test(hex)) {
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            root.style.setProperty('--primary-color', `${r} ${g} ${b}`);
        } else {
            root.style.setProperty('--primary-color', '13 148 136');
        }

        if (themeGradient) {
            root.style.setProperty('--header-bg', themeGradient);
            root.style.setProperty('--theme-gradient', themeGradient);
        } else {
            root.style.setProperty('--header-bg', themeColor);
            root.style.setProperty('--theme-gradient', `linear-gradient(135deg, ${themeColor} 0%, ${themeColor} 100%)`);
        }

        if (font) {
            root.style.setProperty('--app-font', font);
        }

        // Apply UI Preferences classes
        const body = document.body;
        body.classList.remove('font-size-small', 'font-size-normal', 'font-size-large', 'compact');
        if (uiPreferences?.fontSize) {
            body.classList.add(`font-size-${uiPreferences.fontSize}`);
        }
        if (uiPreferences?.density === 'compact') {
            body.classList.add('compact');
        }

        const updateIcons = () => {
            const bg = themeColor;
            const svgString = `
                <svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
                <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="400" font-family="serif" fill="${bg}" font-weight="bold" dy="20">ॐ</text>
                </svg>
            `.trim();

            const dataUrl = `data:image/svg+xml,${encodeURIComponent(svgString)}`;
            const links = document.querySelectorAll("link[rel*='icon']");
            links.forEach(link => (link as HTMLLinkElement).href = dataUrl);
            const metaTheme = document.querySelector("meta[name='theme-color']");
            if (metaTheme) metaTheme.setAttribute("content", bg);
        };
        updateIcons();

    }, [theme, themeColor, themeGradient, font, uiPreferences]);

    // Analytics Effect
    useEffect(() => {
        logPageView(currentPage);
    }, [currentPage]);

    // Navigation Handler
    const handleNavigation = (page: Page) => {
        if (currentPage === 'SALES') {
            const { customerId, items } = state.currentSale;
            const hasActiveSale = !!customerId || items.length > 0;

            if (hasActiveSale) {
                setParkModalState({ isOpen: true, targetPage: page });
                return;
            }
        }

        if (isDirty && currentPage !== 'SALES') {
            (async () => {
                if (await showConfirm('You have unsaved changes. Are you sure you want to leave?', { variant: 'danger' })) {
                    setIsDirty(false);
                    navigate(ROUTE_MAP[page] || '/');
                }
            })();
        } else {
            navigate(ROUTE_MAP[page] || '/');
        }
    };



    // Shortcuts
    Object.keys(QUICK_ACTION_REGISTRY).forEach(actionId => {
        const shortcut = QUICK_ACTION_SHORTCUTS[actionId];
        const action = QUICK_ACTION_REGISTRY[actionId];
        if (shortcut && action) {
            useHotkeys(shortcut, () => {
                showToast(`Quick Add: New ${action.label}`, 'info');
                if (action.action) {
                    dispatch({ type: 'SET_SELECTION', payload: { page: action.page, id: action.action as any } });
                }
                handleNavigation(action.page);
            }, { alt: true, preventDefault: true });
        }
    });

    // Global Shortcuts (Cmd+N for Invoice, Cmd+B for Bill/Purchase)
    useHotkeys('n', () => {
        showToast("New Invoice", 'info');
        dispatch({ type: 'SET_SELECTION', payload: { page: 'SALES', id: 'new' } });
        handleNavigation('SALES');
    }, { ctrl: true });

    useHotkeys('b', () => {
        showToast("New Purchase Bill", 'info');
        dispatch({ type: 'SET_SELECTION', payload: { page: 'PURCHASES', id: 'new' } });
        handleNavigation('PURCHASES');
    }, { ctrl: true });

    const handleParkAction = (action: 'park' | 'discard' | 'cancel') => {
        if (action === 'cancel') {
            setParkModalState({ isOpen: false, targetPage: null });
            return;
        }

        if (action === 'park') {
            dispatch({ type: 'PARK_CURRENT_SALE' });
            showToast("Sale parked successfully.", 'success');
        } else if (action === 'discard') {
            dispatch({ type: 'CLEAR_CURRENT_SALE' });
        }

        if (parkModalState.targetPage) {
            navigate(ROUTE_MAP[parkModalState.targetPage] || '/');
        }
        setParkModalState({ isOpen: false, targetPage: null });
        setIsDirty(false);
    };

    if (state.dbError) return <CriticalErrorScreen error={state.dbError} />;
    if (!isDbLoaded) return <DevineLoader />;

    // App Lock Screen
    // Safety: If locked but no PIN is set (corruption?), auto-unlock.
    // App Lock Screen
    // Only show PinModal if explicitly locked AND a valid PIN exists.
    if (isLocked && pin) {
        return (
            <PinModal
                mode="enter"
                correctPin={pin}
                onCorrectPin={unlockApp}
                onResetRequest={async () => {
                    if (await showConfirm("Are you sure you want to reset your passcode? This will remove the app lock.", { confirmText: "Reset & Remove Lock", variant: 'danger' })) {
                        authDispatch({ type: 'SET_PIN', payload: null });
                        unlockApp();
                        showToast("Passcode removed.");
                    }
                }}
            />
        );
    }

    return (
        <AppLayout
            currentPage={currentPage}
            onNavigate={handleNavigation}
        >
            <OnboardingScreen isOpen={showOnboarding} onClose={() => setShowOnboarding(false)} />
            <Suspense fallback={null}>
                <PerformanceMonitor />
            </Suspense>
            <Toast />
            <CommandPalette
                isOpen={isCmdOpen}
                onClose={() => setIsCmdOpen(false)}
                onNavigate={handleNavigation}
            />

            {/* Park Sale Modal */}
            {parkModalState.isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[2000] p-4 animate-fade-in-fast backdrop-blur-sm">
                    <Card className="w-full max-w-sm animate-scale-in border-l-4 border-amber-500">
                        <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-2">Sale in Progress</h2>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
                            You have an unsaved sale. Would you like to park it for later or discard the changes?
                        </p>
                        <div className="flex flex-col gap-2">
                            <Button onClick={() => handleParkAction('park')} className="w-full bg-amber-500 hover:bg-amber-600 text-white">
                                <PauseCircle size={18} className="mr-2" /> Park Sale
                            </Button>
                            <Button onClick={() => handleParkAction('discard')} className="w-full bg-red-500 hover:bg-red-600 text-white">
                                <Trash2 size={18} className="mr-2" /> Discard
                            </Button>
                            <Button onClick={() => handleParkAction('cancel')} variant="secondary" className="w-full">
                                Cancel
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            <div className={`mx-auto ${currentPage === 'INVOICE_DESIGNER' ? 'h-full' : 'p-4 pb-32 max-w-7xl'}`}>
                <ErrorBoundary>
                    <Suspense fallback={<DevineLoader />}>
                        <Routes>
                            <Route path="/" element={<Dashboard setCurrentPage={handleNavigation} />} />
                            <Route path="/customers" element={<CustomersPage setIsDirty={setIsDirty} setCurrentPage={handleNavigation} />} />
                            <Route path="/sales" element={<SalesPage setIsDirty={setIsDirty} />} />
                            <Route path="/purchases" element={<PurchasesPage setIsDirty={setIsDirty} setCurrentPage={handleNavigation} />} />
                            <Route path="/products" element={<ProductsPage setIsDirty={setIsDirty} />} />
                            <Route path="/reports" element={<ReportsPage setCurrentPage={handleNavigation} />} />
                            <Route path="/returns" element={<ReturnsPage setIsDirty={setIsDirty} />} />
                            <Route path="/insights" element={<InsightsPage setCurrentPage={handleNavigation} />} />
                            <Route path="/expenses" element={<ExpensesPage setIsDirty={setIsDirty} />} />
                            <Route path="/financial-planning" element={<FinancialPlanningPage />} />
                            <Route path="/analytics" element={<AnalyticsPage />} />
                            <Route path="/quotations" element={<QuotationsPage />} />
                            <Route path="/invoice-designer" element={<InvoiceDesigner setIsDirty={setIsDirty} setCurrentPage={handleNavigation} />} />
                            <Route path="/system-optimizer" element={<SystemOptimizerPage />} />
                            <Route path="/sql-assistant" element={<SQLAssistantPage setCurrentPage={handleNavigation} />} />
                            <Route path="/trash" element={<TrashPage setCurrentPage={handleNavigation} />} />
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </Suspense>
                </ErrorBoundary>
            </div>


        </AppLayout>
    );
};

export default App;