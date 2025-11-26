
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { FileText, Plus, Search, Share2, Trash2, ShoppingCart, QrCode, X } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Customer, Quote, QuoteItem, Product } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';
import DateInput from '../components/DateInput';
import Dropdown from '../components/Dropdown';
import DeleteButton from '../components/DeleteButton';
import { generateEstimatePDF } from '../utils/pdfGenerator';
import DatePill from '../components/DatePill';
import { Html5Qrcode } from 'html5-qrcode';
import { useOnClickOutside } from '../hooks/useOnClickOutside';
import { useDialog } from '../context/DialogContext';

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const QRScannerModal: React.FC<{
    onClose: () => void;
    onScanned: (decodedText: string) => void;
}> = ({ onClose, onScanned }) => {
    const [scanStatus, setScanStatus] = useState<string>("Initializing camera...");
    const scannerId = "qr-reader-quotes";

    useEffect(() => {
        // Ensure container is ready
        if (!document.getElementById(scannerId)) return;

        const html5QrCode = new Html5Qrcode(scannerId);
        setScanStatus("Requesting camera permissions...");

        const qrCodeSuccessCallback = (decodedText: string) => {
            html5QrCode.pause(true);
            onScanned(decodedText);
            // Cleanup handled by useEffect return
        };
        
        const config = { fps: 10, qrbox: { width: 250, height: 250 } };

        html5QrCode.start({ facingMode: "environment" }, config, qrCodeSuccessCallback, undefined)
            .then(() => setScanStatus("Scanning for QR Code..."))
            .catch(err => {
                setScanStatus(`Camera Permission Error. Please allow camera access.`);
                console.error("Camera start failed.", err);
            });
            
        return () => {
            try {
                if (html5QrCode.isScanning) {
                    html5QrCode.stop().then(() => html5QrCode.clear()).catch(e => console.warn("Scanner stop error", e));
                } else {
                    html5QrCode.clear();
                }
            } catch (e) {
                console.warn("Scanner cleanup error", e);
            }
        };
    }, [onScanned]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 backdrop-blur-sm flex flex-col items-center justify-center z-50 p-4 animate-fade-in-fast">
            <Card title="Scan Product QR Code" className="w-full max-w-md relative animate-scale-in">
                 <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                    <X size={20}/>
                 </button>
                <div id={scannerId} className="w-full mt-4 rounded-lg overflow-hidden border"></div>
                <p className="text-center text-sm my-2 text-gray-600 dark:text-gray-400">{scanStatus}</p>
            </Card>
        </div>
    );
};

const QuotationsPage: React.FC = () => {
    const { state, dispatch, showToast } = useAppContext();
    const { showConfirm } = useDialog();
    const [isCreating, setIsCreating] = useState(false);
    
    // Form State
    const [customerId, setCustomerId] = useState('');
    const [quoteDate, setQuoteDate] = useState(getLocalDateString());
    const [validUntil, setValidUntil] = useState(getLocalDateString(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))); // +7 days
    const [items, setItems] = useState<QuoteItem[]>([]);
    const [discount, setDiscount] = useState('0');
    
    // Helper state for product selection
    const [productSearch, setProductSearch] = useState('');
    const [showProductDropdown, setShowProductDropdown] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    
    const [isScanning, setIsScanning] = useState(false);

    useOnClickOutside(searchRef, () => setShowProductDropdown(false));

    const customerOptions = useMemo(() => state.customers.map(c => ({
        value: c.id,
        label: `${c.name} - ${c.area}`,
        searchText: `${c.name} ${c.area}`
    })), [state.customers]);

    const filteredProducts = useMemo(() => state.products.filter(p => 
        p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
        p.id.toLowerCase().includes(productSearch.toLowerCase())
    ), [state.products, productSearch]);

    const calculations = useMemo(() => {
        const subTotal = items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
        const discountAmount = parseFloat(discount) || 0;
        
        const gstAmount = items.reduce((sum, item) => {
            const product = state.products.find(p => p.id === item.productId);
            const itemGstPercent = product ? Number(product.gstPercent)