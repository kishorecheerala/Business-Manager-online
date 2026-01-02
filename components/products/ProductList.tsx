import React, { useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Product } from '../../types';
import ProductCard from './ProductCard';
import ProductListItem from './ProductListItem';
import EmptyState from '../EmptyState';
import { Package, Plus } from 'lucide-react';
import Button from '../Button';

interface ProductListProps {
    products: Product[];
    viewMode: 'list' | 'grid';
    isSelectionMode: boolean;
    selectedIds: Set<string>;
    onToggleSelection: (id: string) => void;
    onSelectProduct: (product: Product) => void;
    onViewHistory: (product: Product) => void;
    onAddProduct: () => void;
    searchTerm: string;
}

const ProductList: React.FC<ProductListProps> = ({
    products,
    viewMode,
    isSelectionMode,
    selectedIds,
    onToggleSelection,
    onSelectProduct,
    onViewHistory,
    onAddProduct,
    searchTerm
}) => {
    const parentRef = useRef<HTMLDivElement>(null);

    // Responsive Columns Logic for Grid
    // We can use a resize observer or just assume width based on window for simplicity in this step.
    // For a robust implementation, use a hook like useWindowSize or similar. 
    // Here we'll rely on CSS grid for layout within rows, but we need strictly defined rows for virtualizer.
    // Let's assume columns based on breakdown:
    // mobile: 2, sm: 3, md: 4 
    const getColumns = () => {
        if (typeof window === 'undefined') return 1;
        if (window.innerWidth >= 768) return 4;
        if (window.innerWidth >= 640) return 3;
        return 2;
    };
    const [columns, setColumns] = React.useState(getColumns());

    React.useEffect(() => {
        const handleResize = () => setColumns(getColumns());
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const count = viewMode === 'list' ? products.length : Math.ceil(products.length / columns);

    const rowVirtualizer = useVirtualizer({
        count,
        getScrollElement: () => parentRef.current,
        estimateSize: () => viewMode === 'list' ? 80 : 380,
        overscan: 5,
        measureElement: (el) => (el as HTMLElement).offsetHeight,
    });

    if (products.length === 0) {
        return (
            <div className="h-full flex items-center justify-center">
                <EmptyState
                    icon={Package}
                    title="No Products Found"
                    description={searchTerm ? "Try adjusting your search terms." : "Start by adding your first product."}
                    action={!searchTerm && (
                        <Button onClick={onAddProduct}>
                            <Plus size={18} className="mr-2" /> Add Product
                        </Button>
                    )}
                />
            </div>
        );
    }

    return (
        <div
            ref={parentRef}
            className="flex-grow overflow-auto h-full w-full px-4 pt-4 custom-scrollbar pb-32"
        >
            <div
                style={{
                    height: `${rowVirtualizer.getTotalSize()}px`,
                    width: '100%',
                    position: 'relative',
                    paddingTop: '1rem' // Prevents first row hover scale from being clipped
                }}
                className="z-0"
            >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const isList = viewMode === 'list';
                    // For List: 1 item per row. For Grid: 'columns' items per row.

                    if (isList) {
                        const product = products[virtualRow.index];
                        return (
                            <div
                                key={product.id}
                                data-index={virtualRow.index}
                                ref={rowVirtualizer.measureElement}
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    transform: `translateY(${virtualRow.start}px)`,
                                    paddingBottom: '1rem' // Gap between rows
                                }}
                            >
                                <ProductListItem
                                    product={product}
                                    isSelectionMode={isSelectionMode}
                                    isSelected={selectedIds.has(product.id)}
                                    onToggleSelection={onToggleSelection}
                                    onClick={onSelectProduct}
                                    onViewHistory={onViewHistory}
                                />
                            </div>
                        );
                    } else {
                        // Grid Mode
                        const startIndex = virtualRow.index * columns;
                        const rowProducts = products.slice(startIndex, startIndex + columns);

                        return (
                            <div
                                key={virtualRow.index}
                                data-index={virtualRow.index}
                                ref={rowVirtualizer.measureElement}
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    transform: `translateY(${virtualRow.start}px)`,
                                    paddingBottom: '1.5rem' // Gap between grid rows
                                }}
                                className="hover:z-20"
                            >
                                <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 w-full`}>
                                    {rowProducts.map(product => (
                                        <ProductCard
                                            key={product.id}
                                            product={product}
                                            isSelectionMode={isSelectionMode}
                                            isSelected={selectedIds.has(product.id)}
                                            onToggleSelection={onToggleSelection}
                                            onClick={onSelectProduct}
                                            onViewHistory={onViewHistory}
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    }
                })}
            </div>
        </div>
    );
};

export default ProductList;
