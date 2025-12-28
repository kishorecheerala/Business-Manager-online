import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { IndianRupee, User, AlertTriangle, Download, Upload, ShoppingCart, Package, Archive, TestTube2, X, Share, Award, Wallet, Zap, CalendarRange, CreditCard, Banknote, Receipt } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import * as db from '../utils/db';
import Card from '../components/Card';
import Button from '../components/Button';
import Dropdown from '../components/Dropdown';
import { Page, AppMetadataBackup } from '../types';
import { testData, testProfile } from '../utils/testData';
import { useDialog } from '../context/DialogContext';
import PinModal from '../components/PinModal';
import CheckpointsModal from '../components/CheckpointsModal';
import { usePWAInstall } from '../hooks/usePWAInstall';
import ModernDateInput from '../components/ModernDateInput';
import { getLocalDateString } from '../utils/dateUtils';
import { formatCurrency, formatNumber, formatDate, formatDateTime, generateDownloadFilename } from '../utils/formatUtils';
import SalesTrendChart from '../components/charts/SalesTrendChart';
import AIInsightsView from '../components/AIInsightsView';
import SmartAnalystCard from '../components/SmartAnalystCard';
import QuickMemoCard from '../components/QuickMemoCard';
import GoalTrackerCard from '../components/GoalTrackerCard';
import WhatsAppIcon from '../components/WhatsAppIcon';
import UISettingsModal from '../components/UISettingsModal';

// Shared Components
import MetricCard from '../components/dashboard/MetricCard';
import { BackupStatusAlert, OverdueDuesCard, UpcomingPurchaseDuesCard, LowStockCard, TopProductsCard } from '../components/dashboard/PriorityAlerts';

interface DashboardProps {
    setCurrentPage: (page: Page) => void;
}


