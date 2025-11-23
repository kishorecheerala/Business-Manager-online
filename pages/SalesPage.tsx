
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Plus, Trash2, Share2, Search, X, IndianRupee, QrCode, Save, Edit, Printer, ShoppingCart } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Sale, SaleItem, Customer, Product, Payment } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';
import { Html5Qrcode } from 'html5-qrcode';
import DeleteButton from '../components/DeleteButton';
import { useOnClickOutside } from '../hooks/useOnClickOutside';
import { generateThermalInvoicePDF, generateInvoicePDF } from '../utils/pdfGenerator';
import AddCustomerModal from '../components/AddCustomerModal';
import Dropdown from '../components/Dropdown';
import ProductSearchModal from '../components/ProductSearchModal';
import QuantityInputModal from '../components/QuantityInputModal';

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface SalesPageProps {
  setIsDirty: (isDirty: boolean) => void;
}

const QRScannerModal: React.FC<{
    onClose: () => void;
    onScanned: (decodedText: string) => void;
}> = ({ onClose, onScanned }) => {
    const [scanStatus, setScanStatus] = useState<string>("Initializing camera...");
    const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

    useEffect(() => {
        html5QrCodeRef.current = new Html5Qrcode("qr-reader-sales");
        setScanStatus("Requesting camera permissions...");

        const qrCodeSuccessCallback = (decodedText: string) => {
            if (html5QrCodeRef.current?.isScanning) {
                html5QrCodeRef.current.stop().then(() => {
                    onScanned(decodedText);
                }).catch(err => {
                    console.error("Error stopping scanner", err);
                    onScanned(decodedText);
                });
            }
        };
        const config = { fps: 10, qrbox: { width: 250, height: 250 } };

        html5QrCodeRef.current.start({ facingMode: "environment" }, config, qrCodeSuccessCallback, undefined)
            .then(() => setScanStatus("Scanning for QR Code..."))
            .catch(err => {
                setScanStatus(`Camera Permission Error. Please allow camera access.`);
                console.error("Camera start failed.", err);
            });
            
        return () => {
            if (html5QrCodeRef.current?.isScanning) {
                html5QrCodeRef.current.stop().catch(err => console.error("Cleanup stop scan failed.", err));
            }
        };
    }, [onScanned]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 backdrop-blur-sm flex flex-col items-center justify-center z-50 p-4 animate-fade-in-fast">
            <Card title="Scan Product QR Code" className="w-full max-w-md relative animate-scale-in">
                 <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                    <X size={20}/>
                 </button>
                <div id="qr-reader-sales" className="w-full mt-4 rounded-lg overflow-hidden border-2 border-indigo-500"></div>
                <p className="text-center text-sm my-2 text-gray-600 dark:text-gray-400">{scanStatus}</p>
            </Card>
        </div>
    );
};

