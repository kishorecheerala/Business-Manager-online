import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { X, CheckCircle, AlertCircle, Package, Plus, ShoppingCart, Scan } from 'lucide-react';
import Card from './Card';
import Button from './Button';
import { Product, SaleItem } from '../types';
import { formatCurrency } from '../utils/formatUtils';
import FormattedNumberInput from './FormattedNumberInput';

interface BarcodeSalesScannerProps {
    isOpen: boolean;
    onClose: () => void;
    onAddToCart: (item: SaleItem) => void;
    products: Product[];
    customerId?: string;
}

interface ScannedProduct extends Product {
    scannedQuantity: number;
}

const BarcodeSalesScanner: React.FC<BarcodeSalesScannerProps> = ({
    isOpen,
    onClose,
    onAddToCart,
    products,
    customerId
}) => {
    const [scanStatus, setScanStatus] = useState<string>("Initializing camera...");
    const [scannedProducts, setScannedProducts] = useState<ScannedProduct[]>([]);
    const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
    const [quantity, setQuantity] = useState<number>(1);
    const [scanHistory, setScanHistory] = useState<{ code: string; time: number; success: boolean }[]>([]);
    const [scanMode, setScanMode] = useState<'continuous' | 'manual'>('continuous');
    
    const scannerId = "barcode-reader-sales";
    const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
    const lastScanTimeRef = useRef<number>(0);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        }
        return () => { 
            document.body.style.overflow = ''; 
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        const element = document.getElementById(scannerId);
        if (!element) return;

        const html5QrCode = new Html5Qrcode(scannerId);
        html5QrCodeRef.current = html5QrCode;
        
        setScanStatus("Requesting camera permissions...");

        const config = { 
            fps: 10, 
            qrbox: { width: 250, height: 250 },
            supportedScanTypes: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16] // All barcode types
        };

        html5QrCode.start(
            { facingMode: "environment" }, 
            config, 
            (decodedText) => {
                // Prevent duplicate scans within 2 seconds
                const now = Date.now();
                if (now - lastScanTimeRef.current < 2000) return;
                lastScanTimeRef.current = now;

                handleBarcodeScan(decodedText);
                if (scanMode === 'manual') {
                    html5QrCode.pause(true);
                }
            }, 
            () => {
                // Ignore frame parse errors (silent)
            }
        ).then(() => setScanStatus("Ready to scan barcodes..."))
        .catch(err => {
            setScanStatus(`Camera Error. Please allow camera access.`);
            console.error("Camera start failed.", err);
        });

        return () => {
            if (html5QrCode.isScanning) {
                html5QrCode.stop().then(() => html5QrCode.clear()).catch(err => console.error("Failed to stop scanner", err));
            } else {
                html5QrCode.clear();
            }
        };
    }, [isOpen, scanMode]);

    const handleBarcodeScan = (code: string) => {
        // Find product by barcode (you'll need to add barcode field to Product type)
        // For now, we'll search by product ID or name
        const product = products.find(p => 
            p.id === code || 
            p.name.toLowerCase().includes(code.toLowerCase()) ||
            (p as any).barcode === code // If barcode field exists
        );

        if (product) {
            setScanHistory(prev => [{ code, time: Date.now(), success: true }, ...prev.slice(0, 9)]);
            
            if (scanMode === 'continuous') {
                // Auto-add with quantity 1
                const existingIndex = scannedProducts.findIndex(p => p.id === product.id);
                if (existingIndex >= 0) {
                    const updated = [...scannedProducts];
                    updated[existingIndex].scannedQuantity += 1;
                    setScannedProducts(updated);
                } else {
                    setScannedProducts(prev => [...prev, { ...product, scannedQuantity: 1 }]);
                }
                setScanStatus(`✓ Added ${product.name} (Qty: 1)`);
            } else {
                // Manual mode - show product and ask for quantity
                setCurrentProduct(product);
                setScanStatus(`Product found: ${product.name}`);
            }
        } else {
            setScanHistory(prev => [{ code, time: Date.now(), success: false }, ...prev.slice(0, 9)]);
            setScanStatus(`❌ Product not found: ${code}`);
            setTimeout(() => {
                if (html5QrCodeRef.current && !html5QrCodeRef.current.isScanning) {
                    html5QrCodeRef.current.resume();
                }
            }, 1500);
        }
    };

    const addProductManually = () => {
        if (!currentProduct || quantity <= 0) return;

        const existingIndex = scannedProducts.findIndex(p => p.id === currentProduct.id);
        if (existingIndex >= 0) {
            const updated = [...scannedProducts];
            updated[existingIndex].scannedQuantity += quantity;
            setScannedProducts(updated);
        } else {
            setScannedProducts(prev => [...prev, { ...currentProduct, scannedQuantity: quantity }]);
        }

        setCurrentProduct(null);
        setQuantity(1);
        setScanStatus("Ready to scan next product...");
        
        // Resume scanning
        if (html5QrCodeRef.current && !html5QrCodeRef.current.isScanning) {
            html5QrCodeRef.current.resume();
        }
    };

    const addToCart = () => {
        scannedProducts.forEach(product => {
            const saleItem: SaleItem = {
                productId: product.id,
                productName: product.name,
                quantity: product.scannedQuantity,
                price: product.salePrice,
                hsn: product.hsn,
                mrp: product.mrp
            };
            onAddToCart(saleItem);
        });
        
        setScannedProducts([]);
        onClose();
    };

    if (!isOpen) return null;

    const totalItems = scannedProducts.reduce((sum, p) => sum + p.scannedQuantity, 0);
    const totalValue = scannedProducts.reduce((sum, p) => sum + (p.salePrice * p.scannedQuantity), 0);

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 overflow-auto">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in-fast" onClick={onClose} />
            <Card className="relative z-10 w-full max-w-4xl my-8 animate-scale-in">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-700 pb-4 mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                            <Scan className="text-indigo-600 dark:text-indigo-400" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Barcode Scanner</h2>
                            <p className="text-sm text-gray-500">Scan products to add to sale</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                        <X size={20}/>
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Scanner View */}
                    <div>
                        <div className="mb-3">
                            <div className="flex gap-2 mb-2">
                                <button
                                    onClick={() => setScanMode('continuous')}
                                    className={`flex-1 p-2 rounded-lg text-sm font-semibold transition-colors ${
                                        scanMode === 'continuous'
                                            ? 'bg-primary text-white'
                                            : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300'
                                    }`}
                                >
                                    Continuous
                                </button>
                                <button
                                    onClick={() => setScanMode('manual')}
                                    className={`flex-1 p-2 rounded-lg text-sm font-semibold transition-colors ${
                                        scanMode === 'manual'
                                            ? 'bg-primary text-white'
                                            : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300'
                                    }`}
                                >
                                    Manual
                                </button>
                            </div>
                        </div>
                        
                        <div id={scannerId} className="w-full rounded-lg overflow-hidden border-2 border-gray-300 dark:border-slate-700 bg-black min-h-[300px]"></div>
                        <div className="mt-2 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg text-center">
                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{scanStatus}</p>
                        </div>

                        {/* Manual Quantity Input (if product scanned in manual mode) */}
                        {currentProduct && scanMode === 'manual' && (
                            <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <Package size={16} className="text-blue-600" />
                                    <span className="font-semibold text-sm text-gray-900 dark:text-white">{currentProduct.name}</span>
                                </div>
                                <div className="flex gap-2">
                                    <FormattedNumberInput
                                        value={quantity}
                                        onChange={(e) => setQuantity(Number(e.target.value) || 1)}
                                        className="flex-1 p-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm"
                                        placeholder="Quantity"
                                    />
                                    <Button onClick={addProductManually} className="h-auto">
                                        <Plus size={16} className="mr-1" /> Add
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Scan History */}
                        {scanHistory.length > 0 && (
                            <div className="mt-3">
                                <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Recent Scans</div>
                                <div className="space-y-1 max-h-32 overflow-auto">
                                    {scanHistory.map((scan, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-xs p-2 bg-gray-50 dark:bg-slate-800 rounded">
                                            {scan.success ? (
                                                <CheckCircle size={12} className="text-green-600" />
                                            ) : (
                                                <AlertCircle size={12} className="text-red-600" />
                                            )}
                                            <span className="flex-1 font-mono text-gray-700 dark:text-gray-300">{scan.code}</span>
                                            <span className="text-gray-500">{new Date(scan.time).toLocaleTimeString()}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Cart Preview */}
                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                                <ShoppingCart size={20} className="inline mr-2" />
                                Cart ({totalItems} items)
                            </h3>
                            {scannedProducts.length > 0 && (
                                <button
                                    onClick={() => setScannedProducts([])}
                                    className="text-xs text-red-600 hover:underline"
                                >
                                    Clear All
                                </button>
                            )}
                        </div>

                        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg p-4 mb-3 border border-indigo-200 dark:border-indigo-800">
                            <div className="text-sm text-gray-600 dark:text-gray-400">Total Value</div>
                            <div className="text-3xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalValue)}</div>
                        </div>

                        {scannedProducts.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <Package size={48} className="mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No products scanned yet</p>
                                <p className="text-xs mt-1">Start scanning barcodes to add items</p>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-80 overflow-auto">
                                {scannedProducts.map(product => (
                                    <div key={product.id} className="p-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <div className="font-semibold text-sm text-gray-900 dark:text-white">{product.name}</div>
                                                <div className="text-xs text-gray-500 mt-1">
                                                    {formatCurrency(product.salePrice)} × {product.scannedQuantity}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-gray-900 dark:text-white">
                                                    {formatCurrency(product.salePrice * product.scannedQuantity)}
                                                </div>
                                                <button
                                                    onClick={() => setScannedProducts(prev => prev.filter(p => p.id !== product.id))}
                                                    className="text-xs text-red-600 hover:underline mt-1"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                        {product.quantity < product.scannedQuantity && (
                                            <div className="mt-2 text-xs text-red-600 flex items-center gap-1">
                                                <AlertCircle size={12} />
                                                Insufficient stock (Available: {product.quantity})
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {scannedProducts.length > 0 && (
                            <Button onClick={addToCart} className="w-full mt-4">
                                <ShoppingCart size={16} className="mr-2" />
                                Add {totalItems} Items to Sale
                            </Button>
                        )}
                    </div>
                </div>
            </Card>
        </div>,
        document.body
    );
};

export default BarcodeSalesScanner;
