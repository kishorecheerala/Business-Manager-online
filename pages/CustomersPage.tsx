
import React, { useState, useEffect, useRef } from 'react';
import { Plus, User, Phone, MapPin, Search, Edit, Save, X, IndianRupee, ShoppingCart, Share2, ChevronDown, Printer, Trash2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Customer, Payment, Sale, Page } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';
import ConfirmationModal from '../components/ConfirmationModal';
import DeleteButton from '../components/DeleteButton';
import { useOnClickOutside } from '../hooks/useOnClickOutside';
import { useDialog } from '../context/DialogContext';
import PaymentModal from '../components/PaymentModal';
import { generateInvoicePDF, generateThermalInvoicePDF } from '../utils/pdfGenerator';

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getCustomerRisk = (sales: Sale[], customerId: string): 'High' | 'Medium' | 'Low' | 'Safe' => {
    const customerSales = sales.filter(s => s.customerId === customerId);
    if (customerSales.length === 0) return 'Safe';

    const totalRevenue = customerSales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
    const totalPaid = customerSales.reduce((sum, s) => sum + s.payments.reduce((p, pay) => p + Number(pay.amount), 0), 0);
    const due = totalRevenue - totalPaid;

    if (due <= 100) return 'Safe'; 

    const dueRatio = totalRevenue > 0 ? due / totalRevenue : 0;

    if (dueRatio > 0.5 && due > 5000) return 'High';
    if (dueRatio > 0.3) return 'Medium';
    return 'Low';
};

const RiskBadge: React.FC<{ risk: 'High' | 'Medium' | 'Low' | 'Safe' }> = ({ risk }) => {
    switch (risk) {
        case 'High':
            return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200 border border-red-200 dark:border-red-800">High Risk</span>;
        case 'Medium':
            return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 border border-amber-200 dark:border-amber-800">Medium Risk</span>;
        case 'Low':
            return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">Good</span>;
        default:
             return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">Safe</span>;
    }
};

interface CustomersPageProps {
  setIsDirty: (isDirty: boolean) => void;
  setCurrentPage: (page: Page) => void;
}

