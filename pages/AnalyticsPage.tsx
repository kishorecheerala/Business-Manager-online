import React, { useMemo, useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, ComposedChart
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Users, Package, Calendar } from 'lucide-react';
import { useData } from '../context/DataContext';
import Card from '../components/Card';
import { formatCurrency, formatDate } from '../utils/formatUtils';
import { Sale, Expense, Product } from '../types';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const AnalyticsPage: React.FC = () => {
    const { state } = useData();
    const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year' | 'all'>('month');

    // --- Data Processing Helpers ---

    const getStartDate = () => {
        const now = new Date();
        if (timeRange === 'week') return new Date(now.setDate(now.getDate() - 7));
        if (timeRange === 'month') return new Date(now.setMonth(now.getMonth() - 1));
        if (timeRange === 'year') return new Date(now.setFullYear(now.getFullYear() - 1));
        return new Date(0); // All time
    };

    const filterByDate = (dateStr: string) => {
        return new Date(dateStr) >= getStartDate();
    };

    const filteredSales = useMemo(() => state.sales.filter(s => filterByDate(s.date)), [state.sales, timeRange]);
    const filteredExpenses = useMemo(() => state.expenses.filter(e => filterByDate(e.date)), [state.expenses, timeRange]);

    // Financial Metrics
    const metrics = useMemo(() => {
        const revenue = filteredSales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
        const expenseTotal = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
        // COGS estimation (simplified)
        const cogs = filteredSales.reduce((sum, s) => {
            return sum + s.items.reduce((itemSum, item) => {
                const product = state.products.find(p => p.id === item.productId);
                return itemSum + (Number(product?.purchasePrice || 0) * Number(item.quantity));
            }, 0);
        }, 0);

        const grossProfit = revenue - cogs;
        const netProfit = grossProfit - expenseTotal;
        const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

        return { revenue, expenseTotal, cogs, grossProfit, netProfit, margin };
    }, [filteredSales, filteredExpenses, state.products]);


    // Chart Data: Revenue vs Expenses (Daily/Monthly)
    const revenueVsExpenseData = useMemo(() => {
        const dataMap = new Map<string, { date: string, revenue: number, expense: number, profit: number }>();

        filteredSales.forEach(s => {
            const date = new Date(s.date).toLocaleDateString(); // Aggregate by day for now
            if (!dataMap.has(date)) dataMap.set(date, { date, revenue: 0, expense: 0, profit: 0 });
            const entry = dataMap.get(date)!;
            entry.revenue += Number(s.totalAmount);
        });

        filteredExpenses.forEach(e => {
            const date = new Date(e.date).toLocaleDateString();
            if (!dataMap.has(date)) dataMap.set(date, { date, revenue: 0, expense: 0, profit: 0 });
            const entry = dataMap.get(date)!;
            entry.expense += Number(e.amount);
        });

        // Calculate Profit for each day
        dataMap.forEach(entry => entry.profit = entry.revenue - entry.expense);

        return Array.from(dataMap.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [filteredSales, filteredExpenses]);

    // Chart Data: Top Selling Products
    const topProductsData = useMemo(() => {
        const productMap = new Map<string, number>();
        filteredSales.forEach(s => {
            s.items.forEach(i => {
                const current = productMap.get(i.productId) || 0;
                productMap.set(i.productId, current + i.quantity); // By Qty
            });
        });

        return Array.from(productMap.entries())
            .map(([id, qty]) => {
                const p = state.products.find(prod => prod.id === id);
                return { name: p?.name || id, quantity: qty };
            })
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 5);
    }, [filteredSales, state.products]);

    // Chart Data: Category Distribution
    const categoryData = useMemo(() => {
        const catMap = new Map<string, number>();
        filteredSales.forEach(s => {
            s.items.forEach(i => {
                const p = state.products.find(prod => prod.id === i.productId);
                const cat = p?.category || 'Uncategorized';
                const revenue = Number(i.price) * Number(i.quantity);
                catMap.set(cat, (catMap.get(cat) || 0) + revenue);
            });
        });

        return Array.from(catMap.entries()).map(([name, value]) => ({ name, value }));
    }, [filteredSales, state.products]);


    return (
        <div className="space-y-6 animate-fade-in-fast pb-20">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Business Analytics</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Deep dive into your financial health</p>
                </div>
                <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-lg">
                    {(['week', 'month', 'year', 'all'] as const).map(range => (
                        <button
                            key={range}
                            onClick={() => setTimeRange(range)}
                            className={`px-3 py-1 text-sm rounded-md capitalize transition-colors ${timeRange === range ? 'bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            {range}
                        </button>
                    ))}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-l-4 border-indigo-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs text-slate-500 uppercase font-bold">Total Revenue</p>
                            <h3 className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{formatCurrency(metrics.revenue)}</h3>
                        </div>
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600">
                            <DollarSign size={20} />
                        </div>
                    </div>
                </Card>
                <Card className="border-l-4 border-green-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs text-slate-500 uppercase font-bold">Net Profit</p>
                            <h3 className={`text-2xl font-bold mt-1 ${metrics.netProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                {formatCurrency(metrics.netProfit)}
                            </h3>
                            <p className="text-xs text-slate-400 mt-1">Margin: {metrics.margin.toFixed(1)}%</p>
                        </div>
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600">
                            <TrendingUp size={20} />
                        </div>
                    </div>
                </Card>
                <Card className="border-l-4 border-orange-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs text-slate-500 uppercase font-bold">Expenses</p>
                            <h3 className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{formatCurrency(metrics.expenseTotal)}</h3>
                        </div>
                        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg text-orange-600">
                            <TrendingDown size={20} />
                        </div>
                    </div>
                </Card>
                <Card className="border-l-4 border-blue-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs text-slate-500 uppercase font-bold">Transactions</p>
                            <h3 className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{filteredSales.length}</h3>
                            <p className="text-xs text-slate-400 mt-1">Avg: {filteredSales.length > 0 ? formatCurrency(metrics.revenue / filteredSales.length) : 0}</p>
                        </div>
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600">
                            <Package size={20} />
                        </div>
                    </div>
                </Card>
            </div>

            {/* Charts Section 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Revenue vs Expenses Trend" className="min-h-[400px]">
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={revenueVsExpenseData}>
                                <defs>
                                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                <XAxis dataKey="date" fontSize={12} tickMargin={10} />
                                <YAxis fontSize={12} />
                                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                <Legend />
                                <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorRev)" name="Revenue" />
                                <Area type="monotone" dataKey="expense" stroke="#ef4444" fillOpacity={1} fill="url(#colorExp)" name="Expenses" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card title="Sales by Category" className="min-h-[400px]">
                    <div className="h-[350px] w-full flex items-center justify-center">
                        {categoryData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={categoryData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                        outerRadius={120}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {categoryData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="text-gray-400 text-sm">No sales data available for this period</div>
                        )}
                    </div>
                </Card>
            </div>

            {/* Charts Section 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Top Selling Products (Qty)" className="min-h-[400px]">
                    <div className="h-[350px] w-full">
                        {topProductsData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart layout="vertical" data={topProductsData} margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                                    <XAxis type="number" />
                                    <YAxis dataKey="name" type="category" width={100} fontSize={12} />
                                    <Tooltip />
                                    <Bar dataKey="quantity" fill="#0ea5e9" radius={[0, 4, 4, 0]} name="Units Sold" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="text-gray-400 text-sm h-full flex items-center justify-center">No product data available</div>
                        )}
                    </div>
                </Card>

                <Card title="Profitability Analysis" className="min-h-[400px]">
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={revenueVsExpenseData}>
                                <CartesianGrid stroke="#f5f5f5" />
                                <XAxis dataKey="date" scale="band" fontSize={10} />
                                <YAxis fontSize={10} />
                                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                <Legend />
                                <Bar dataKey="profit" barSize={20} fill="#10b981" name="Net Profit" />
                                <Line type="monotone" dataKey="revenue" stroke="#8b5cf6" name="Revenue" />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default AnalyticsPage;
