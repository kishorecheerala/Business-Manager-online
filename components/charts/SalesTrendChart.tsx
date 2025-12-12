import React, { useState, useMemo } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { TrendingUp, Calendar } from 'lucide-react';
import Card from '../Card';
import { Sale } from '../../types';

interface SalesTrendChartProps {
    sales: Sale[];
    className?: string;
}

const SalesTrendChart: React.FC<SalesTrendChartProps> = ({ sales, className }) => {
    const [days, setDays] = useState(14);

    const chartData = useMemo(() => {
        const data = [];
        const today = new Date();

        for (let i = days - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            const dayStr = d.toISOString().split('T')[0];

            const dailyTotal = sales
                .filter(s => s.date.startsWith(dayStr))
                .reduce((sum, s) => sum + Number(s.totalAmount), 0);

            data.push({
                date: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
                sales: dailyTotal,
                fullDate: dayStr
            });
        }
        return data;
    }, [sales, days]);

    const totalRevenue = chartData.reduce((a, b) => a + b.sales, 0);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-xl border border-gray-100 dark:border-slate-700">
                    <p className="text-sm font-bold text-gray-700 dark:text-gray-200">{label}</p>
                    <p className="text-sm text-indigo-600 font-medium">
                        ₹{Number(payload[0].value).toLocaleString('en-IN')}
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <Card className={`h-full flex flex-col ${className}`}>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="font-bold text-lg text-gray-800 dark:text-white flex items-center gap-2">
                        <TrendingUp size={18} className="text-indigo-500" />
                        Revenue Trajectory
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        Total ₹{totalRevenue.toLocaleString('en-IN')} in last {days} days
                    </p>
                </div>

                <div className="flex bg-gray-100 dark:bg-slate-700 rounded-lg p-1 text-xs font-medium">
                    {[7, 14, 30, 90].map(d => (
                        <button
                            key={d}
                            onClick={() => setDays(d)}
                            className={`px-3 py-1 rounded-md transition-all ${days === d
                                ? 'bg-white dark:bg-slate-600 shadow text-indigo-600 dark:text-indigo-300'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                        >
                            {d}d
                        </button>
                    ))}
                </div>
            </div>

            {/* Removed min-h to fit parent height strictly */}
            <div className="flex-grow w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                            tick={{ fontSize: 10, fill: '#94a3b8' }}
                            dy={10}
                            interval="preserveStartEnd"
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: '#94a3b8' }}
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
                            animationDuration={1000}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

export default SalesTrendChart;
