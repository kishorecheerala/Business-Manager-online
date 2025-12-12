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
    const chartData = useMemo(() => {
        const days = 14;
        const data = [];
        const today = new Date();

        for (let i = days - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            const dayStr = d.toISOString().split('T')[0];

            const dailyTotal = sales
                .filter(s => s.date.startsWith(dayStr))
                .reduce((sum, s) => sum + s.totalAmount, 0);

            data.push({
                date: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
                sales: dailyTotal
            });
        }
        return data;
    }, [sales]);

    // Prepare Expense Data
    const expenseData = useMemo(() => {
        const breakdown: Record<string, number> = {};
        expenses.forEach(e => {
            breakdown[e.category] = (breakdown[e.category] || 0) + e.amount;
        });

        return Object.entries(breakdown)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [expenses]);

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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Sales Trend Chart (Large) */}
                <motion.div variants={itemVariants} className="lg:col-span-2">
                    <Card className="h-full min-h-[400px] flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="font-bold text-lg text-gray-800 dark:text-white flex items-center gap-2">
                                    <TrendingUp size={18} className="text-indigo-500" />
                                    Revenue Trajectory
                                </h3>
                                <p className="text-xs text-gray-500">Last 14 Days Performance</p>
                            </div>
                            <span className="text-sm font-bold bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full dark:bg-indigo-900/30 dark:text-indigo-300">
                                Total: ₹{chartData.reduce((a, b) => a + b.sales, 0).toLocaleString()}
                            </span>
                        </div>

                        <div className="flex-grow w-full h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5} />
                                    <XAxis
                                        dataKey="date"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 12, fill: '#94a3b8' }}
                                        dy={10}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 12, fill: '#94a3b8' }}
                                        tickFormatter={(value) => `₹${value / 1000}k`}
                                    />
                                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '5 5' }} />
                                    <Area
                                        type="monotone"
                                        dataKey="sales"
                                        stroke="#6366f1"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorSales)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </motion.div>

                {/* Expense Breakdown (Pie) */}
                <motion.div variants={itemVariants} className="lg:col-span-1">
                    <Card className="h-full min-h-[400px] flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-lg text-gray-800 dark:text-white flex items-center gap-2">
                                <PieIcon size={18} className="text-rose-500" />
                                Expense Distribution
                            </h3>
                        </div>

                        {expenseData.length > 0 ? (
                            <div className="flex-grow flex flex-col items-center justify-center relative">
                                <div className="w-full h-[250px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={expenseData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {expenseData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Legend */}
                                <div className="w-full space-y-2 mt-4 max-h-[150px] overflow-y-auto px-2 custom-scrollbar">
                                    {expenseData.map((entry, index) => (
                                        <div key={index} className="flex justify-between items-center text-xs">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                                <span className="text-gray-600 dark:text-gray-300 truncate max-w-[100px]">{entry.name}</span>
                                            </div>
                                            <span className="font-medium">₹{entry.value.toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="flex-grow flex flex-col items-center justify-center text-gray-400 space-y-2">
                                <PieIcon size={48} className="opacity-20" />
                                <span className="text-sm">No expense data available</span>
                            </div>
                        )}
                    </Card>
                </motion.div>
            </div>

        </motion.div>
    );
};

export default InsightsPage;
