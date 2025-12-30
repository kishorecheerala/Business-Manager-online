import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, IndianRupee, Plus, Trash2, Bell, CheckCircle, AlertCircle } from 'lucide-react';
import Card from './Card';
import Button from './Button';
import { useUI } from '../context/UIContext';
import { PaymentSchedule, PaymentInstallment } from '../types';
import { formatCurrency, formatDate } from '../utils/formatUtils';
import { getLocalDateString } from '../utils/dateUtils';
import FormattedNumberInput from './FormattedNumberInput';

interface PaymentScheduleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (schedule: PaymentSchedule) => void;
    totalAmount: number;
    saleId: string;
    existingSchedule?: PaymentSchedule;
}

const PaymentScheduleModal: React.FC<PaymentScheduleModalProps> = ({
    isOpen,
    onClose,
    onSave,
    totalAmount,
    saleId,
    existingSchedule
}) => {
    const { showToast } = useUI();
    const [autoReminders, setAutoReminders] = useState(existingSchedule?.autoReminders ?? true);
    const [installments, setInstallments] = useState<Omit<PaymentInstallment, 'id'>[]>(
        existingSchedule?.installments || []
    );

    // Quick setup options
    const [quickSetup, setQuickSetup] = useState<number | null>(null);

    useEffect(() => {
        if (isOpen && !existingSchedule && installments.length === 0) {
            // Initialize with at least 2 installments
            const half = totalAmount / 2;
            const today = new Date();
            setInstallments([
                {
                    dueDate: getLocalDateString(),
                    amount: half,
                    status: 'pending',
                },
                {
                    dueDate: new Date(today.setMonth(today.getMonth() + 1)).toISOString().split('T')[0],
                    amount: half,
                    status: 'pending',
                }
            ]);
        }
    }, [isOpen, totalAmount, existingSchedule]);

    const handleQuickSetup = (numInstallments: number) => {
        const amount = totalAmount / numInstallments;
        const today = new Date();
        const newInstallments: Omit<PaymentInstallment, 'id'>[] = [];
        
        for (let i = 0; i < numInstallments; i++) {
            const dueDate = new Date();
            dueDate.setMonth(today.getMonth() + i);
            newInstallments.push({
                dueDate: dueDate.toISOString().split('T')[0],
                amount: Number(amount.toFixed(2)),
                status: 'pending',
            });
        }
        
        setInstallments(newInstallments);
        setQuickSetup(numInstallments);
    };

    const addInstallment = () => {
        const today = new Date();
        const lastInstallment = installments[installments.length - 1];
        const nextMonth = lastInstallment ? new Date(lastInstallment.dueDate) : today;
        nextMonth.setMonth(nextMonth.getMonth() + 1);

        setInstallments([
            ...installments,
            {
                dueDate: nextMonth.toISOString().split('T')[0],
                amount: 0,
                status: 'pending',
            }
        ]);
    };

    const removeInstallment = (index: number) => {
        if (installments.length <= 1) {
            showToast('At least one installment is required', 'error');
            return;
        }
        setInstallments(installments.filter((_, i) => i !== index));
    };

    const updateInstallment = (index: number, field: keyof Omit<PaymentInstallment, 'id'>, value: any) => {
        const updated = [...installments];
        updated[index] = { ...updated[index], [field]: value };
        setInstallments(updated);
    };

    const handleSave = () => {
        // Validation
        if (installments.length === 0) {
            showToast('Add at least one installment', 'error');
            return;
        }

        const totalScheduled = installments.reduce((sum, inst) => sum + Number(inst.amount), 0);
        if (Math.abs(totalScheduled - totalAmount) > 0.01) {
            showToast(`Total installments (${formatCurrency(totalScheduled)}) must equal invoice amount (${formatCurrency(totalAmount)})`, 'error');
            return;
        }

        for (const inst of installments) {
            if (!inst.dueDate || inst.amount <= 0) {
                showToast('All installments must have a valid date and amount', 'error');
                return;
            }
        }

        const schedule: PaymentSchedule = {
            id: existingSchedule?.id || `schedule_${Date.now()}`,
            saleId,
            totalAmount,
            installments: installments.map((inst, idx) => ({
                ...inst,
                id: existingSchedule?.installments[idx]?.id || `inst_${Date.now()}_${idx}`,
                status: existingSchedule?.installments[idx]?.status || 'pending',
                paidDate: existingSchedule?.installments[idx]?.paidDate,
                paidAmount: existingSchedule?.installments[idx]?.paidAmount,
            })),
            autoReminders,
            createdAt: existingSchedule?.createdAt || new Date().toISOString(),
        };

        onSave(schedule);
        showToast('Payment schedule saved successfully', 'success');
        onClose();
    };

    if (!isOpen) return null;

    const totalScheduled = installments.reduce((sum, inst) => sum + Number(inst.amount), 0);
    const isBalanced = Math.abs(totalScheduled - totalAmount) < 0.01;

    return createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-fade-in-fast overflow-auto">
            <Card className="w-full max-w-3xl my-8 animate-scale-in">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-700 pb-4 mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <Calendar className="text-blue-600 dark:text-blue-400" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Payment Schedule</h2>
                            <p className="text-sm text-gray-500">Split invoice into installments</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Summary */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                        <div className="flex justify-between items-center">
                            <div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">Total Invoice Amount</div>
                                <div className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalAmount)}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm text-gray-600 dark:text-gray-400">Total Scheduled</div>
                                <div className={`text-2xl font-bold ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatCurrency(totalScheduled)}
                                </div>
                            </div>
                        </div>
                        {!isBalanced && (
                            <div className="mt-2 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                                <AlertCircle size={14} />
                                Difference: {formatCurrency(Math.abs(totalScheduled - totalAmount))}
                            </div>
                        )}
                    </div>

                    {/* Quick Setup */}
                    {installments.length === 0 || (!existingSchedule && quickSetup === null) && (
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                Quick Setup
                            </label>
                            <div className="grid grid-cols-4 gap-2">
                                {[2, 3, 4, 6].map(num => (
                                    <button
                                        key={num}
                                        onClick={() => handleQuickSetup(num)}
                                        className="p-3 border-2 border-gray-200 dark:border-slate-700 rounded-lg hover:border-primary transition-colors"
                                    >
                                        <div className="text-xl font-bold text-gray-900 dark:text-white">{num}</div>
                                        <div className="text-xs text-gray-500">Installments</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Installments */}
                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                                Installments ({installments.length})
                            </label>
                            <Button onClick={addInstallment} className="h-8 text-xs">
                                <Plus size={14} className="mr-1" /> Add
                            </Button>
                        </div>
                        <div className="space-y-3 max-h-96 overflow-auto">
                            {installments.map((inst, index) => (
                                <div key={index} className="flex gap-2 items-start p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
                                    <div className="flex-shrink-0 w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold text-sm">
                                        {index + 1}
                                    </div>
                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                                                Due Date
                                            </label>
                                            <input
                                                type="date"
                                                value={inst.dueDate}
                                                onChange={(e) => updateInstallment(index, 'dueDate', e.target.value)}
                                                className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                                                Amount
                                            </label>
                                            <FormattedNumberInput
                                                value={inst.amount}
                                                onChange={(val) => updateInstallment(index, 'amount', val)}
                                                className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => removeInstallment(index)}
                                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Auto Reminders */}
                    <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                        <input
                            type="checkbox"
                            id="autoReminders"
                            checked={autoReminders}
                            onChange={(e) => setAutoReminders(e.target.checked)}
                            className="w-5 h-5 accent-primary rounded"
                        />
                        <label htmlFor="autoReminders" className="flex-1 cursor-pointer">
                            <div className="flex items-center gap-2">
                                <Bell size={16} className="text-amber-600" />
                                <span className="font-semibold text-sm text-gray-900 dark:text-white">
                                    Enable Auto Reminders
                                </span>
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                Automatically notify customers 3 days before each installment due date
                            </div>
                        </label>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-slate-700 mt-6">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                        {isBalanced ? (
                            <span className="flex items-center gap-1 text-green-600">
                                <CheckCircle size={16} /> Schedule balanced
                            </span>
                        ) : (
                            <span className="flex items-center gap-1 text-red-600">
                                <AlertCircle size={16} /> Adjust amounts to match total
                            </span>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={onClose} variant="secondary">
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={!isBalanced}>
                            <CheckCircle size={16} className="mr-2" />
                            Save Schedule
                        </Button>
                    </div>
                </div>
            </Card>
        </div>,
        document.body
    );
};

export default PaymentScheduleModal;
