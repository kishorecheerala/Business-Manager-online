import React from 'react';
import { Clock, PlayCircle, Trash2 } from 'lucide-react';
import { ParkedSale, Customer, Product } from '../../types';
import { formatDate, formatCurrency } from '../../utils/formatUtils';
import { calculateTotals } from '../../utils/calculations';
import Button from '../Button';
import DeleteButton from '../DeleteButton';
import Card from '../Card';

interface ParkedSalesListProps {
    parkedSales: ParkedSale[];
    customers: Customer[];
    products: Product[]; // Needed for calculation if price not in item, though usually in item
    onResume: (draft: ParkedSale) => void;
    onDelete: (draftId: string) => void;
    onClose: () => void;
}

const ParkedSalesList: React.FC<ParkedSalesListProps> = ({
    parkedSales,
    customers,
    products,
    onResume,
    onDelete,
    onClose
}) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[150] p-4 animate-fade-in-fast backdrop-blur-sm">
            <Card title="Parked Sales (Drafts)" className="w-full max-w-md animate-scale-in max-h-[80vh] flex flex-col">
                <div className="flex-grow overflow-y-auto pr-1 space-y-3">
                    {parkedSales.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">No parked sales.</p>
                    ) : (
                        parkedSales.map(draft => {
                            const customer = customers.find(c => c.id === draft.customerId);
                            // We need products for calculation if not fully populated, but usually items have price
                            const total = calculateTotals(draft.items, parseFloat(draft.discount) || 0, products).totalAmount;
                            return (
                                <div key={draft.id} className="bg-gray-50 dark:bg-slate-700/50 p-3 rounded-lg flex justify-between items-center border dark:border-slate-600">
                                    <div>
                                        <p className="font-bold text-sm dark:text-white">{customer?.name || 'Unknown'}</p>
                                        <p className="text-xs text-gray-500 flex items-center gap-1">
                                            <Clock size={10} /> {formatDate(draft.parkedAt)}
                                        </p>
                                        <p className="text-xs font-semibold mt-1">{draft.items.length} items • {formatCurrency(total)}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button onClick={() => onResume(draft)} className="h-8 text-xs px-2 bg-emerald-600 hover:bg-emerald-700">
                                            <PlayCircle size={14} className="mr-1" /> Resume
                                        </Button>
                                        <DeleteButton variant="delete" onClick={() => onDelete(draft.id)} />
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
                <div className="pt-4 mt-2 border-t dark:border-slate-700">
                    <Button onClick={onClose} variant="secondary" className="w-full">Close</Button>
                </div>
            </Card>
        </div>
    );
};

export default ParkedSalesList;
