
import React, { useMemo } from 'react';
import Card from '../Card';
import { Sale } from '../../types';
import { CalendarClock } from 'lucide-react';

interface SalesHeatmapChartProps {
    sales: Sale[];
}

const SalesHeatmapChart: React.FC<SalesHeatmapChartProps> = ({ sales }) => {
    const data = useMemo(() => {
        // Initialize 7 days x 24 hours grid
        const grid = Array(7).fill(0).map(() => Array(24).fill(0));
        let maxVal = 0;

        sales.forEach(sale => {
            const d = new Date(sale.date);
            const day = d.getDay(); // 0 = Sunday
            const hour = d.getHours();
            grid[day][hour] += 1; // Count sales (or use revenue)
            if (grid[day][hour] > maxVal) maxVal = grid[day][hour];
        });

        return { grid, maxVal };
    }, [sales]);

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const hours = [
        '12 AM', '3 AM', '6 AM', '9 AM', '12 PM', '3 PM', '6 PM', '9 PM'
    ];

    const getColor = (value: number) => {
        if (value === 0) return 'bg-gray-50 dark:bg-slate-800/50';
        const intensity = Math.ceil((value / data.maxVal) * 4); // 1-4 scale
        switch (intensity) {
            case 1: return 'bg-indigo-100 dark:bg-indigo-900/30';
            case 2: return 'bg-indigo-300 dark:bg-indigo-700/50';
            case 3: return 'bg-indigo-500 dark:bg-indigo-600';
            case 4: return 'bg-indigo-700 dark:bg-indigo-500';
            default: return 'bg-gray-50';
        }
    };

    return (
        <Card className="h-full">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg text-gray-800 dark:text-white flex items-center gap-2">
                    <CalendarClock size={18} className="text-indigo-500" />
                    Peak Shopping Times
                </h3>
            </div>

            <div className="overflow-x-auto">
                <div className="min-w-[600px]">
                    <div className="grid grid-cols-[auto_repeat(24,1fr)] gap-1">
                        {/* Header Row (Hours) */}
                        <div className="h-6"></div> {/* Spacer for corner */}
                        {Array.from({ length: 24 }).map((_, h) => (
                            <div key={h} className="text-[9px] text-center text-gray-400">
                                {h % 3 === 0 ? (h === 0 || h === 12 ? (h === 0 ? '12a' : '12p') : (h > 12 ? h - 12 : h)) : ''}
                            </div>
                        ))}

                        {/* Data Rows */}
                        {days.map((day, dIdx) => (
                            <React.Fragment key={day}>
                                <div className="text-xs text-gray-500 font-medium self-center pr-2">{day}</div>
                                {data.grid[dIdx].map((val, hIdx) => (
                                    <div
                                        key={hIdx}
                                        className={`h-6 rounded-sm transition-colors cursor-default ${getColor(val)}`}
                                        title={`${day} ${hIdx}:00 - ${val} Sales`}
                                    />
                                ))}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            </div>
            <div className="mt-4 flex items-center justify-end gap-2 text-xs text-gray-400">
                <span>Less</span>
                <div className="flex gap-1">
                    <div className="w-3 h-3 rounded-sm bg-indigo-100 dark:bg-indigo-900/30"></div>
                    <div className="w-3 h-3 rounded-sm bg-indigo-300 dark:bg-indigo-700/50"></div>
                    <div className="w-3 h-3 rounded-sm bg-indigo-500 dark:bg-indigo-600"></div>
                    <div className="w-3 h-3 rounded-sm bg-indigo-700 dark:bg-indigo-500"></div>
                </div>
                <span>More</span>
            </div>
        </Card>
    );
};

export default SalesHeatmapChart;