const Dashboard: React.FC<DashboardProps> = ({ setCurrentPage }) => {
    const { state, dispatch, showToast } = useAppContext();
    const { customers, sales, purchases, products, app_metadata, suppliers, returns, profile, expenses, dashboardConfig } = state;
    const { showConfirm, showAlert } = useDialog();
    const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
    const [bannerDismissed, setBannerDismissed] = useState(false);
    const [isUISettingsOpen, setIsUISettingsOpen] = useState(false);

    // Initial greeting update
    useEffect(() => {
        const dismissed = sessionStorage.getItem('pwa_banner_dismissed');
        if (dismissed === 'true') {
            setBannerDismissed(true);
        }
    }, []);

    const handleDismissBanner = () => {
        setBannerDismissed(true);
        sessionStorage.setItem('pwa_banner_dismissed', 'true');
    };

    // --- Filters State ---
    const [duration, setDuration] = useState('this_month');
    const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth().toString());
    const [customStart, setCustomStart] = useState(getLocalDateString());
    const [customEnd, setCustomEnd] = useState(getLocalDateString());
    const [isStartCalendarOpen, setIsStartCalendarOpen] = useState(false);
    const [isEndCalendarOpen, setIsEndCalendarOpen] = useState(false);

    // Collection Modal State
    const [collectionDetailModalOpen, setCollectionDetailModalOpen] = useState(false);

    const [isPinModalOpen, setIsPinModalOpen] = useState(false);
    const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

    const [isGeneratingReport, setIsGeneratingReport] = useState(false);
    const [isCheckpointsModalOpen, setIsCheckpointsModalOpen] = useState(false);

    const lastBackupDate = (app_metadata.find(m => m.id === 'lastBackup') as AppMetadataBackup | undefined)?.date || null;

    const getYears = useMemo(() => {
        const years = new Set<string>();
        sales.forEach(s => years.add(new Date(s.date).getFullYear().toString()));
        years.add(new Date().getFullYear().toString());
        return Array.from(years).sort().reverse();
    }, [sales]);

    const durationOptions = [
        { value: 'today', label: 'Today' },
        { value: 'yesterday', label: 'Yesterday' },
        { value: 'this_week', label: 'This Week' },
        { value: 'last_7', label: 'Last 7 Days' },
        { value: 'this_month', label: 'This Month' },
        { value: 'last_month', label: 'Last Month' },
        { value: 'this_year', label: 'This Year' },
        { value: 'custom', label: 'Custom Period' },
    ];

    // Compute generic date range based on duration filter
    const dateRange = useMemo(() => {
        const now = new Date();
        let start = new Date();
        let end = new Date();

        // Default to end of today
        end.setHours(23, 59, 59, 999);
        start.setHours(0, 0, 0, 0);

        switch (duration) {
            case 'today':
                // start/end are already set to today 00:00 and 23:59
                break;
            case 'yesterday':
                start.setDate(now.getDate() - 1);
                end.setDate(now.getDate() - 1);
                end.setHours(23, 59, 59, 999);
                start.setHours(0, 0, 0, 0);
                break;
            case 'this_week':
                // Assuming week starts on Monday
                const day = now.getDay() || 7;
                start.setDate(now.getDate() - day + 1);
                break;
            case 'last_7':
                start.setDate(now.getDate() - 7);
                break;
            case 'this_month':
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                break;
            case 'last_month':
                start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
                break;
            case 'this_year':
                start = new Date(now.getFullYear(), 0, 1);
                end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
                break;
            case 'custom':
                // Parse custom dates
                const [sy, sm, sd] = customStart.split('-').map(Number);
                start = new Date(sy, sm - 1, sd, 0, 0, 0, 0);

                const [ey, em, ed] = customEnd.split('-').map(Number);
                end = new Date(ey, em - 1, ed, 23, 59, 59, 999);
                break;
        }
        return { start, end };
    }, [duration, customStart, customEnd]);

    // Calculate metrics based on filtered range
    const stats = useMemo(() => {
        const filteredSales = sales.filter(s => {
            const d = new Date(s.date);
            return d >= dateRange.start && d <= dateRange.end;
        });

        const filteredPurchases = purchases.filter(p => {
            const d = new Date(p.date);
            return d >= dateRange.start && d <= dateRange.end;
        });

        const filteredExpenses = expenses.filter(e => {
            const d = new Date(e.date);
            return d >= dateRange.start && d <= dateRange.end;
        });

        // Collection: Payments received in period
        const periodCollection = sales.reduce((acc, sale) => {
            const salePayments = sale.payments || [];
            const paymentsInPeriod = salePayments.filter(p => {
                const pd = new Date(p.date);
                return pd >= dateRange.start && pd <= dateRange.end;
            });
            return acc + paymentsInPeriod.reduce((sum, p) => sum + Number(p.amount), 0);
        }, 0);

        const periodSalesTotal = filteredSales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
        const periodPurchasesTotal = filteredPurchases.reduce((sum, p) => sum + Number(p.totalAmount), 0);
        const periodExpensesTotal = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

        // Customer Dues (All time snapshot)
        const totalCustomerDues = sales.reduce((sum, s) => {
            const paid = (s.payments || []).reduce((pSum, p) => pSum + Number(p.amount), 0);
            return sum + (Number(s.totalAmount) - paid);
        }, 0);

        // Supplier Dues (All time snapshot)
        const totalSupplierDues = purchases.reduce((sum, p) => {
            const paid = (p.payments || []).reduce((pSum, p) => pSum + Number(p.amount), 0);
            return sum + (Number(p.totalAmount) - paid);
        }, 0);

        return {
            periodSalesTotal,
            periodPurchasesTotal,
            periodExpensesTotal,
            periodCollection,
            totalCustomerDues,
            totalSupplierDues,
            salesCount: filteredSales.length
        };
    }, [sales, purchases, expenses, dateRange]);

    const collectionDetails = useMemo(() => {
        const paymentMap: Record<string, number> = {};
        const paymentsList: { date: string, customer: string, amount: number, method: string }[] = [];

        sales.forEach(sale => {
            const salePayments = sale.payments || [];
            salePayments.forEach(p => {
                const pDate = new Date(p.date);
                if (pDate >= dateRange.start && pDate <= dateRange.end) {
                    const method = p.method || 'CASH';
                    paymentMap[method] = (paymentMap[method] || 0) + Number(p.amount);

                    const customer = customers.find(c => c.id === sale.customerId);
                    paymentsList.push({
                        date: p.date,
                        customer: customer?.name || 'Unknown',
                        amount: Number(p.amount),
                        method: method
                    });
                }
            });
        });

        return {
            byMethod: Object.entries(paymentMap).map(([method, amount]) => ({ method, amount })),
            list: paymentsList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        };
    }, [sales, customers, dateRange]);

    const runSecureAction = (action: () => void) => {
        if (state.pin) {
            setPendingAction(() => action);
            setIsPinModalOpen(true);
        } else {
            action();
        }
    };

    const handlePinSuccess = () => {
        setIsPinModalOpen(false);
        if (pendingAction) {
            pendingAction();
            setPendingAction(null);
        }
    };

    const handleBackup = async () => {
        setIsGeneratingReport(true);
        try {
            const data = await db.exportData();
            const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const filename = (state.profile?.name || 'backup').replace(/[^a-z0-9]/gi, '_');
            a.download = generateDownloadFilename(`${filename}_backup`, 'json');
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            await db.setLastBackupDate();
            dispatch({ type: 'SET_LAST_BACKUP_DATE', payload: new Date().toISOString() });
            showToast("Backup downloaded successfully!", 'success');
        } catch (e) {
            if (state.devMode) console.error("Backup failed", e);
            showToast("Backup failed!", 'error');
        } finally {
            setIsGeneratingReport(false);
        }
    };

    const handleCreateCheckpoint = async () => {
        const name = prompt("Enter a name for this checkpoint:", `Backup ${formatDateTime(new Date()).split(', ')[1]}`);
        if (name) {
            try {
                await db.createSnapshot(name);
                showToast("Checkpoint created successfully.", 'success');
            } catch (e) {
                if (state.devMode) console.error(e);
                showToast("Failed to create checkpoint.", 'error');
            }
        }
    };

    const handleNavigate = (page: Page, id: string) => {
        dispatch({ type: 'SET_SELECTION', payload: { page, id } });
        setCurrentPage(page);
    };

    const handleFileRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const processRestore = async () => {
            const confirmed = await showConfirm("Restoring will OVERWRITE all current data. Are you sure you want to restore from this backup?", {
                title: "Restore Backup",
                confirmText: "Yes, Restore",
                variant: "danger"
            });

            if (confirmed) {
                try {
                    const text = await file.text();
                    const data = JSON.parse(text);
                    await db.importData(data);
                    window.location.reload();
                } catch (err) {
                    showAlert("Failed to restore backup. The file might be invalid or corrupted.");
                }
            }
        };

        runSecureAction(processRestore);
        e.target.value = '';
    };

    const handleLoadTestData = async () => {
        const confirmed = await showConfirm("This will OVERWRITE your current data with sample test data. Proceed?", {
            title: "Load Test Data",
            confirmText: "Overwrite",
            variant: "danger"
        });

        if (confirmed) {
            try {
                await db.importData(testData as any);
                await db.saveCollection('profile', [testProfile]);
                window.location.reload();
            } catch (error) {
                if (state.devMode) console.error("Failed to load test data:", error);
                showToast("Failed to load test data.", 'info');
            }
        }
    };

    return (
        <div className="space-y-6 animate-fade-in-fast">
            <CheckpointsModal isOpen={isCheckpointsModalOpen} onClose={() => setIsCheckpointsModalOpen(false)} />

            {isPinModalOpen && (
                <PinModal
                    mode="enter"
                    correctPin={state.pin}
                    onCorrectPin={handlePinSuccess}
                    onCancel={() => {
                        setIsPinModalOpen(false);
                        setPendingAction(null);
                    }}
                    onResetRequest={async () => {
                        if (await showConfirm("Are you sure you want to reset your passcode? Use this only if you forgot it. This will remove the lock.", { confirmText: "Reset & Remove Lock", variant: 'danger' })) {
                            dispatch({ type: 'SET_PIN', payload: null });
                            showToast("Passcode removed.");
                            setIsPinModalOpen(false);
                            setPendingAction(null);
                        }
                    }}
                />
            )}

            {/* Header Section */}
            <div className="mb-6 text-center flex flex-col items-center animate-fade-in-down">
                {dashboardConfig.showGreeting && (
                    <p
                        className={`font-semibold mb-2 font-serif tracking-widest opacity-90 transition-all ${dashboardConfig.uppercaseGreeting !== false ? 'uppercase' : ''} ${(!dashboardConfig.greetingColor && !dashboardConfig.matchThemeColor) ? 'text-orange-600 dark:text-orange-400' : ''} text-${dashboardConfig.greetingFontSize || 'sm'}`}
                        style={{ color: dashboardConfig.matchThemeColor ? state.themeColor : (dashboardConfig.greetingColor || undefined) }}
                    >
                        {dashboardConfig.greetingText}
                    </p>
                )}

                {dashboardConfig.showLogo && (
                    (dashboardConfig.useCustomLogo ? dashboardConfig.customLogo : profile?.logo) ? (
                        <div
                            className={`mb-4 relative group transition-all duration-300
                                h-[var(--logo-h-mobile)] md:h-[var(--logo-h-desktop)]
                                ${dashboardConfig.logoFillMobile ? 'w-full' : 'w-auto'}
                                ${dashboardConfig.logoFillDesktop ? 'md:w-full' : 'md:w-auto'}
                            `}
                            style={{
                                '--logo-h-mobile': `${(dashboardConfig.logoSizeMobile || dashboardConfig.logoSize || 1) * 5}rem`,
                                '--logo-h-desktop': `${(dashboardConfig.logoSizeDesktop || dashboardConfig.logoSize || 1) * 5}rem`,
                                '--logo-pos-mobile': `${dashboardConfig.logoPositionMobile?.x ?? 50}% ${dashboardConfig.logoPositionMobile?.y ?? 50}%`,
                                '--logo-pos-desktop': `${dashboardConfig.logoPositionDesktop?.x ?? 50}% ${dashboardConfig.logoPositionDesktop?.y ?? 50}%`,
                            } as React.CSSProperties}
                        >
                            <div className={`relative h-full w-full overflow-hidden rounded-xl shadow-2xl border-2 border-white/50 dark:border-slate-600/50 bg-white/90 dark:bg-slate-800/90 p-1`}>
                                <img
                                    src={dashboardConfig.useCustomLogo ? dashboardConfig.customLogo : profile?.logo}
                                    alt="Dashboard Logo"
                                    className={`relative w-full h-full transition-all duration-300 animate-divine-breath
                                        ${dashboardConfig.logoFillMobile ? 'object-cover' : 'object-contain'}
                                        md:${dashboardConfig.logoFillDesktop ? 'object-cover' : 'object-contain'}
                                        object-[var(--logo-pos-mobile)] md:object-[var(--logo-pos-desktop)]
                                    `}
                                />
                                {/* Golden Glow Overlay */}
                                {(dashboardConfig.showGlow !== false) && (
                                    <div className="absolute inset-0 shadow-[inset_0_0_40px_rgba(255,215,0,0.5)] rounded-lg pointer-events-none z-10 mix-blend-screen bg-transparent animate-golden-breath"></div>
                                )}

                                {/* Replace Button in Top-Right */}
                                <button
                                    onClick={() => setIsUISettingsOpen(true)}
                                    className="absolute top-2 right-2 z-20 bg-black/70 hover:bg-black/90 text-white text-xs px-3 py-1.5 rounded-md backdrop-blur-sm transition-all duration-200 flex items-center gap-1.5 shadow-lg opacity-0 group-hover:opacity-100"
                                    title="Replace Logo"
                                >
                                    <Upload size={12} />
                                    <span>Replace</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div
                            onClick={() => setIsUISettingsOpen(true)}
                            className="mb-6 w-full max-w-md mx-auto h-40 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-slate-800/50 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors group"
                        >
                            <div className="bg-white dark:bg-slate-700 p-3 rounded-full mb-3 shadow-sm group-hover:scale-110 transition-transform">
                                <Upload className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                            </div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-300 text-center">
                                Upload your logo or custom image<br />to show up here
                            </p>
                            <p className="text-xs text-gray-400 mt-2 group-hover:text-primary transition-colors">Click to Configure</p>
                        </div>
                    )
                )}

                <h1 className="text-3xl font-bold text-primary drop-shadow-sm">{dashboardConfig.titleText}</h1>
            </div>

            {/* Install Prompt Banner */}
            {(isInstallable || (isIOS && !isInstalled)) && !bannerDismissed && (
                <div className="bg-gradient-to-r from-indigo-500 to-blue-600 text-white rounded-xl p-4 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3 animate-slide-down-fade mb-4 relative">
                    <button
                        onClick={handleDismissBanner}
                        className="absolute top-2 right-2 p-1 hover:bg-white/20 rounded-full transition-colors"
                        aria-label="Dismiss install banner"
                    >
                        <X size={16} />
                    </button>
                    <div className="flex items-center gap-3 pr-8">
                        <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                            <Download size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-base">Install App for Offline Use</h3>
                            <p className="text-xs opacity-90">Get the best experience with full screen & faster loading.</p>
                        </div>
                    </div>
                    {isIOS ? (
                        <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                            <p className="text-xs font-bold text-white">Tap <Share size={12} className="inline mx-1" /> then "Add to Home Screen"</p>
                        </div>
                    ) : (
                        <button onClick={install} className="bg-white text-indigo-600 px-4 py-2 rounded-lg font-bold text-sm shadow hover:bg-gray-100 transition-colors whitespace-nowrap w-full sm:w-auto">
                            Install Now
                        </button>
                    )}
                </div>
            )}



            {/* Toolbar for Period Selectors */}
            <div className="flex flex-wrap justify-end items-center mb-1 gap-2">
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 bg-white dark:bg-slate-800 p-1 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 relative z-20 w-full sm:w-auto">
                    <div className="flex items-center gap-1.5 px-2 w-full sm:w-auto mb-2 sm:mb-0">
                        <CalendarRange size={16} className="text-gray-400 shrink-0" />
                        <Dropdown
                            options={durationOptions}
                            value={duration}
                            onChange={setDuration}
                            className="w-full sm:w-36"
                        />
                    </div>

                    {duration === 'custom' && (
                        <>
                            <div className="hidden sm:block h-4 w-px bg-gray-300 dark:bg-slate-600 mx-1"></div>
                            <div className="flex items-center gap-2 px-2 w-full sm:w-auto border-t sm:border-t-0 pt-2 sm:pt-0 dark:border-slate-700">
                                <ModernDateInput
                                    value={customStart}
                                    onChange={(e) => setCustomStart(e.target.value)}
                                    isOpen={isStartCalendarOpen}
                                    onToggle={setIsStartCalendarOpen}
                                    containerClassName="flex-1 sm:flex-none sm:w-40"
                                />
                                <span className="text-gray-400 shrink-0">-</span>
                                <ModernDateInput
                                    value={customEnd}
                                    onChange={(e) => setCustomEnd(e.target.value)}
                                    isOpen={isEndCalendarOpen}
                                    onToggle={setIsEndCalendarOpen}
                                    containerClassName="flex-1 sm:flex-none sm:w-40"
                                />
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 lgs:grid-cols-4 gap-3 mb-6">
                <MetricCard
                    icon={IndianRupee}
                    title="Total Revenue"
                    value={stats.periodCollection}
                    subValue={duration === 'custom' ? 'Selected Range' : duration.replace('_', ' ')}
                    color="bg-emerald-50 dark:bg-emerald-900/20"
                    iconBgColor="bg-emerald-100 dark:bg-emerald-800"
                    textColor="text-emerald-700 dark:text-emerald-100"
                    onClick={() => setCollectionDetailModalOpen(true)}
                    delay={0}
                    tooltip="Tap for statement"
                />
                <MetricCard
                    icon={Receipt}
                    title="Expenses"
                    value={stats.periodExpensesTotal}
                    subValue={duration === 'custom' ? 'Selected Range' : duration.replace('_', ' ')}
                    color="bg-rose-50 dark:bg-rose-900/20"
                    iconBgColor="bg-rose-100 dark:bg-rose-800"
                    textColor="text-rose-700 dark:text-rose-100"
                    onClick={() => setCurrentPage('EXPENSES')}
                    delay={50}
                />
                <MetricCard
                    icon={IndianRupee}
                    title="Sales"
                    value={stats.periodSalesTotal}
                    subValue={`${stats.salesCount} orders`}
                    color="bg-primary/5 dark:bg-primary/10"
                    iconBgColor="bg-primary/20"
                    textColor="text-primary"
                    onClick={() => setCurrentPage('SALES')}
                    delay={100}
                />
                <MetricCard
                    icon={Package}
                    title="Purchases"
                    value={stats.periodPurchasesTotal}
                    subValue="Inventory cost"
                    color="bg-blue-50 dark:bg-blue-900/20"
                    iconBgColor="bg-blue-100 dark:bg-blue-800"
                    textColor="text-blue-700 dark:text-blue-100"
                    onClick={() => setCurrentPage('PURCHASES')}
                    delay={200}
                />
                <MetricCard
                    icon={User}
                    title="Cust. Dues"
                    value={stats.totalCustomerDues}
                    subValue="Total Receivable"
                    color="bg-purple-50 dark:bg-purple-900/20"
                    iconBgColor="bg-purple-100 dark:bg-purple-800"
                    textColor="text-purple-700 dark:text-purple-100"
                    onClick={() => setCurrentPage('CUSTOMERS')}
                    delay={300}
                />
                <MetricCard
                    icon={ShoppingCart}
                    title="My Payables"
                    value={stats.totalSupplierDues}
                    subValue="Total Payable"
                    color="bg-amber-50 dark:bg-amber-900/20"
                    iconBgColor="bg-amber-100 dark:bg-amber-800"
                    textColor="text-amber-700 dark:text-amber-100"
                    onClick={() => setCurrentPage('PURCHASES')}
                    delay={400}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                {/* AI Analyst Card */}
                <div className="md:col-span-2">
                    <SmartAnalystCard
                        sales={sales}
                        products={products}
                        customers={customers}
                        purchases={purchases}
                        returns={returns}
                        expenses={expenses}
                        ownerName={profile?.name || 'User'}
                        onNavigate={(page, id) => {
                            if (page === 'CUSTOMERS') {
                                dispatch({ type: 'SET_SELECTION', payload: { page: 'CUSTOMERS', id } });
                            } else if (page === 'PRODUCTS') {
                                dispatch({ type: 'SET_SELECTION', payload: { page: 'PRODUCTS', id } });
                            }
                            setCurrentPage(page);
                        }}
                    />
                </div>

                {/* Productivity Widgets */}
                <div className="md:col-span-1">
                    <GoalTrackerCard sales={sales} />
                </div>
                <div className="md:col-span-1">
                    <QuickMemoCard />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <OverdueDuesCard
                    sales={sales}
                    customers={customers}
                    onNavigate={(id) => handleNavigate('CUSTOMERS', id)}
                    businessName={profile?.name || 'Our Business'}
                />
                <UpcomingPurchaseDuesCard
                    purchases={purchases}
                    suppliers={suppliers}
                    onNavigate={(id) => handleNavigate('PURCHASES', id)}
                />
            </div>

            <div className="mb-6 w-full">
                <SalesTrendChart sales={sales} className="h-[350px] w-full" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="flex flex-col gap-6">
                    <TopProductsCard sales={sales} />
                    <LowStockCard products={products} onNavigate={(id) => handleNavigate('PRODUCTS', id)} />
                </div>
                <div className="space-y-6">
                    <AIInsightsView />
                    <Card title="Data Management">
                        <BackupStatusAlert lastBackupDate={lastBackupDate} lastSyncTime={state.lastSyncTime || null} />
                        <div className="space-y-4 mt-4">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Your data is stored locally. Please create regular backups.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <Button onClick={handleBackup} className="w-full" disabled={isGeneratingReport}>
                                    <Download className="w-4 h-4 mr-2" /> {isGeneratingReport ? 'Preparing...' : 'Backup Data Now'}
                                </Button>
                                <label htmlFor="restore-backup" className="px-4 py-2 rounded-md font-semibold text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 shadow-sm flex items-center justify-center gap-2 bg-secondary hover:bg-teal-500 focus:ring-secondary cursor-pointer w-full text-center dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">
                                    <Upload className="w-4 h-4 mr-2" /> Restore from Backup
                                </label>
                                <input
                                    id="restore-backup"
                                    type="file"
                                    accept="application/json"
                                    className="hidden"
                                    onChange={handleFileRestore}
                                />
                                <Button onClick={() => window.dispatchEvent(new CustomEvent('OPEN_DATA_IMPORT'))} variant="secondary" className="w-full bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800">
                                    <Upload className="w-4 h-4 mr-2" /> Import CSV Data
                                </Button>
                                <Button onClick={() => runSecureAction(handleLoadTestData)} variant="secondary" className="w-full bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800">
                                    <TestTube2 className="w-4 h-4 mr-2" /> Load Test Data
                                </Button>
                            </div>

                            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-md border border-yellow-200 dark:border-yellow-700 mt-4">
                                <div className="flex gap-2">
                                    <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                                    <p className="text-xs text-yellow-700 dark:text-yellow-300">
                                        <strong>Tip:</strong> Send the backup file to your email or save it to Google Drive for safe keeping.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Collection Details Modal */}
            {collectionDetailModalOpen && createPortal(
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4 animate-fade-in-fast" onClick={() => setCollectionDetailModalOpen(false)}>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden animate-scale-in border dark:border-slate-700" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b dark:border-slate-700 flex justify-between items-center bg-emerald-50 dark:bg-emerald-900/20">
                            <div>
                                <h3 className="font-bold text-lg text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                                    <Wallet className="w-5 h-5" /> Collection Breakdown
                                </h3>
                                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                                    {duration === 'custom' ? `${formatDate(dateRange.start)} - ${formatDate(dateRange.end)}` : duration.replace('_', ' ')}
                                </p>
                            </div>
                            <button onClick={() => setCollectionDetailModalOpen(false)} className="p-2 rounded-full hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors text-emerald-700 dark:text-emerald-300">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="overflow-y-auto p-4 space-y-4 bg-white dark:bg-slate-900 custom-scrollbar">
                            <div className="grid grid-cols-2 gap-3 mb-2">
                                {collectionDetails.byMethod.map((item, idx) => (
                                    <div key={idx} className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border dark:border-slate-700 flex flex-col">
                                        <div className="flex items-center gap-2 mb-1">
                                            {item.method === 'UPI' ? <Zap size={14} className="text-amber-500" /> : item.method === 'CHEQUE' ? <CreditCard size={14} className="text-blue-500" /> : <Banknote size={14} className="text-green-500" />}
                                            <span className="text-xs font-bold text-slate-500 uppercase">{item.method}</span>
                                        </div>
                                        <span className="text-lg font-bold text-slate-800 dark:text-white">{formatCurrency(item.amount)}</span>
                                    </div>
                                ))}
                            </div>

                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Recent Transactions</h4>
                                <div className="space-y-2">
                                    {collectionDetails.list.length > 0 ? (
                                        collectionDetails.list.map((tx, idx) => (
                                            <div key={idx} className="flex justify-between items-center p-2.5 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-sm text-slate-700 dark:text-slate-200 truncate">{tx.customer}</p>
                                                    <p className="text-[10px] text-slate-500">{formatDateTime(tx.date)}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">+{formatCurrency(tx.amount)}</p>
                                                    <span className="text-[10px] bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-500">{tx.method}</span>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-center text-sm text-slate-400 py-4">No collections found in this period.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
            <UISettingsModal isOpen={isUISettingsOpen} onClose={() => setIsUISettingsOpen(false)} />
        </div>
    );
};

export default Dashboard;
