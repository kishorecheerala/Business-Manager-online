import React, { useState, useMemo } from 'react';
import {
    BarChart2, TrendingUp, TrendingDown, IndianRupee, ShoppingCart,
    Package, Users, Activity, PieChart as PieIcon, ArrowRight, Wallet, CalendarRange, Info, X
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, PieChart, Pie, Legend
} from 'recharts';
import { motion } from 'framer-motion';

import { useAppContext } from '../context/AppContext';
import { Page } from '../types';
import Card from '../components/Card';
import AIInsightsView from '../components/AIInsightsView';
import SalesTrendChart from '../components/charts/SalesTrendChart';
import TopProductsChart from '../components/charts/TopProductsChart';
import TopCustomersChart from '../components/charts/TopCustomersChart';
import ExpenseTrendChart from '../components/charts/ExpenseTrendChart';
import GoalTracker from '../components/analytics/GoalTracker';
import ProfitLossCard from '../components/analytics/ProfitLossCard';
import { calculateRevenueForecast, calculateCLV, calculateInventoryTurnover } from '../utils/analytics';
import Dropdown from '../components/Dropdown';
import ModernDateInput from '../components/ModernDateInput';
import { getLocalDateString } from '../utils/dateUtils';
import Button from '../components/Button';

interface InsightsPageProps {
    setCurrentPage: (page: Page) => void;
}

// Custom Tooltip for Recharts
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-xl border border-gray-100 dark:border-slate-700">
                <p className="text-sm font-bold text-gray-700 dark:text-gray-200">{label}</p>
                <p className="text-sm text-indigo-600 font-medium">
                    ₹{Number(payload[0].value).toLocaleString()}
                </p>
            </div>
        );
    }
    return null;
};

