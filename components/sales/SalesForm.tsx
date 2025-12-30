import React, { useMemo, useState } from 'react';
import { Plus, Search, QrCode, Share2, Save, IndianRupee, Edit } from 'lucide-react';
import { SaleItem, Customer, Product, Payment, Sale } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/formatUtils';
import { calculateTotals } from '../../utils/calculations';
import Button from '../Button';
import Card from '../Card';
import Input from '../Input';
import Dropdown from '../Dropdown';
import FormattedNumberInput from '../FormattedNumberInput';
import DeleteButton from '../DeleteButton';
import ModernDateInput from '../ModernDateInput';

// Note: Passing large number of props. In a larger refactor, this could use a specific context or complex object.
interface SalesFormProps {
    mode: 'add' | 'edit';
    customerId: string;
    setCustomerId: (id: string) => void;
    items: SaleItem[];
    setItems: (items: SaleItem[]) => void; // Using Function update might be needed, but simple sets for now
    discount: string;
    setDiscount: (val: string) => void;
    saleDate: string;
    setSaleDate: (date: string) => void;
    paymentDetails: {
        amount: string;
        method: 'CASH' | 'UPI' | 'CHEQUE' | 'RETURN_CREDIT';
        date: string;
        reference: string;
        accountId?: string;
    };
    setPaymentDetails: (details: any) => void;
    storedPayments: Payment[];
    setStoredPayments: (payments: Payment[]) => void;
    showAddPayment: boolean;
    setShowAddPayment: (show: boolean) => void;
    customers: Customer[];
    products: Product[];
    returns: any[]; // types not fully exposed here, using any for now or strictly Import Return
    saleToEdit: Sale | null;

    // Actions
    onAddCustomer: () => void;
    onSelectProduct: () => void;
    onScanProduct: () => void;
    onSubmitSale: () => void;
    onRecordPayment: () => void;
    onReset: () => void;
    onNavigateCustomer: () => void;
}

