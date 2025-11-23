
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Plus, Trash2, Share2, Search, X, IndianRupee, QrCode, Save, Edit, ShoppingCart, Info, ChevronDown } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Sale, SaleItem, Customer, Product, Payment } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Html5Qrcode } from 'html5-qrcode';
import DeleteButton from '../components/DeleteButton';
import { useOnClickOutside } from '../hooks/useOnClickOutside';
import { logoBase64 } from '../utils/logo';


const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const fetchImageAsBase64 = (url: string): Promise<string> =>
  fetch(url)
    .then(response => response.blob())
    .then(blob => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    }));

interface SalesPageProps {
  setIsDirty: (isDirty: boolean) => void;
}

const newCustomerInitialState = { id: '', name: '', phone: '', address: '', area: '', reference: '' };

const AddCustomerModal: React.FC<{
    newCustomer: typeof newCustomerInitialState;
    onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSave: () => void;
    onCancel: () => void;
}> = React.memo(({ newCustomer, onInputChange, onSave, onCancel }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in-fast">
        <Card title="Add New Customer" className="w-full max-w-md animate-scale-in">
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Customer ID</label>
                    <div className="flex items-center mt-1">
                        <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-gray-400">
                            CUST-
                        </span>
                        <input
                            type="text"
                            name="id"
                            placeholder="Enter unique ID"
                            value={newCustomer.id}
                            onChange={onInputChange}
                            className="w-full p-2 border rounded-r-md dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                    <input type="text" placeholder="Full Name" name="name" value={newCustomer.name} onChange={onInputChange} className="w-full p-2 border rounded mt-1 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
                    <input type="text" placeholder="Phone Number" name="phone" value={newCustomer.phone} onChange={onInputChange} className="w-full p-2 border rounded mt-1 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Address</label>
                    <input type="text" placeholder="Full Address" name="address" value={newCustomer.address} onChange={onInputChange} className="w-full p-2 border rounded mt-1 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Area/Location</label>
                    <input type="text" placeholder="e.g. Ameerpet" name="area" value={newCustomer.area} onChange={onInputChange} className="w-full p-2 border rounded mt-1 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Reference (Optional)</label>
                    <input type="text" placeholder="Referred by..." name="reference" value={newCustomer.reference} onChange={onInputChange} className="w-full p-2 border rounded mt-1 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" />
                </div>
                <div className="flex gap-2">
                    <Button onClick={onSave} className="w-full">Save Customer</Button>
                    <Button onClick={onCancel} variant="secondary" className="w-full">Cancel</Button>
                </div>
            </div>
        </Card>
    </div>
));

