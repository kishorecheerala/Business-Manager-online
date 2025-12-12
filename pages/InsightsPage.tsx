import React, { useMemo } from 'react';
import {
    BarChart2, TrendingUp, TrendingDown, IndianRupee, ShoppingCart,
    Package, Users, Activity, PieChart as PieIcon, ArrowRight
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <motion.div variants={itemVariants}>
                    <Card className="bg-white dark:bg-slate-800 border-l-4 border-green-500 hover:shadow-lg transition-shadow">
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

        </motion.div>
    );
};

export default InsightsPage;
