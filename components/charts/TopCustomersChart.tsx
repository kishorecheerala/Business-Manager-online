import React, { useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { Users, Crown } from 'lucide-react';
import Card from '../Card';
import { Sale, Customer } from '../../types';

interface TopCustomersChartProps {
    sales: Sale[];
    customers: Customer[];
    className?: string;
}

const TopCustomersChart: React.FC<TopCustomersChartProps> = ({ sales, customers, className }) => {

    const data = useMemo(() => {
        const customerMap: Record<string, number> = {};

        sales.forEach(sale => {
            if (sale.customerId) {
                customerMap[sale.customerId] = (customerMap[sale.customerId] || 0) + Number(sale.totalAmount);
            }
        });

        return Object.entries(customerMap)
            .map(([id, value]) => {
                const customer = customers.find(c => c.id === id);
                return {
                    name: customer?.name || 'Unknown',
                    value: value,
                    id: id
                };
            })
            .sort((a, b) => b.value - a.value)
            .slice(0, 5); // Top 5
    }, [sales, customers]);

    if (data.length === 0) {
        return (
            <Card className={`h-full flex flex-col items-center justify-center text-gray-400 ${className}`}>
                <Users size={48} className="opacity-20 mb-2" />
                <p>No customer data available</p>
            </Card>
        );
    }

    return (
        <Card className={`h-full flex flex-col ${className}`}>
            <h3 className="font-bold text-lg text-gray-800 dark:text-white flex items-center gap-2 mb-4">
                <Crown size={18} className="text-amber-500" />
                Top Customers
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
                            formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Total Spent']}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={30} label={{ position: 'right', fill: '#64748b', fontSize: 11, formatter: (val: number) => `₹${val.toLocaleString()}` }}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={index === 0 ? '#f59e0b' : '#6366f1'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

export default TopCustomersChart;
