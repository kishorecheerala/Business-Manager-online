import React, { useMemo } from 'react';
import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer
} from 'recharts';
import { PieChart as PieIcon } from 'lucide-react';
import Card from '../Card';
import { Sale, Product } from '../../types';

interface CategoryDistributionChartProps {
    sales: Sale[];
    products: Product[];
    className?: string;
}

const CategoryDistributionChart: React.FC<CategoryDistributionChartProps> = ({ sales, products, className }) => {

    const data = useMemo(() => {
        const categoryMap: Record<string, number> = {};

        sales.forEach(sale => {
            sale.items.forEach(item => {
                const product = products.find(p => p.id === item.productId);
                const category = product?.category || 'Uncategorized';
                const amount = Number(item.price) * Number(item.quantity);
                categoryMap[category] = (categoryMap[category] || 0) + amount;
            });
        });

        return Object.entries(categoryMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [sales, products]);

    const COLORS = ['#6366f1', '#f43f5e', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4'];

    if (data.length === 0) {
        return (
            <Card className={`h-full flex flex-col items-center justify-center text-gray-400 ${className}`}>
                <PieIcon size={48} className="opacity-20 mb-2" />
                <p>No sales data available</p>
            </Card>
        );
    }

    return (
        <Card className={`h-full flex flex-col ${className}`}>
            <h3 className="font-bold text-lg text-gray-800 dark:text-white flex items-center gap-2 mb-4">
                <PieIcon size={18} className="text-rose-500" />
                Sales by Category
            </h3>

            <div className="flex-grow flex flex-col items-center justify-center relative min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                            formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Revenue']}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                    </PieChart>
                </ResponsiveContainer>

                {/* Legend */}
                <div className="w-full space-y-2 mt-4 max-h-[150px] overflow-y-auto px-2 custom-scrollbar">
                    {data.map((entry, index) => (
                        <div key={index} className="flex justify-between items-center text-xs">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                <span className="text-gray-600 dark:text-gray-300 truncate max-w-[120px]">{entry.name}</span>
                            </div>
                            <span className="font-medium dark:text-gray-200">₹{entry.value.toLocaleString()}</span>
                        </div>
                    ))}
                </div>
            </div>
        </Card>
    );
};

export default CategoryDistributionChart;
