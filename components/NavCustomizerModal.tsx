import React, { useState, useEffect } from 'react';
import { X, GripVertical, Check, Info } from 'lucide-react';
import Card from './Card';
import Button from './Button';
import { useAppContext } from '../context/AppContext';
import { Page } from '../types';
import { Home, Users, ShoppingCart, Package, Receipt, Undo2, FileText, BarChart2, PenTool, Gauge } from 'lucide-react';

interface NavCustomizerModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const PAGE_ICONS: Record<string, React.ElementType> = {
    'DASHBOARD': Home,
    'CUSTOMERS': Users,
    'SALES': ShoppingCart,
    'PURCHASES': Package,
    'INSIGHTS': BarChart2,
    'PRODUCTS': Package, 
    'REPORTS': FileText,
    'EXPENSES': Receipt,
    'RETURNS': Undo2,
    'QUOTATIONS': FileText,
    'INVOICE_DESIGNER': PenTool,
    'SYSTEM_OPTIMIZER': Gauge,
};

const PAGE_LABELS: Record<string, string> = {
    'DASHBOARD': 'Home',
    'CUSTOMERS': 'Customers',
    'SALES': 'Sales',
    'PURCHASES': 'Purchases',
    'INSIGHTS': 'Insights',
    'PRODUCTS': 'Products',
    'REPORTS': 'Reports',
    'EXPENSES': 'Expenses',
    'RETURNS': 'Returns',
    'QUOTATIONS': 'Estimates',
    'INVOICE_DESIGNER': 'Designer',
    'SYSTEM_OPTIMIZER': 'System',
};

