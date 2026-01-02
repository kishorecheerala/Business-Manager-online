import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, List, Grid, QrCode, CheckSquare, AlertTriangle, FileSpreadsheet, Scale, History, Plus, Trash2, Share2, IndianRupee, Barcode } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useUI } from '../context/UIContext';
import { Product } from '../types';
import { formatCurrency, generateDownloadFilename } from '../utils/formatUtils';
import Tooltip from '../components/Tooltip';
import Button from '../components/Button';
import BarcodeModal from '../components/BarcodeModal';
import BatchBarcodeModal from '../components/BatchBarcodeModal';
import { useDialog } from '../context/DialogContext';
import StockAdjustmentModal from '../components/StockAdjustmentModal';
import ProductHistoryModal from '../components/ProductHistoryModal';
import BatchPriceModal from '../components/BatchPriceModal';
import QRScannerModal from '../components/QRScannerModal';
import { useDataLookups } from '../hooks/useDataLookups';

// Refactored Components
import ProductList from '../components/products/ProductList';
import ProductDetailView from '../components/products/ProductDetailView';

interface ProductsPageProps {
    setIsDirty: (isDirty: boolean) => void;
}

// Helper for image to file conversion
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

const ProductsPage: React.FC<ProductsPageProps> = ({ setIsDirty }) => {
    const { state, dispatch } = useData();
    const { showToast } = useUI();
    const { showConfirm } = useDialog();
    const { getProduct } = useDataLookups();
    const [searchTerm, setSearchTerm] = useState('');

    // View Modes
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Selected Product for Details
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editedProduct, setEditedProduct] = useState<Product | null>(null);

    // History & Modals
    const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
    const [isGlobalHistoryOpen, setIsGlobalHistoryOpen] = useState(false);

    // Feature Modals
    const [isBatchPriceModalOpen, setIsBatchPriceModalOpen] = useState(false);
    const [isBatchBarcodeModalOpen, setIsBatchBarcodeModalOpen] = useState(false);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [isStockAdjustOpen, setIsStockAdjustOpen] = useState(false);

    const isDirtyRef = useRef(false);

    // Initial load from navigation logic
    useEffect(() => {
        if (state.selection && state.selection.page === 'PRODUCTS') {
            const prod = state.products.find(p => p.id === state.selection.id);
            if (prod) {
                setSelectedProduct(prod);
                setEditedProduct(prod);
            }
            dispatch({ type: 'CLEAR_SELECTION' });
        }
    }, [state.selection, state.products, dispatch]);

    useEffect(() => {
        const currentlyDirty = isEditing;
        if (currentlyDirty !== isDirtyRef.current) {
            isDirtyRef.current = currentlyDirty;
            setIsDirty(currentlyDirty);
        }
    }, [isEditing, setIsDirty]);

    const filteredProducts = useMemo(() => {
        const lowerTerm = searchTerm.toLowerCase();
        if (lowerTerm === 'low_stock') {
            return state.products.filter(p => p.quantity < 5);
        }
        return state.products.filter(p =>
            p.name.toLowerCase().includes(lowerTerm) ||
            p.id.toLowerCase().includes(lowerTerm) ||
            p.category?.toLowerCase().includes(lowerTerm)
        );
    }, [state.products, searchTerm]);

    const inventoryStats = useMemo(() => {
        const totalValue = state.products.reduce((sum, p) => sum + (p.quantity * p.purchasePrice), 0);
        const totalCount = state.products.length;
        const lowStock = state.products.filter(p => p.quantity < 5).length;
        return { totalValue, totalCount, lowStock };
    }, [state.products]);

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const handleBulkDelete = async () => {
        if (await showConfirm(`Delete ${selectedIds.size} selected products? This cannot be undone.`)) {
            const newProducts = state.products.filter(p => !selectedIds.has(p.id));
            dispatch({ type: 'REPLACE_COLLECTION', payload: { storeName: 'products', data: newProducts } });

            showToast(`${selectedIds.size} products deleted.`);
            setSelectedIds(new Set());
            setIsSelectionMode(false);
        }
    };

    const handleBatchPriceUpdate = (updatedProducts: Product[]) => {
        dispatch({ type: 'BATCH_UPDATE_PRODUCTS', payload: updatedProducts });
        showToast(`Updated prices for ${updatedProducts.length} products.`);
        setSelectedIds(new Set());
        setIsSelectionMode(false);
    };

    const handleExportCSV = () => {
        // ... (Keep existing export logic)
        const headers = ['ID', 'Name', 'Category', 'Quantity', 'Purchase Price', 'Wholesale Price', 'Sale Price', 'GST %', 'Description'];
        const rows = state.products.map(p =>
            `"${p.id}","${p.name}","${p.category || ''}",${p.quantity},${p.purchasePrice},${p.wholesalePrice || ''},${p.salePrice},${p.gstPercent},"${p.description || ''}"`
        );
        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', generateDownloadFilename('inventory_export', 'csv'));
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleBulkShare = async () => {
        const selectedProducts = filteredProducts.filter(p => selectedIds.has(p.id));
        if (selectedProducts.length === 0) return;

        // 1. Try Native Share with Images (Mobile WhatsApp support)
        if (navigator.canShare && navigator.share) {
            const files: File[] = [];
            for (const p of selectedProducts) {
                if (p.image) {
                    try {
                        const file = dataURLtoFile(p.image, `${p.name.replace(/[^a-z0-9]/gi, '_')}.jpg`);
                        files.push(file);
                    } catch (e: any) { console.error(e); }
                }
            }

            const text = `*Product Catalog*\n\n` + selectedProducts.map(p => `*${p.name}* - ₹${p.salePrice}`).join('\n');

            try {
                // Check if we can share files
                if (files.length > 0 && navigator.canShare({ files })) {
                    await navigator.share({
                        files: files,
                        text: text,
                        title: 'Catalog'
                    });
                    return; // Success
                }
            } catch (e: any) {
                console.warn("Share with files failed, trying text fallback", e);
            }
        }

        // 2. Fallback: WhatsApp Text Link
        const combinedText = `*Product Catalog*\n\n` + selectedProducts.map(p =>
            `*${p.name}*\nPrice: ${formatCurrency(p.salePrice)}${p.description ? '\n' + p.description : ''}`
        ).join('\n\n----------------\n\n');

        const url = `https://wa.me/?text=${encodeURIComponent(combinedText)}`;
        window.open(url, '_blank');
    };

    const handleSaveProduct = () => {
        if (!editedProduct || !selectedProduct) return;

        if (editedProduct.id !== selectedProduct.id && state.products.some(p => p.id === selectedProduct.id)) {
            if (state.products.some(p => p.id === editedProduct.id)) {
                showToast("This Product Code already exists. Please use a unique code.", "error");
                return;
            }
            dispatch({ type: 'RENAME_PRODUCT_ID', payload: { oldId: selectedProduct.id, newId: editedProduct.id } });
        }

        dispatch({ type: 'BATCH_UPDATE_PRODUCTS', payload: [editedProduct] });
        setSelectedProduct(editedProduct);
        setIsEditing(false);
        showToast("Product updated successfully.");
    };

    const handleDuplicateProduct = () => {
        if (!editedProduct) return;
        const newId = `PROD-${Date.now()}`;
        const newProduct: Product = {
            ...editedProduct,
            id: newId,
            name: `${editedProduct.name} (Copy)`,
            quantity: 0
        };
        dispatch({ type: 'ADD_PRODUCT', payload: newProduct });
        setSelectedProduct(newProduct);
        setEditedProduct(newProduct);
        setIsEditing(true);
        showToast("Product duplicated. Update details and save.");
    };

    const handleAddNewProduct = () => {
        const newProd: Product = { id: `PROD-${Date.now()}`, name: '', quantity: 0, purchasePrice: 0, salePrice: 0, gstPercent: 0 };
        setSelectedProduct(newProd);
        setEditedProduct(newProd);
        setIsEditing(true);
    };

    const businessName = state.profile?.name || '';

    return (
        <div className="space-y-4 animate-fade-in-fast h-full flex flex-col">
            {/* Detail View Overlay */}
            {selectedProduct && editedProduct && (
                <ProductDetailView
                    product={selectedProduct}
                    editedProduct={editedProduct}
                    setEditedProduct={setEditedProduct}
                    isEditing={isEditing}
                    setIsEditing={setIsEditing}
                    onSave={handleSaveProduct}
                    onClose={() => { setSelectedProduct(null); setIsEditing(false); }}
                    showToast={showToast}
                    businessName={businessName}
                    onDuplicate={handleDuplicateProduct}
                    onViewHistory={() => setHistoryProduct(selectedProduct)}
                />
            )}

            {isStockAdjustOpen && (
                <StockAdjustmentModal isOpen={isStockAdjustOpen} onClose={() => setIsStockAdjustOpen(false)} />
            )}

            <ProductHistoryModal
                isOpen={!!historyProduct || isGlobalHistoryOpen}
                onClose={() => { setHistoryProduct(null); setIsGlobalHistoryOpen(false); }}
                product={historyProduct || undefined}
            />

            {isBatchBarcodeModalOpen && (
                <BatchBarcodeModal
                    isOpen={isBatchBarcodeModalOpen}
                    onClose={() => setIsBatchBarcodeModalOpen(false)}
                    purchaseItems={filteredProducts.filter(p => selectedIds.has(p.id)).map(p => ({
                        productId: p.id,
                        productName: p.name,
                        quantity: p.quantity,
                        price: p.purchasePrice,
                        saleValue: p.salePrice,
                        gstPercent: p.gstPercent
                    }))}
                    businessName={businessName}
                    title="Bulk Barcode Print"
                />
            )}

            {isBatchPriceModalOpen && (
                <BatchPriceModal
                    isOpen={isBatchPriceModalOpen}
                    onClose={() => setIsBatchPriceModalOpen(false)}
                    selectedProducts={state.products.filter(p => selectedIds.has(p.id))}
                    onApply={handleBatchPriceUpdate}
                />
            )}

            {isScannerOpen && (
                <QRScannerModal
                    onClose={() => setIsScannerOpen(false)}
                    onScanned={(code) => {
                        setIsScannerOpen(false);
                        const prod = getProduct(code);
                        if (prod) {
                            setSelectedProduct(prod);
                            setEditedProduct(prod);
                        } else {
                            showToast("Product not found.", "error");
                        }
                    }}
                />
            )}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-primary">Products</h1>
                </div>

                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    <div className="flex bg-gray-100 dark:bg-slate-800 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-600 shadow text-primary' : 'text-gray-500'}`}
                            title="List View"
                        >
                            <List size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-600 shadow text-primary' : 'text-gray-500'}`}
                            title="Grid View"
                        >
                            <Grid size={18} />
                        </button>
                    </div>

                    <Tooltip content="Global Stock Flow">
                        <Button onClick={() => setIsGlobalHistoryOpen(true)} variant="secondary" className="px-3">
                            <History size={18} />
                        </Button>
                    </Tooltip>

                    <Tooltip content="Audit Stock">
                        <Button onClick={() => setIsStockAdjustOpen(true)} variant="secondary" className="px-3">
                            <Scale size={18} />
                        </Button>
                    </Tooltip>

                    <Tooltip content="Export CSV">
                        <Button onClick={handleExportCSV} variant="secondary" className="px-3">
                            <FileSpreadsheet size={18} />
                        </Button>
                    </Tooltip>

                    <Tooltip content="Add Product">
                        <Button onClick={handleAddNewProduct} className="px-3">
                            <Plus size={18} />
                        </Button>
                    </Tooltip>
                </div>
            </div>

            {/* Selection Toolbar */}
            {selectedIds.size > 0 && (
                <div className="bg-indigo-600 text-white p-3 rounded-xl flex items-center justify-between shadow-lg animate-slide-down-fade sticky top-2 z-30">
                    <div className="flex items-center gap-3">
                        <span className="font-bold px-3 py-1 bg-white/20 rounded-lg">{selectedIds.size} Selected</span>
                        <button onClick={() => setSelectedIds(new Set())} className="text-xs hover:underline opacity-80">Clear</button>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleBulkShare} className="p-2 hover:bg-white/20 rounded-lg transition-colors" title="Share Catalog">
                            <Share2 size={18} />
                        </button>
                        <button onClick={() => setIsBatchPriceModalOpen(true)} className="p-2 hover:bg-white/20 rounded-lg transition-colors" title="Batch Price Update">
                            <IndianRupee size={18} />
                        </button>
                        <button onClick={() => { if (selectedIds.size > 0) setIsBatchBarcodeModalOpen(true) }} className="p-2 hover:bg-white/20 rounded-lg transition-colors" title="Print Barcodes">
                            <Barcode size={18} />
                        </button>
                        <button onClick={handleBulkDelete} className="p-2 hover:bg-red-500 rounded-lg transition-colors" title="Delete">
                            <Trash2 size={18} />
                        </button>
                    </div>
                </div>
            )}

            {/* Inventory Summary */}
            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-2 sm:p-4 rounded-xl border border-indigo-100 dark:border-indigo-800 flex flex-row justify-between items-center text-sm sm:text-lg mb-4 shrink-0 transition-all hover:shadow-md">
                <div className="flex flex-row gap-3 sm:gap-6 text-left">
                    <div className="whitespace-nowrap">
                        <span className="font-bold text-indigo-950 dark:text-white">Items: </span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-300">{inventoryStats.totalCount}</span>
                    </div>
                    <div className="whitespace-nowrap">
                        <span className="font-bold text-indigo-950 dark:text-white">Value: </span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-300">{formatCurrency(inventoryStats.totalValue)}</span>
                    </div>
                </div>
                {inventoryStats.lowStock > 0 && (
                    <span className="ml-2 text-red-600 dark:text-red-400 font-bold flex items-center gap-1 text-[10px] sm:text-sm bg-red-100 dark:bg-red-900/30 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full animate-pulse whitespace-nowrap">
                        <AlertTriangle size={12} className="sm:w-4 sm:h-4" /> <span className="hidden sm:inline">{inventoryStats.lowStock} Low Stock</span><span className="sm:hidden">{inventoryStats.lowStock} Low</span>
                    </span>
                )}
            </div>

            <div className="flex gap-2 flex-shrink-0 mb-8 relative z-30 items-stretch h-11">
                <div className="relative flex-grow">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search products..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full h-full p-2 pl-10 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    />
                </div>
                <Button onClick={() => setIsScannerOpen(true)} variant="secondary" className="!px-0 !w-11 h-11 flex items-center justify-center flex-shrink-0">
                    <QrCode size={20} />
                </Button>
                <Button
                    onClick={() => setIsSelectionMode(!isSelectionMode)}
                    variant="secondary"
                    className={`!px-0 !w-11 h-11 flex items-center justify-center flex-shrink-0 ${isSelectionMode ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' : ''}`}
                >
                    <CheckSquare size={20} />
                </Button>
            </div>

            <ProductList
                products={filteredProducts}
                viewMode={viewMode}
                isSelectionMode={isSelectionMode}
                selectedIds={selectedIds}
                onToggleSelection={toggleSelection}
                onSelectProduct={(product) => {
                    setSelectedProduct(product);
                    setEditedProduct(product);
                }}
                onViewHistory={(product) => setHistoryProduct(product)}
                onAddProduct={handleAddNewProduct}
                searchTerm={searchTerm}
            />
        </div>
    );
};

export default ProductsPage;
