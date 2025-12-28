import React, { memo } from 'react';
import { History, ImageIcon, Check } from 'lucide-react';
import { Product } from '../../types';
import { formatCurrency } from '../../utils/formatUtils';

interface ProductListItemProps {
    product: Product;
    isSelectionMode: boolean;
    isSelected: boolean;
    onToggleSelection: (id: string) => void;
    onClick: (product: Product) => void;
    onViewHistory: (product: Product) => void;
}

const ProductListItem: React.FC<ProductListItemProps> = memo(({
    product,
    isSelectionMode,
    isSelected,
    onToggleSelection,
    onClick,
    onViewHistory
}) => {
    return (
        <div
            onClick={() => {
                if (isSelectionMode) onToggleSelection(product.id);
                else onClick(product);
            }}
            className={`flex items-center gap-4 p-3 bg-white dark:bg-slate-800 rounded-xl border transition-all cursor-pointer group ${isSelected
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                : 'border-transparent hover:border-gray-300 dark:hover:border-slate-600 shadow-sm hover:shadow-md'
                }`}
        >
            {/* Checkbox (Visible in Selection Mode) */}
            {isSelectionMode && (
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-gray-400'}`}>
                    {isSelected && <Check size={12} className="text-white" />}
                </div>
            )}

            {/* Image Thumbnail */}
            <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-slate-700 overflow-hidden flex-shrink-0 relative">
                {product.image ? (
                    <img src={product.image} alt="" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <ImageIcon size={20} />
                    </div>
                )}
            </div>

            {/* Details */}
            <div className="flex-grow min-w-0">
                <h3 className="font-bold text-gray-800 dark:text-white truncate">{product.name}</h3>
                <p className="text-xs text-gray-500 font-mono truncate">{product.id}</p>
            </div>

            {/* Price & Stock */}
            <div className="text-right flex-shrink-0">
                <p className="font-bold text-primary">{formatCurrency(product.salePrice)}</p>
                <p className={`text-xs font-medium ${product.quantity < 5 ? 'text-red-500' : 'text-gray-500'}`}>
                    {product.quantity} in stock
                </p>
                <button
                    onClick={(e) => { e.stopPropagation(); onViewHistory(product); }}
                    className="mt-1 text-indigo-600 dark:text-indigo-400 text-xs hover:underline"
                >
                    History
                </button>
            </div>
        </div>
    );
});

export default ProductListItem;
