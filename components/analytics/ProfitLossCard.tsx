import React from 'react';
import { IndianRupee, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import Card from '../Card';

interface ProfitLossCardProps {
    revenue: number;
    expenses: number;
    cogs: number; // Cost of Goods Sold
    className?: string;
}

const ProfitLossCard: React.FC<ProfitLossCardProps> = ({ revenue, expenses, cogs, className }) => {
    const totalCost = expenses + cogs;
    const netProfit = revenue - totalCost;
    const isProfitable = netProfit >= 0;
    const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

    return (
        <Card className={`bg-gradient-to-br min-w-0 ${isProfitable ? 'from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-emerald-200 dark:border-emerald-800' : 'from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-red-200 dark:border-red-800'} ${className}`}>
            <h3 className="font-bold text-gray-600 dark:text-gray-300 flex items-center gap-2 mb-4 truncate">
                <div className={`p-1.5 rounded-lg flex-shrink-0 ${isProfitable ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                    <DollarSign size={18} />
                </div>
                <span className="truncate">Net Profit Analysis</span>
            </h3>

            <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="min-w-0">
                    <p className="text-xs text-gray-500 uppercase font-semibold truncate">Total Revenue</p>
                    <p className="text-lg font-bold text-gray-800 dark:text-gray-200 truncate">₹{revenue.toLocaleString()}</p>
                </div>
                <div className="text-right min-w-0">
                    <p className="text-xs text-gray-500 uppercase font-semibold truncate">Total Costs</p>
                    <p className="text-lg font-bold text-gray-800 dark:text-gray-200 truncate">₹{totalCost.toLocaleString()}</p>
                    <p className="text-[10px] text-gray-400 truncate">(Exp + COGS)</p>
                </div>
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-700/50">
                <div className="flex justify-between items-end gap-2">
                    <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Net Profit</p>
                        <p className={`text-3xl font-extrabold truncate ${isProfitable ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                            {isProfitable ? '+' : ''}₹{netProfit.toLocaleString()}
                        </p>
                    </div>
                    <div className={`text-right flex-shrink-0 ${isProfitable ? 'text-emerald-600' : 'text-red-600'}`}>
                        <div className="flex items-center justify-end gap-1 font-bold text-lg">
                            {isProfitable ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                            {margin.toFixed(1)}%
                        </div>
                        <p className="text-[10px] uppercase font-semibold opacity-75">Margin</p>
                    </div>
                </div>
            </div>
        </Card>
    );
};

export default ProfitLossCard;
