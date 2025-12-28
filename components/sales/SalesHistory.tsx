import React, { useMemo, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Search, Trash2, Printer, FileText, ArrowRight, Eye, Edit } from 'lucide-react';
import { Sale, Customer } from '../../types';
import { formatDate, formatCurrency } from '../../utils/formatUtils';
import Button from '../Button';
import Card from '../Card';
import Input from '../Input';

interface SalesHistoryProps {
    sales: Sale[];
    customers: Customer[];
    onEdit: (sale: Sale) => void;
    onDelete: (saleIds: Set<string>) => void;
    onPrint: (sale: Sale) => void;
}

const SalesHistory: React.FC<SalesHistoryProps> = ({
    sales,
    customers,
    onEdit,
    onDelete,
    onPrint
}) => {
    const [search, setSearch] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isSelectionMode, setIsSelectionMode] = useState(false);

    const filteredSales = useMemo(() => {
        const lowerSearch = search.toLowerCase();
        return sales
            .filter(sale => {
                const customer = customers.find(c => c.id === sale.customerId);
                const searchStr = `${customer?.name || ''} ${sale.id} ${sale.totalAmount}`.toLowerCase();
                return searchStr.includes(lowerSearch);
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [sales, customers, search]);

    const parentRef = React.useRef<HTMLDivElement>(null);

    const rowVirtualizer = useVirtualizer({
        count: filteredSales.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 72, // Estimated height of a row
        overscan: 5,
    });

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const handleSelectAll = () => {
        if (selectedIds.size === filteredSales.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(filteredSales.map(s => s.id)));
    };

    const handleBulkDelete = () => {
        if (selectedIds.size > 0) {
            onDelete(selectedIds);
            setSelectedIds(new Set());
            setIsSelectionMode(false);
        }
    };

    return (
        <Card className="h-full flex flex-col">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-4">
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <Input
                        placeholder="Search sales..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10"
                    />
                </div>

                <div className="flex gap-2">
                    {isSelectionMode && (
                        <>
                            <Button
                                onClick={handleBulkDelete}
                                variant="danger"
                                disabled={selectedIds.size === 0}
                            >
                                <Trash2 size={16} className="mr-2" /> Delete ({selectedIds.size})
                            </Button>
                            <Button onClick={() => setIsSelectionMode(false)} variant="secondary">
                                Cancel
                            </Button>
                            <Button onClick={handleSelectAll} variant="secondary">
                                {selectedIds.size === filteredSales.length ? 'Deselect All' : 'Select All'}
                            </Button>
                        </>
                    )}
                    {!isSelectionMode && (
                        <Button onClick={() => setIsSelectionMode(true)} variant="secondary">
                            Select
                        </Button>
                    )}
                </div>
            </div>

            <div className="flex-grow overflow-hidden border rounded-lg dark:border-slate-700 bg-white dark:bg-slate-800">
                <div className="h-full overflow-auto" ref={parentRef}>
                    <div
                        style={{
                            height: `${rowVirtualizer.getTotalSize()}px`,
                            width: '100%',
                            position: 'relative',
                        }}
                    >
                        {filteredSales.length === 0 && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                                <FileText size={48} className="mb-2 opacity-50" />
                                <p>No sales found</p>
                            </div>
                        )}

                        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                            const sale = filteredSales[virtualRow.index];
                            const customer = customers.find(c => c.id === sale.customerId);
                            const isSelected = selectedIds.has(sale.id);

                            return (
                                <div
                                    key={sale.id}
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        height: `${virtualRow.size}px`,
                                        transform: `translateY(${virtualRow.start}px)`,
                                    }}
                                    className={`
                                        flex items-center justify-between p-3 border-b dark:border-slate-700 transition-colors
                                        ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-slate-700/50'}
                                    `}
                                    onClick={() => isSelectionMode && toggleSelection(sale.id)}
                                >
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        {isSelectionMode && (
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => { }} // Handled by div click
                                                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                                            />
                                        )}

                                        <div className="min-w-0">
                                            <p className="font-bold text-gray-800 dark:text-white truncate">
                                                {customer?.name || 'Unknown Customer'}
                                            </p>
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <span>{formatDate(sale.date)}</span>
                                                <span>•</span>
                                                <span className="font-mono">{sale.id}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 flex-shrink-0 ml-2">
                                        <div className="text-right">
                                            <p className="font-bold text-primary">{formatCurrency(sale.totalAmount)}</p>
                                            <p className="text-xs text-gray-500">{sale.items.length} items</p>
                                        </div>

                                        {!isSelectionMode && (
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    onClick={(e) => { e.stopPropagation(); onPrint(sale); }}
                                                    variant="ghost"
                                                    className="p-1 h-8 w-8 text-gray-400 hover:text-primary"
                                                    title="Print Inference"
                                                >
                                                    <Printer size={16} />
                                                </Button>
                                                <Button
                                                    onClick={(e) => { e.stopPropagation(); onEdit(sale); }}
                                                    variant="ghost"
                                                    className="p-1 h-8 w-8 text-gray-400 hover:text-blue-500"
                                                    title="Edit Sale"
                                                >
                                                    <Edit size={16} />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </Card>
    );
};

export default React.memo(SalesHistory);
