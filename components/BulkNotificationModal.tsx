import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, MessageCircle, Send, Users, Tag, Calendar, Gift, TrendingUp, IndianRupee } from 'lucide-react';
import Card from './Card';
import Button from './Button';
import { useData } from '../context/DataContext';
import { useUI } from '../context/UIContext';
import { Customer, Sale } from '../types';
import { formatCurrency } from '../utils/formatUtils';

interface BulkNotificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    preselectedCustomers?: string[]; // Customer IDs
}

type MessageTemplate = 'payment_reminder' | 'birthday' | 'new_product' | 'festival_offer' | 'custom';

const BulkNotificationModal: React.FC<BulkNotificationModalProps> = ({
    isOpen,
    onClose,
    preselectedCustomers = []
}) => {
    const { state } = useData();
    const { showToast } = useUI();

    const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set(preselectedCustomers));
    const [messageTemplate, setMessageTemplate] = useState<MessageTemplate>('custom');
    const [customMessage, setCustomMessage] = useState('');
    const [filterTag, setFilterTag] = useState<string>('all');
    const [filterMinDue, setFilterMinDue] = useState<number>(0);

    // Calculate dues for each customer
    const customerDues = useMemo(() => {
        const duesMap = new Map<string, number>();
        state.sales.forEach(sale => {
            const paid = (sale.payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
            const due = Number(sale.totalAmount) - paid;
            if (due > 0) {
                const existing = duesMap.get(sale.customerId) || 0;
                duesMap.set(sale.customerId, existing + due);
            }
        });
        return duesMap;
    }, [state.sales]);

    // Filter customers based on criteria
    const filteredCustomers = useMemo(() => {
        return state.customers.filter(customer => {
            // Tag filter
            if (filterTag !== 'all') {
                if (!customer.tags?.includes(filterTag)) return false;
            }
            // Minimum due filter
            if (filterMinDue > 0) {
                const due = customerDues.get(customer.id) || 0;
                if (due < filterMinDue) return false;
            }
            // Must have phone
            return !!customer.phone;
        });
    }, [state.customers, filterTag, filterMinDue, customerDues]);

    // Get all unique tags
    const allTags = useMemo(() => {
        const tags = new Set<string>();
        state.customers.forEach(c => c.tags?.forEach(t => tags.add(t)));
        return Array.from(tags);
    }, [state.customers]);

    // Message templates
    const getTemplateMessage = (template: MessageTemplate, customer: Customer): string => {
        const businessName = state.profile?.name || 'Business Manager';
        const due = customerDues.get(customer.id) || 0;

        switch (template) {
            case 'payment_reminder':
                return `Dear ${customer.name},

This is a friendly reminder that you have a pending payment of ${formatCurrency(due)}.

Please clear the dues at your earliest convenience.

Thank you!
- ${businessName}`;
            case 'birthday':
                return `🎉 Happy Birthday, ${customer.name}! 🎂

Wishing you a wonderful year ahead!

Enjoy 10% OFF on your next purchase as our birthday gift to you! 🎁

- ${businessName}`;
            case 'new_product':
                return `Hello ${customer.name}! 👋

We've just received fresh stock of premium sarees!

✨ New designs & exclusive collection

Visit us today or call ${state.profile?.phone || ''} to reserve yours!

- ${businessName}`;
            case 'festival_offer':
                return `🪔 Festival Special Offer! 🪔

Dear ${customer.name},

Celebrate this festive season with MEGA DISCOUNTS up to 30% OFF on all sarees!

Limited time offer. Visit us today!

- ${businessName}`;
            case 'custom':
                return customMessage.replace('{name}', customer.name).replace('{due}', formatCurrency(due));
            default:
                return '';
        }
    };

    const toggleCustomer = (id: string) => {
        const newSet = new Set(selectedCustomers);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedCustomers(newSet);
    };

    const selectAll = () => {
        setSelectedCustomers(new Set(filteredCustomers.map(c => c.id)));
    };

    const clearSelection = () => {
        setSelectedCustomers(new Set());
    };

    const handleSendMessages = () => {
        const customersToSend = state.customers.filter(c => selectedCustomers.has(c.id));
        
        if (customersToSend.length === 0) {
            showToast('Please select at least one customer', 'error');
            return;
        }

        // Generate messages for all selected customers
        const messages = customersToSend.map(customer => ({
            customer,
            message: getTemplateMessage(messageTemplate, customer)
        }));

        // Open WhatsApp for each customer (in practice, you'd batch this)
        messages.forEach((item, index) => {
            setTimeout(() => {
                const phone = item.customer.phone.replace(/[^0-9]/g, '');
                const formattedPhone = phone.startsWith('91') ? phone : `91${phone}`;
                const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(item.message)}`;
                window.open(url, '_blank');
            }, index * 500); // Stagger by 500ms
        });

        showToast(`Opening WhatsApp for ${customersToSend.length} customer(s)...`, 'success');
        onClose();
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-fade-in-fast">
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-scale-in">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-700 pb-4 mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                            <MessageCircle className="text-green-600 dark:text-green-400" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Bulk WhatsApp Notifications</h2>
                            <p className="text-sm text-gray-500">Send messages to multiple customers at once</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-auto space-y-4">
                    {/* Message Template Selection */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                            Message Template
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                            {[
                                { value: 'payment_reminder', label: 'Payment Reminder', icon: IndianRupee },
                                { value: 'birthday', label: 'Birthday', icon: Gift },
                                { value: 'new_product', label: 'New Product', icon: TrendingUp },
                                { value: 'festival_offer', label: 'Festival Offer', icon: Calendar },
                                { value: 'custom', label: 'Custom', icon: MessageCircle }
                            ].map(template => (
                                <button
                                    key={template.value}
                                    onClick={() => setMessageTemplate(template.value as MessageTemplate)}
                                    className={`p-3 rounded-lg border-2 transition-all ${
                                        messageTemplate === template.value
                                            ? 'border-primary bg-primary/10 text-primary'
                                            : 'border-gray-200 dark:border-slate-700 hover:border-primary/50'
                                    }`}
                                >
                                    <template.icon size={20} className="mx-auto mb-1" />
                                    <div className="text-xs font-semibold">{template.label}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Custom Message (if selected) */}
                    {messageTemplate === 'custom' && (
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                Custom Message (use {'{name}'} for customer name, {'{due}'} for due amount)
                            </label>
                            <textarea
                                value={customMessage}
                                onChange={(e) => setCustomMessage(e.target.value)}
                                rows={4}
                                className="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                                placeholder="Enter your custom message..."
                            />
                        </div>
                    )}

                    {/* Message Preview */}
                    {filteredCustomers.length > 0 && (
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                            <div className="text-sm font-bold text-green-800 dark:text-green-400 mb-2">Message Preview:</div>
                            <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono bg-white dark:bg-slate-800 p-3 rounded">
                                {getTemplateMessage(messageTemplate, filteredCustomers[0])}
                            </div>
                        </div>
                    )}

                    {/* Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                <Tag size={14} className="inline mr-1" /> Filter by Tag
                            </label>
                            <select
                                value={filterTag}
                                onChange={(e) => setFilterTag(e.target.value)}
                                className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
                            >
                                <option value="all">All Customers</option>
                                {allTags.map(tag => (
                                    <option key={tag} value={tag}>{tag}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                <IndianRupee size={14} className="inline mr-1" /> Minimum Due Amount
                            </label>
                            <input
                                type="number"
                                value={filterMinDue}
                                onChange={(e) => setFilterMinDue(Number(e.target.value))}
                                className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
                                placeholder="0"
                                min="0"
                            />
                        </div>
                    </div>

                    {/* Customer Selection */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                                <Users size={14} className="inline mr-1" /> Select Customers ({selectedCustomers.size}/{filteredCustomers.length})
                            </label>
                            <div className="flex gap-2">
                                <button onClick={selectAll} className="text-xs text-primary hover:underline">Select All</button>
                                <button onClick={clearSelection} className="text-xs text-gray-500 hover:underline">Clear</button>
                            </div>
                        </div>
                        <div className="max-h-64 overflow-auto border border-gray-200 dark:border-slate-700 rounded-lg">
                            {filteredCustomers.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">No customers found matching the filters</div>
                            ) : (
                                <div className="divide-y divide-gray-200 dark:divide-slate-700">
                                    {filteredCustomers.map(customer => {
                                        const due = customerDues.get(customer.id) || 0;
                                        return (
                                            <label key={customer.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedCustomers.has(customer.id)}
                                                    onChange={() => toggleCustomer(customer.id)}
                                                    className="w-4 h-4 accent-primary rounded"
                                                />
                                                <div className="flex-1">
                                                    <div className="font-semibold text-sm text-gray-800 dark:text-white">{customer.name}</div>
                                                    <div className="text-xs text-gray-500">{customer.phone}</div>
                                                </div>
                                                {due > 0 && (
                                                    <div className="text-xs font-semibold text-red-600">Due: {formatCurrency(due)}</div>
                                                )}
                                                {customer.tags && customer.tags.length > 0 && (
                                                    <div className="flex gap-1">
                                                        {customer.tags.map(tag => (
                                                            <span key={tag} className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs rounded">
                                                                {tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-slate-700 mt-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                        {selectedCustomers.size} customer(s) selected
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={onClose} variant="secondary">
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleSendMessages}
                            className="bg-green-600 hover:bg-green-700"
                            disabled={selectedCustomers.size === 0}
                        >
                            <Send size={16} className="mr-2" />
                            Send WhatsApp Messages
                        </Button>
                    </div>
                </div>
            </Card>
        </div>,
        document.body
    );
};

export default BulkNotificationModal;
