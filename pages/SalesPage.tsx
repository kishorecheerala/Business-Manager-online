import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Trash2, Share2, Search, X, IndianRupee, QrCode, Save, Edit, PauseCircle, PlayCircle, Clock, History, ArrowRight, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useUI } from '../context/UIContext';
import { useDialog } from '../context/DialogContext';
import { Sale, SaleItem, Customer, Product, Payment, ParkedSale } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';
import DeleteButton from '../components/DeleteButton';
import { useOnClickOutside } from '../hooks/useOnClickOutside';
import { getLocalDateString } from '../utils/dateUtils';
import { formatCurrency, formatDate, formatDateTime, generateDownloadFilename } from '../utils/formatUtils';
import { calculateTotals } from '../utils/calculations';
import AddCustomerModal from '../components/AddCustomerModal';
import ProductSearchModal from '../components/ProductSearchModal';
import QRScannerModal from '../components/QRScannerModal';
import ModernDateInput from '../components/ModernDateInput';
import { generateA4InvoicePdf } from '../utils/pdfGenerator';
import Input from '../components/Input';
import FormattedNumberInput from '../components/FormattedNumberInput';
import Dropdown from '../components/Dropdown';
import MagicOrderModal from '../components/MagicOrderModal';
import WhatsAppButton from '../components/WhatsAppButton';
import { useDataLookups } from '../hooks/useDataLookups';

// Refactored Components
import SalesForm from '../components/sales/SalesForm';
import SalesHistory from '../components/sales/SalesHistory';
import ParkedSalesList from '../components/sales/ParkedSalesList';

interface SalesPageProps {
    setIsDirty: (isDirty: boolean) => void;
}

