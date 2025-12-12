import React, { useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { Award, Package } from 'lucide-react';
import Card from '../Card';
import { Sale } from '../../types';

interface TopProductsChartProps {
    sales: Sale[];
    className?: string;
}

const TopProductsChart: React.FC<TopProductsChartProps> = ({ sales, className }) => {

    const data = useMemo(() => {
        const productMap: Record<string, { name: string, quantity: number, revenue: number }> = {};

        sales.forEach(sale => {
            sale.items.forEach(item => {
                if (!productMap[item.productId]) {
                    productMap[item.productId] = {
                        name: item.productName,
                        quantity: 0,
                        revenue: 0
                    };
                }
                productMap[item.productId].quantity += item.quantity;
                productMap[item.productId].revenue += (item.quantity * item.price);
            });
        });

        return Object.values(productMap)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5)
            .map(p => ({
                name: p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name,
                fullName: p.name,
                value: p.revenue,
                quantity: p.quantity
            }));
    }, [sales]);

    if (data.length === 0) {
        return (
            <Card className={`h-full flex flex-col items-center justify-center text-gray-400 ${className}`}>
                <Package size={48} className="opacity-20 mb-2" />
                <p>No product data available</p>
            </Card>
        );
    }

    return (
        <Card className={`h-full flex flex-col ${className}`}>
            <h3 className="font-bold text-lg text-gray-800 dark:text-white flex items-center gap-2 mb-4">
                <Award size={18} className="text-indigo-500" />
                Top Selling Products
            </h3>

            <div className="flex-grow min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <XAxis type="number" hide />
                        <YAxis
                            dataKey="name"
                            type="category"
                            width={100}
                            tick={{ fontSize: 11, fill: '#64748b' }}
                        />
                        <Tooltip
                            cursor={{ fill: 'transparent' }}
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    return (
                                        <div className="bg-white dark:bg-slate-800 p-2 rounded shadow-lg border dark:border-slate-700">
                                            <p className="text-sm font-bold dark:text-white">{data.fullName}</p>
                                            <p className="text-xs text-gray-500">{data.quantity} units sold</p>
                                            <p className="text-sm text-indigo-600 font-bold">₹{data.value.toLocaleString()}</p>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Bar
                            dataKey="value"
                            radius={[0, 4, 4, 0]}
                            barSize={30}
                            label={{ position: 'right', fill: '#64748b', fontSize: 11, formatter: (val: number) => `₹${val.toLocaleString()}` }}
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={index === 0 ? '#6366f1' : '#8b5cf6'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

export default TopProductsChart;
