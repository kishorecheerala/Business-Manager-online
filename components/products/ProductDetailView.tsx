import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Edit, Save, Share2, CheckSquare, MessageCircle, X, Camera, Check, GripVertical, GripHorizontal, Loader2, Sparkles, Wand2, IndianRupee, Barcode, Copy, History, ImageIcon } from 'lucide-react';
import { Product } from '../../types';
import { formatCurrency, generateDownloadFilename } from '../../utils/formatUtils';
import Button from '../Button';
import FormattedNumberInput from '../FormattedNumberInput';
import { GoogleGenAI } from "@google/genai";
import { compressImage } from '../../utils/imageUtils';
import BarcodeModal from '../BarcodeModal';

// Helper to convert base64 to File object for sharing
const dataURLtoFile = (dataurl: string, filename: string) => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
};

interface ProductDetailViewProps {
    product: Product;
    editedProduct: Product;
    setEditedProduct: (p: Product) => void;
    isEditing: boolean;
    setIsEditing: (isEditing: boolean) => void;
    onSave: () => void;
    onClose: () => void;
    showToast: (msg: string, type?: any) => void;
    businessName: string;
    onDuplicate: () => void;
    onViewHistory: () => void;
}

const ProductDetailView: React.FC<ProductDetailViewProps> = ({
    product: initialProduct,
    editedProduct,
    setEditedProduct,
    isEditing,
    setIsEditing,
    onSave,
    onClose,
    showToast,
    businessName,
    onDuplicate,
    onViewHistory
}) => {
    const [detailSplitRatio, setDetailSplitRatio] = useState(0.5);
    const [isResizing, setIsResizing] = useState(false);
    const detailContainerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);

    // Share Selection Mode
    const [isShareSelectMode, setIsShareSelectMode] = useState(false);
    const [selectedShareImages, setSelectedShareImages] = useState<Set<string>>(new Set());

    const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
    const [isSuggestingPrice, setIsSuggestingPrice] = useState(false);

    // Split Pane Resizing Logic
    const startDetailResize = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        setIsResizing(true);
        document.body.style.userSelect = 'none';
        document.body.style.cursor = window.innerWidth >= 768 ? 'col-resize' : 'row-resize';
    }, []);

    const stopDetailResize = useCallback(() => {
        setIsResizing(false);
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
    }, []);

    const doDetailResize = useCallback((e: MouseEvent | TouchEvent) => {
        if (!isResizing || !detailContainerRef.current) return;

        const containerRect = detailContainerRef.current.getBoundingClientRect();
        const isDesktop = window.matchMedia('(min-width: 768px)').matches;

        let newRatio;
        if (isDesktop) {
            const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
            newRatio = (clientX - containerRect.left) / containerRect.width;
        } else {
            const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
            newRatio = (clientY - containerRect.top) / containerRect.height;
        }

        newRatio = Math.max(0.2, Math.min(0.85, newRatio));
        setDetailSplitRatio(newRatio);
    }, [isResizing]);

    useEffect(() => {
        if (isResizing) {
            window.addEventListener('mousemove', doDetailResize);
            window.addEventListener('touchmove', doDetailResize, { passive: false });
            window.addEventListener('mouseup', stopDetailResize);
            window.addEventListener('touchend', stopDetailResize);
        }
        return () => {
            window.removeEventListener('mousemove', doDetailResize);
            window.removeEventListener('touchmove', doDetailResize);
            window.removeEventListener('mouseup', stopDetailResize);
            window.removeEventListener('touchend', stopDetailResize);
        };
    }, [isResizing, doDetailResize, stopDetailResize]);

    // Image logic
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0 && editedProduct) {
            const newImages: string[] = [];
            const files = e.target.files;

            for (let i = 0; i < files.length; i++) {
                try {
                    const file = files[i];
                    const base64 = await compressImage(file, 800, 0.8);
                    if (typeof base64 === 'string') {
                        newImages.push(base64);
                    }
                } catch (err: any) {
                    console.error("Image upload failed", err);
                }
            }

            let updatedProduct = { ...editedProduct };

            if (!updatedProduct.image && newImages.length > 0) {
                updatedProduct.image = newImages[0];
                if (newImages.length > 1) {
                    const currentAdditional: string[] = updatedProduct.additionalImages || [];
                    updatedProduct.additionalImages = [...currentAdditional, ...newImages.slice(1)];
                }
            } else {
                const currentAdditional: string[] = updatedProduct.additionalImages || [];
                updatedProduct.additionalImages = [...currentAdditional, ...newImages];
            }

            setEditedProduct(updatedProduct);
        }
    };

    const setMainImage = (img: string) => {
        if (!editedProduct) return;
        const currentMain = editedProduct.image;
        const otherImages = editedProduct.additionalImages?.filter(i => i !== img) || [];

        if (currentMain && currentMain !== img) otherImages.push(currentMain);

        setEditedProduct({
            ...editedProduct,
            image: img,
            additionalImages: otherImages
        });
    };

    const removeImage = (img: string) => {
        if (!editedProduct) return;
        if (editedProduct.image === img) {
            const nextImage = editedProduct.additionalImages?.[0];
            setEditedProduct({
                ...editedProduct,
                image: nextImage,
                additionalImages: editedProduct.additionalImages?.slice(1) || []
            });
        } else {
            setEditedProduct({
                ...editedProduct,
                additionalImages: editedProduct.additionalImages?.filter(i => i !== img)
            });
        }
    };

    const toggleShareSelection = (img: string) => {
        const newSet = new Set(selectedShareImages);
        if (newSet.has(img)) newSet.delete(img);
        else newSet.add(img);
        setSelectedShareImages(newSet);
    };

    const handleMultiShare = async () => {
        if (!editedProduct) return;

        const imagesToShare = selectedShareImages.size > 0
            ? Array.from(selectedShareImages)
            : [editedProduct.image].filter(Boolean) as string[];

        if (imagesToShare.length === 0) {
            showToast("No images to share.", 'error');
            return;
        }

        const shareData: any = {
            title: editedProduct.name,
            text: `*${editedProduct.name}*\nPrice: ${formatCurrency(editedProduct.salePrice)}\n${editedProduct.description || ''}`,
        };

        if (navigator.canShare && navigator.share) {
            try {
                const files = imagesToShare.map((img, idx) =>
                    dataURLtoFile(img as string, `prod_${editedProduct.id}_${idx}.jpg`)
                );

                if (navigator.canShare({ files })) {
                    shareData.files = files;
                }

                await navigator.share(shareData);
                setIsShareSelectMode(false);
                setSelectedShareImages(new Set());
            } catch (e: any) {
                console.warn("Share failed or cancelled", e);
            }
        } else {
            handleWhatsAppShare(editedProduct);
        }
    };

    const handleWhatsAppShare = (product: Product) => {
        const text = `*${product.name}*\nPrice: ${formatCurrency(product.salePrice)}\n${product.description || ''}`;
        const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    };

    // AI Logic
    const handleAIGenerateDescription = async () => {
        if (!editedProduct || !editedProduct.name) {
            showToast("Product Name is required to generate description.", 'error');
            return;
        }

        setIsGeneratingDesc(true);
        try {
            const apiKey = localStorage.getItem('gemini_api_key') || (import.meta as any).env.VITE_GEMINI_API_KEY as string || '';

            if (!apiKey) throw new Error("API Key not available");

            const ai = new GoogleGenAI({ apiKey });
            const prompt = `Write a professional and catchy 2-sentence sales description for a product named "${editedProduct.name}" in category "${editedProduct.category || 'General'}". The description should highlight quality and value. Keep it under 50 words.`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt
            });

            const text = response.text;
            if (text) {
                setEditedProduct({ ...editedProduct, description: text });
                showToast("Description generated!");
            }
        } catch (error: any) {
            console.error("AI Gen Error", error);
            showToast("Failed to generate description. Check network/API key.", 'error');
        } finally {
            setIsGeneratingDesc(false);
        }
    };

    const handleAIGeneratePrice = async () => {
        if (!editedProduct || !editedProduct.purchasePrice) {
            showToast("Need a valid Purchase Price to suggest selling price.", 'error');
            return;
        }

        setIsSuggestingPrice(true);
        try {
            const apiKey = localStorage.getItem('gemini_api_key') || (import.meta as any).env.VITE_GEMINI_API_KEY as string || '';

            if (!apiKey) throw new Error("API Key not available");

            const ai = new GoogleGenAI({ apiKey });
            const prompt = `I bought a product named "${editedProduct.name}" (${editedProduct.category || 'General'}) for ${editedProduct.purchasePrice}. 
            Suggest a competitive selling price with a 25-45% profit margin range. 
            Return ONLY the suggested price number (e.g. 500).`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt
            });

            const text = response.text;
            const priceText = text ? text.trim() : '';
            const suggestedPrice = parseFloat(priceText.replace(/[^0-9.]/g, ''));

            if (!isNaN(suggestedPrice)) {
                setEditedProduct({ ...editedProduct, salePrice: suggestedPrice });
                showToast(`Suggested Price: ${suggestedPrice} (Based on standard margins)`, 'success');
            } else {
                throw new Error("AI returned invalid number");
            }
        } catch (error: any) {
            console.error("AI Price Error", error);
            showToast("Failed to suggest price.", 'error');
        } finally {
            setIsSuggestingPrice(false);
        }
    };

    const calculateMargin = (buy: number, sell: number) => {
        if (!buy || !sell) return 0;
        return ((sell - buy) / sell) * 100;
    };

    const marginPercent = editedProduct ? calculateMargin(editedProduct.purchasePrice, editedProduct.salePrice) : 0;
    const marginColor = marginPercent < 20 ? 'text-red-500' : marginPercent > 40 ? 'text-green-600' : 'text-amber-600';


    return (
        <div
            ref={detailContainerRef}
            className="fixed inset-0 w-full h-full z-[5000] bg-white dark:bg-slate-900 flex flex-col md:flex-row overflow-hidden animate-fade-in-fast"
        >
            {isBarcodeModalOpen && (
                <BarcodeModal
                    isOpen={isBarcodeModalOpen}
                    onClose={() => setIsBarcodeModalOpen(false)}
                    product={initialProduct}
                    businessName={businessName}
                />
            )}
            {/* Close Button */}
            <button
                onClick={onClose}
                className="absolute top-4 left-4 z-[5010] p-2 bg-black/30 hover:bg-black/50 backdrop-blur-md text-white rounded-full transition-all shadow-lg"
            >
                <ArrowLeft size={24} />
            </button>

            {/* Edit / Save Actions */}
            <div className="absolute top-4 right-4 z-[5010] flex gap-2">
                {isEditing ? (
                    <Button onClick={onSave} className="shadow-lg bg-emerald-600 hover:bg-emerald-700 text-white border-none">
                        <Save size={18} className="mr-2" /> Save
                    </Button>
                ) : (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="p-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-full shadow-lg hover:scale-105 transition-transform"
                    >
                        <Edit size={20} />
                    </button>
                )}
            </div>

            {/* Left Side (Image Gallery) - Resizable */}
            <div
                className={`relative flex flex-col shrink-0 shadow-xl z-10 bg-gray-100 dark:bg-slate-950 ${isResizing ? '' : 'transition-[flex-basis] duration-200 ease-out'}`}
                style={{ flexBasis: `${detailSplitRatio * 100}%` }}
            >
                <div className="flex-1 relative w-full h-full flex items-center justify-center p-4 overflow-hidden">
                    {editedProduct.image ? (
                        <img
                            src={editedProduct.image}
                            alt={editedProduct.name}
                            className="max-w-full max-h-full object-contain drop-shadow-xl"
                        />
                    ) : (
                        <div className="text-gray-400 flex flex-col items-center">
                            <ImageIcon size={64} />
                            <span className="mt-2 text-sm">No Image</span>
                        </div>
                    )}

                    {!isEditing && (
                        <div className="absolute bottom-4 right-4 flex gap-2 z-20">
                            {isShareSelectMode ? (
                                <button
                                    onClick={handleMultiShare}
                                    disabled={selectedShareImages.size === 0}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 disabled:bg-gray-400 text-white rounded-full shadow-lg hover:scale-105 transition-all font-bold text-sm"
                                >
                                    <Share2 size={16} /> Share ({selectedShareImages.size})
                                </button>
                            ) : (
                                <>
                                    <button onClick={() => setIsShareSelectMode(true)} className="p-3 bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-200 rounded-full shadow-lg hover:scale-110 transition-transform border border-gray-200 dark:border-slate-600" title="Select Images">
                                        <CheckSquare size={20} />
                                    </button>
                                    <button onClick={() => handleWhatsAppShare(editedProduct)} className="p-3 bg-green-500 text-white rounded-full shadow-lg hover:scale-110 transition-transform" title="Share Text on WhatsApp">
                                        <MessageCircle size={20} />
                                    </button>
                                    <button onClick={handleMultiShare} className="p-3 bg-blue-600 text-white rounded-full shadow-lg hover:scale-110 transition-transform" title="Share Main Image & Text">
                                        <Share2 size={20} />
                                    </button>
                                </>
                            )}
                        </div>
                    )}

                    {isShareSelectMode && (
                        <button
                            onClick={() => { setIsShareSelectMode(false); setSelectedShareImages(new Set()); }}
                            className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-xs backdrop-blur-md hover:bg-black/70 transition-colors z-20"
                        >
                            Cancel Selection
                        </button>
                    )}
                </div>

                <div className="h-20 sm:h-24 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-2 flex gap-2 overflow-x-auto border-t dark:border-slate-800 shrink-0 custom-scrollbar z-20">
                    {isEditing && (
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800"
                        >
                            <Camera size={20} />
                            <span className="text-[10px] mt-1">Add</span>
                            <input type="file" multiple accept="image/*" ref={fileInputRef} className="hidden" onChange={handleImageUpload} />
                        </div>
                    )}
                    {[editedProduct.image, ...(editedProduct.additionalImages || [])].filter(Boolean).map((img, idx) => {
                        const isSelected = selectedShareImages.has(img!);
                        const isMain = editedProduct.image === img;
                        return (
                            <div key={idx} className="relative group w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 cursor-pointer transition-transform active:scale-95">
                                <img
                                    src={img}
                                    className={`w-full h-full object-cover rounded-lg border-2 ${isShareSelectMode
                                        ? (isSelected ? 'border-blue-500 opacity-100' : 'border-transparent opacity-60 hover:opacity-100')
                                        : (isMain ? 'border-primary' : 'border-transparent')
                                        }`}
                                    onClick={() => isShareSelectMode ? toggleShareSelection(img!) : setMainImage(img!)}
                                />
                                {isShareSelectMode && (
                                    <div
                                        className={`absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center border shadow-sm ${isSelected ? 'bg-blue-500 border-blue-500' : 'bg-white/50 border-gray-400'}`}
                                        onClick={(e) => { e.stopPropagation(); toggleShareSelection(img!); }}
                                    >
                                        {isSelected && <Check size={12} className="text-white" />}
                                    </div>
                                )}
                                {isEditing && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); removeImage(img!); }}
                                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X size={12} />
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Resizer Handle */}
            <div
                className="z-20 flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 active:bg-indigo-100 transition-colors touch-none select-none cursor-row-resize md:cursor-col-resize shrink-0 border-y-4 md:border-y-0 md:border-x-4 border-transparent bg-clip-padding"
                style={{ flexBasis: '24px' }}
                onMouseDown={startDetailResize}
                onTouchStart={startDetailResize}
            >
                <div className="w-12 h-1 md:w-1 md:h-12 bg-slate-300 dark:bg-slate-600 rounded-full" />
                <div className="absolute flex items-center justify-center pointer-events-none text-slate-400 opacity-50">
                    {window.innerWidth >= 768 ? <GripVertical size={16} /> : <GripHorizontal size={16} />}
                </div>
            </div>

            {/* Right Side (Details) */}
            <div className="flex-1 min-w-0 min-h-0 bg-white dark:bg-slate-800 flex flex-col border-l dark:border-slate-700 overflow-y-auto">
                <div className="p-6 space-y-6">
                    {isEditing ? (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Product Name</label>
                                    <input
                                        type="text"
                                        value={editedProduct.name}
                                        onChange={e => setEditedProduct({ ...editedProduct, name: e.target.value })}
                                        className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Product Code (SKU)</label>
                                    <input
                                        type="text"
                                        value={editedProduct.id}
                                        onChange={e => setEditedProduct({ ...editedProduct, id: e.target.value.toUpperCase().replace(/\s+/g, '-') })}
                                        className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white font-mono"
                                        placeholder="e.g. SKU-100"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="text-xs font-bold text-gray-500 uppercase">Sale Price</label>
                                        <button
                                            onClick={handleAIGeneratePrice}
                                            disabled={isSuggestingPrice || !editedProduct.purchasePrice}
                                            className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 hover:underline disabled:opacity-50"
                                            title="Suggest price based on purchase cost"
                                        >
                                            {isSuggestingPrice ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                            Magic Price
                                        </button>
                                    </div>
                                    <FormattedNumberInput
                                        value={editedProduct.salePrice}
                                        onChange={e => setEditedProduct({ ...editedProduct, salePrice: parseFloat(e.target.value) })}
                                        className="pl-8 font-bold text-lg"
                                    />
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mt-1 inline-block ${marginColor === 'text-red-500' ? 'bg-red-50' : marginColor === 'text-green-600' ? 'bg-green-50' : 'bg-amber-50'} ${marginColor}`}>
                                        Margin: {marginPercent.toFixed(1)}%
                                    </span>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Stock Qty</label>
                                    <FormattedNumberInput
                                        value={editedProduct.quantity}
                                        onChange={e => setEditedProduct({ ...editedProduct, quantity: parseFloat(e.target.value) || 0 })}
                                        className="font-bold"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Wholesale Price</label>
                                <div className="relative">
                                    <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <FormattedNumberInput
                                        placeholder="Optional"
                                        value={editedProduct.wholesalePrice || ''}
                                        onChange={e => setEditedProduct({ ...editedProduct, wholesalePrice: parseFloat(e.target.value) })}
                                        className="pl-8 border-indigo-200 dark:border-indigo-800 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Description</label>
                                    <button
                                        onClick={handleAIGenerateDescription}
                                        disabled={isGeneratingDesc}
                                        className="text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline disabled:opacity-50"
                                    >
                                        {isGeneratingDesc ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                                        {isGeneratingDesc ? 'Writing...' : 'Magic Write'}
                                    </button>
                                </div>
                                <textarea
                                    rows={4}
                                    value={editedProduct.description || ''}
                                    onChange={e => setEditedProduct({ ...editedProduct, description: e.target.value })}
                                    placeholder="Add product details, material, size..."
                                    className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 resize-none dark:text-white"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Category</label>
                                    <input
                                        type="text"
                                        value={editedProduct.category || ''}
                                        onChange={e => setEditedProduct({ ...editedProduct, category: e.target.value })}
                                        className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Purchase Price</label>
                                    <FormattedNumberInput
                                        value={editedProduct.purchasePrice}
                                        onChange={e => setEditedProduct({ ...editedProduct, purchasePrice: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">GST %</label>
                                    <FormattedNumberInput
                                        value={editedProduct.gstPercent}
                                        onChange={e => setEditedProduct({ ...editedProduct, gstPercent: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight mb-1">{editedProduct.name}</h1>
                                <div className="flex items-center gap-2">
                                    <span className="bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded text-xs font-mono">{editedProduct.id}</span>
                                    {editedProduct.category && <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 px-2 py-0.5 rounded text-xs font-bold uppercase">{editedProduct.category}</span>}
                                </div>
                            </div>

                            <div className="flex gap-4 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl border dark:border-slate-700">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase mb-1">Price</p>
                                    <p className="text-2xl font-bold text-primary">{formatCurrency(editedProduct.salePrice)}</p>
                                </div>
                                <div className="w-px bg-gray-300 dark:bg-slate-600"></div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase mb-1">Stock</p>
                                    <p className={`text-2xl font-bold ${editedProduct.quantity < 5 ? 'text-red-500' : 'text-gray-700 dark:text-white'}`}>
                                        {editedProduct.quantity}
                                    </p>
                                </div>
                            </div>

                            <div className="prose dark:prose-invert text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-slate-700/30 p-4 rounded-xl border dark:border-slate-700">
                                {editedProduct.description || "No description available."}
                            </div>

                            <div className="pt-4 border-t dark:border-slate-700">
                                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Actions</h3>
                                <div className="flex gap-2 flex-wrap">
                                    <button onClick={() => setIsBarcodeModalOpen(true)} className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors text-sm font-medium">
                                        <Barcode size={16} /> Print Barcode
                                    </button>
                                    <button onClick={onDuplicate} className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors text-sm font-medium text-primary">
                                        <Copy size={16} /> Duplicate
                                    </button>
                                    <button
                                        onClick={onViewHistory}
                                        className="flex items-center gap-2 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors text-sm font-medium text-indigo-700 dark:text-indigo-300"
                                    >
                                        <History size={16} /> View Flow
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProductDetailView;