const SalesForm: React.FC<SalesFormProps> = ({
    mode,
    customerId,
    setCustomerId,
    items,
    setItems,
    discount,
    setDiscount,
    saleDate,
    setSaleDate,
    paymentDetails,
    setPaymentDetails,
    storedPayments,
    setStoredPayments,
    showAddPayment,
    setShowAddPayment,
    customers,
    products,
    returns,
    saleToEdit,
    onAddCustomer,
    onSelectProduct,
    onScanProduct,
    onSubmitSale,
    onRecordPayment,
    onReset,
    onNavigateCustomer
}) => {

    // Derived State
    const calculations = useMemo(() => {
        return calculateTotals(items, parseFloat(discount) || 0, products);
    }, [items, discount, products]);

    const selectedCustomer = useMemo(() => customerId ? customers.find(c => c.id === customerId) : null, [customerId, customers]);

    const lastPurchaseInfo = useMemo(() => {
        // Logic passed from parent or recalculated? Recalculating here requires Sales list which we don't have.
        // WARNING: We are missing 'sales' prop to calculate last purchase info and total due.
        // Ideally these should be passed as props: `lastPurchaseInfo` and `customerTotalDue`.
        // For now, I will omit them or request they be passed.
        return null;
    }, []);

    // Helper functions
    const handleRemoveItem = (productId: string) => {
        setItems(items.filter(item => item.productId !== productId));
    };

    const handleItemChange = (productId: string, field: 'quantity' | 'price', value: string) => {
        const numValue = parseFloat(value);
        if (isNaN(numValue) && value !== '') return;

        const newItems = items.map(item => {
            if (item.productId === productId) {
                if (field === 'quantity') {
                    const product = products.find(p => p.id === productId);
                    const originalQtyInSale = mode === 'edit' ? saleToEdit?.items.find(i => i.productId === productId)?.quantity || 0 : 0;
                    const availableStock = (Number(product?.quantity) || 0) + originalQtyInSale;
                    if (numValue > availableStock) {
                        // Toast needed? Pushing up error handling might be better, but we can't show toast here easily without hook
                        // Using callback or just clamping?
                        return { ...item, quantity: availableStock };
                    }
                }
                return { ...item, [field]: numValue };
            }
            return item;
        });
        setItems(newItems);
    };

    const canCreateSale = customerId && items.length > 0 && mode === 'add';
    const canUpdateSale = customerId && items.length > 0 && mode === 'edit';
    // Logic for payment recording needs customerTotalDue
    const canRecordPayment = customerId && items.length === 0 && parseFloat(paymentDetails.amount || '0') > 0 && mode === 'add';

    return (
        <div className="space-y-4">
            <Card>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Customer</label>
                        <div className="flex gap-2 items-center">
                            <div className="w-full">
                                <Dropdown
                                    options={customers.map(c => ({
                                        value: c.id,
                                        label: `${c.name} - ${c.area}`,
                                        searchText: `${c.name} ${c.area} ${c.phone}`
                                    }))}
                                    value={customerId}
                                    onChange={setCustomerId}
                                    searchable={true}
                                    searchPlaceholder="Search..."
                                    placeholder="Select a Customer"
                                    disabled={mode === 'edit' || (mode === 'add' && items.length > 0)}
                                />
                            </div>
                            {mode === 'add' && (
                                <Button onClick={onAddCustomer} variant="secondary" className="flex-shrink-0">
                                    <Plus size={16} /> New Customer
                                </Button>
                            )}
                        </div>
                    </div>

                    <ModernDateInput
                        label="Sale Date"
                        value={saleDate}
                        onChange={e => setSaleDate(e.target.value)}
                        disabled={mode === 'edit'}
                    />

                    {/* Missing contextual info placeholders */}
                </div>
            </Card>

            <Card title={
                <div className="flex items-center justify-between">
                    <span>Sale Items</span>
                    {selectedCustomer?.priceTier === 'WHOLESALE' && (
                        <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded border border-purple-200 font-bold ml-2">
                            WHOLESALE ACTIVE
                        </span>
                    )}
                </div>
            }>
                <div className="flex flex-col sm:flex-row gap-2">
                    <Button onClick={onSelectProduct} className="w-full sm:w-auto flex-grow" disabled={!customerId}>
                        <Search size={16} className="mr-2" /> Select Product
                    </Button>
                    <Button onClick={onScanProduct} variant="secondary" className="w-full sm:w-auto flex-grow" disabled={!customerId}>
                        <QrCode size={16} className="mr-2" /> Scan Product
                    </Button>
                </div>
                <div className="mt-4 space-y-2">
                    {items.map(item => (
                        <div key={item.productId} className="p-2 bg-gray-50 dark:bg-slate-700/50 rounded animate-fade-in-fast border dark:border-slate-700">
                            <div className="flex justify-between items-start">
                                <p className="font-semibold flex-grow">{item.productName}</p>
                                <DeleteButton variant="remove" onClick={() => handleRemoveItem(item.productId)} />
                            </div>
                            <div className="flex items-center gap-2 text-sm mt-1">
                                <FormattedNumberInput value={item.quantity} onChange={e => handleItemChange(item.productId, 'quantity', e.target.value)} className="w-20 !p-1 text-center" placeholder="Qty" />
                                <span>x</span>
                                <FormattedNumberInput value={item.price} onChange={e => handleItemChange(item.productId, 'price', e.target.value)} className="w-24 !p-1 text-center" placeholder="Price" />
                                <span>= {formatCurrency(Number(item.quantity) * Number(item.price))}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>

            <Card title="Transaction Details">
                <div className="space-y-6">
                    {/* Calculations */}
                    <div className="grid grid-cols-[1fr_auto] gap-3 items-center text-gray-700 dark:text-gray-300">
                        <span>Subtotal:</span>
                        <span className="text-right font-medium">{formatCurrency(calculations.subTotal)}</span>

                        <span>Discount:</span>
                        <div className="flex justify-end">
                            <FormattedNumberInput
                                value={discount}
                                onChange={e => setDiscount(e.target.value)}
                                className="w-32 h-8 text-right font-medium"
                            />
                        </div>

                        {mode === 'edit' && (() => {
                            const relatedReturns = returns?.filter(r => r.referenceId === saleToEdit?.id) || [];
                            const totalReturned = relatedReturns.reduce((sum, r) => sum + Number(r.amount), 0);
                            if (totalReturned > 0) {
                                return (
                                    <>
                                        <span className="text-amber-700">Less Returns:</span>
                                        <span className="text-right font-medium text-amber-700">-{formatCurrency(totalReturned)}</span>
                                    </>
                                );
                            }
                            return null;
                        })()}

                        <span>GST Included:</span>
                        <span className="text-right font-medium">{formatCurrency(calculations.gstAmount)}</span>
                    </div>

                    {/* Grand Total */}
                    <div className="text-center pt-2 border-t dark:border-slate-700 mt-2">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Grand Total</p>
                        <p className="text-3xl font-bold text-primary">
                            {formatCurrency(calculations.totalAmount)}
                        </p>
                    </div>

                    {/* Payments */}
                    <div className="space-y-4 pt-4 border-t dark:border-slate-700">
                        {mode === 'edit' && storedPayments.length > 0 && (
                            <div className="space-y-3 mb-4">
                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Existing Payments</p>
                                {storedPayments.map((payment, index) => (
                                    <div key={payment.id} className="bg-gray-50 dark:bg-slate-700/50 p-3 rounded-md border border-gray-200 dark:border-slate-600">
                                        <div className="flex flex-col sm:flex-row gap-3 items-end">
                                            <div className="w-full sm:flex-1">
                                                <label className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 mb-1 block">Date</label>
                                                <Input
                                                    type="date"
                                                    value={new Date(payment.date).toISOString().split('T')[0]}
                                                    onChange={(e) => {
                                                        const newPayments = [...storedPayments];
                                                        newPayments[index] = { ...payment, date: new Date(e.target.value).toISOString() };
                                                        setStoredPayments(newPayments);
                                                    }}
                                                    className="h-9 text-sm"
                                                />
                                            </div>
                                            <div className="w-full sm:w-28">
                                                <label className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 mb-1 block">Amount</label>
                                                <FormattedNumberInput
                                                    value={payment.amount}
                                                    onChange={(e) => {
                                                        const newPayments = [...storedPayments];
                                                        newPayments[index] = { ...payment, amount: parseFloat(e.target.value) || 0 };
                                                        setStoredPayments(newPayments);
                                                    }}
                                                    className="h-9 text-sm font-medium"
                                                />
                                            </div>
                                            <div className="w-full sm:w-32">
                                                <label className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 mb-1 block">Method</label>
                                                <Dropdown
                                                    options={[{ value: 'CASH', label: 'Cash' }, { value: 'UPI', label: 'UPI' }, { value: 'CHEQUE', label: 'Cheque' }, { value: 'RETURN_CREDIT', label: 'Return Credit' }]}
                                                    value={payment.method}
                                                    onChange={(val) => {
                                                        const newPayments = [...storedPayments];
                                                        newPayments[index] = { ...payment, method: val as any };
                                                        setStoredPayments(newPayments);
                                                    }}
                                                    className="h-9 text-sm"
                                                />
                                            </div>
                                            <div className="w-full sm:flex-1">
                                                <label className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 mb-1 block">Reference</label>
                                                <Input
                                                    type="text"
                                                    placeholder="Ref / Cheque #"
                                                    value={payment.reference || ''}
                                                    onChange={(e) => {
                                                        const newPayments = [...storedPayments];
                                                        newPayments[index] = { ...payment, reference: e.target.value };
                                                        setStoredPayments(newPayments);
                                                    }}
                                                    className="h-9 text-sm"
                                                />
                                            </div>
                                            <div className="pb-1">
                                                <DeleteButton variant="delete" onClick={() => {
                                                    const newPayments = storedPayments.filter((_, i) => i !== index);
                                                    setStoredPayments(newPayments);
                                                }} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {mode === 'edit' && !showAddPayment ? (
                            <Button
                                variant="secondary"
                                onClick={() => setShowAddPayment(true)}
                                className="w-full dashed border-2"
                            >
                                + Add New Payment
                            </Button>
                        ) : (
                            <div className={`space-y-4 ${mode === 'edit' ? 'bg-gray-50 dark:bg-slate-800 p-3 rounded-lg border dark:border-700' : ''}`}>
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {mode === 'add' ? 'Amount Paid Now' : 'New Payment Amount'}
                                    </label>
                                    {mode === 'edit' && (
                                        <button onClick={() => setShowAddPayment(false)} className="text-xs text-red-500 hover:underline">Cancel</button>
                                    )}
                                </div>
                                <FormattedNumberInput
                                    value={paymentDetails.amount}
                                    onChange={(e) => setPaymentDetails({ ...paymentDetails, amount: e.target.value })}
                                    placeholder={mode === 'add' ? `Total is ${formatCurrency(calculations.totalAmount)}` : 'Enter amount'}
                                    className="border-2 border-red-300 focus:ring-red-500 focus:border-red-500 dark:border-red-400"
                                />
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Method</label>
                                    <Dropdown
                                        options={[{ value: 'CASH', label: 'Cash' }, { value: 'UPI', label: 'UPI' }, { value: 'CHEQUE', label: 'Cheque' }, { value: 'RETURN_CREDIT', label: 'Return Credit' }]}
                                        value={paymentDetails.method}
                                        onChange={(val) => setPaymentDetails({ ...paymentDetails, method: val as any })}
                                    />
                                </div>
                                <Input
                                    label="Reference (Optional)"
                                    type="text"
                                    placeholder="e.g. UPI ID"
                                    value={paymentDetails.reference}
                                    onChange={(e) => setPaymentDetails({ ...paymentDetails, reference: e.target.value })}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            <div className="space-y-2">
                {canCreateSale ? (
                    <Button onClick={onSubmitSale} variant="secondary" className="w-full">
                        <Share2 className="w-4 h-4 mr-2" /> Create & Share
                    </Button>
                ) : canUpdateSale ? (
                    <Button onClick={onSubmitSale} className="w-full">
                        <Save className="w-4 h-4 mr-2" /> Save Changes
                    </Button>
                ) : (
                    <Button className="w-full" disabled>Incomplete</Button>
                )}
                <Button onClick={onReset} variant="ghost" className="w-full">Cancel</Button>
            </div>
        </div>
    );
};

export default SalesForm;
