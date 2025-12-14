import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Edit, Save, X, Search, Download, Printer, FileSpreadsheet, Upload, CheckCircle, XCircle, Info, QrCode, Calendar as CalendarIcon, Image as ImageIcon, Share2, MessageCircle, Eye, FileText, Trash2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Supplier, Purchase, Payment, Return, Page, Product, PurchaseItem } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';
import ConfirmationModal from '../components/ConfirmationModal';
import DeleteButton from '../components/DeleteButton';
import AddSupplierModal from '../components/AddSupplierModal';
import BatchBarcodeModal from '../components/BatchBarcodeModal';
import Dropdown from '../components/Dropdown';
import PaymentModal from '../components/PaymentModal';
import { generateDebitNotePDF, generateImagesToPDF } from '../utils/pdfGenerator';
import ModernDateInput from '../components/ModernDateInput';
import { Html5Qrcode } from 'html5-qrcode';
import { PurchaseForm } from '../components/AddPurchaseView';
import { getLocalDateString } from '../utils/dateUtils';
import { formatCurrency, formatDate } from '../utils/formatUtils';
import { createCalendarEvent } from '../utils/googleCalendar';
import LedgerModal from '../components/LedgerModal';

interface PurchasesPageProps {
    setIsDirty: (isDirty: boolean) => void;
    setCurrentPage: (page: Page) => void;
}

