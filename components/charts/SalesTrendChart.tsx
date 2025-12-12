import React, { useMemo } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Sale } from '../../types';

interface SalesTrendChartProps {
    sales: Sale[];
    days?: number;
}

const SalesTrendChart: React.FC<SalesTrendChartProps> = ({ sales, days = 7 }) => {
    const data = useMemo(() => {
        const result = [];
        const today = new Date();

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(today.getDate() - i);
            const dateStr = date.toISOString().slice(0, 10);

            const daySales = sales.filter(s => s.date.startsWith(dateStr));
            const total = daySales.reduce((sum, s) => sum + Number(s.totalAmount), 0);

            result.push({
                name: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                date: dateStr,
                amount: total
            });
        }
        return result;
    }, [sales, days]);

    return (
        <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                    data={data}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                    <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.3} />
                    <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12 }}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => `₹${value}`}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            borderRadius: '8px',
                            border: 'none',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                        }}
                        formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Sales']}
                    />
                    <Area
                        type="monotone"
                        dataKey="amount"
                        stroke="#8884d8"
                        fillOpacity={1}
                        fill="url(#colorSales)"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

export default SalesTrendChart;