const SalesPage: React.FC<SalesPageProps> = ({ setIsDirty }) => {
    const { state, dispatch, showToast } = useAppContext();
    
    const [mode, setMode] = useState<'add' | 'edit'>('add');
    const [saleToEdit, setSaleToEdit] = useState<Sale | null>(null);

    const [customerId, setCustomerId] = useState('');
    const [items, setItems] = useState<SaleItem[]>([]);
    const [discount, setDiscount] = useState('0');
    const [saleDate, setSaleDate] = useState(getLocalDateString());
    
    const [paymentDetails, setPaymentDetails] = useState({
        amount: '',
        method: 'CASH' as 'CASH' | 'UPI' | 'CHEQUE',
        date: getLocalDateString(),
        reference: '',
    });

    const [isSelectingProduct, setIsSelectingProduct] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    
    const [isAddingCustomer, setIsAddingCustomer] = useState(false);
    const isDirtyRef = useRef(false);

    const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
    const [customerSearchTerm, setCustomerSearchTerm] = useState('');
    const customerDropdownRef = useRef<HTMLDivElement>(null);
    
    useOnClickOutside(customerDropdownRef, () => {
        if (isCustomerDropdownOpen) {
            setIsCustomerDropdownOpen(false);
        }
    });

    useEffect(() => {
        if (state.selection?.page === 'SALES' && state.selection.action === 'edit') {
            const sale = state.sales.find(s => s.id === state.selection.id);
            if (sale) {
                setSaleToEdit(sale);
                setMode('edit');
                setCustomerId(sale.customerId);
                setItems(sale.items.map(item => ({...item}))); 
                setDiscount(sale.discount.toString());
                setSaleDate(getLocalDateString(new Date(sale.date)));
                setPaymentDetails({ amount: '', method: 'CASH', date: getLocalDateString(), reference: '' });
                dispatch({ type: 'CLEAR_SELECTION' });
            }
        }
    }, [state.selection, state.sales, dispatch]);

    useEffect(() => {
        const dateIsDirty = mode === 'add' && saleDate !== getLocalDateString();
        const formIsDirty = !!customerId || items.length > 0 || discount !== '0' || !!paymentDetails.amount || dateIsDirty;
        const newCustomerFormIsDirty = isAddingCustomer;
        const currentlyDirty = formIsDirty || newCustomerFormIsDirty;
        if (currentlyDirty !== isDirtyRef.current) {
            isDirtyRef.current = currentlyDirty;
            setIsDirty(currentlyDirty);
        }
    }, [customerId, items, discount, paymentDetails.amount, isAddingCustomer, setIsDirty, saleDate, mode]);

    useEffect(() => {
        return () => {
            setIsDirty(false);
        };
    }, [setIsDirty]);

    const resetForm = () => {
        setCustomerId('');
        setItems([]);
        setDiscount('0');
        setSaleDate(getLocalDateString());
        setPaymentDetails({
            amount: '',
            method: 'CASH',
            date: getLocalDateString(),
            reference: '',
        });
        setIsSelectingProduct(false);
        setMode('add');
        setSaleToEdit(null);
    };
    
    const handleSelectProduct = (product: Product) => {
        const newItem = {
            productId: product.id,
            productName: product.name,
            price: Number(product.salePrice),
            quantity: 1,
        };

        const existingItem = items.find(i => i.productId === newItem.productId);
        const originalQtyInSale = mode === 'edit' ? saleToEdit?.items.find(i => i.productId === product.id)?.quantity || 0 : 0;
        const availableStock = Number(product.quantity) + originalQtyInSale;

        if (existingItem) {
            if (existingItem.quantity + 1 > availableStock) {
                 alert(`Not enough stock for ${product.name}. Only ${availableStock} available.`);
                 return;
            }
            setItems(items.map(i => i.productId === newItem.productId ? { ...i, quantity: i.quantity + 1 } : i));
        } else {
             if (1 > availableStock) {
                 alert(`Not enough stock for ${product.name}. Only ${availableStock} available.`);
                 return;
            }
            setItems([...items, newItem]);
        }
        setIsSelectingProduct(false);
    };
    
    const handleProductScanned = (decodedText: string) => {
        setIsScanning(false);
        const product = state.products.find(p => p.id.toLowerCase() === decodedText.toLowerCase());
        if (product) {
            handleSelectProduct(product);
        } else {
            alert("Product not found in inventory.");
        }
    };

    const handleItemChange = (productId: string, field: 'quantity' | 'price', value: string) => {
        const numValue = parseFloat(value);
        if (isNaN(numValue) && value !== '') return;

        setItems(prevItems => prevItems.map(item => {
            if (item.productId === productId) {
                if (field === 'quantity') {
                    const product = state.products.find(p => p.id === productId);
                    const originalQtyInSale = mode === 'edit' ? saleToEdit?.items.find(i => i.productId === productId)?.quantity || 0 : 0;
                    const availableStock = (Number(product?.quantity) || 0) + originalQtyInSale;
                    if (numValue > availableStock) {
                        alert(`Not enough stock for ${item.productName}. Only ${availableStock} available.`);
                        return { ...item, quantity: availableStock };
                    }
                }
                return { ...item, [field]: numValue };
            }
            return item;
        }));
    };

    const handleRemoveItem = (productId: string) => {
        setItems(items.filter(item => item.productId !== productId));
    };

    const calculations = useMemo(() => {
        const subTotal = items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
        const discountAmount = parseFloat(discount) || 0;
        const gstAmount = items.reduce((sum, item) => {
            const product = state.products.find(p => p.id === item.productId);
            const itemGstPercent = product ? Number(product.gstPercent) : 0;
            const itemTotalWithGst = Number(item.price) * Number(item.quantity);
            const itemGst = itemTotalWithGst - (itemTotalWithGst / (1 + (itemGstPercent / 100)));
            return sum + itemGst;
        }, 0);
        const totalAmount = subTotal - discountAmount;
        const roundedGstAmount = Math.round(gstAmount * 100) / 100;
        return { subTotal, discountAmount, gstAmount: roundedGstAmount, totalAmount };
    }, [items, discount, state.products]);

    const selectedCustomer = useMemo(() => customerId ? state.customers.find(c => c.id === customerId) : null, [customerId, state.customers]);

    const filteredCustomers = useMemo(() => 
        state.customers.filter(c => 
            c.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) || 
            c.area.toLowerCase().includes(customerSearchTerm.toLowerCase())
        ).sort((a,b) => a.name.localeCompare(b.name)),
    [state.customers, customerSearchTerm]);

    const customerTotalDue = useMemo(() => {
        if (!customerId) return null;
        const customerSales = state.sales.filter(s => s.customerId === customerId);
        if (customerSales.length === 0) return 0;
        const totalBilled = customerSales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0);
        const totalPaid = customerSales.reduce((sum, sale) => {
            return sum + (sale.payments || []).reduce((paySum, payment) => paySum + Number(payment.amount), 0);
        }, 0);
        return totalBilled - totalPaid;
    }, [customerId, state.sales]);

    const handleAddCustomer = useCallback((customer: Customer) => {
        dispatch({ type: 'ADD_CUSTOMER', payload: customer });
        setIsAddingCustomer(false);
        setCustomerId(customer.id);
        showToast("Customer added successfully!");
    }, [dispatch, showToast]);

    const generateAndSharePDF = async (sale: Sale, customer: Customer) => {
        try {
            const doc = await generateThermalInvoicePDF(sale, customer, state.profile);
            const pdfBlob = doc.output('blob');
            const url = URL.createObjectURL(pdfBlob);
            // Open in new tab - safest for mobile to avoid iframe crash
            window.open(url, '_blank');
        } catch (error) {
            console.error("PDF Gen Error", error);
            showToast("Could not generate receipt.", 'info');
        }
    };

    const handleSubmitSale = async () => {
        if (!customerId || items.length === 0) {
            alert("Please select a customer and add at least one item.");
            return;
        }
        const customer = state.customers.find(c => c.id === customerId);
        if(!customer) {
            alert("Could not find the selected customer.");
            return;
        }
        const { totalAmount, gstAmount, discountAmount } = calculations;

        if (mode === 'add') {
            const paidAmount = parseFloat(paymentDetails.amount) || 0;
            if (paidAmount > totalAmount + 0.01) {
                alert(`Paid amount (₹${paidAmount.toLocaleString('en-IN')}) cannot be greater than total amount.`);
                return;
            }
            const payments: Payment[] = [];
            if (paidAmount > 0) {
                payments.push({
                    id: `PAY-S-${Date.now()}`, amount: paidAmount, method: paymentDetails.method,
                    date: new Date(paymentDetails.date).toISOString(), reference: paymentDetails.reference.trim() || undefined,
                });
            }
            
            const saleCreationDate = new Date();
            const saleDateWithTime = new Date(`${saleDate}T${saleCreationDate.toTimeString().split(' ')[0]}`);
            const saleId = `SALE-${Date.now().toString().slice(-6)}`; // Shorter ID for cleaner receipt
            
            const newSale: Sale = {
                id: saleId, customerId, items, discount: discountAmount, gstAmount, totalAmount,
                date: saleDateWithTime.toISOString(), payments
            };
            dispatch({ type: 'ADD_SALE', payload: newSale });
            items.forEach(item => {
                dispatch({ type: 'UPDATE_PRODUCT_STOCK', payload: { productId: item.productId, change: -Number(item.quantity) } });
            });
            showToast('Sale created successfully!');
            await generateAndSharePDF(newSale, customer);

        } else if (mode === 'edit' && saleToEdit) {
            const existingPayments = saleToEdit.payments || [];
            const totalPaid = existingPayments.reduce((sum, p) => sum + Number(p.amount), 0);
            if (totalAmount < totalPaid - 0.01) {
                alert(`New total cannot be less than already paid amount (₹${totalPaid.toLocaleString('en-IN')}).`);
                return;
            }
            const updatedSale: Sale = {
                ...saleToEdit, items, discount: discountAmount, gstAmount, totalAmount,
            };
            dispatch({ type: 'UPDATE_SALE', payload: { oldSale: saleToEdit, updatedSale } });
            showToast('Sale updated successfully!');
        }
        resetForm();
    };

     const handleRecordStandalonePayment = () => {
        if (!customerId) return alert('Select a customer.');
        const paidAmount = parseFloat(paymentDetails.amount || '0');
        if (paidAmount <= 0) return alert('Enter valid amount.');

        const outstandingSales = state.sales
            .filter(sale => {
                const paid = (sale.payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
                return sale.customerId === customerId && (Number(sale.totalAmount) - paid) > 0.01;
            })
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        if (outstandingSales.length === 0) return alert('This customer has no outstanding dues.');
        
        let remainingPayment = paidAmount;
        for (const sale of outstandingSales) {
            if (remainingPayment <= 0) break;
            const paid = (sale.payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
            const dueAmount = Number(sale.totalAmount) - paid;
            const amountToApply = Math.min(remainingPayment, dueAmount);

            const newPayment: Payment = {
                id: `PAY-S-${Date.now()}-${Math.random().toString().slice(2,6)}`,
                amount: amountToApply,
                method: paymentDetails.method,
                date: new Date(paymentDetails.date).toISOString(),
                reference: paymentDetails.reference.trim() || undefined,
            };
            dispatch({ type: 'ADD_PAYMENT_TO_SALE', payload: { saleId: sale.id, payment: newPayment } });
            remainingPayment -= amountToApply;
        }
        showToast(`Payment of ₹${paidAmount.toLocaleString('en-IN')} recorded.`);
        resetForm();
    };

    // Inline reusable components for this page to avoid complex imports if environment is flaky
    const ProductSearchInline = ({ products, onClose, onSelect }: any) => {
        const [term, setTerm] = useState('');
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in-fast">
                <Card className="w-full max-w-lg h-[60vh] flex flex-col animate-scale-in">
                    <div className="flex justify-between items-center mb-4 border-b pb-2 dark:border-slate-700">
                        <h3 className="font-bold text-lg text-primary">Select Product</h3>
                        <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full"><X size={20}/></button>
                    </div>
                    <div className="relative mb-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input autoFocus type="text" placeholder="Search..." className="p-2 pl-10 border rounded-lg w-full dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:ring-2 focus:ring-primary" value={term} onChange={e => setTerm(e.target.value)} />
                    </div>
                    <div className="overflow-y-auto flex-grow space-y-2">
                        {products.filter((p: any) => p.name.toLowerCase().includes(term.toLowerCase())).map((p: any) => (
                            <div key={p.id} onClick={() => onSelect(p)} className="p-3 border rounded-lg cursor-pointer hover:bg-indigo-50 dark:hover:bg-slate-700 dark:border-slate-600 transition-colors flex justify-between">
                                <div>
                                    <div className="font-semibold text-gray-800 dark:text-gray-200">{p.name}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">{p.id}</div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-primary">₹{p.salePrice}</div>
                                    <div className={`text-xs ${p.quantity < 5 ? 'text-red-500' : 'text-green-500'}`}>Stock: {p.quantity}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        );
    };

    const pageTitle = mode === 'edit' ? `Edit Sale: ${saleToEdit?.id}` : 'New Sale / Payment';
    const canCreateSale = customerId && items.length > 0 && mode === 'add';
    const canUpdateSale = customerId && items.length > 0 && mode === 'edit';
    const canRecordPayment = customerId && items.length === 0 && parseFloat(paymentDetails.amount || '0') > 0 && customerTotalDue != null && customerTotalDue > 0.01 && mode === 'add';

    return (
        <div className="space-y-4 animate-fade-in-fast">
            {isAddingCustomer && <AddCustomerModal isOpen={isAddingCustomer} onClose={() => setIsAddingCustomer(false)} onAdd={handleAddCustomer} existingCustomers={state.customers} />}
            {isSelectingProduct && <ProductSearchInline products={state.products} onClose={() => setIsSelectingProduct(false)} onSelect={handleSelectProduct} />}
            {isScanning && <QRScannerModal onClose={() => setIsScanning(false)} onScanned={handleProductScanned} />}
            
            <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">{pageTitle}</h1>
            </div>
            
            <Card className="border-l-4 border-indigo-500">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Select Customer</label>
                        <div className="flex gap-2 items-center">
                            <div className="relative w-full" ref={customerDropdownRef}>
                                <button
                                    type="button"
                                    onClick={() => setIsCustomerDropdownOpen(prev => !prev)}
                                    className="w-full p-3 border rounded-xl bg-white text-left flex justify-between items-center shadow-sm hover:border-indigo-300 focus:ring-2 focus:ring-indigo-500 transition-all dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                                    disabled={mode === 'edit' || (mode === 'add' && items.length > 0)}
                                >
                                    <span className="truncate font-medium">{selectedCustomer ? `${selectedCustomer.name} - ${selectedCustomer.area}` : 'Search or Select Customer'}</span>
                                    <Search className="w-4 h-4 text-gray-400" />
                                </button>

                                {isCustomerDropdownOpen && (
                                    <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-100 dark:border-slate-700 z-40 animate-scale-in overflow-hidden">
                                        <div className="p-2 bg-gray-50 dark:bg-slate-800 border-b dark:border-slate-700">
                                            <input
                                                type="text"
                                                placeholder="Type name to filter..."
                                                value={customerSearchTerm}
                                                onChange={e => setCustomerSearchTerm(e.target.value)}
                                                className="w-full p-2 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 dark:text-white"
                                                autoFocus
                                            />
                                        </div>
                                        <ul className="max-h-60 overflow-y-auto">
                                            {filteredCustomers.map(c => (
                                                <li
                                                    key={c.id}
                                                    onClick={() => {
                                                        setCustomerId(c.id);
                                                        setIsCustomerDropdownOpen(false);
                                                        setCustomerSearchTerm('');
                                                    }}
                                                    className="px-4 py-3 hover:bg-indigo-50 dark:hover:bg-slate-700 cursor-pointer border-b border-gray-50 dark:border-slate-700/50 last:border-0"
                                                >
                                                    <div className="font-bold text-gray-800 dark:text-gray-200">{c.name}</div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400">{c.area} • {c.phone}</div>
                                                </li>
                                            ))}
                                            {filteredCustomers.length === 0 && <li className="p-4 text-gray-500 text-center text-sm">No customers found.</li>}
                                        </ul>
                                    </div>
                                )}
                            </div>
                            {mode === 'add' && (
                                <Button onClick={() => setIsAddingCustomer(true)} className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md rounded-xl px-4 flex-shrink-0">
                                    <Plus size={18}/>
                                </Button>
                            )}
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date</label>
                            <input 
                                type="date" 
                                value={saleDate} 
                                onChange={e => setSaleDate(e.target.value)} 
                                className="w-full p-2 border rounded-lg mt-1 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200 focus:ring-indigo-500"
                                disabled={mode === 'edit'}
                            />
                        </div>
                        {customerId && customerTotalDue !== null && mode === 'add' && (
                            <div className={`p-3 rounded-xl border flex flex-col justify-center items-center ${customerTotalDue > 0.01 ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' : 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800'}`}>
                                <p className="text-xs font-bold uppercase tracking-wider opacity-70">Current Due</p>
                                <p className={`text-xl font-extrabold ${customerTotalDue > 0.01 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                    ₹{customerTotalDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            <Card title="Cart Items">
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                    <Button onClick={() => setIsSelectingProduct(true)} className="w-full sm:w-auto flex-grow bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-slate-700 dark:text-indigo-300 dark:hover:bg-slate-600" disabled={!customerId}>
                        <Search size={16} className="mr-2"/> Search Product
                    </Button>
                    <Button onClick={() => setIsScanning(true)} className="w-full sm:w-auto flex-grow bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-slate-700 dark:text-purple-300 dark:hover:bg-slate-600" disabled={!customerId}>
                        <QrCode size={16} className="mr-2"/> Scan QR
                    </Button>
                </div>
                
                {items.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 bg-gray-50 dark:bg-slate-800/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-700">
                        <ShoppingCart size={48} className="mx-auto mb-2 opacity-20" />
                        <p>Cart is empty</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {items.map((item, idx) => (
                            <div key={item.productId} className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 animate-scale-in" style={{animationDelay: `${idx * 50}ms`}}>
                                <div className="flex justify-between items-start mb-2">
                                    <p className="font-bold text-gray-800 dark:text-gray-200">{item.productName}</p>
                                    <DeleteButton variant="remove" onClick={() => handleRemoveItem(item.productId)} />
                                </div>
                                <div className="flex items-center gap-2 text-sm bg-gray-50 dark:bg-slate-700/50 p-2 rounded-lg">
                                    <div className="flex items-center bg-white dark:bg-slate-600 rounded border dark:border-slate-500 overflow-hidden">
                                        <input type="number" value={item.quantity} onChange={e => handleItemChange(item.productId, 'quantity', e.target.value)} className="w-16 p-1 text-center outline-none dark:bg-slate-600 dark:text-white font-bold" />
                                    </div>
                                    <span className="text-gray-400">x</span>
                                    <input type="number" value={item.price} onChange={e => handleItemChange(item.productId, 'price', e.target.value)} className="w-20 p-1 border-b border-dashed bg-transparent outline-none text-center dark:text-white" />
                                    <span className="ml-auto font-bold text-indigo-600 dark:text-indigo-400">₹{(Number(item.quantity) * Number(item.price)).toLocaleString('en-IN')}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-2xl p-5 shadow-xl">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Billing Summary</h3>
                
                <div className="space-y-2 text-sm mb-4">
                    <div className="flex justify-between text-slate-300">
                        <span>Subtotal</span>
                        <span>₹{calculations.subTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-slate-300">Discount</span>
                        <input type="number" value={discount} onChange={e => setDiscount(e.target.value)} className="w-24 p-1 bg-slate-700 rounded border border-slate-600 text-right text-white outline-none focus:border-indigo-500" />
                    </div>
                    <div className="flex justify-between text-slate-300">
                        <span>GST (Inc)</span>
                        <span>₹{calculations.gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>
                
                <div className="flex justify-between items-end border-t border-slate-700 pt-4 mb-6">
                    <span className="text-lg font-bold">Grand Total</span>
                    <span className="text-3xl font-extrabold text-emerald-400">₹{calculations.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>

                {mode === 'add' ? (
                    <div className="bg-slate-700/50 rounded-xl p-3 space-y-3 border border-slate-600">
                        <div>
                            <label className="text-xs text-slate-400 block mb-1">Amount Paid Now</label>
                            <input type="number" value={paymentDetails.amount} onChange={e => setPaymentDetails({...paymentDetails, amount: e.target.value })} className="w-full p-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="0" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <select value={paymentDetails.method} onChange={e => setPaymentDetails({ ...paymentDetails, method: e.target.value as any})} className="p-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm">
                                <option value="CASH">Cash</option>
                                <option value="UPI">UPI</option>
                                <option value="CHEQUE">Cheque</option>
                            </select>
                            <input type="text" placeholder="Ref (Optional)" value={paymentDetails.reference} onChange={e => setPaymentDetails({...paymentDetails, reference: e.target.value })} className="p-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm" />
                        </div>
                    </div>
                ) : (
                    <p className="text-center text-xs text-slate-400 bg-slate-800 p-2 rounded">Edit mode: Payments managed separately.</p>
                )}
            </div>

            <div className="pb-10 pt-2">
                {canCreateSale ? (
                    <Button onClick={handleSubmitSale} className="w-full py-4 text-lg shadow-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 transform active:scale-[0.98] transition-all">
                        <Share2 className="w-5 h-5 mr-2"/> Confirm & Print
                    </Button>
                ) : canUpdateSale ? (
                    <Button onClick={handleSubmitSale} className="w-full py-3 text-lg">
                        <Save className="w-5 h-5 mr-2"/> Save Changes
                    </Button>
                ) : canRecordPayment ? (
                     <Button onClick={handleRecordStandalonePayment} className="w-full py-4 text-lg bg-indigo-600 hover:bg-indigo-700 shadow-lg">
                        <IndianRupee className="w-5 h-5 mr-2" /> Pay Dues (₹{paymentDetails.amount || 0})
                    </Button>
                ) : (
                     <Button className="w-full py-3 bg-gray-300 dark:bg-slate-700 text-gray-500 cursor-not-allowed" disabled>
                        {customerId ? (items.length === 0 ? 'Add Items or Enter Amount' : 'Complete details') : 'Select a customer'}
                    </Button>
                )}
                
                <Button onClick={resetForm} variant="secondary" className="w-full mt-3 bg-transparent border border-gray-300 dark:border-slate-600 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800">
                    {mode === 'edit' ? 'Cancel Edit' : 'Reset Form'}
                </Button>
            </div>
        </div>
    );
};

export default SalesPage;