const SalesPage: React.FC<SalesPageProps> = ({ setIsDirty }) => {
    const { state, dispatch } = useData();
    const { showToast } = useUI();
    const { getProduct, getCustomer, productMap } = useDataLookups();
    const { showConfirm } = useDialog();
    const { currentSale, parkedSales } = state;

    const [mode, setMode] = useState<'add' | 'edit'>(currentSale.editId ? 'edit' : 'add');
    const [saleToEdit, setSaleToEdit] = useState<Sale | null>(null);
    const [activeTab, setActiveTab] = useState<'form' | 'history'>('form');

    const [customerId, setCustomerId] = useState(currentSale.customerId || '');
    const [items, setItems] = useState<SaleItem[]>(currentSale.items || []);
    const [discount, setDiscount] = useState(currentSale.discount || '0');
    const [saleDate, setSaleDate] = useState(currentSale.date || getLocalDateString());

    const [paymentDetails, setPaymentDetails] = useState<{
        amount: string;
        method: 'CASH' | 'UPI' | 'CHEQUE';
        date: string;
        reference: string;
        accountId?: string;
    }>(currentSale.paymentDetails || {
        amount: '',
        method: 'CASH',
        date: getLocalDateString(),
        reference: '',
        accountId: ''
    });

    const [isSelectingProduct, setIsSelectingProduct] = useState(false);
    const [isScanning, setIsScanning] = useState(false);

    const [isAddingCustomer, setIsAddingCustomer] = useState(false);
    const isDirtyRef = useRef(false);

    const [isDraftsOpen, setIsDraftsOpen] = useState(false);
    const [isMagicModalOpen, setIsMagicModalOpen] = useState(false);

    const [storedPayments, setStoredPayments] = useState<Payment[]>([]);
    const [showAddPayment, setShowAddPayment] = useState(false);

    // Sync local form state to global currentSale for navigation guard
    useEffect(() => {
        const timer = setTimeout(() => {
            dispatch({
                type: 'UPDATE_CURRENT_SALE',
                payload: {
                    customerId,
                    items,
                    discount,
                    date: saleDate,
                    paymentDetails,
                    editId: mode === 'edit' ? saleToEdit?.id : undefined
                }
            });
        }, 300); // Debounce
        return () => clearTimeout(timer);
    }, [customerId, items, discount, saleDate, paymentDetails, mode, saleToEdit, dispatch]);

    const loadSaleForEditing = (sale: Sale) => {
        setSaleToEdit(sale);
        setMode('edit');
        setCustomerId(sale.customerId);
        setItems(sale.items.map(item => ({ ...item }))); // Deep copy
        setDiscount(sale.discount.toString());
        setSaleDate(new Date(sale.date).toISOString().split('T')[0]);
        setStoredPayments(sale.payments || []);
        setShowAddPayment(false);
        setPaymentDetails({ amount: '', method: 'CASH', date: getLocalDateString(), reference: '' });

        setActiveTab('form');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    useEffect(() => {
        if (state.selection?.page === 'SALES') {
            if (state.selection.action === 'edit' || state.selection.id !== 'new') {
                const sale = state.sales.find(s => s.id === state.selection.id);
                if (sale) {
                    loadSaleForEditing(sale);
                }
            }

            if (state.selection.id === 'new' || state.selection.action === 'new') {
                resetForm();
                setActiveTab('form');
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
            dispatch({ type: 'CLEAR_SELECTION' });
        }
    }, [state.selection, state.sales, dispatch]);

    useEffect(() => {
        const handleMagicPasteEvent = (e: CustomEvent) => {
            if (e.detail?.text) {
                setIsMagicModalOpen(true);
            }
        };

        window.addEventListener('OPEN_MAGIC_PASTE', handleMagicPasteEvent as EventListener);
        return () => window.removeEventListener('OPEN_MAGIC_PASTE', handleMagicPasteEvent as EventListener);
    }, []);

    // When returning to the page, if it was in edit mode, re-fetch the saleToEdit
    useEffect(() => {
        if (mode === 'edit' && !saleToEdit && currentSale.editId) {
            const sale = state.sales.find(s => s.id === currentSale.editId);
            if (sale) setSaleToEdit(sale);
            else {
                showToast("Edited sale not found, returning to new sale mode.", "info");
                resetForm();
            }
        }
    }, [mode, saleToEdit, currentSale.editId, state.sales]);

    useEffect(() => {
        const dateIsDirty = mode === 'add' && saleDate !== getLocalDateString();
        const formIsDirty = !!customerId || items.length > 0 || discount !== '0' || !!paymentDetails.amount || dateIsDirty;
        const currentlyDirty = formIsDirty || isAddingCustomer || storedPayments.length > 0;
        if (currentlyDirty !== isDirtyRef.current) {
            isDirtyRef.current = currentlyDirty;
            setIsDirty(currentlyDirty);
        }
    }, [customerId, items, discount, paymentDetails.amount, isAddingCustomer, setIsDirty, saleDate, mode, storedPayments]);

    useEffect(() => {
        return () => {
            setIsDirty(false);
        };
    }, [setIsDirty]);

    const resetForm = (clearSelection: boolean = true) => {
        setCustomerId('');
        setItems([]);
        setDiscount('0');
        setSaleDate(getLocalDateString());
        setPaymentDetails({
            amount: '', method: 'CASH', reference: '', date: getLocalDateString()
        });
        setStoredPayments([]);

        setShowAddPayment(false);
        setSaleToEdit(null);
        if (clearSelection) {
            dispatch({ type: 'CLEAR_SELECTION' });
        }
    };

    const handleParkSale = () => {
        if (items.length === 0 && !customerId) {
            showToast("Cannot park an empty sale.", 'error');
            return;
        }
        dispatch({ type: 'PARK_CURRENT_SALE' });
        showToast("Sale parked successfully.", 'success');

        // Immediately reset local state after dispatching
        setCustomerId('');
        setItems([]);
        setDiscount('0');
        setSaleDate(getLocalDateString());
        setPaymentDetails({ amount: '', method: 'CASH', date: getLocalDateString(), reference: '' });

        setMode('add');
        setSaleToEdit(null);
    };

    const handleResumeDraft = (draft: ParkedSale) => {
        // Restore local state from draft
        setCustomerId(draft.customerId);
        setItems(draft.items);
        setDiscount(draft.discount);
        setSaleDate(draft.date);
        setPaymentDetails(draft.paymentDetails);

        if (draft.editId) {
            const sale = state.sales.find(s => s.id === draft.editId);
            if (sale) {
                setSaleToEdit(sale);
                setMode('edit');
            } else {
                showToast(`Original sale ${draft.editId} not found. Resuming as new draft.`, 'info');
                setMode('add');
                setSaleToEdit(null);
            }
        } else {
            setMode('add');
            setSaleToEdit(null);
        }

        // Dispatch to remove from parked list and update currentSale
        dispatch({ type: 'RESUME_PARKED_SALE', payload: draft });

        setIsDraftsOpen(false);
        setActiveTab('form');
        showToast("Draft resumed.", 'success');
    };

    const handleDeleteDraft = (draftId: string) => {
        dispatch({ type: 'DELETE_PARKED_SALE', payload: draftId });
    };

    const handleSelectProduct = (product: Product) => {
        let price = Number(product.salePrice);

        // Wholesale Pricing Logic
        if (customerId) {
            const customer = getCustomer(customerId);
            if (customer?.priceTier === 'WHOLESALE' && product.wholesalePrice && product.wholesalePrice > 0) {
                price = Number(product.wholesalePrice);
                showToast(`Wholesale price applied for ${product.name}`, 'info');
            }
        }

        const newItem = {
            productId: product.id,
            productName: product.name,
            price: price,
            quantity: 1,
        };

        const existingItem = items.find(i => i.productId === newItem.productId);

        const originalQtyInSale = mode === 'edit' ? saleToEdit?.items.find(i => i.productId === product.id)?.quantity || 0 : 0;
        const availableStock = Number(product.quantity) + originalQtyInSale;

        if (existingItem) {
            if (existingItem.quantity + 1 > availableStock) {
                showToast(`Not enough stock for ${product.name}. Only ${availableStock} available for this sale.`, 'error');
                return;
            }
            setItems(items.map(i => i.productId === newItem.productId ? { ...i, quantity: i.quantity + 1 } : i));
        } else {
            if (1 > availableStock) {
                showToast(`Not enough stock for ${product.name}. Only ${availableStock} available for this sale.`, 'error');
                return;
            }
            setItems([...items, newItem]);
        }

        setIsSelectingProduct(false);
    };

    const handleProductScanned = (decodedText: string) => {
        setIsScanning(false);
        const product = getProduct(decodedText) || state.products.find(p => p.id.toLowerCase() === decodedText.toLowerCase());
        if (product) {
            handleSelectProduct(product);
        } else {
            showToast("Product not found in inventory.", 'error');
        }
    };

    // Calculate totals for submit validation
    const calculations = useMemo(() => {
        return calculateTotals(items, parseFloat(discount) || 0, productMap);
    }, [items, discount, productMap]);

    // Total due for standalone payments
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


    const handleAddCustomer = (customer: Customer) => {
        dispatch({ type: 'ADD_CUSTOMER', payload: customer });
        setCustomerId(customer.id);
        setIsAddingCustomer(false);
        showToast("Customer added successfully!");
    };

    const generateAndSharePDF = async (sale: Sale, customer: Customer, paidAmountOnSale: number) => {
        try {
            const doc = await generateA4InvoicePdf(sale, customer, state.profile, state.invoiceTemplate, state.customFonts);
            const pdfBlob = doc.output('blob');
            const filename = generateDownloadFilename(`Invoice_${sale.id}`, 'pdf');
            const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });
            const businessName = state.profile?.name || 'Your Business';

            const subTotal = calculateTotals(sale.items, Number(sale.discount), state.products).subTotal;
            const dueAmountOnSale = Number(sale.totalAmount) - paidAmountOnSale;

            const whatsAppText = `Thank you for your purchase from ${businessName}!\n\n*Invoice Summary:*\nInvoice ID: ${sale.id}\nDate: ${formatDate(sale.date)}\n\n*Items:*\n${sale.items.map(i => `- ${i.productName} (x${i.quantity}) - ${formatCurrency(Number(i.price) * Number(i.quantity))}`).join('\n')}\n\nSubtotal: ${formatCurrency(subTotal)}\nGST: ${formatCurrency(Number(sale.gstAmount))}\nDiscount: ${formatCurrency(Number(sale.discount))}\n*Total: ${formatCurrency(Number(sale.totalAmount))}*\nPaid: ${formatCurrency(paidAmountOnSale)}\nDue: ${formatCurrency(dueAmountOnSale)}\n\nHave a blessed day!`;

            if (navigator.share && navigator.canShare({ files: [pdfFile] })) {
                try {
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        await navigator.clipboard.writeText(whatsAppText);
                        showToast('Invoice text copied to clipboard!');
                    }
                } catch (err) {
                    if (state.devMode) console.warn('Could not copy text to clipboard:', err);
                }
                await navigator.share({
                    title: `${businessName} Invoice ${sale.id}`,
                    text: whatsAppText,
                    files: [pdfFile],
                });
            } else {
                doc.save(filename);
            }
        } catch (error: any) {
            if (state.devMode) console.error("PDF generation or sharing failed:", error);
            showToast(`Sale created, but PDF failed: ${error.message}`, 'error');
        }
    };

    const handleSubmitSale = async () => {
        if (!customerId || items.length === 0) {
            showToast("Please select a customer and add at least one item.", 'info');
            return;
        }

        const customer = getCustomer(customerId);
        if (!customer) {
            showToast("Could not find the selected customer.", 'error');
            return;
        }

        const { totalAmount, gstAmount, discountAmount } = calculations;

        if (mode === 'add') {
            const paidAmount = parseFloat(paymentDetails.amount) || 0;
            if (paidAmount > totalAmount + 0.01) {
                showToast(`Paid amount (${formatCurrency(paidAmount)}) cannot be greater than the total amount (${formatCurrency(totalAmount)}).`, 'error');
                return;
            }
            const payments: Payment[] = [];
            if (paidAmount > 0) {
                payments.push({
                    id: `PAY-S-${Date.now()}`, amount: paidAmount, method: paymentDetails.method,
                    date: new Date(paymentDetails.date).toISOString(), reference: paymentDetails.reference.trim() || undefined,
                    accountId: paymentDetails.accountId || undefined
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
            await generateAndSharePDF(newSale, customer, paidAmount);

        } else if (mode === 'edit' && saleToEdit) {
            const newPaymentAmount = parseFloat(paymentDetails.amount) || 0;
            const totalPaid = storedPayments.reduce((sum, p) => sum + Number(p.amount), 0) + newPaymentAmount;

            if (totalAmount < totalPaid - 0.01) {
                showToast(`The new total amount (${formatCurrency(totalAmount)}) cannot be less than the amount already paid (${formatCurrency(totalPaid)}).`, 'error');
                return;
            }

            let updatedPayments = [...storedPayments];
            if (newPaymentAmount > 0) {
                updatedPayments.push({
                    id: `PAY-S-${Date.now()}`,
                    amount: newPaymentAmount,
                    method: paymentDetails.method,
                    date: new Date(paymentDetails.date || new Date().toISOString()).toISOString(),
                    reference: paymentDetails.reference.trim() || undefined,
                    accountId: paymentDetails.accountId || undefined
                });
            }

            const updatedSale: Sale = {
                ...saleToEdit, items, discount: discountAmount, gstAmount, totalAmount, payments: updatedPayments
            };
            dispatch({ type: 'UPDATE_SALE', payload: { oldSale: saleToEdit, updatedSale } });
            showToast('Sale updated successfully!');
        }

        const shouldReturnToCustomer = mode === 'edit' && customerId;
        resetForm(!shouldReturnToCustomer);

        if (shouldReturnToCustomer) {
            dispatch({ type: 'SET_SELECTION', payload: { page: 'CUSTOMERS', id: customerId } });
        }
    };

    const handleRecordStandalonePayment = () => {
        if (!customerId) {
            showToast('Please select a customer to record a payment for.', 'info');
            return;
        }

        const paidAmount = parseFloat(paymentDetails.amount || '0');
        if (paidAmount <= 0) {
            showToast('Please enter a valid payment amount.', 'error');
            return;
        }

        const outstandingSales = state.sales
            .filter(sale => {
                const paid = (sale.payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
                return sale.customerId === customerId && (Number(sale.totalAmount) - paid) > 0.01;
            })
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        if (outstandingSales.length === 0) {
            showToast('This customer has no outstanding dues.', 'info');
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

        showToast(`Payment of ${formatCurrency(paidAmount)} recorded successfully.`);
        resetForm();
    };

    const handleEditFromHistory = async (sale: Sale) => {
        if (isDirtyRef.current) {
            const confirmed = await showConfirm("You have unsaved changes. Discard and edit this sale?", {
                title: "Unsaved Changes",
                confirmText: "Discard & Edit",
                cancelText: "Stay",
                variant: 'danger'
            });
            if (!confirmed) return;
        }
        loadSaleForEditing(sale);
        setActiveTab('form'); // Switch to form tab
    };

    const handleBulkDelete = (saleIds: Set<string>) => {
        showConfirm(`Are you sure you want to delete ${saleIds.size} sales? This cannot be undone.`, { variant: 'danger' })
            .then(confirmed => {
                if (confirmed) {
                    saleIds.forEach(id => dispatch({ type: 'DELETE_SALE', payload: id }));
                    showToast("Sales deleted successfully.");
                }
            });
    };

    const handlePrintSale = React.useCallback((sale: Sale) => {
        const customer = state.customers.find(c => c.id === sale.customerId);
        if (customer) {
            const paid = (sale.payments || []).reduce((acc, p) => acc + Number(p.amount), 0);
            generateAndSharePDF(sale, customer, paid);
        } else {
            showToast("Customer not found for this sale.", 'error');
        }
    }, [state.customers, state.profile, state.invoiceTemplate, state.customFonts, showToast]); // Dependencies for generateAndSharePDF

    const pageTitle = mode === 'edit' ? `Edit Sale: ${saleToEdit?.id}` : 'New Sale / Payment';

    return (
        <div className="space-y-4 animate-fade-in-fast relative pb-10">
            {isAddingCustomer &&
                <AddCustomerModal
                    isOpen={isAddingCustomer}
                    onClose={() => setIsAddingCustomer(false)}
                    onAdd={handleAddCustomer}
                    existingCustomers={state.customers}
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

            {/* Drafts Modal */}
            {isDraftsOpen && (
                <ParkedSalesList
                    parkedSales={parkedSales}
                    customers={state.customers}
                    products={state.products}
                    onResume={handleResumeDraft}
                    onDelete={handleDeleteDraft}
                    onClose={() => setIsDraftsOpen(false)}
                />
            )}

            {isMagicModalOpen && (
                <MagicOrderModal
                    isOpen={isMagicModalOpen}
                    onClose={() => setIsMagicModalOpen(false)}
                    products={state.products}
                    onItemsParsed={(parsedItems: any, customerName?: string) => {
                        // Merge logic
                        const newItems = [...items];
                        parsedItems.forEach((pItem: any) => {
                            const existing = newItems.find(i => i.productId === pItem.productId);
                            if (existing) {
                                existing.quantity += pItem.quantity;
                            } else {
                                newItems.push(pItem);
                            }
                        });
                        setItems(newItems);
                        setIsMagicModalOpen(false);

                        if (customerName) {
                            // Try to finding customer
                            const found = state.customers.find(c => c.name.toLowerCase().includes(customerName.toLowerCase()));
                            if (found) {
                                setCustomerId(found.id);
                                showToast(`Matched customer: ${found.name}`, 'success');
                            }
                        }
                    }}
                />
            )}

            <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-primary">{pageTitle}</h1>

                    {/* Drafts Controls */}
                    <div className="flex gap-2">
                        {mode === 'add' && (items.length > 0 || customerId) && (
                            <Button onClick={handleParkSale} variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800">
                                <PauseCircle size={16} className="mr-1 sm:mr-2" /> <span className="hidden sm:inline">Park</span>
                            </Button>
                        )}
                        <Button onClick={() => setIsDraftsOpen(true)} variant="secondary" className="relative">
                            <Clock size={16} className="mr-1 sm:mr-2" />
                            <span className="hidden sm:inline">Drafts</span>
                            {parkedSales.length > 0 && (
                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">
                                    {parkedSales.length}
                                </span>
                            )}
                        </Button>
                    </div>
                </div>

                {/* TABS */}
                <div className="flex p-1 bg-gray-100 dark:bg-slate-800 rounded-lg">
                    <button
                        onClick={() => setActiveTab('form')}
                        className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'form' ? 'bg-white dark:bg-slate-700 shadow text-primary' : 'text-gray-500 dark:text-gray-400'}`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <Edit size={16} /> {mode === 'edit' ? 'Edit Mode' : 'Transaction Form'}
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'history' ? 'bg-white dark:bg-slate-700 shadow text-primary' : 'text-gray-500 dark:text-gray-400'}`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <History size={16} /> Sales History
                        </div>
                    </button>
                </div>
            </div>

            {activeTab === 'form' ? (
                <SalesForm
                    mode={mode}
                    customerId={customerId}
                    setCustomerId={setCustomerId}
                    items={items}
                    setItems={setItems}
                    discount={discount}
                    setDiscount={setDiscount}
                    saleDate={saleDate}
                    setSaleDate={setSaleDate}
                    paymentDetails={paymentDetails}
                    setPaymentDetails={setPaymentDetails}
                    storedPayments={storedPayments}
                    setStoredPayments={setStoredPayments}
                    showAddPayment={showAddPayment}
                    setShowAddPayment={setShowAddPayment}
                    customers={state.customers}
                    products={state.products}
                    returns={state.returns}
                    saleToEdit={saleToEdit}
                    onAddCustomer={() => setIsAddingCustomer(true)}
                    onSelectProduct={() => setIsSelectingProduct(true)}
                    onScanProduct={() => setIsScanning(true)}
                    onSubmitSale={handleSubmitSale}
                    onRecordPayment={handleRecordStandalonePayment}
                    onReset={() => resetForm()}
                    onNavigateCustomer={() => { }} // Navigation logic not explicitly needed as reset handles it
                />
            ) : (
                <SalesHistory
                    sales={state.sales}
                    customers={state.customers}
                    onEdit={handleEditFromHistory}
                    onDelete={handleBulkDelete}
                    onPrint={handlePrintSale}
                />
            )}
        </div>
    );
};

export default SalesPage;