const CustomersPage: React.FC<CustomersPageProps> = ({ setIsDirty, setCurrentPage }) => {
    const { state, dispatch, showToast } = useAppContext();
    const { showConfirm, showAlert } = useDialog();
    const [searchTerm, setSearchTerm] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [newCustomer, setNewCustomer] = useState({ id: '', name: '', phone: '', address: '', area: '', reference: '' });
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [activeSaleId, setActiveSaleId] = useState<string | null>(null);
    const [actionMenuSaleId, setActionMenuSaleId] = useState<string | null>(null);

    const [isEditing, setIsEditing] = useState(false);
    const [editedCustomer, setEditedCustomer] = useState<Customer | null>(null);

    const [paymentModalState, setPaymentModalState] = useState<{ isOpen: boolean, saleId: string | null }>({ isOpen: false, saleId: null });
    const [paymentDetails, setPaymentDetails] = useState({
        amount: '',
        method: 'CASH' as 'CASH' | 'UPI' | 'CHEQUE',
        date: getLocalDateString(),
        reference: '',
    });
    
    const [confirmModalState, setConfirmModalState] = useState<{ isOpen: boolean, saleIdToDelete: string | null }>({ isOpen: false, saleIdToDelete: null });
    const isDirtyRef = useRef(false);
    const actionMenuRef = useRef<HTMLDivElement>(null);

    useOnClickOutside(actionMenuRef, () => setActionMenuSaleId(null));

    useEffect(() => {
        if (state.selection && state.selection.page === 'CUSTOMERS') {
            if (state.selection.id === 'new') {
                setIsAdding(true);
                setSelectedCustomer(null);
            } else {
                const customerToSelect = state.customers.find(c => c.id === state.selection.id);
                if (customerToSelect) {
                    setSelectedCustomer(customerToSelect);
                }
            }
            dispatch({ type: 'CLEAR_SELECTION' });
        }
    }, [state.selection, state.customers, dispatch]);

    useEffect(() => {
        const currentlyDirty = (isAdding && !!(newCustomer.id || newCustomer.name || newCustomer.phone || newCustomer.address || newCustomer.area)) || isEditing;
        if (currentlyDirty !== isDirtyRef.current) {
            isDirtyRef.current = currentlyDirty;
            setIsDirty(currentlyDirty);
        }
    }, [isAdding, newCustomer, isEditing, setIsDirty]);

    useEffect(() => {
        return () => {
            setIsDirty(false);
        };
    }, [setIsDirty]);

    useEffect(() => {
        if (selectedCustomer) {
            const currentCustomerData = state.customers.find(c => c.id === selectedCustomer.id);
            if (JSON.stringify(currentCustomerData) !== JSON.stringify(selectedCustomer)) {
                setSelectedCustomer(currentCustomerData || null);
            }
        }
    }, [selectedCustomer?.id, state.customers]);

    useEffect(() => {
        if (selectedCustomer) {
            setEditedCustomer(selectedCustomer);
            setActiveSaleId(null); 
        }
        setIsEditing(false);
    }, [selectedCustomer]);


    const handleAddCustomer = () => {
        const trimmedId = newCustomer.id.trim();
        if (!trimmedId) return showAlert('Customer ID is required.');
        if (!newCustomer.name || !newCustomer.phone || !newCustomer.address || !newCustomer.area) return showAlert('Please fill all required fields.');

        const finalId = `CUST-${trimmedId}`;
        const isIdTaken = state.customers.some(c => c.id.toLowerCase() === finalId.toLowerCase());
        
        if (isIdTaken) return showAlert(`Customer ID "${finalId}" is already taken.`);

        const customerWithId: Customer = { 
            name: newCustomer.name,
            phone: newCustomer.phone,
            address: newCustomer.address,
            area: newCustomer.area,
            id: finalId,
            reference: newCustomer.reference || ''
        };
        dispatch({ type: 'ADD_CUSTOMER', payload: customerWithId });
        setNewCustomer({ id: '', name: '', phone: '', address: '', area: '', reference: '' });
        setIsAdding(false);
        showToast("Customer added successfully!");
    };
    
    const handleUpdateCustomer = async () => {
        if (editedCustomer) {
            const confirmed = await showConfirm('Save changes to customer details?');
            if (confirmed) {
                dispatch({ type: 'UPDATE_CUSTOMER', payload: editedCustomer });
                setSelectedCustomer(editedCustomer);
                setIsEditing(false);
                showToast("Customer updated.");
            }
        }
    };

    const handleDeleteSale = (saleId: string) => {
        setConfirmModalState({ isOpen: true, saleIdToDelete: saleId });
    };

    const confirmDeleteSale = () => {
        if (confirmModalState.saleIdToDelete) {
            dispatch({ type: 'DELETE_SALE', payload: confirmModalState.saleIdToDelete });
            showToast('Sale deleted.');
            setConfirmModalState({ isOpen: false, saleIdToDelete: null });
        }
    };

    const handleEditSale = (saleId: string) => {
        dispatch({ type: 'SET_SELECTION', payload: { page: 'SALES', id: saleId, action: 'edit' } });
        setCurrentPage('SALES');
    };

    const handleEditReturn = (returnId: string) => {
        dispatch({ type: 'SET_SELECTION', payload: { page: 'RETURNS', id: returnId, action: 'edit' } });
        setCurrentPage('RETURNS');
    };

    const handleAddPayment = () => {
        const sale = state.sales.find(s => s.id === paymentModalState.saleId);
        if (!sale || !paymentDetails.amount) return showAlert("Enter amount.");
        
        const amountPaid = sale.payments.reduce((sum, p) => sum + Number(p.amount), 0);
        const dueAmount = Number(sale.totalAmount) - amountPaid;
        const newPaymentAmount = parseFloat(paymentDetails.amount);

        if(newPaymentAmount > dueAmount + 0.01) return showAlert(`Payment exceeds due amount.`);

        const payment: Payment = {
            id: `PAY-${Date.now()}`,
            amount: newPaymentAmount,
            method: paymentDetails.method,
            date: new Date(paymentDetails.date).toISOString(),
            reference: paymentDetails.reference.trim() || undefined,
        };

        dispatch({ type: 'ADD_PAYMENT_TO_SALE', payload: { saleId: sale.id, payment } });
        showToast('Payment added.');
        
        setPaymentModalState({ isOpen: false, saleId: null });
        setPaymentDetails({ amount: '', method: 'CASH', date: getLocalDateString(), reference: '' });
    };

    const handlePrintOrShare = async (sale: Sale, type: 'a4' | 'thermal', action: 'print' | 'share') => {
        if (!selectedCustomer) return;
        try {
            const doc = type === 'thermal' 
                ? await generateThermalInvoicePDF(sale, selectedCustomer, state.profile)
                : await generateInvoicePDF(sale, selectedCustomer, state.profile);
            
            const blob = doc.output('blob');
            const file = new File([blob], `Invoice-${sale.id}.pdf`, { type: 'application/pdf' });

            if (action === 'share') {
                if (navigator.share && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        title: `Invoice ${sale.id}`,
                        text: `Here is your invoice from ${state.profile?.name || 'us'}.`,
                        files: [file],
                    });
                } else {
                    const url = URL.createObjectURL(blob);
                    window.open(url, '_blank');
                }
            } else {
                // Print Action: Open in new window - safest for mobile & desktop
                const url = URL.createObjectURL(blob);
                const printWindow = window.open(url, '_blank');
                if (printWindow) {
                    // Attempt to trigger print dialog if possible, but just opening is often enough
                    // printWindow.onload = () => printWindow.print(); 
                } else {
                    showAlert("Pop-up blocked. Please allow pop-ups to print.");
                }
            }
        } catch (e) {
            console.error("PDF Error", e);
            showToast("Failed to generate invoice.", 'info');
        }
    };

    const filteredCustomers = state.customers.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.includes(searchTerm) ||
        c.area.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    if (selectedCustomer && editedCustomer) {
        const customerSales = state.sales.filter(s => s.customerId === selectedCustomer.id);
        const customerReturns = state.returns.filter(r => r.type === 'CUSTOMER' && r.partyId === selectedCustomer.id);
        const currentRisk = getCustomerRisk(state.sales, selectedCustomer.id);

        const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            setEditedCustomer({ ...editedCustomer, [e.target.name]: e.target.value });
        };

        const saleForPayment = state.sales.find(s => s.id === paymentModalState.saleId);
        const paymentModalTotal = saleForPayment ? Number(saleForPayment.totalAmount) : 0;
        const paymentModalPaid = saleForPayment ? saleForPayment.payments.reduce((sum, p) => sum + Number(p.amount), 0) : 0;
        const paymentModalDue = paymentModalTotal - paymentModalPaid;

        return (
            <div className="space-y-4 animate-fade-in-fast">
                <ConfirmationModal
                    isOpen={confirmModalState.isOpen}
                    onClose={() => setConfirmModalState({ isOpen: false, saleIdToDelete: null })}
                    onConfirm={confirmDeleteSale}
                    title="Confirm Deletion"
                >
                    Delete this sale record? Stock will be restored.
                </ConfirmationModal>
                <PaymentModal
                    isOpen={paymentModalState.isOpen}
                    onClose={() => setPaymentModalState({isOpen: false, saleId: null})}
                    onSubmit={handleAddPayment}
                    totalAmount={paymentModalTotal}
                    dueAmount={paymentModalDue}
                    paymentDetails={paymentDetails}
                    setPaymentDetails={setPaymentDetails}
                />
                <Button onClick={() => setSelectedCustomer(null)} variant="secondary" className="mb-2">&larr; Back List</Button>
                
                <Card className="border-l-4 border-indigo-500">
                    <div className="flex flex-col sm:flex-row justify-between items-start mb-4 gap-3">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h2 className="text-xl font-bold text-gray-800 dark:text-white">{selectedCustomer.name}</h2>
                                <RiskBadge risk={currentRisk} />
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 flex gap-3">
                                <span>{selectedCustomer.id}</span>
                                <span>•</span>
                                <span>{selectedCustomer.area}</span>
                            </div>
                        </div>
                        <div className="flex gap-2 items-center flex-shrink-0">
                            {isEditing ? (
                                <>
                                    <Button onClick={handleUpdateCustomer} className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700"><Save size={16} /> Save</Button>
                                    <button onClick={() => setIsEditing(false)} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                                        <X size={20}/>
                                    </button>
                                </>
                            ) : (
                                <Button onClick={() => setIsEditing(true)} variant="secondary" className="h-9 px-4"><Edit size={16}/> Edit</Button>
                            )}
                        </div>
                    </div>
                    {isEditing ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in-up">
                            <div><label className="text-xs font-bold uppercase text-gray-500">Name</label><input type="text" name="name" value={editedCustomer.name} onChange={handleInputChange} className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" /></div>
                            <div><label className="text-xs font-bold uppercase text-gray-500">Phone</label><input type="text" name="phone" value={editedCustomer.phone} onChange={handleInputChange} className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" /></div>
                            <div className="sm:col-span-2"><label className="text-xs font-bold uppercase text-gray-500">Address</label><input type="text" name="address" value={editedCustomer.address} onChange={handleInputChange} className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" /></div>
                            <div><label className="text-xs font-bold uppercase text-gray-500">Area</label><input type="text" name="area" value={editedCustomer.area} onChange={handleInputChange} className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" /></div>
                            <div><label className="text-xs font-bold uppercase text-gray-500">Reference</label><input type="text" name="reference" value={editedCustomer.reference ?? ''} onChange={handleInputChange} className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" /></div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-slate-700/30 p-3 rounded-xl border border-gray-100 dark:border-slate-700">
                            <p><span className="font-semibold w-20 inline-block text-gray-500">Phone:</span> {selectedCustomer.phone}</p>
                            <p><span className="font-semibold w-20 inline-block text-gray-500">Ref:</span> {selectedCustomer.reference || '-'}</p>
                            <p className="sm:col-span-2"><span className="font-semibold w-20 inline-block text-gray-500">Address:</span> {selectedCustomer.address}</p>
                        </div>
                    )}
                </Card>

                <Card title="Transaction History">
                    {customerSales.length > 0 ? (
                        <div className="space-y-3">
                            {customerSales.slice().reverse().map(sale => {
                                const amountPaid = sale.payments.reduce((sum, p) => sum + Number(p.amount), 0);
                                const dueAmount = Number(sale.totalAmount) - amountPaid;
                                const isPaid = dueAmount <= 0.01;
                                const isExpanded = activeSaleId === sale.id;

                                return (
                                <div key={sale.id} className={`rounded-xl border transition-all duration-300 ${isExpanded ? 'bg-white dark:bg-slate-800 border-indigo-200 dark:border-indigo-900 shadow-md' : 'bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 hover:border-indigo-100'}`}>
                                    <button 
                                        onClick={() => setActiveSaleId(isExpanded ? null : sale.id)}
                                        className="w-full text-left p-4 flex justify-between items-center focus:outline-none"
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-xs bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded text-gray-600 dark:text-gray-300">{sale.id}</span>
                                                <span className="text-xs text-gray-500">{new Date(sale.date).toLocaleDateString()}</span>
                                            </div>
                                            <div className="mt-1 flex items-center gap-2">
                                                <span className="font-bold text-gray-800 dark:text-white">₹{Number(sale.totalAmount).toLocaleString('en-IN')}</span>
                                                {!isPaid && <span className="text-xs font-bold text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full">Due: ₹{dueAmount.toLocaleString('en-IN')}</span>}
                                                {isPaid && <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">Paid</span>}
                                            </div>
                                        </div>
                                        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                                    </button>
                                    
                                    {isExpanded && (
                                        <div className="px-4 pb-4 pt-0 animate-fade-in-up">
                                            <div className="border-t border-dashed border-gray-200 dark:border-slate-700 my-3"></div>
                                            
                                            {/* Items */}
                                            <div className="mb-4">
                                                {sale.items.map((item, index) => (
                                                    <div key={index} className="flex justify-between text-sm py-1 text-gray-600 dark:text-gray-300">
                                                        <span className="truncate w-2/3">{item.productName} <span className="text-xs text-gray-400">x{item.quantity}</span></span>
                                                        <span>₹{(Number(item.price) * Number(item.quantity)).toLocaleString('en-IN')}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Actions Toolbar */}
                                            <div className="flex flex-wrap gap-2 mb-4">
                                                <button onClick={() => setPaymentModalState({ isOpen: true, saleId: sale.id })} disabled={isPaid} className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2">
                                                    <IndianRupee size={14}/> {isPaid ? 'Fully Paid' : 'Add Payment'}
                                                </button>
                                                <div className="relative" ref={actionMenuSaleId === sale.id ? actionMenuRef : undefined}>
                                                    <button onClick={() => setActionMenuSaleId(sale.id)} className="bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 py-2 px-3 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 flex items-center gap-2">
                                                        <Printer size={16}/> Actions
                                                    </button>
                                                    {actionMenuSaleId === sale.id && (
                                                        <div className="absolute bottom-full right-0 mb-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-100 dark:border-slate-600 z-50 overflow-hidden animate-scale-in origin-bottom-right">
                                                            <button onClick={() => handlePrintOrShare(sale, 'thermal', 'print')} className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2"><Printer size={14}/> Print Receipt</button>
                                                            <button onClick={() => handlePrintOrShare(sale, 'a4', 'print')} className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2"><Printer size={14}/> Print Invoice (A4)</button>
                                                            <div className="border-t dark:border-slate-700"></div>
                                                            <button onClick={() => handlePrintOrShare(sale, 'thermal', 'share')} className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2"><Share2 size={14}/> Share Receipt</button>
                                                            <button onClick={() => handlePrintOrShare(sale, 'a4', 'share')} className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2"><Share2 size={14}/> Share Invoice</button>
                                                            <div className="border-t dark:border-slate-700"></div>
                                                            <button onClick={() => handleEditSale(sale.id)} className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-slate-700 text-blue-600"><Edit size={14} className="inline mr-2"/> Edit Sale</button>
                                                            <button onClick={() => handleDeleteSale(sale.id)} className="w-full text-left px-4 py-3 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600"><Trash2 size={14} className="inline mr-2"/> Delete</button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Payment History */}
                                            {(sale.payments?.length || 0) > 0 && (
                                                <div className="bg-gray-50 dark:bg-slate-700/30 rounded-lg p-2 text-xs space-y-1">
                                                    <p className="font-bold text-gray-500 uppercase">Payments</p>
                                                    {sale.payments.map(p => (
                                                        <div key={p.id} className="flex justify-between text-gray-600 dark:text-gray-400">
                                                            <span>{new Date(p.date).toLocaleDateString()} ({p.method})</span>
                                                            <span>₹{Number(p.amount).toLocaleString()}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )})}
                        </div>
                    ) : (
                        <div className="text-center py-10 text-gray-400">
                            <ShoppingCart size={40} className="mx-auto mb-2 opacity-20" />
                            <p>No sales history yet.</p>
                        </div>
                    )}
                </Card>
                 <Card title="Returns History">
                    {customerReturns.length > 0 ? (
                         <div className="space-y-3">
                            {customerReturns.slice().reverse().map(ret => (
                                <div key={ret.id} className="p-3 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/30">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="font-bold text-red-800 dark:text-red-200">₹{Number(ret.amount).toLocaleString('en-IN')} Refunded</p>
                                            <p className="text-xs text-red-600 dark:text-red-400">{new Date(ret.returnDate).toLocaleDateString()}</p>
                                        </div>
                                        <Button onClick={() => handleEditReturn(ret.id)} variant="secondary" className="p-2 h-auto bg-white hover:bg-red-50 border-red-200 text-red-600">
                                            <Edit size={14} />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-400 text-sm text-center py-4">No returns recorded.</p>
                    )}
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-fade-in-fast">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">Customers</h1>
                <Button onClick={() => setIsAdding(!isAdding)} className="bg-indigo-600 hover:bg-indigo-700 shadow-lg">
                    <Plus className="w-4 h-4 mr-2" />
                    {isAdding ? 'Cancel' : 'Add Customer'}
                </Button>
            </div>

            {isAdding && (
                <Card title="New Customer" className="border-t-4 border-indigo-500 animate-slide-down-fade">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Customer ID</label>
                            <div className="flex items-center">
                                <span className="bg-gray-100 dark:bg-slate-700 border border-r-0 border-gray-300 dark:border-slate-600 px-3 py-2 rounded-l-lg text-sm text-gray-500">CUST-</span>
                                <input type="text" placeholder="Unique ID" value={newCustomer.id} onChange={e => setNewCustomer({ ...newCustomer, id: e.target.value })} className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded-r-lg dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>
                        </div>
                        <input type="text" placeholder="Full Name" value={newCustomer.name} onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })} className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-600 dark:text-white" />
                        <input type="text" placeholder="Phone Number" value={newCustomer.phone} onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })} className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-600 dark:text-white" />
                        <input type="text" placeholder="Address" value={newCustomer.address} onChange={e => setNewCustomer({ ...newCustomer, address: e.target.value })} className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-600 dark:text-white" />
                        <input type="text" placeholder="Area" value={newCustomer.area} onChange={e => setNewCustomer({ ...newCustomer, area: e.target.value })} className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-600 dark:text-white" />
                        <input type="text" placeholder="Reference (Optional)" value={newCustomer.reference} onChange={e => setNewCustomer({ ...newCustomer, reference: e.target.value })} className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-600 dark:text-white" />
                        <Button onClick={handleAddCustomer} className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold py-3 rounded-lg shadow-md">Save Customer</Button>
                    </div>
                </Card>
            )}

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                    type="text"
                    placeholder="Search by name, phone, or area..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full p-3 pl-10 border border-gray-200 dark:border-slate-700 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-slate-800 dark:text-white transition-all"
                />
            </div>

            <div className="space-y-3 pb-20">
                {filteredCustomers.map((customer, index) => {
                    const customerSales = state.sales.filter(s => s.customerId === customer.id);
                    const totalPurchase = customerSales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
                    const totalPaid = customerSales.reduce((sum, s) => sum + s.payments.reduce((pSum, p) => pSum + Number(p.amount), 0), 0);
                    const totalDue = totalPurchase - totalPaid;
                    const risk = getCustomerRisk(state.sales, customer.id);

                    return (
                        <Card 
                            key={customer.id} 
                            className="cursor-pointer hover:shadow-lg transition-all duration-300 border-l-4 border-l-indigo-500" 
                            style={{ animationDelay: `${index * 50}ms` }}
                            onClick={() => setSelectedCustomer(customer)}
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="font-bold text-lg text-gray-800 dark:text-white">{customer.name}</p>
                                        <RiskBadge risk={risk} />
                                    </div>
                                    <p className="text-sm text-gray-500 flex items-center gap-2"><Phone size={14}/> {customer.phone}</p>
                                    <p className="text-sm text-gray-500 flex items-center gap-2"><MapPin size={14}/> {customer.area}</p>
                                </div>
                                <div className="text-right flex-shrink-0 ml-4">
                                    <div className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">Due Amount</div>
                                     <div className={`text-xl font-extrabold ${totalDue > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                        ₹{totalDue.toLocaleString('en-IN')}
                                    </div>
                                    <div className="text-xs text-gray-400 mt-1">Total Buy: ₹{totalPurchase.toLocaleString()}</div>
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};

export default CustomersPage;
