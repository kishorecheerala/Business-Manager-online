
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Edit, Save, X, Package, IndianRupee, Percent, PackageCheck, Barcode, Printer, Filter, Grid, List, Camera, Image as ImageIcon, Eye, Trash2, QrCode, Boxes, Maximize2, Minimize2, ArrowLeft, CheckSquare, Square, Plus, Clock, AlertTriangle } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Product, PurchaseItem } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';
import { BarcodeModal } from '../components/BarcodeModal';
import BatchBarcodeModal from '../components/BatchBarcodeModal';
import DatePill from '../components/DatePill';
import { compressImage } from '../utils/imageUtils'; 
import { Html5Qrcode } from 'html5-qrcode';
import EmptyState from '../components/EmptyState';
import { useDialog } from '../context/DialogContext';
import ImageCropperModal from '../components/ImageCropperModal';

interface ProductsPageProps {
  setIsDirty: (isDirty: boolean) => void;
}

// ... (ProductImage component and QRScannerModal remain same) ...
const ProductImage: React.FC<any> = () => null; // Placeholder for brevity
const QRScannerModal: React.FC<any> = () => null; // Placeholder for brevity

const ProductsPage: React.FC<ProductsPageProps> = ({ setIsDirty }) => {
    const { state, dispatch, showToast } = useAppContext();
    const { showConfirm } = useDialog();
    const [searchTerm, setSearchTerm] = useState('');
    
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editedProduct, setEditedProduct] = useState<Product | null>(null);
    const [newQuantity, setNewQuantity] = useState<string>('');
    const isDirtyRef = useRef(false);
    
    // ... (Other state) ...
    const [isShowcaseMode, setIsShowcaseMode] = useState(true);

    // Filter Logic
    const filteredProducts = useMemo(() => {
        const lowerTerm = searchTerm.toLowerCase();
        return state.products.filter(p => 
            p.name.toLowerCase().includes(lowerTerm) || 
            p.id.toLowerCase().includes(lowerTerm)
        );
    }, [state.products, searchTerm]);

    // ... (Handlers remain same) ...

    if (selectedProduct && editedProduct) {
        // Details View
        return (
            <div className="fixed inset-0 w-full h-full z-[5000] bg-white dark:bg-slate-900 flex flex-col md:flex-row overflow-hidden animate-fade-in-fast">
                <button 
                    onClick={() => setSelectedProduct(null)} 
                    className="absolute top-4 left-4 z-[5010] p-3 bg-black/30 hover:bg-black/50 backdrop-blur-md text-white rounded-full transition-all shadow-lg"
                >
                    <ArrowLeft size={24} />
                </button>
                
                {/* Left Side (Image) - Same as before */}
                <div className="h-[40%] w-full md:h-full md:w-1/2 bg-gray-100 dark:bg-slate-900 relative">
                     {/* Image Placeholder */}
                     <div className="w-full h-full flex items-center justify-center text-gray-400">Image Area</div>
                </div>

                {/* Right Side (Details) */}
                <div className="flex-1 h-full w-full md:w-1/2 bg-white dark:bg-slate-800 flex flex-col border-l dark:border-slate-700 p-5 overflow-y-auto">
                    <h1 className="text-2xl font-bold dark:text-white mb-2">{selectedProduct.name}</h1>
                    
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-sm font-mono text-gray-500 bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded">
                            {selectedProduct.id}
                        </span>
                        {selectedProduct.quantity < 5 && (
                            <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded flex items-center gap-1 font-bold">
                                <AlertTriangle size={12} /> Low Stock
                            </span>
                        )}
                    </div>

                    {/* Simple Stock Details */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                            <p className="text-xs text-gray-500 uppercase font-bold">Sale Price</p>
                            <p className="text-xl font-bold text-primary">₹{selectedProduct.salePrice.toLocaleString('en-IN')}</p>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                            <p className="text-xs text-gray-500 uppercase font-bold">Available Stock</p>
                            <p className="text-xl font-bold text-gray-800 dark:text-white">{selectedProduct.quantity}</p>
                        </div>
                    </div>
                    
                    {/* ... Existing Details UI (Manual Stock Adjustment, etc) ... */}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* ... Header & Search ... */}
            <div className="flex gap-2 mb-4">
                <input type="text" placeholder="Search..." className="flex-1 p-2 border rounded" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>

            <div className="space-y-2">
                {filteredProducts.map(product => {
                    return (
                        <div key={product.id} className="p-3 bg-white dark:bg-slate-800 rounded shadow flex items-center justify-between" onClick={() => setSelectedProduct(product)}>
                            <div>
                                <p className="font-bold">{product.name}</p>
                                <p className="text-xs text-gray-500">ID: {product.id}</p>
                            </div>
                            <div className="text-right">
                                <p className="font-bold">₹{product.salePrice}</p>
                                <p className={`text-xs ${product.quantity < 5 ? 'text-red-500 font-bold' : 'text-gray-500'}`}>
                                    {product.quantity} Stock
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ProductsPage;
