import React, { useMemo } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { TrendingDown, TrendingUp } from 'lucide-react';
import Card from '../Card';
import { Sale, Expense } from '../../types';

interface ExpenseTrendChartProps {
    sales: Sale[];
    expenses: Expense[];
    className?: string;
}

const ExpenseTrendChart: React.FC<ExpenseTrendChartProps> = ({ sales, expenses, className }) => {

    const chartData = useMemo(() => {
        const data: Record<string, { date: string, revenue: number, expenses: number }> = {};
        const today = new Date();

        // Show last 30 days
        for (let i = 29; i >= 0; i--) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            const key = d.toISOString().split('T')[0];
            data[key] = {
                date: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
                revenue: 0,
                expenses: 0
            };
        }

        // Aggregate Revenue
        sales.forEach(s => {
            const key = s.date.split('T')[0];
            if (data[key]) {
                data[key].revenue += Number(s.totalAmount);
            }
        });

        // Aggregate Expenses
        expenses.forEach(e => {
            const key = e.date.split('T')[0];
            if (data[key]) {
                data[key].expenses += Number(e.amount);
            }
        });

        return Object.values(data);
    }, [sales, expenses]);

    if (expenses.length === 0) {
        return (
            <Card className={`h-full flex flex-col items-center justify-center text-gray-400 ${className}`}>
                <TrendingDown size={48} className="opacity-20 mb-2" />
                <p>No expense data available</p>
            </Card>
        );
    }

    return (
        <Card className={`h-full flex flex-col ${className}`}>
            <h3 className="font-bold text-lg text-gray-800 dark:text-white flex items-center gap-2 mb-4">
                <TrendingDown size={18} className="text-rose-500" />
                Revenue vs Expenses
            </h3>

            <div className="flex-grow min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5} />
                        <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: '#94a3b8' }}
                            interval="preserveStartEnd"
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: '#94a3b8' }}
                            tickFormatter={(val) => `₹${val / 1000}k`}
                        />
                        <Tooltip
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            formatter={(value: number, name: string) => [`₹${value.toLocaleString()}`, name === 'revenue' ? 'Revenue' : 'Expenses']}
                        />
                        <Legend verticalAlign="top" height={36} iconType="circle" />
                        <Line
                            type="monotone"
                            dataKey="revenue"
                            stroke="#6366f1"
                            strokeWidth={2}
                            dot={false}
                            name="Revenue"
                        />
                        <Line
                            type="monotone"
                            dataKey="expenses"
                            stroke="#f43f5e"
                            strokeWidth={2}
                            dot={false}
                            name="Expenses"
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

export default ExpenseTrendChart;
