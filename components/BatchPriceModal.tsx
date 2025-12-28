import React, { useState } from 'react';
import { X, Percent, IndianRupee, Save, Zap } from 'lucide-react';
import Button from './Button';
import Card from './Card';
import FormattedNumberInput from './FormattedNumberInput';
import { Product } from '../types';

interface BatchPriceModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedProducts: Product[];
    onApply: (updatedProducts: Product[]) => void;
}

const BatchPriceModal: React.FC<BatchPriceModalProps> = ({ isOpen, onClose, selectedProducts, onApply }) => {
    const [updateType, setUpdateType] = useState<'percent' | 'fixed'>('percent');
    const [updateField, setUpdateField] = useState<'salePrice' | 'wholesalePrice' | 'purchasePrice'>('salePrice');
    const [value, setValue] = useState<number>(0);
    const [direction, setDirection] = useState<'increase' | 'decrease'>('increase');

    if (!isOpen) return null;

    const handleApply = () => {
        const updated = selectedProducts.map(p => {
            const currentVal = p[updateField] || 0;
            let newVal = currentVal;

            if (updateType === 'fixed') {
                newVal = value;
            } else {
                const multiplier = direction === 'increase' ? (1 + value / 100) : (1 - value / 100);
                newVal = Math.round(currentVal * multiplier);
            }

            return { ...p, [updateField]: newVal };
        });

        onApply(updated);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[2000] flex items-center justify-center p-4 animate-fade-in-fast">
            <Card className="w-full max-w-md animate-scale-in" title="Batch Price Update">
                <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full text-gray-500 transition-colors">
                    <X size={20} />
                </button>

                <div className="space-y-6 mt-4">
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                        <p className="text-xs text-amber-800 dark:text-amber-200">
                            Updating <strong>{selectedProducts.length}</strong> products. Changes will be applied immediately to the selected items.
                        </p>
                    </div>

                    <div className="space-y-4">
                        {/* Field Selection */}
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Field to Update</label>
                            <div className="flex gap-2">
                                {(['salePrice', 'wholesalePrice', 'purchasePrice'] as const).map(field => (
                                    <button
                                        key={field}
                                        onClick={() => setUpdateField(field)}
                                        className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-all ${updateField === field ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-slate-700 hover:bg-gray-50'}`}
                                    >
                                        {field === 'salePrice' ? 'Sale' : field === 'wholesalePrice' ? 'Wholesale' : 'Purchase'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Update Type */}
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Adjustment Type</label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setUpdateType('percent')}
                                    className={`flex-1 py-2 flex items-center justify-center gap-2 text-xs font-medium rounded-lg border transition-all ${updateType === 'percent' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-slate-700 hover:bg-gray-50'}`}
                                >
                                    <Percent size={14} /> Percentage
                                </button>
                                <button
                                    onClick={() => setUpdateType('fixed')}
                                    className={`flex-1 py-2 flex items-center justify-center gap-2 text-xs font-medium rounded-lg border transition-all ${updateType === 'fixed' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-slate-700 hover:bg-gray-50'}`}
                                >
                                    <IndianRupee size={14} /> Fixed Price
                                </button>
                            </div>
                        </div>

                        {updateType === 'percent' && (
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setDirection('increase')}
                                    className={`flex-1 py-2 text-xs font-medium rounded-lg border ${direction === 'increase' ? 'bg-green-600 text-white border-green-600' : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-slate-700'}`}
                                >
                                    Increase (+)
                                </button>
                                <button
                                    onClick={() => setDirection('decrease')}
                                    className={`flex-1 py-2 text-xs font-medium rounded-lg border ${direction === 'decrease' ? 'bg-red-600 text-white border-red-600' : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-slate-700'}`}
                                >
                                    Decrease (-)
                                </button>
                            </div>
                        )}

                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Value</label>
                            <div className="relative">
                                {updateType === 'percent' ? (
                                    <div className="relative">
                                        <FormattedNumberInput
                                            value={value}
                                            onChange={(e) => setValue(parseFloat(e.target.value) || 0)}
                                            className="pr-10"
                                        />
                                        <Percent size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <IndianRupee size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <FormattedNumberInput
                                            value={value}
                                            onChange={(e) => setValue(parseFloat(e.target.value) || 0)}
                                            className="pl-10"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
                        <Button onClick={handleApply} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white">
                            <Zap size={18} className="mr-2" /> Apply Changes
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default BatchPriceModal;
