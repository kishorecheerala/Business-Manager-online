import React, { useMemo } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Users } from 'lucide-react';
import Card from '../Card';
import { Sale } from '../../types';

interface CustomerGrowthChartProps {
    sales: Sale[];
}

const CustomerGrowthChart: React.FC<CustomerGrowthChartProps> = ({ sales }) => {
    const chartData = useMemo(() => {
        // 1. Determine first purchase date for each customer
        const firstPurchaseMap = new Map<string, string>(); // customerId -> ISODateString

        sales.forEach(sale => {
            if (!sale.customerId) return;
            const currentFirst = firstPurchaseMap.get(sale.customerId);
            if (!currentFirst || new Date(sale.date) < new Date(currentFirst)) {
                firstPurchaseMap.set(sale.customerId, sale.date);
            }
        });

        // 2. Group new customers by month
        const monthlyNewCustomers: Record<string, number> = {};

        // Find range
        if (sales.length === 0) return [];

        const dates = Array.from(firstPurchaseMap.values()).map(d => new Date(d));
        if (dates.length === 0) return [];

        const start = new Date(Math.min(...dates.map(d => d.getTime())));
        const end = new Date();
        const current = new Date(start.getFullYear(), start.getMonth(), 1);

        // Pre-fill months
        while (current <= end) {
            const key = current.toISOString().slice(0, 7); // YYYY-MM
            monthlyNewCustomers[key] = 0;
            current.setMonth(current.getMonth() + 1);
        }

        firstPurchaseMap.forEach(dateStr => {
            const key = new Date(dateStr).toISOString().slice(0, 7);
            if (monthlyNewCustomers[key] !== undefined) monthlyNewCustomers[key]++;
        });

        // 3. Compute cumulative
        const data: { date: string, count: number, fullDate: string }[] = [];
        let cumulative = 0;
        const monthKeys = Object.keys(monthlyNewCustomers).sort();

        monthKeys.forEach(key => {
            cumulative += monthlyNewCustomers[key];
            data.push({
                date: new Date(key + '-01').toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
                count: cumulative,
                fullDate: key
            });
        });

        return data;
    }, [sales]);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-xl border border-gray-100 dark:border-slate-700">
                    <p className="text-sm font-bold text-gray-700 dark:text-gray-200">{label}</p>
                    <p className="text-sm text-purple-600 font-medium">
                        {payload[0].value} Total Customers
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <Card className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="font-bold text-lg text-gray-800 dark:text-white flex items-center gap-2">
                        <Users size={18} className="text-purple-500" />
                        Customer Growth
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        Based on first purchase date
                    </p>
                </div>
            </div>

            <div className="flex-grow w-full" style={{ minWidth: 0, minHeight: 0, height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorCustomers" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
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
                            minTickGap={30}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: '#94a3b8' }}
                            width={30}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#a855f7', strokeWidth: 1, strokeDasharray: '5 5' }} />
                        <Area
                            type="monotone"
                            dataKey="count"
                            stroke="#a855f7"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorCustomers)"
                            // Disable animation to prevent infinite loop
                            animationDuration={0}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

export default CustomerGrowthChart;