const InsightsPage: React.FC<InsightsPageProps> = ({ setCurrentPage }) => {
    const { state } = useAppContext();
    const { sales, purchases, products, customers, expenses } = state;

    const forecast = useMemo(() => calculateRevenueForecast(sales), [sales]);
    const clv = useMemo(() => calculateCLV(sales, customers), [sales, customers]);
    const inventory = useMemo(() => calculateInventoryTurnover(sales, products, purchases), [sales, products, purchases]);

    // Calculate Profit
    const totalRevenue = sales.reduce((acc, s) => acc + Number(s.totalAmount), 0);
    const totalExpenses = expenses.reduce((acc, e) => acc + Number(e.amount), 0);
    const totalCOGS = inventory.cogs;
    const estimatedProfit = totalRevenue - totalCOGS - totalExpenses;

    // Prepare Chart Data (Last 14 days)
    // Chart Data Preparation moved to specific chart components or passed as raw data

    // --- Date Filter & Balance Calculation ---
    const [duration, setDuration] = useState('this_month');
    const [customStart, setCustomStart] = useState(getLocalDateString());
    const [customEnd, setCustomEnd] = useState(getLocalDateString());
    const [accountFilter, setAccountFilter] = useState<string>('ALL'); // 'ALL' | 'CASH' | BankAccountId
    const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);

    const dateRange = useMemo(() => {
        const now = new Date();
        let start = new Date();
        let end = new Date();

        // Default to end of today
        end.setHours(23, 59, 59, 999);
        start.setHours(0, 0, 0, 0);

        switch (duration) {
            case 'today': break;
            case 'yesterday':
                start.setDate(now.getDate() - 1);
                end.setDate(now.getDate() - 1);
                end.setHours(23, 59, 59, 999);
                start.setHours(0, 0, 0, 0);
                break;
            case 'this_week':
                const day = now.getDay() || 7;
                start.setDate(now.getDate() - day + 1);
                break;
            case 'this_month':
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                break;
            case 'last_month':
                start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
                break;
            case 'custom':
                const [sy, sm, sd] = customStart.split('-').map(Number);
                start = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
                const [ey, em, ed] = customEnd.split('-').map(Number);
                end = new Date(ey, em - 1, ed, 23, 59, 59, 999);
                break;
        }
        return { start, end };
    }, [duration, customStart, customEnd]);

    const statementData = useMemo(() => {
        let inflow = 0;
        let outflow = 0;

        let cashNet = 0;
        // Map to store balances for each bank account: { accountId: number }
        const bankBalances: Record<string, number> = {};
        state.bankAccounts.forEach(acc => bankBalances[acc.id] = 0);

        const transactions: { date: string, type: 'IN' | 'OUT', description: string, amount: number, category: string, method: string, accountId?: string }[] = [];

        // Helper to check if a transaction matches the current filter
        const matchesFilter = (method: string, accountId?: string) => {
            if (accountFilter === 'ALL') return true;
            if (accountFilter === 'CASH') return method === 'CASH';
            // Otherwise, accountFilter is a Bank Account ID
            return method !== 'CASH' && accountId === accountFilter;
        };

        // 1. Sales Inflows
        sales.forEach(sale => {
            (sale.payments || []).forEach(p => {
                const pDate = new Date(p.date);
                if (pDate >= dateRange.start && pDate <= dateRange.end) {
                    const amount = Number(p.amount);

                    // Update Individual Balances
                    if (p.method === 'CASH') {
                        cashNet += amount;
                    } else if (p.accountId && bankBalances[p.accountId] !== undefined) {
                        bankBalances[p.accountId] += amount;
                    }

                    // Filter for Statement List & Totals
                    if (matchesFilter(p.method, p.accountId)) {
                        inflow += amount;
                        const customer = customers.find(c => c.id === sale.customerId);
                        transactions.push({
                            date: p.date,
                            type: 'IN',
                            description: `Sale Payment - ${customer?.name || 'Unknown'}`,
                            amount,
                            category: 'Sales',
                            method: p.method,
                            accountId: p.accountId
                        });
                    }
                }
            });
        });

        // 2. Purchase Outflows
        purchases.forEach(purchase => {
            (purchase.payments || []).forEach(p => {
                const pDate = new Date(p.date);
                if (pDate >= dateRange.start && pDate <= dateRange.end) {
                    const amount = Number(p.amount);

                    if (p.method === 'CASH') {
                        cashNet -= amount;
                    } else if (p.accountId && bankBalances[p.accountId] !== undefined) {
                        bankBalances[p.accountId] -= amount;
                    }

                    if (matchesFilter(p.method, p.accountId)) {
                        outflow += amount;
                        transactions.push({
                            date: p.date,
                            type: 'OUT',
                            description: `Purchase Payment - ID: ${purchase.id}`,
                            amount,
                            category: 'Purchase',
                            method: p.method,
                            accountId: p.accountId
                        });
                    }
                }
            });
        });

        // 3. Expense Outflows
        expenses.forEach(expense => {
            const eDate = new Date(expense.date);
            if (eDate >= dateRange.start && eDate <= dateRange.end) {
                const amount = Number(expense.amount);

                if (expense.paymentMethod === 'CASH') {
                    cashNet -= amount;
                } else if (expense.bankAccountId && bankBalances[expense.bankAccountId] !== undefined) {
                    bankBalances[expense.bankAccountId] -= amount;
                }

                if (matchesFilter(expense.paymentMethod, expense.bankAccountId)) {
                    outflow += amount;
                    transactions.push({
                        date: expense.date,
                        type: 'OUT',
                        description: `${expense.category} - ${expense.description || ''}`,
                        amount,
                        category: 'Expense',
                        method: expense.paymentMethod,
                        accountId: expense.bankAccountId
                    });
                }
            }
        });

        return {
            inflow,
            outflow,
            net: inflow - outflow,
            cashNet,
            bankBalances,
            transactions: transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        };
    }, [sales, purchases, expenses, customers, dateRange, accountFilter, state.bankAccounts]);

    const netBalance = statementData.net;


    const COLORS = ['#6366f1', '#f43f5e', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899'];

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    // Helper to get Account Name for filter display
    const getFilterLabel = () => {
        if (accountFilter === 'ALL') return 'Total Balance';
        if (accountFilter === 'CASH') return 'Cash Balance';
        const account = state.bankAccounts.find(a => a.id === accountFilter);
        return account ? `${account.name} Balance` : 'Account Balance';
    };

    return (
        <motion.div
            className="space-y-6 pb-20"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            <motion.div variants={itemVariants} className="flex items-center gap-3 mb-2">
                <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl text-white shadow-lg shadow-indigo-500/20">
                    <BarChart2 className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Business Intelligence</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Real-time analytics & AI insights</p>
                </div>
            </motion.div>

            {/* AI Analyst Section */}
            <motion.div variants={itemVariants}>
                <AIInsightsView />
            </motion.div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Accounts Balance Card */}
                <motion.div variants={itemVariants} className="md:col-span-2 lg:col-span-2">
                    <Card className="bg-white dark:bg-slate-800 border-l-4 border-emerald-500 hover:shadow-lg transition-shadow relative group h-full flex flex-col p-0 overflow-hidden">
                        {/* Header with Title and Filters */}
                        <div className="p-4 pb-3 border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                <h3 className="font-bold text-lg text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                    <Wallet className="w-5 h-5 text-emerald-600" /> Accounts
                                </h3>

                                {/* Integrated Filter Controls - Unified Box */}
                                <div className="flex items-center h-10 bg-white dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600 shadow-sm overflow-hidden divide-x divide-gray-200 dark:divide-slate-600 flex-shrink-0">
                                    <Dropdown
                                        options={[
                                            { value: 'today', label: 'Today' },
                                            { value: 'yesterday', label: 'Yesterday' },
                                            { value: 'this_week', label: 'This Week' },
                                            { value: 'this_month', label: 'This Month' },
                                            { value: 'last_month', label: 'Last Month' },
                                            { value: 'custom', label: 'Custom Range' },
                                        ]}
                                        value={duration}
                                        onChange={setDuration}
                                        className="w-[140px] h-full"
                                        triggerClassName="h-full border-none rounded-none shadow-none focus:ring-0 bg-transparent text-sm"
                                    />
                                    {duration === 'custom' && (
                                        <div className="flex items-center h-full px-2 gap-1 animate-fade-in-fast bg-slate-50 dark:bg-slate-800/50">
                                            <ModernDateInput
                                                value={customStart}
                                                onChange={e => setCustomStart(e.target.value)}
                                                className="h-full w-[115px] bg-transparent text-sm"
                                                containerClassName="h-8 border-none shadow-none rounded-none focus:ring-0 bg-transparent px-0"
                                            />
                                            <span className="text-gray-400 text-xs">-</span>
                                            <ModernDateInput
                                                value={customEnd}
                                                onChange={e => setCustomEnd(e.target.value)}
                                                className="h-full w-[115px] bg-transparent text-sm"
                                                containerClassName="h-8 border-none shadow-none rounded-none focus:ring-0 bg-transparent px-0"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Accounts Grid */}
                        <div className="flex-1 p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {/* Cash Account Card */}
                            <div
                                onClick={(e) => { e.stopPropagation(); setAccountFilter('CASH'); setIsStatementModalOpen(true); }}
                                className="flex flex-col justify-between p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/20 cursor-pointer transition-all group/cash"
                            >
                                <div className="flex items-center justify-between mb-1.5">
                                    <div className="p-1.5 bg-white dark:bg-slate-800 rounded-lg text-emerald-600 shadow-sm">
                                        <Wallet size={16} />
                                    </div>
                                    <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 font-medium opacity-0 group-hover/cash:opacity-100 transition-opacity flex items-center gap-0.5">
                                        Statement <ArrowRight size={10} />
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-700 dark:text-gray-200 group-hover/cash:text-emerald-700 dark:group-hover/cash:text-emerald-400 transition-colors">Cash in Hand</p>
                                    <p className={`text-lg font-bold mt-0.5 ${statementData.cashNet >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600'}`}>
                                        ₹{statementData.cashNet.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                    </p>
                                </div>
                            </div>

                            {/* Bank Account Cards */}
                            {state.bankAccounts.map(account => (
                                <div
                                    key={account.id}
                                    onClick={(e) => { e.stopPropagation(); setAccountFilter(account.id); setIsStatementModalOpen(true); }}
                                    className="flex flex-col justify-between p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/20 cursor-pointer transition-all group/bank"
                                >
                                    <div className="flex items-center justify-between mb-1.5">
                                        <div className="p-1.5 bg-white dark:bg-slate-800 rounded-lg text-blue-600 shadow-sm">
                                            <IndianRupee size={16} />
                                        </div>
                                        <p className="text-[10px] text-blue-600/70 dark:text-blue-400/70 font-medium opacity-0 group-hover/bank:opacity-100 transition-opacity flex items-center gap-0.5">
                                            Statement <ArrowRight size={10} />
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-gray-700 dark:text-gray-200 group-hover/bank:text-blue-700 dark:group-hover/bank:text-blue-400 transition-colors truncate" title={account.name}>
                                            {account.name}
                                        </p>
                                        <p className={`text-lg font-bold mt-0.5 ${statementData.bankBalances[account.id] >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-red-600'}`}>
                                            ₹{(statementData.bankBalances[account.id] || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Footer Total */}
                        <div className="p-3 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-center flex justify-between items-center px-6">
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                                <Info size={12} /> Click grid items for statements
                            </span>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                Total: <span className={`font-bold text-base ${netBalance >= 0 ? 'text-gray-800 dark:text-white' : 'text-red-600'}`}>₹{netBalance.toLocaleString('en-IN')}</span>
                            </p>
                        </div>
                    </Card>
                </motion.div>

                <motion.div variants={itemVariants}>
                    <Card className="bg-white dark:bg-slate-800 border-l-4 border-green-500 hover:shadow-lg transition-shadow h-full flex flex-col justify-between group relative">
                        <div>
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Net Profit (Est.)</p>
                                    <h3 className={`text-2xl font-bold mt-1 ${estimatedProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        ₹{estimatedProfit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                    </h3>
                                </div>
                                <div className={`p-2 rounded-full ${estimatedProfit >= 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                    <Activity size={20} />
                                </div>
                            </div>
                            <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                                <span className="font-mono">Rev - COGS - Exp</span>
                            </p>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-4 text-center hover:text-primary cursor-pointer transition-colors" onClick={(e) => { e.stopPropagation(); setIsStatementModalOpen(true); }}>
                            View Detailed Statement &rarr;
                        </p>
                    </Card>
                </motion.div>

                <motion.div variants={itemVariants}>
                    <Card className="bg-white dark:bg-slate-800 border-l-4 border-blue-500 hover:shadow-lg transition-shadow">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Growth Trend</p>
                                <h3 className="text-2xl font-bold mt-1 text-blue-600 flex items-center">
                                    {forecast.slope > 0 ? <TrendingUp className="mr-1" size={20} /> : <TrendingDown className="mr-1" size={20} />}
                                    {forecast.slope > 0 ? 'Growing' : 'Declining'}
                                </h3>
                            </div>
                            <div className="p-2 bg-blue-100 text-blue-600 rounded-full">
                                <TrendingUp size={20} />
                            </div>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">Based on 30-day velocity</p>
                    </Card>
                </motion.div>

                <motion.div variants={itemVariants}>
                    <Card className="bg-white dark:bg-slate-800 border-l-4 border-purple-500 hover:shadow-lg transition-shadow">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Customer LTV</p>
                                <h3 className="text-2xl font-bold mt-1 text-purple-600">
                                    ₹{Math.round(clv.clv).toLocaleString('en-IN')}
                                </h3>
                            </div>
                            <div className="p-2 bg-purple-100 text-purple-600 rounded-full">
                                <Users size={20} />
                            </div>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">Avg lifetime revenue</p>
                    </Card>
                </motion.div>

                <motion.div variants={itemVariants}>
                    <Card className="bg-white dark:bg-slate-800 border-l-4 border-orange-500 hover:shadow-lg transition-shadow">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Stock Turnover</p>
                                <h3 className="text-2xl font-bold mt-1 text-orange-600">
                                    {inventory.ratio.toFixed(1)}x
                                </h3>
                            </div>
                            <div className="p-2 bg-orange-100 text-orange-600 rounded-full">
                                <Package size={20} />
                            </div>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">Times sold per year</p>
                    </Card>
                </motion.div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {/* Sales Trend Chart (Large) */}
                <motion.div variants={itemVariants} className="col-span-full mb-4">
                    <GoalTracker sales={sales} />
                </motion.div>

                {/* Profit/Loss and Expense Trends */}
                <motion.div variants={itemVariants} className="col-span-full w-full grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="md:col-span-1">
                        <ProfitLossCard
                            revenue={totalRevenue}
                            expenses={totalExpenses}
                            cogs={totalCOGS}
                            className="h-full"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <ExpenseTrendChart sales={sales} expenses={expenses} />
                    </div>
                </motion.div>

                <motion.div variants={itemVariants} className="xl:col-span-2">
                    <SalesTrendChart sales={sales} />
                </motion.div>

                {/* Top Customers (Side Panel) */}
                <motion.div variants={itemVariants} className="xl:col-span-1">
                    <TopCustomersChart sales={sales} customers={customers} />
                </motion.div>

                {/* Top Products (Was Category) */}
                <motion.div variants={itemVariants} className="xl:col-span-1">
                    <TopProductsChart sales={sales} />
                </motion.div>
            </div>

            {/* Statement Modal */}
            {isStatementModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4 animate-fade-in-fast" onClick={() => setIsStatementModalOpen(false)}>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-scale-in border dark:border-slate-700" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800">
                            <div>
                                <h3 className="font-bold text-lg text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                    <Wallet className="w-5 h-5" /> Account Statement {accountFilter !== 'ALL' && <span className="text-sm font-normal text-gray-500 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">({accountFilter})</span>}
                                </h3>
                                <p className="text-xs text-gray-500">
                                    {duration === 'custom' ? `${new Date(dateRange.start).toLocaleDateString()} - ${new Date(dateRange.end).toLocaleDateString()}` : duration.replace('_', ' ')}
                                </p>
                            </div>
                            <button onClick={() => setIsStatementModalOpen(false)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50/50 dark:bg-slate-800/50 border-b dark:border-slate-700">
                            <div className="text-center p-2 bg-emerald-50 dark:bg-emerald-900/10 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase">Total Inflow</p>
                                <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">₹{statementData.inflow.toLocaleString()}</p>
                            </div>
                            <div className="text-center p-2 bg-rose-50 dark:bg-rose-900/10 rounded-lg border border-rose-100 dark:border-rose-900/30">
                                <p className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase">Total Outflow</p>
                                <p className="text-lg font-bold text-rose-700 dark:text-rose-300">₹{statementData.outflow.toLocaleString()}</p>
                            </div>
                            <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/30">
                                <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase">Net Balance</p>
                                <p className={`text-lg font-bold ${statementData.net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {statementData.net >= 0 ? '+' : ''}₹{statementData.net.toLocaleString()}
                                </p>
                            </div>
                        </div>

                        <div className="flex-grow overflow-y-auto p-0 bg-white dark:bg-slate-900 custom-scrollbar">
                            {statementData.transactions.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                                    <Info size={32} className="mb-2 opacity-50" />
                                    <p>No transactions found in this period.</p>
                                </div>
                            ) : (
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-slate-800 sticky top-0 z-10">
                                        <tr>
                                            <th className="px-4 py-3">Date</th>
                                            <th className="px-4 py-3">Description</th>
                                            <th className="px-4 py-3 text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                        {statementData.transactions.map((tx, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                                                    {new Date(tx.date).toLocaleDateString()}
                                                    <div className="text-[10px] opacity-70">{new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-gray-800 dark:text-gray-200">{tx.description}</div>
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${tx.type === 'IN' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                                                        {tx.category}
                                                    </span>
                                                </td>
                                                <td className={`px-4 py-3 text-right font-bold ${tx.type === 'IN' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {tx.type === 'IN' ? '+' : '-'}₹{tx.amount.toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    );
};

export default InsightsPage;