const PurchasesPage: React.FC<PurchasesPageProps> = ({ setIsDirty, setCurrentPage }) => {
    const { state, dispatch, showToast } = useAppContext();
    const [view, setView] = useState<'list' | 'add_purchase' | 'edit_purchase' | 'add_supplier' | 'edit_supplier'>('list');
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [purchaseToEdit, setPurchaseToEdit] = useState<Purchase | null>(null);
    const [viewImageModal, setViewImageModal] = useState<string | null>(null);
    const [paymentModalState, setPaymentModalState] = useState<{ isOpen: boolean, purchaseId: string | null, paymentToEdit: Payment | null }>({ isOpen: false, purchaseId: null, paymentToEdit: null });
    const [paymentDetails, setPaymentDetails] = useState({ amount: '', method: 'CASH' as 'CASH' | 'UPI' | 'CHEQUE', date: getLocalDateString(), reference: '' });
    const [confirmModalState, setConfirmModalState] = useState<{ isOpen: boolean, purchaseIdToDelete: string | null }>({ isOpen: false, purchaseIdToDelete: null });
    const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
    const [tempDueDates, setTempDueDates] = useState<string[]>([]);
    const [isLedgerOpen, setIsLedgerOpen] = useState(false);
    const [openDetailCalendars, setOpenDetailCalendars] = useState<Record<string, boolean>>({});

    const toggleDetailCalendar = (id: string) => {
        setOpenDetailCalendars(prev => ({ [id]: !prev[id] })); // only one at a time
    };

    const [isBatchBarcodeModalOpen, setIsBatchBarcodeModalOpen] = useState(false);
    const [lastPurchase, setLastPurchase] = useState<Purchase | null>(null);

    const isDirtyRef = useRef(false);

    useEffect(() => {
        if (state.selection && state.selection.page === 'PURCHASES') {
            if (state.selection.id === 'new') {
                setView('add_purchase');
                setSelectedSupplier(null);
            } else {
                const supplierToSelect = state.suppliers.find(s => s.id === state.selection.id);
                if (supplierToSelect) {
                    setSelectedSupplier(supplierToSelect);
                    setView('list');
                }
            }
            dispatch({ type: 'CLEAR_SELECTION' });
        }
    }, [state.selection, state.suppliers, dispatch]);

    useEffect(() => {
        const detailViewDirty = !!(selectedSupplier && (editingScheduleId));
        const currentlyDirty = detailViewDirty || view === 'add_supplier' || view === 'edit_supplier';
        if (currentlyDirty !== isDirtyRef.current) {
            isDirtyRef.current = currentlyDirty;
            setIsDirty(currentlyDirty);
        }
    }, [view, selectedSupplier, editingScheduleId, setIsDirty]);

    useEffect(() => {
        return () => {
            setIsDirty(false);
        };
    }, [setIsDirty]);

    useEffect(() => {
        if (selectedSupplier) {
            const currentSupplierData = state.suppliers.find(s => s.id === selectedSupplier.id);
            if (JSON.stringify(currentSupplierData) !== JSON.stringify(selectedSupplier)) {
                setSelectedSupplier(currentSupplierData || null);
            }
        }
    }, [selectedSupplier?.id, state.suppliers]);

    const handleAddSupplier = (newSupplier: Supplier) => {
        dispatch({ type: 'ADD_SUPPLIER', payload: newSupplier });
        showToast("Supplier added successfully!");
        setView('list');
    };

    const handleUpdateSupplier = (updatedSupplier: Supplier) => {
        dispatch({ type: 'UPDATE_SUPPLIER', payload: updatedSupplier });
        showToast("Supplier details updated.");
        setSelectedSupplier(updatedSupplier);
        setView('list');
    };

    const handleSavePayment = () => {
        const purchase = state.purchases.find(p => p.id === paymentModalState.purchaseId);
        if (!purchase || !paymentDetails.amount) {
            showToast("Please enter a valid amount.", 'error');
            return;
        }

        // Validation: If Adding, checks due amount. If Editing, checks due amount regarding the change.
        const currentPaymentAmount = paymentModalState.paymentToEdit ? paymentModalState.paymentToEdit.amount : 0;
        const amountPaid = (purchase.payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
        const dueAmount = Number(purchase.totalAmount) - (amountPaid - currentPaymentAmount);
        const newPaymentAmount = parseFloat(paymentDetails.amount);

        if (newPaymentAmount > dueAmount + 0.01) {
            showToast(`Payment exceeds due amount of ${formatCurrency(dueAmount)}.`, 'error');
            return;
        }

        const paymentData: Payment = {
            id: paymentModalState.paymentToEdit ? paymentModalState.paymentToEdit.id : `PAY-P-${Date.now()}`,
            amount: newPaymentAmount,
            method: paymentDetails.method,
            date: new Date(`${paymentDetails.date}T${new Date().toTimeString().split(' ')[0]}`).toISOString(),
            reference: paymentDetails.reference.trim() || undefined,
            accountId: paymentDetails.accountId || undefined
        };

        if (paymentModalState.paymentToEdit) {
            dispatch({ type: 'UPDATE_PAYMENT_IN_PURCHASE', payload: { purchaseId: purchase.id, payment: paymentData } });
            showToast("Payment updated successfully.");
        } else {
            dispatch({ type: 'ADD_PAYMENT_TO_PURCHASE', payload: { purchaseId: purchase.id, payment: paymentData } });
            showToast("Payment added successfully.");
        }

        setPaymentModalState({ isOpen: false, purchaseId: null, paymentToEdit: null });
        setPaymentDetails({ amount: '', method: 'CASH', date: getLocalDateString(), reference: '', accountId: '' });
    };

    const handleDeletePayment = async (purchaseId: string, paymentId: string) => {
        const confirmed = await window.confirm("Are you sure you want to delete this payment?");
        if (!confirmed) return;

        const purchase = state.purchases.find(p => p.id === purchaseId);
        if (!purchase) return;

        const updatedPayments = (purchase.payments || []).filter(p => p.id !== paymentId);
        const updatedPurchase = { ...purchase, payments: updatedPayments };

        dispatch({ type: 'UPDATE_PURCHASE', payload: { oldPurchase: purchase, updatedPurchase } });
        showToast("Payment deleted.");
    };

    const openAddPayment = (purchaseId: string) => {
        setPaymentModalState({ isOpen: true, purchaseId, paymentToEdit: null });
        setPaymentDetails({ amount: '', method: 'CASH', date: getLocalDateString(), reference: '', accountId: '' });
    };

    const openEditPayment = (purchaseId: string, payment: Payment) => {
        setPaymentModalState({ isOpen: true, purchaseId, paymentToEdit: payment });
        setPaymentDetails({
            amount: payment.amount.toString(),
            method: payment.method,
            date: payment.date.split('T')[0],
            reference: payment.reference || '',
            accountId: payment.accountId || '' // Load Saved Account ID
        });
    };

    const handleDeletePurchase = (purchaseId: string) => {
        setConfirmModalState({ isOpen: true, purchaseIdToDelete: purchaseId });
    };

    const confirmDeletePurchase = () => {
        if (confirmModalState.purchaseIdToDelete) {
            dispatch({ type: 'DELETE_PURCHASE', payload: confirmModalState.purchaseIdToDelete });
            showToast('Purchase deleted successfully. Stock has been adjusted.');
            setConfirmModalState({ isOpen: false, purchaseIdToDelete: null });
        }
    };

    const handleEditReturn = (returnId: string) => {
        dispatch({ type: 'SET_SELECTION', payload: { page: 'RETURNS', id: returnId, action: 'edit' } });
        setCurrentPage('RETURNS');
    };

    const handleCompletePurchase = (purchaseData: Purchase) => {
        dispatch({ type: 'ADD_PURCHASE', payload: purchaseData });
        purchaseData.items.forEach(item => {
            dispatch({
                type: 'ADD_PRODUCT',
                payload: {
                    id: item.productId,
                    name: item.productName,
                    quantity: Number(item.quantity),
                    purchasePrice: Number(item.price),
                    salePrice: Number(item.saleValue),
                    gstPercent: Number(item.gstPercent),
                }
            });
        });

        showToast("Purchase recorded successfully! Inventory updated.");
        setLastPurchase(purchaseData);
        setIsBatchBarcodeModalOpen(true);
        setView('list'); // Switch back to list view (which renders the modal)
    };

    const handleUpdatePurchase = (updatedPurchase: Purchase) => {
        if (!purchaseToEdit) {
            showToast("Error updating purchase: Original data not found.", 'error');
            return;
        }

        dispatch({ type: 'UPDATE_PURCHASE', payload: { oldPurchase: purchaseToEdit, updatedPurchase } });
        showToast("Purchase updated successfully!");

        setView('list');
        setPurchaseToEdit(null);
    };

    const handleDownloadDebitNote = async (newReturn: Return) => {
        const supplier = state.suppliers.find(s => s.id === newReturn.partyId);
        if (!supplier) {
            showToast("Supplier not found.", 'error');
            return;
        }
        try {
            const doc = await generateDebitNotePDF(newReturn, supplier, state.profile, state.debitNoteTemplate, state.customFonts);
            const dateStr = new Date(newReturn.returnDate).toLocaleDateString('en-IN').replace(/\//g, '-');
            doc.save(`DebitNote_${newReturn.id}_${dateStr}.pdf`);
        } catch (e) {
            console.error("PDF Error", e);
            showToast("Failed to generate PDF", 'error');
        }
    };

    const handleAddToCalendar = async (dateStr: string, supplierName: string, purchaseId: string) => {
        if (!state.googleUser?.accessToken) {
            showToast("Please sign in to Google to use Calendar integration.", 'info');
            return;
        }

        try {
            // Set time to 10:00 AM on due date
            const startTime = new Date(dateStr);
            startTime.setHours(10, 0, 0, 0);

            await createCalendarEvent(state.googleUser.accessToken, {
                summary: `Payment Due: ${supplierName}`,
                description: `Purchase ID: ${purchaseId}\nReminder created from Business Manager.`,
                startTime: startTime.toISOString()
            });
            showToast("Reminder added to your Google Calendar!", 'success');
        } catch (error: any) {
            if (error.message === "AUTH_ERROR") {
                showToast("Calendar permission denied. Please Sign Out and Sign In again.", 'error');
            } else {
                showToast("Failed to create event.", 'error');
            }
        }
    };

    // Share attached images as a compiled PDF
    const handleSharePurchaseDocs = async (purchase: Purchase) => {
        const images = (purchase.invoiceImages || [purchase.invoiceUrl]).filter(Boolean) as string[];
        if (images.length === 0) {
            showToast("No invoice images attached to share.", 'info');
            return;
        }

        showToast("Compiling document...", 'info');
        const fileName = `Invoice_${purchase.id}_${getLocalDateString()}.pdf`;

        try {
            const doc = generateImagesToPDF(images, fileName);
            const pdfBlob = doc.output('blob');
            const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

            if (navigator.share && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: `Invoice ${purchase.id}`,
                    text: `Invoice documents for purchase ${purchase.id}`
                });
            } else {
                // Fallback to download
                doc.save(fileName);
                showToast("Sharing not supported, file downloaded instead.", 'info');
            }
        } catch (e) {
            console.error("Share PDF failed", e);
            showToast("Failed to generate shareable document.", 'error');
        }
    };

    const sendPurchaseOrder = (purchase: Purchase) => {
        const itemsText = purchase.items.map(i => `${i.productName} (x${i.quantity})`).join('\n');
        const text = `New Order for ${selectedSupplier?.name || 'Supplier'}:\n\n${itemsText}\n\nTotal Est: Rs. ${purchase.totalAmount}`;
        const phone = selectedSupplier?.phone?.replace(/\D/g, '') || '';
        if (!phone) {
            showToast("Supplier phone number missing.", 'error');
            return;
        }
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    };

    // --- Portal for Image Viewer ---
    const ImageViewer = viewImageModal ? createPortal(
        <div
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/95 backdrop-blur-sm animate-fade-in-fast"
            onClick={() => setViewImageModal(null)}
        >
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-50 bg-gradient-to-b from-black/50 to-transparent pointer-events-none">
                <h3 className="text-white font-medium text-lg drop-shadow-md pl-2 pointer-events-auto">Invoice Viewer</h3>
                <div className="flex gap-4 pointer-events-auto">
                    <a
                        href={viewImageModal}
                        download={`Invoice_${Date.now()}.jpg`}
                        className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-full backdrop-blur-md transition-colors flex items-center gap-2 px-4 shadow-lg border border-white/10"
                        title="Download Original"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Download size={20} /> <span className="hidden sm:inline font-bold text-sm">Download</span>
                    </a>
                    <button
                        onClick={() => setViewImageModal(null)}
                        className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-full backdrop-blur-md transition-colors shadow-lg border border-white/10"
                    >
                        <X size={24} />
                    </button>
                </div>
            </div>

            <div className="w-full h-full flex items-center justify-center p-4">
                <img
                    src={viewImageModal}
                    alt="Invoice"
                    className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-scale-in"
                    onClick={(e) => e.stopPropagation()}
                />
            </div>
        </div>,
        document.body
    ) : null;

    const renderContent = () => {
        if (view === 'add_purchase' || view === 'edit_purchase') {
            return (
                <PurchaseForm
                    mode={view === 'add_purchase' ? 'add' : 'edit'}
                    initialData={purchaseToEdit}
                    suppliers={state.suppliers}
                    products={state.products}
                    onSubmit={view === 'add_purchase' ? handleCompletePurchase : handleUpdatePurchase}
                    onBack={() => { setView('list'); setPurchaseToEdit(null); }}
                    setIsDirty={setIsDirty}
                    dispatch={dispatch}
                    showToast={showToast}
                />
            );
        }

        if (view === 'add_supplier') {
            return (
                <div className="space-y-4 animate-fade-in-fast">
                    <Button onClick={() => setView('list')} variant="secondary">&larr; Back to List</Button>
                    <AddSupplierModal
                        isOpen={true}
                        onClose={() => setView('list')}
                        onSave={handleAddSupplier}
                        existingSuppliers={state.suppliers}
                        inline={true}
                    />
                </div>
            );
        }

        if (view === 'edit_supplier' && selectedSupplier) {
            return (
                <div className="space-y-4 animate-fade-in-fast">
                    <Button onClick={() => setView('list')} variant="secondary">&larr; Back to Details</Button>
                    <AddSupplierModal
                        isOpen={true}
                        onClose={() => setView('list')}
                        onSave={(updated) => {
                            handleUpdateSupplier(updated);
                            setView('list');
                        }}
                        existingSuppliers={state.suppliers}
                        initialData={selectedSupplier}
                        inline={true}
                    />
                </div>
            );
        }

        if (selectedSupplier) {
            const supplierPurchases = state.purchases.filter(p => p.supplierId === selectedSupplier.id);
            const supplierReturns = state.returns.filter(r => r.type === 'SUPPLIER' && r.partyId === selectedSupplier.id);

            const selectedPurchase = state.purchases.find(p => p.id === paymentModalState.purchaseId);
            const selectedPurchasePaid = selectedPurchase ? (selectedPurchase.payments || []).reduce((sum, p) => sum + Number(p.amount), 0) : 0;
            const selectedPurchaseDue = selectedPurchase ? Number(selectedPurchase.totalAmount) - selectedPurchasePaid : 0;

            const handleEditScheduleClick = (purchase: Purchase) => {
                setEditingScheduleId(purchase.id);
                setTempDueDates(purchase.paymentDueDates || []);
            };

            const handleTempDateChange = (index: number, value: string) => {
                const newDates = [...tempDueDates];
                newDates[index] = value;
                setTempDueDates(newDates);
            };

            const addTempDate = () => {
                setTempDueDates([...tempDueDates, getLocalDateString()]);
            };

            const removeTempDate = (index: number) => {
                setTempDueDates(tempDueDates.filter((_, i) => i !== index));
            };

            const handleSaveSchedule = (purchaseToUpdate: Purchase) => {
                const updatedPurchase: Purchase = {
                    ...purchaseToUpdate,
                    paymentDueDates: tempDueDates.filter(d => d).sort()
                };
                dispatch({ type: 'UPDATE_PURCHASE', payload: { oldPurchase: purchaseToUpdate, updatedPurchase } });
                setEditingScheduleId(null);
                showToast("Payment schedule updated.");
            };

            return (
                <>
                    {isLedgerOpen && <LedgerModal isOpen={isLedgerOpen} onClose={() => setIsLedgerOpen(false)} partyId={selectedSupplier.id} partyType="SUPPLIER" />}

                    <ConfirmationModal
                        isOpen={confirmModalState.isOpen}
                        onClose={() => setConfirmModalState({ isOpen: false, purchaseIdToDelete: null })}
                        onConfirm={confirmDeletePurchase}
                        title="Confirm Purchase Deletion"
                    >
                        Are you sure you want to delete this purchase? This will remove the items from inventory.
                    </ConfirmationModal>

                    <PaymentModal
                        isOpen={paymentModalState.isOpen}
                        onClose={() => setPaymentModalState({ isOpen: false, purchaseId: null, paymentToEdit: null })}
                        onSubmit={handleSavePayment}
                        totalAmount={selectedPurchase ? selectedPurchase.totalAmount : 0}
                        dueAmount={selectedPurchaseDue + (paymentModalState.paymentToEdit ? paymentModalState.paymentToEdit.amount : 0)}
                        paymentDetails={paymentDetails as any}
                        setPaymentDetails={setPaymentDetails}
                        type="purchase"
                        title={paymentModalState.paymentToEdit ? "Edit Payment" : "Add Payment"}
                    />

                    {ImageViewer}

                    <div className="space-y-6 animate-fade-in-fast">
                        <div className="flex items-center gap-2">
                            <Button onClick={() => setSelectedSupplier(null)} variant="secondary">&larr; Back to List</Button>
                            <h1 className="text-2xl font-bold text-primary">{selectedSupplier.name}</h1>
                        </div>

                        <Card>
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-gray-600 dark:text-gray-300 flex items-center gap-2"><span className="font-bold">Phone:</span> {selectedSupplier.phone}</p>
                                    <p className="text-gray-600 dark:text-gray-300 flex items-center gap-2"><span className="font-bold">Location:</span> {selectedSupplier.location}</p>
                                    {selectedSupplier.gstNumber && <p className="text-gray-600 dark:text-gray-300 flex items-center gap-2"><span className="font-bold">GST:</span> {selectedSupplier.gstNumber}</p>}
                                </div>
                                <Button onClick={() => setView('edit_supplier')} variant="secondary"><Edit size={16} className="mr-2" /> Edit Details</Button>
                            </div>
                            <div className="mt-4 pt-4 border-t">
                                <Button onClick={() => setIsLedgerOpen(true)} className="w-full">
                                    <FileText size={16} className="mr-2" />
                                    Statement / Ledger
                                </Button>
                            </div>
                        </Card>

                        <Card title="Purchase History">
                            {supplierPurchases.length > 0 ? (
                                <div className="space-y-4">
                                    {supplierPurchases.slice().reverse().map(purchase => {
                                        const amountPaid = (purchase.payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
                                        const dueAmount = Number(purchase.totalAmount) - amountPaid;
                                        const isPaid = dueAmount <= 0.01;
                                        const isEditingSchedule = editingScheduleId === purchase.id;
                                        const hasImages = (purchase.invoiceImages && purchase.invoiceImages.length > 0) || !!purchase.invoiceUrl;
                                        const areAnyCalendarsInThisItemOpen = tempDueDates.some((_, idx) => openDetailCalendars[`${purchase.id}-due-${idx}`]);

                                        return (
                                            <div key={purchase.id} className={`border dark:border-slate-700 rounded-lg p-4 bg-gray-50 dark:bg-slate-700/30 ${areAnyCalendarsInThisItemOpen ? 'relative z-10' : ''}`}>
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <p className="font-bold text-lg dark:text-white">#{purchase.id}</p>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400">{formatDate(purchase.date)}</p>
                                                        {purchase.supplierInvoiceId && <p className="text-sm text-gray-500 dark:text-gray-400">Ref: {purchase.supplierInvoiceId}</p>}
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-bold text-xl text-primary">{formatCurrency(Number(purchase.totalAmount))}</p>
                                                        <p className={`font-bold ${isPaid ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                            {isPaid ? 'Paid' : `Due: ${formatCurrency(dueAmount)}`}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Payment History List */}
                                                {purchase.payments && purchase.payments.length > 0 && (
                                                    <div className="mb-3 bg-blue-50 dark:bg-slate-800/50 p-2 rounded border border-blue-100 dark:border-slate-700">
                                                        <p className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">Payment History</p>
                                                        <div className="space-y-2">
                                                            {purchase.payments.map((pay) => (
                                                                <div key={pay.id} className="flex justify-between items-center text-sm bg-white dark:bg-slate-700 p-2 rounded shadow-sm">
                                                                    <div>
                                                                        <span className="font-bold text-green-700 dark:text-green-400">{formatCurrency(pay.amount)}</span>
                                                                        <span className="mx-2 text-gray-400">|</span>
                                                                        <span className="text-gray-600 dark:text-gray-300">{pay.method}</span>
                                                                        <span className="mx-2 text-gray-400">|</span>
                                                                        <span className="text-gray-500 text-xs">{formatDate(pay.date)}</span>
                                                                        {pay.accountId && state.bankAccounts && (
                                                                            <div className="text-xs text-gray-400 mt-0.5">
                                                                                Paid via: {state.bankAccounts.find(b => b.id === pay.accountId)?.name || 'Unknown Account'}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex gap-1">
                                                                        <button
                                                                            onClick={() => openEditPayment(purchase.id, pay)}
                                                                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                                                            title="Edit Payment"
                                                                        >
                                                                            <Edit size={14} />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleDeletePayment(purchase.id, pay.id)}
                                                                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                                                                            title="Delete Payment"
                                                                        >
                                                                            <Trash2 size={14} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Items */}
                                                <div className="bg-white dark:bg-slate-800 rounded p-2 mb-3 text-sm border dark:border-slate-600">
                                                    <p className="font-semibold mb-1 dark:text-gray-200">Items:</p>
                                                    <ul className="list-disc list-inside text-gray-600 dark:text-gray-400">
                                                        {purchase.items.map((item, idx) => (
                                                            <li key={idx}>{item.productName} (x{item.quantity})</li>
                                                        ))}
                                                    </ul>
                                                </div>

                                                {/* Attachments */}
                                                {hasImages && (
                                                    <div className="mb-3">
                                                        <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                                                            {(purchase.invoiceImages || [purchase.invoiceUrl]).filter(Boolean).map((img, idx) => (
                                                                <div key={idx} className="relative h-12 w-12 flex-shrink-0 cursor-pointer border dark:border-slate-600 rounded overflow-hidden hover:opacity-80 transition-opacity shadow-sm" onClick={() => setViewImageModal(img!)}>
                                                                    <img src={img} alt="Invoice" className="h-full w-full object-cover" />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Payment Schedule */}
                                                {!isPaid && (
                                                    <div className="mb-3">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <p className="text-sm font-semibold dark:text-gray-200">Payment Schedule:</p>
                                                            {!isEditingSchedule && (
                                                                <button onClick={() => handleEditScheduleClick(purchase)} className="text-xs text-blue-600 hover:underline">Edit Schedule</button>
                                                            )}
                                                        </div>

                                                        {isEditingSchedule ? (
                                                            <div className="space-y-2 bg-white dark:bg-slate-800 p-2 rounded border border-blue-200 dark:border-slate-600">
                                                                {tempDueDates.map((date, idx) => (
                                                                    <div key={idx} className="flex gap-2 items-center">
                                                                        <ModernDateInput
                                                                            value={date}
                                                                            onChange={(e) => handleTempDateChange(idx, e.target.value)}
                                                                            isOpen={!!openDetailCalendars[`${purchase.id}-due-${idx}`]}
                                                                            onToggle={() => toggleDetailCalendar(`${purchase.id}-due-${idx}`)}
                                                                        />
                                                                        <DeleteButton variant="remove" onClick={() => removeTempDate(idx)} />
                                                                    </div>
                                                                ))}
                                                                <div className="flex gap-2 mt-2">
                                                                    <Button onClick={addTempDate} variant="secondary" className="text-xs h-8"><Plus size={12} className="mr-1" /> Add Date</Button>
                                                                    <div className="flex-grow"></div>
                                                                    <Button onClick={() => setEditingScheduleId(null)} variant="secondary" className="text-xs h-8">Cancel</Button>
                                                                    <Button onClick={() => handleSaveSchedule(purchase)} className="text-xs h-8">Save</Button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            purchase.paymentDueDates && purchase.paymentDueDates.length > 0 ? (
                                                                <div className="flex flex-wrap gap-2">
                                                                    {purchase.paymentDueDates.map((date, idx) => {
                                                                        const d = new Date(date);
                                                                        const isOverdue = d < new Date() && !isPaid;
                                                                        return (
                                                                            <div key={idx} className={`text-xs px-2 py-1 rounded border flex items-center gap-2 ${isOverdue ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300' : 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-slate-700 dark:text-gray-300'}`}>
                                                                                {formatDate(date)}
                                                                                <button
                                                                                    onClick={() => handleAddToCalendar(date, selectedSupplier.name, purchase.id)}
                                                                                    className="hover:text-primary transition-colors p-0.5 rounded"
                                                                                    title="Add to Google Calendar"
                                                                                >
                                                                                    <CalendarIcon size={12} />
                                                                                </button>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            ) : <p className="text-xs text-gray-500 italic">No scheduled dates.</p>
                                                        )}
                                                    </div>
                                                )}

                                                <div className="flex flex-wrap gap-2 pt-2 border-t dark:border-slate-600 mt-2">
                                                    {!isPaid && (
                                                        <Button onClick={() => openAddPayment(purchase.id)} className="text-xs h-8 flex-grow sm:flex-grow-0">
                                                            Record Payment
                                                        </Button>
                                                    )}
                                                    {/* Solid Green Send Order Button */}
                                                    <button
                                                        onClick={() => sendPurchaseOrder(purchase)}
                                                        className="flex-grow sm:flex-grow-0 h-8 px-4 text-xs font-bold bg-green-600 hover:bg-green-700 text-white rounded-md shadow-sm transition-colors flex items-center justify-center"
                                                    >
                                                        <MessageCircle size={14} className="mr-1.5" /> Send Order
                                                    </button>

                                                    {/* View Image Button */}
                                                    {hasImages && (
                                                        <button
                                                            onClick={() => setViewImageModal((purchase.invoiceImages && purchase.invoiceImages[0]) || purchase.invoiceUrl || '')}
                                                            className="flex-grow sm:flex-grow-0 h-8 px-3 text-xs font-bold bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 rounded-md shadow-sm transition-colors flex items-center justify-center border border-gray-300 dark:border-slate-600"
                                                            title="View Invoice Image"
                                                        >
                                                            <Eye size={14} className="mr-1.5" /> View
                                                        </button>
                                                    )}

                                                    {/* New Share Docs Button */}
                                                    {hasImages && (
                                                        <button
                                                            onClick={() => handleSharePurchaseDocs(purchase)}
                                                            className="flex-grow sm:flex-grow-0 h-8 px-3 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-sm transition-colors flex items-center justify-center"
                                                            title="Share PDF for GST"
                                                        >
                                                            <Share2 size={14} className="mr-1.5" /> Share
                                                        </button>
                                                    )}

                                                    <Button onClick={() => { setPurchaseToEdit(purchase); setView('edit_purchase'); }} variant="secondary" className="text-xs h-8 px-2 flex-grow sm:flex-grow-0">
                                                        <Edit size={14} />
                                                    </Button>
                                                    <DeleteButton variant="delete" onClick={() => handleDeletePurchase(purchase.id)} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-gray-500 text-center py-4">No purchases recorded for this supplier.</p>
                            )}
                        </Card>

                        <Card title="Debit Notes (Returns)">
                            {supplierReturns.length > 0 ? (
                                <div className="space-y-3">
                                    {supplierReturns.slice().reverse().map(ret => (
                                        <div key={ret.id} className="p-3 bg-gray-50 dark:bg-slate-700/30 rounded-lg border dark:border-slate-700 flex justify-between items-center">
                                            <div>
                                                <p className="font-semibold text-sm dark:text-white">Return #{ret.id}</p>
                                                <p className="text-xs text-gray-500">{formatDate(ret.returnDate)}</p>
                                                <p className="text-xs font-bold text-red-600">Value: {formatCurrency(Number(ret.amount))}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button onClick={() => handleDownloadDebitNote(ret)} variant="secondary" className="p-2 h-auto"><Download size={16} /></Button>
                                                <Button onClick={() => handleEditReturn(ret.id)} variant="secondary" className="p-2 h-auto"><Edit size={16} /></Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500 text-center py-4">No debit notes created.</p>
                            )}
                        </Card>
                    </div>
                </>
            );
        }

        const filteredSuppliers = state.suppliers.filter(s =>
            s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.location.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return (
            <>
                {ImageViewer}

                {isBatchBarcodeModalOpen && lastPurchase && (
                    <BatchBarcodeModal
                        isOpen={isBatchBarcodeModalOpen}
                        onClose={() => { setIsBatchBarcodeModalOpen(false); setView('list'); setPurchaseToEdit(null); }}
                        purchaseItems={lastPurchase.items}
                        businessName={state.profile?.name || ''}
                        title="Bulk Barcode Print"
                    />
                )}

                <div className="space-y-4 animate-fade-in-fast">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-primary">Purchases</h1>
                        </div>
                        <Button onClick={() => setView('add_purchase')}>
                            <Plus size={16} className="mr-2" /> Create Purchase
                        </Button>
                    </div>

                    <div>
                        <div className="relative flex-grow">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="Search suppliers..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full p-2 pl-10 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        {filteredSuppliers.map((supplier, index) => {
                            const supplierPurchases = state.purchases.filter(p => p.supplierId === supplier.id);
                            const totalPurchased = supplierPurchases.reduce((sum, p) => sum + Number(p.totalAmount), 0);
                            const totalPaid = supplierPurchases.reduce((sum, p) => sum + (p.payments || []).reduce((psum, pay) => psum + Number(pay.amount), 0), 0);
                            const due = totalPurchased - totalPaid;

                            // Calculate Next Due Date
                            let nextDueDate: string | null = null;
                            let daysUntilDue: number | null = null;
                            let isOverdue = false;

                            const allDueDates: string[] = [];
                            supplierPurchases.forEach(p => {
                                const pPaid = (p.payments || []).reduce((sum, pay) => sum + Number(pay.amount), 0);
                                const pDue = Number(p.totalAmount) - pPaid;

                                if (pDue > 0.01 && p.paymentDueDates) {
                                    p.paymentDueDates.forEach(date => {
                                        // Only consider dates that haven't "passed" in terms of being fully paid? 
                                        // Actually simplest is just collect ALL dates from UNPAID invoices.
                                        allDueDates.push(date);
                                    });
                                }
                            });

                            if (allDueDates.length > 0) {
                                allDueDates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
                                // Find earliest date
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);

                                // Logic: Find the earliest date. If it's in past -> Overdue.
                                const earliest = new Date(allDueDates[0]);
                                nextDueDate = allDueDates[0];

                                const diffTime = earliest.getTime() - today.getTime();
                                daysUntilDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                isOverdue = daysUntilDue < 0;
                            }

                            return (
                                <Card
                                    key={supplier.id}
                                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors animate-slide-up-fade"
                                    style={{ animationDelay: `${index * 50}ms` }}
                                    onClick={() => setSelectedSupplier(supplier)}
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold text-lg text-gray-800 dark:text-white mb-1">{supplier.name}</h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                {supplier.location}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            {/* Financial Summary */}
                                            <div className="flex flex-col gap-0.5">
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    Total Invoice: <span className="font-semibold text-gray-700 dark:text-gray-200">{formatCurrency(totalPurchased)}</span>
                                                </p>
                                                <p className={`font-bold text-lg ${due > 0.01 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                                    Outstanding: {formatCurrency(due)}
                                                </p>

                                                {/* Due Date Indicator */}
                                                {nextDueDate && daysUntilDue !== null && due > 0.01 && (
                                                    <div className={`text-xs font-bold mt-1 px-2 py-1 rounded-md inline-block self-end ${isOverdue
                                                            ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                                                            : daysUntilDue === 0
                                                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                                                : 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                                        }`}>
                                                        {isOverdue
                                                            ? `Overdue by ${Math.abs(daysUntilDue)} days (${formatDate(nextDueDate)})`
                                                            : daysUntilDue === 0
                                                                ? `Due Today`
                                                                : `Due in ${daysUntilDue} days (${formatDate(nextDueDate)})`
                                                        }
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                        {filteredSuppliers.length === 0 && (
                            <div className="text-center py-10">
                                <p className="text-gray-500 dark:text-gray-400">No suppliers found.</p>
                            </div>
                        )}
                    </div>
                </div>
            </>
        );
    };

    return renderContent();
};

export default PurchasesPage;
