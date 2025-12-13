import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Wand2, Loader2, ArrowRight, Zap } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { AIController } from '../utils/ai/AIController';
import Card from './Card';
import Button from './Button';
import { Product, SaleItem } from '../types';

interface MagicOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    products: Product[];
    onItemsParsed: (items: SaleItem[]) => void;
}

const MagicOrderModal: React.FC<MagicOrderModalProps> = ({ isOpen, onClose, products, onItemsParsed }) => {
    const { state, showToast } = useAppContext();
    const [inputText, setInputText] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    const handleProcess = async () => {
        if (!inputText.trim()) return;

        setIsProcessing(true);
        try {
            const parsedItems = await AIController.parseOrder(inputText, products, state);

            if (parsedItems && parsedItems.length > 0) {
                onItemsParsed(parsedItems);
                onClose();
                setInputText('');
                showToast(`Matched ${parsedItems.length} items!`, 'success');
            } else {
                showToast("Could not match any products. Try using exact names.", 'info');
            }

        } catch (error: any) {
            console.error("Magic Order Error", error);
            showToast(error.message || "Failed to parse order", 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
        >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in-fast" onClick={onClose} />
            <Card className="relative z-10 w-full max-w-lg p-0 overflow-hidden animate-scale-in border-none shadow-2xl bg-white dark:bg-slate-900">
                <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-4 flex justify-between items-center text-white shrink-0">
                    <div className="flex items-center gap-2">
                        <Wand2 size={20} className="text-yellow-300" />
                        <h2 className="font-bold text-lg">Magic Order Paste</h2>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors"><X size={20} /></button>
                </div>

                <div className="p-6 space-y-4">
                    {!state.isOnline && (
                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg">
                            <Zap size={14} />
                            <span>Offline Mode: Using text matching. Accuracy may be lower.</span>
                        </div>
                    )}

                    <p className="text-sm text-gray-600 dark:text-gray-300">
                        Paste an order from WhatsApp, SMS, or Email. AI will match products and quantities automatically.
                    </p>

                    <textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="e.g., I need 2 Blue Silk Sarees and 1 Cotton Kurti (L)"
                        className="w-full h-32 p-3 border rounded-xl dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none resize-none"
                    />

                    <div className="flex justify-end pt-2">
                        <Button
                            onClick={handleProcess}
                            disabled={isProcessing || !inputText.trim()}
                            className="bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-200 dark:shadow-none"
                        >
                            {isProcessing ? (
                                <><Loader2 size={18} className="mr-2 animate-spin" /> Processing...</>
                            ) : (
                                <><Wand2 size={18} className="mr-2" /> Convert to Items <ArrowRight size={16} className="ml-1" /></>
                            )}
                        </Button>
                    </div>
                </div>
            </Card>
        </div>,
        document.body
    );
};

export default MagicOrderModal;