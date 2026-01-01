import React from 'react';
import { Info } from 'lucide-react';
import { formatNumber, formatCurrency } from '../../utils/formatUtils';

interface MetricCardProps {
    icon: React.ElementType;
    title: string;
    value: string | number;
    color: string;
    iconBgColor: string;
    textColor: string;
    unit?: string;
    subValue?: string;
    tooltip?: string;
    onClick?: () => void;
    delay?: number;
}

const MetricCard: React.FC<MetricCardProps> = ({
    icon: Icon,
    title,
    value,
    color,
    iconBgColor,
    textColor,
    unit = '₹',
    subValue,
    tooltip,
    onClick,
    delay
}) => {
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onClick();
        }
    };

    return (
        <div
            onClick={onClick}
            className={`rounded-lg shadow-md p-3 sm:p-4 flex items-center transition-all duration-300 hover:shadow-xl hover:scale-[1.01] hover:z-10 ${color} ${onClick ? 'cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-primary/50' : ''} animate-slide-up-fade group relative`}
            style={{ animationDelay: `${delay || 0}ms` }}
            role={onClick ? 'button' : undefined}
            title={tooltip}
            tabIndex={onClick ? 0 : undefined}
            onKeyDown={handleKeyDown}
        >
            <div className={`p-2 sm:p-3 ${iconBgColor} rounded-full flex-shrink-0 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6`}>
                <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${textColor}`} />
            </div>
            <div className="ml-3 sm:ml-4 flex-grow min-w-0">
                <div className="flex items-center gap-1">
                    <p className={`font-bold text-sm sm:text-base ${textColor} truncate`}>{title}</p>
                    {tooltip && (
                        <div className="group/tooltip relative">
                            <Info size={12} className={`${textColor} opacity-70`} />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-[10px] rounded shadow-lg whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-10">
                                {tooltip}
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                            </div>
                        </div>
                    )}
                </div>
                <p className={`text-lg sm:text-xl font-extrabold ${textColor} break-all mt-0.5`}>
                    {unit === '₹' ? formatCurrency(value) : `${unit}${typeof value === 'number' ? formatNumber(value) : value}`}
                </p>
                {subValue && <p className={`text-[10px] sm:text-xs font-medium mt-0.5 opacity-90 ${textColor} truncate`}>{subValue}</p>}
            </div>
        </div>
    );
};

export default MetricCard;