const NavCustomizerModal: React.FC<NavCustomizerModalProps> = ({ isOpen, onClose }) => {
    const { state, dispatch, showToast } = useAppContext();
    const [currentOrder, setCurrentOrder] = useState<string[]>([]);
    
    // For manual drag fallback (touch-based swapping)
    const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

    useEffect(() => {
        if (isOpen) {
            setCurrentOrder([...state.navOrder]);
        }
    }, [isOpen, state.navOrder]);

    const handleSave = () => {
        dispatch({ type: 'UPDATE_NAV_ORDER', payload: currentOrder });
        showToast("Navigation layout updated.");
        onClose();
    };

    const onDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        e.dataTransfer.setData("text/plain", index.toString());
        e.dataTransfer.effectAllowed = "move";
        setDraggedItemIndex(index);
    };

    const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    };

    const onDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
        e.preventDefault();
        const dragIndexStr = e.dataTransfer.getData("text/plain");
        const dragIndex = parseInt(dragIndexStr, 10);
        
        if (dragIndex !== dropIndex) {
            const newOrder = [...currentOrder];
            const [movedItem] = newOrder.splice(dragIndex, 1);
            newOrder.splice(dropIndex, 0, movedItem);
            setCurrentOrder(newOrder);
        }
        setDraggedItemIndex(null);
    };

    // Touch support via simple tap-to-select logic if polyfill fails, 
    // but we added polyfill so standard drag events usually work.
    // However, to be extra safe on React, let's implement a simple Swap mechanism on click.
    const [selectedForSwap, setSelectedForSwap] = useState<number | null>(null);

    const handleItemClick = (index: number) => {
        if (selectedForSwap === null) {
            setSelectedForSwap(index);
        } else {
            // Swap
            const newOrder = [...currentOrder];
            const itemA = newOrder[selectedForSwap];
            const itemB = newOrder[index];
            newOrder[selectedForSwap] = itemB;
            newOrder[index] = itemA;
            setCurrentOrder(newOrder);
            setSelectedForSwap(null);
        }
    };

    if (!isOpen) return null;

    const bottomBarItems = currentOrder.slice(0, 4);
    const menuItems = currentOrder.slice(4);

    return (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 animate-fade-in-fast backdrop-blur-sm">
            <Card className="w-full max-w-sm h-[80vh] flex flex-col p-0 overflow-hidden bg-gray-50 dark:bg-slate-900 border-none shadow-2xl">
                <div className="bg-white dark:bg-slate-800 p-4 border-b dark:border-slate-700 flex justify-between items-center shrink-0">
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white">Customize Navigation</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2 shrink-0">
                    <Info size={16} className="mt-0.5 shrink-0" />
                    <p>
                        Drag and drop items to reorder. The <strong>top 4 items</strong> will appear in the main bottom bar. The rest will be in the "More" menu.
                        <br/><span className="opacity-70 mt-1 block">(Or tap one item, then tap another to swap positions)</span>
                    </p>
                </div>

                <div className="flex-grow overflow-y-auto p-4 space-y-6">
                    {/* Bottom Bar Section */}
                    <div>
                        <h3 className="text-xs font-bold uppercase text-gray-500 mb-2 pl-2">Bottom Bar (Visible)</h3>
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
                            {bottomBarItems.map((pageId, idx) => {
                                const Icon = PAGE_ICONS[pageId] || FileText;
                                const isSelected = selectedForSwap === idx;
                                return (
                                    <div 
                                        key={pageId}
                                        draggable
                                        onDragStart={(e) => onDragStart(e, idx)}
                                        onDragOver={onDragOver}
                                        onDrop={(e) => onDrop(e, idx)}
                                        onClick={() => handleItemClick(idx)}
                                        className={`flex items-center gap-3 p-3 border-b dark:border-slate-700 last:border-0 active:bg-blue-50 dark:active:bg-blue-900/30 transition-colors cursor-move ${isSelected ? 'bg-blue-100 dark:bg-blue-900/50 ring-2 ring-inset ring-blue-500' : ''}`}
                                    >
                                        <GripVertical size={18} className="text-gray-400" />
                                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                            <Icon size={20} />
                                        </div>
                                        <span className="font-medium text-gray-700 dark:text-gray-200">{PAGE_LABELS[pageId]}</span>
                                        <span className="ml-auto text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                            {idx < 2 ? 'Left' : 'Right'}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Menu Section */}
                    <div>
                        <h3 className="text-xs font-bold uppercase text-gray-500 mb-2 pl-2">More Menu (Hidden)</h3>
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
                            {menuItems.map((pageId, idx) => {
                                const actualIdx = idx + 4;
                                const Icon = PAGE_ICONS[pageId] || FileText;
                                const isSelected = selectedForSwap === actualIdx;
                                return (
                                    <div 
                                        key={pageId}
                                        draggable
                                        onDragStart={(e) => onDragStart(e, actualIdx)}
                                        onDragOver={onDragOver}
                                        onDrop={(e) => onDrop(e, actualIdx)}
                                        onClick={() => handleItemClick(actualIdx)}
                                        className={`flex items-center gap-3 p-3 border-b dark:border-slate-700 last:border-0 active:bg-blue-50 dark:active:bg-blue-900/30 transition-colors cursor-move ${isSelected ? 'bg-blue-100 dark:bg-blue-900/50 ring-2 ring-inset ring-blue-500' : ''}`}
                                    >
                                        <GripVertical size={18} className="text-gray-400" />
                                        <div className="p-2 bg-gray-100 dark:bg-slate-700 rounded-lg text-gray-500 dark:text-gray-400">
                                            <Icon size={20} />
                                        </div>
                                        <span className="font-medium text-gray-700 dark:text-gray-200">{PAGE_LABELS[pageId]}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-white dark:bg-slate-800 border-t dark:border-slate-700 flex gap-3 shrink-0">
                    <Button onClick={onClose} variant="secondary" className="flex-1">Cancel</Button>
                    <Button onClick={handleSave} className="flex-[2] bg-primary text-white shadow-lg">
                        <Check size={18} className="mr-2" /> Save Layout
                    </Button>
                </div>
            </Card>
        </div>
    );
};

export default NavCustomizerModal;