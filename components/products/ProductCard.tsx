import React, { memo } from 'react';
import { History, ImageIcon } from 'lucide-react';
import { Product } from '../../types';
import { formatCurrency } from '../../utils/formatUtils';

interface ProductCardProps {
    product: Product;
    isSelectionMode: boolean;
    isSelected: boolean;
    onToggleSelection: (id: string) => void;
    onClick: (product: Product) => void;
    onViewHistory: (product: Product) => void;
}

const ProductCard: React.FC<ProductCardProps> = memo(({
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
            className={`bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-sm border transition-all cursor-pointer relative group ${isSelected
                ? 'ring-2 ring-indigo-500'
                : 'hover:shadow-md hover:-translate-y-1'
                }`}
        >
            {/* Selection Overlay */}
            {isSelectionMode && (
                <div className="absolute top-2 right-2 z-10">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center bg-white ${isSelected ? 'border-indigo-500' : 'border-gray-300'}`}>
                        {isSelected && <div className="w-3 h-3 bg-indigo-500 rounded-full" />}
                    </div>
                </div>
            )}

            {/* History Button Overlay */}
            {!isSelectionMode && (
                <button
                    onClick={(e) => { e.stopPropagation(); onViewHistory(product); }}
                    className="absolute top-2 right-2 z-10 p-1.5 bg-white/80 dark:bg-black/50 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white hover:text-indigo-600 dark:hover:text-indigo-400 text-gray-600"
                    title="View History"
                >
                    <History size={16} />
                </button>
            )}

            {/* Image */}
            <div className="aspect-square bg-gray-100 dark:bg-slate-700 relative">
                {product.image ? (
                    <img src={product.image} alt="" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <ImageIcon size={32} />
                    </div>
                )}
                {product.quantity < 5 && (
                    <div className="absolute bottom-0 left-0 right-0 bg-red-500/90 text-white text-[10px] font-bold text-center py-1">
                        LOW STOCK
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="p-3">
                <h3 className="font-bold text-sm text-gray-800 dark:text-white truncate mb-1">{product.name}</h3>
                <div className="flex justify-between items-center">
                    <span className="text-primary font-bold text-sm">{formatCurrency(product.salePrice)}</span>
                    <span className="text-xs text-gray-500">{product.quantity} left</span>
                </div>
            </div>
        </div>
    );
});

export default ProductCard;