const ProductSearchModal: React.FC<{
    products: Product[];
    onClose: () => void;
    onSelect: (product: Product) => void;
}> = ({ products, onClose, onSelect }) => {
    const [productSearchTerm, setProductSearchTerm] = useState('');

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in-fast">
          <Card className="w-full max-w-lg animate-scale-in">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Select Product</h2>
              <button onClick={onClose} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                <X size={20}/>
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search products..."
                value={productSearchTerm}
                onChange={e => setProductSearchTerm(e.target.value)}
                className="w-full p-2 pl-10 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                autoFocus
              />
            </div>
            <div className="mt-4 max-h-80 overflow-y-auto space-y-2">
              {products
                .filter(p => p.name.toLowerCase().includes(productSearchTerm.toLowerCase()) || p.id.toLowerCase().includes(productSearchTerm.toLowerCase()))
                .map(p => (
                <div key={p.id} onClick={() => onSelect(p)} className="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg cursor-pointer hover:bg-teal-50 dark:hover:bg-slate-700 flex justify-between items-center">
                  <div>
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Code: {p.id}</p>
                  </div>
                  <div className="text-right">
                      <p className="font-semibold">₹{Number(p.salePrice).toLocaleString('en-IN')}</p>
                      <p className="text-sm">Stock: {p.quantity}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
    );
};
    
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
                    // Still call onScanned even if stopping fails, to proceed with logic
                    onScanned(decodedText);
                });
            }
        };
        const config = { fps: 10, qrbox: { width: 250, height: 250 } };

        html5QrCodeRef.current.start({ facingMode: "environment" }, config, qrCodeSuccessCallback, undefined)
            .then(() => setScanStatus("Scanning for QR Code..."))
            .catch(err => {
                setScanStatus(`Camera Permission Error. Please allow camera access for this site in your browser's settings.`);
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
                <div id="qr-reader-sales" className="w-full mt-4 rounded-lg overflow-hidden border"></div>
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
    const [newCustomer, setNewCustomer] = useState(newCustomerInitialState);
    const isDirtyRef = useRef(false);

    const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
    const [customerSearchTerm, setCustomerSearchTerm] = useState('');
    const customerDropdownRef = useRef<HTMLDivElement>(null);
    
    useOnClickOutside(customerDropdownRef, () => {
        if (isCustomerDropdownOpen) {
            setIsCustomerDropdownOpen(false);
        }
    });

    // Effect to handle switching to edit mode from another page
    useEffect(() => {
        if (state.selection?.page === 'SALES' && state.selection.action === 'edit') {
            const sale = state.sales.find(s => s.id === state.selection.id);
            if (sale) {
                setSaleToEdit(sale);
                setMode('edit');
                setCustomerId(sale.customerId);
                setItems(sale.items.map(item => ({...item}))); // Deep copy
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
        const newCustomerFormIsDirty = isAddingCustomer && !!(newCustomer.id || newCustomer.name || newCustomer.phone || newCustomer.address || newCustomer.area);
        const currentlyDirty = formIsDirty || newCustomerFormIsDirty;
        if (currentlyDirty !== isDirtyRef.current) {
            isDirtyRef.current = currentlyDirty;
            setIsDirty(currentlyDirty);
        }
    }, [customerId, items, discount, paymentDetails.amount, isAddingCustomer, newCustomer, setIsDirty, saleDate, mode]);


    // On unmount, we must always clean up.
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
                 alert(`Not enough stock for ${product.name}. Only ${availableStock} available for this sale.`);
                 return;
            }
            setItems(items.map(i => i.productId === newItem.productId ? { ...i, quantity: i.quantity + 1 } : i));
        } else {
             if (1 > availableStock) {
                 alert(`Not enough stock for ${product.name}. Only ${availableStock} available for this sale.`);
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
                        alert(`Not enough stock for ${item.productName}. Only ${availableStock} available for this sale.`);
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

    const handleNewCustomerChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setNewCustomer(prev => ({...prev, [name]: value}));
    }, []);

    const handleCancelAddCustomer = useCallback(() => {
        setIsAddingCustomer(false);
        setNewCustomer(newCustomerInitialState);
    }, []);

    const handleAddCustomer = useCallback(() => {
        const trimmedId = newCustomer.id.trim();
        if (!trimmedId) {
            alert('Customer ID is required.');
            return;
        }
        if (!newCustomer.name || !newCustomer.phone || !newCustomer.address || !newCustomer.area) {
            alert('Please fill all required fields (Name, Phone, Address, Area).');
            return;
        }

        const finalId = `CUST-${trimmedId}`;
        const isIdTaken = state.customers.some(c => c.id.toLowerCase() === finalId.toLowerCase());

        if (isIdTaken) {
            alert(`Customer ID "${finalId}" is already taken. Please choose another one.`);
            return;
        }

        const customerWithId: Customer = {
            name: newCustomer.name,
            phone: newCustomer.phone,
            address: newCustomer.address,
            area: newCustomer.area,
            id: finalId,
            reference: newCustomer.reference || ''
        };
        dispatch({ type: 'ADD_CUSTOMER', payload: customerWithId });
        setNewCustomer(newCustomerInitialState);
        setIsAddingCustomer(false);
        setCustomerId(customerWithId.id);
        showToast("Customer added successfully!");
    }, [newCustomer, state.customers, dispatch, showToast]);


    const generateAndSharePDF = async (sale: Sale, customer: Customer, paidAmountOnSale: number) => {
      // ... logic handled by centralized pdfGenerator now, but kept for fallback/compatibility ...
      // This function body is largely illustrative in this snippet as we moved logic to utils/pdfGenerator.ts
      // In a real refactor, we call the util directly. 
      // But adhering to "minimal changes" while fixing the request:
      // We use window.open to prevent crashes as requested before.
      
      // NOTE: In a previous turn I moved this to utils/pdfGenerator.ts. 
      // I will use the `handlePrintOrShare` logic (which calls utils) for the manual action buttons,
      // but for automatic generation after sale, we'll do a simple share if supported.
      
      try {
          // Import dynamically to avoid circular deps if needed, or just use the util
          const { generateThermalInvoicePDF } = await import('../utils/pdfGenerator');
          const doc = await generateThermalInvoicePDF(sale, customer, state.profile);
          
          // Share Logic
          const blob = doc.output('blob');
          const file = new File([blob], `Receipt-${sale.id}.pdf`, { type: 'application/pdf' });
          
          if (navigator.share && navigator.canShare({ files: [file] })) {
              await navigator.share({
                  title: `Receipt ${sale.id}`,
                  text: `Thank you for shopping with us!`,
                  files: [file]
              });
          } else {
              // Fallback for desktop
              const url = URL.createObjectURL(blob);
              window.open(url, '_blank');
          }
      } catch (e) {
          console.error("Auto-receipt failed", e);
          // Don't block the UI for this
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
                alert(`Paid amount (₹${paidAmount.toLocaleString('en-IN')}) cannot be greater than the total amount (₹${totalAmount.toLocaleString('en-IN')}).`);
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
            const saleId = `SALE-${saleCreationDate.getFullYear()}${(saleCreationDate.getMonth() + 1).toString().padStart(2, '0')}${saleCreationDate.getDate().toString().padStart(2, '0')}-${saleCreationDate.getHours().toString().padStart(2, '0')}${saleCreationDate.getMinutes().toString().padStart(2, '0')}${saleCreationDate.getSeconds().toString().padStart(2, '0')}`;
            
            const newSale: Sale = {
                id: saleId, customerId, items, discount: discountAmount, gstAmount, totalAmount,
                date: saleDateWithTime.toISOString(), payments
            };
            dispatch({ type: 'ADD_SALE', payload: newSale });
            items.forEach(item => {
                dispatch({ type: 'UPDATE_PRODUCT_STOCK', payload: { productId: item.productId, change: -Number(item.quantity) } });
            });
            showToast('Sale created successfully!');
            
            // Auto-generate thermal receipt
            await generateAndSharePDF(newSale, customer, paidAmount);

        } else if (mode === 'edit' && saleToEdit) {
            const existingPayments = saleToEdit.payments || [];
            const totalPaid = existingPayments.reduce((sum, p) => sum + Number(p.amount), 0);

            if (totalAmount < totalPaid - 0.01) {
                alert(`The new total amount (₹${totalAmount.toLocaleString('en-IN')}) cannot be less than the amount already paid (₹${totalPaid.toLocaleString('en-IN')}).`);
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
        if (!customerId) {
            alert('Please select a customer to record a payment for.');
            return;
        }

        const paidAmount = parseFloat(paymentDetails.amount || '0');
        if (paidAmount <= 0) {
            alert('Please enter a valid payment amount.');
            return;
        }

        const outstandingSales = state.sales
            .filter(sale => {
                const paid = (sale.payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
                return sale.customerId === customerId && (Number(sale.totalAmount) - paid) > 0.01;
            })
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        if (outstandingSales.length === 0) {
            alert('This customer has no outstanding dues.');
            return;
        }
        
        let remainingPayment = paidAmount;
        for (const sale of outstandingSales) {
            if (remainingPayment <= 0) break;

            const paid = (sale.payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
            const dueAmount = Number(sale.totalAmount) - paid;
            
            const amountToApply = Math.min(remainingPayment, dueAmount);

            const newPayment: Payment = {
                id: `PAY-S-${Date.now()}-${Math.random()}`,
                amount: amountToApply,
                method: paymentDetails.method,
                date: new Date(paymentDetails.date).toISOString(),
                reference: paymentDetails.reference.trim() || undefined,
            };

            dispatch({ type: 'ADD_PAYMENT_TO_SALE', payload: { saleId: sale.id, payment: newPayment } });
            
            remainingPayment -= amountToApply;
        }
        
        showToast(`Payment of ₹${paidAmount.toLocaleString('en-IN')} recorded successfully.`);
        resetForm();
    };

    const canCreateSale = customerId && items.length > 0 && mode === 'add';
    const canUpdateSale = customerId && items.length > 0 && mode === 'edit';
    const canRecordPayment = customerId && items.length === 0 && parseFloat(paymentDetails.amount || '0') > 0 && customerTotalDue != null && customerTotalDue > 0.01 && mode === 'add';
    const pageTitle = mode === 'edit' ? `Edit Sale: ${saleToEdit?.id}` : 'New Sale / Payment';

    return (
        <div className="space-y-4">
            {isAddingCustomer && 
                <AddCustomerModal 
                    newCustomer={newCustomer}
                    onInputChange={handleNewCustomerChange}
                    onSave={handleAddCustomer}
                    onCancel={handleCancelAddCustomer}
                />
            }
            {isSelectingProduct && 
                <ProductSearchModal 
                    products={state.products}
                    onClose={() => setIsSelectingProduct(false)}
                    onSelect={handleSelectProduct}
                />
            }
            {isScanning && 
                <QRScannerModal 
                    onClose={() => setIsScanning(false)}
                    onScanned={handleProductScanned}
                />
            }
            
            <h1 className="text-2xl font-bold text-primary">{pageTitle}</h1>
            
            <Card>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Select Customer</label>
                        <div className="flex gap-3 items-center">
                            <div className="relative w-full" ref={customerDropdownRef}>
                                <div 
                                    onClick={() => setIsCustomerDropdownOpen(!isCustomerDropdownOpen)}
                                    className="w-full p-3 pl-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl flex items-center justify-between cursor-pointer shadow-sm hover:border-indigo-400 transition-all"
                                >
                                    <span className={selectedCustomer ? 'text-gray-800 dark:text-white font-semibold' : 'text-gray-400'}>
                                        {selectedCustomer ? selectedCustomer.name : 'Search or Select Customer'}
                                    </span>
                                    <Search className="w-5 h-5 text-gray-400" />
                                </div>

                                {isCustomerDropdownOpen && (
                                    <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-gray-100 dark:border-slate-700 z-40 animate-scale-in origin-top overflow-hidden">
                                        <div className="p-2 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
                                            <input
                                                type="text"
                                                placeholder="Type to search..."
                                                value={customerSearchTerm}
                                                onChange={e => setCustomerSearchTerm(e.target.value)}
                                                className="w-full p-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                                                autoFocus
                                            />
                                        </div>
                                        <ul className="max-h-60 overflow-y-auto" role="listbox">
                                            {filteredCustomers.map(c => (
                                                <li
                                                    key={c.id}
                                                    onClick={() => {
                                                        setCustomerId(c.id);
                                                        setIsCustomerDropdownOpen(false);
                                                        setCustomerSearchTerm('');
                                                    }}
                                                    className="px-4 py-3 hover:bg-indigo-50 dark:hover:bg-slate-800 cursor-pointer border-b border-gray-50 dark:border-slate-800 last:border-0 transition-colors"
                                                >
                                                    <div className="font-semibold text-gray-800 dark:text-gray-200">{c.name}</div>
                                                    <div className="text-xs text-gray-500">{c.area} • {c.phone}</div>
                                                </li>
                                            ))}
                                            {filteredCustomers.length === 0 && (
                                                <li className="px-4 py-4 text-center text-gray-400 text-sm">No customers found.</li>
                                            )}
                                        </ul>
                                    </div>
                                )}
                            </div>
                            {mode === 'add' && (
                                <button 
                                    onClick={() => setIsAddingCustomer(true)} 
                                    className="p-3.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl shadow-md hover:shadow-lg active:scale-95 transition-all flex-shrink-0"
                                    aria-label="Add New Customer"
                                >
                                    <Plus size={24} strokeWidth={2.5} />
                                </button>
                            )}
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Sale Date</label>
                        <input 
                            type="date" 
                            value={saleDate} 
                            onChange={e => setSaleDate(e.target.value)} 
                            className="w-full p-2.5 border bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 rounded-lg mt-1 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                            disabled={mode === 'edit'}
                        />
                    </div>

                    {customerId && customerTotalDue !== null && mode === 'add' && (
                        <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl flex justify-between items-center">
                            <p className="text-sm font-medium text-indigo-800 dark:text-indigo-300">
                                Outstanding Dues
                            </p>
                            <p className={`text-lg font-bold ${customerTotalDue > 0.01 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                ₹{customerTotalDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                    )}
                </div>
            </Card>


            <Card title="Sale Items">
                <div className="flex flex-col sm:flex-row gap-2">
                    <Button onClick={() => setIsSelectingProduct(true)} className="w-full sm:w-auto flex-grow" disabled={!customerId}>
                        <Search size={16} className="mr-2"/> Select Product
                    </Button>
                    <Button onClick={() => setIsScanning(true)} variant="secondary" className="w-full sm:w-auto flex-grow" disabled={!customerId}>
                        <QrCode size={16} className="mr-2"/> Scan Product
                    </Button>
                </div>
                
                <div className="mt-4 space-y-2">
                    {items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-gray-400 dark:text-gray-500 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl bg-gray-50/50 dark:bg-slate-800/30">
                            <div className="p-4 bg-white dark:bg-slate-800 rounded-full shadow-sm mb-3">
                                <ShoppingCart size={32} className="text-indigo-200 dark:text-slate-600" />
                            </div>
                            <p className="font-medium">Cart is empty</p>
                            <p className="text-xs mt-1 opacity-70">Add products to proceed</p>
                        </div>
                    ) : (
                        items.map(item => (
                            <div key={item.productId} className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm animate-fade-in-fast border border-gray-100 dark:border-slate-700">
                                <div className="flex justify-between items-start">
                                    <p className="font-semibold flex-grow dark:text-gray-200 text-sm">{item.productName}</p>
                                    <DeleteButton variant="remove" onClick={() => handleRemoveItem(item.productId)} />
                                </div>
                                <div className="flex items-center gap-2 text-sm mt-2">
                                    <div className="relative">
                                        <input type="number" value={item.quantity} onChange={e => handleItemChange(item.productId, 'quantity', e.target.value)} className="w-16 p-1.5 pl-2 border rounded-lg text-center font-bold dark:bg-slate-700 dark:border-slate-600 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" />
                                        <span className="text-[10px] text-gray-400 absolute -bottom-4 left-1/2 -translate-x-1/2">Qty</span>
                                    </div>
                                    <span className="text-gray-400 mx-1">x</span>
                                    <div className="relative">
                                        <input type="number" value={item.price} onChange={e => handleItemChange(item.productId, 'price', e.target.value)} className="w-20 p-1.5 pl-2 border rounded-lg text-center dark:bg-slate-700 dark:border-slate-600 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" />
                                        <span className="text-[10px] text-gray-400 absolute -bottom-4 left-1/2 -translate-x-1/2">Price</span>
                                    </div>
                                    <span className="ml-auto font-bold text-indigo-600 dark:text-indigo-400">₹{(Number(item.quantity) * Number(item.price)).toLocaleString('en-IN')}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </Card>

            {/* Billing Summary Card - Ensure consistent light mode background */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-xl border border-gray-100 dark:border-slate-700 transition-all duration-200">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-4 border-b border-gray-100 dark:border-slate-700 pb-2">Billing Summary</h3>
                
                <div className="space-y-3">
                    <div className="flex justify-between items-center text-gray-600 dark:text-slate-300 text-sm">
                        <span>Subtotal:</span>
                        <span className="font-medium">₹{calculations.subTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center text-gray-600 dark:text-slate-300 text-sm">
                        <span>Discount:</span>
                        <input 
                            type="number" 
                            value={discount} 
                            onChange={e => setDiscount(e.target.value)} 
                            className="w-24 p-1.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg text-right text-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all" 
                        />
                    </div>
                    <div className="flex justify-between items-center text-gray-600 dark:text-slate-300 text-sm">
                        <span>GST Included:</span>
                        <span>₹{calculations.gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>

                <div className="my-4 border-t border-dashed border-gray-200 dark:border-slate-700"></div>

                <div className="text-center mb-6">
                    <p className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">Grand Total</p>
                    <p className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-emerald-400 dark:to-teal-300">
                        ₹{calculations.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                </div>

                {mode === 'add' ? (
                    <div className="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-4 space-y-4 border border-gray-200 dark:border-slate-700">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1.5">Amount Paid Now</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                                <input 
                                    type="number" 
                                    value={paymentDetails.amount} 
                                    onChange={e => setPaymentDetails({...paymentDetails, amount: e.target.value })} 
                                    placeholder={`${calculations.totalAmount.toLocaleString('en-IN')}`} 
                                    className="w-full p-2.5 pl-8 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-800 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-bold text-lg" 
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1.5">Method</label>
                                <select 
                                    value={paymentDetails.method} 
                                    onChange={e => setPaymentDetails({ ...paymentDetails, method: e.target.value as any})} 
                                    className="w-full p-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-800 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                >
                                    <option value="CASH">Cash</option>
                                    <option value="UPI">UPI</option>
                                    <option value="CHEQUE">Cheque</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1.5">Reference</label>
                                <input 
                                    type="text" 
                                    placeholder="Optional" 
                                    value={paymentDetails.reference} 
                                    onChange={e => setPaymentDetails({...paymentDetails, reference: e.target.value })} 
                                    className="w-full p-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-800 dark:text-white text-sm placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 outline-none" 
                                />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="p-3 bg-blue-50 dark:bg-slate-900/50 rounded-lg border border-blue-100 dark:border-slate-700 text-center">
                        <p className="text-xs text-blue-600 dark:text-slate-400 flex items-center justify-center gap-2">
                            <Info size={14}/>
                            Payments managed in customer details.
                        </p>
                    </div>
                )}
            </div>
            
            {mode === 'add' && items.length === 0 && customerId && customerTotalDue != null && customerTotalDue > 0.01 && (
                <Card title="Record Payment for Dues">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Amount Paid</label>
                            <input type="number" value={paymentDetails.amount} onChange={e => setPaymentDetails({...paymentDetails, amount: e.target.value })} placeholder={'Enter amount to pay dues'} className="w-full p-2 border-2 border-red-300 rounded-lg shadow-inner focus:ring-red-500 focus:border-red-500 dark:bg-slate-700 dark:border-red-400" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Payment Method</label>
                            <select value={paymentDetails.method} onChange={e => setPaymentDetails({ ...paymentDetails, method: e.target.value as any})} className="w-full p-2 border rounded custom-select dark:bg-slate-700 dark:border-slate-600">
                                <option value="CASH">Cash</option>
                                <option value="UPI">UPI</option>
                                <option value="CHEQUE">Cheque</option>
                            </select>
                        </div>
                    </div>
                </Card>
            )}

            <div className="space-y-2 pb-20">
                {canCreateSale ? (
                    <Button onClick={handleSubmitSale} variant="secondary" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg py-3 text-lg">
                        <Share2 className="w-5 h-5 mr-2"/>
                        Create Sale & Share Invoice
                    </Button>
                ) : canUpdateSale ? (
                    <Button onClick={handleSubmitSale} className="w-full">
                        <Save className="w-4 h-4 mr-2"/>
                        Save Changes to Sale
                    </Button>
                ) : canRecordPayment ? (
                     <Button onClick={handleRecordStandalonePayment} className="w-full">
                        <IndianRupee className="w-4 h-4 mr-2" />
                        Record Standalone Payment
                    </Button>
                ) : (
                     <Button className="w-full opacity-50 cursor-not-allowed" disabled>
                        {customerId ? (items.length === 0 ? 'Enter payment or add items' : 'Complete billing details') : 'Select a customer'}
                    </Button>
                )}
                <Button onClick={resetForm} variant="secondary" className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">
                    {mode === 'edit' ? 'Cancel Edit' : 'Clear Form'}
                </Button>
            </div>
        </div>
    );
};

export default SalesPage;
