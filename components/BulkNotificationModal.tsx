import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, MessageCircle, Send, Users, Tag, Calendar, Gift, TrendingUp, IndianRupee, Check } from 'lucide-react';
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[300] p-4 animate-fade-in-fast">
            <div className="w-full max-w-5xl max-h-[90vh] flex flex-col animate-scale-in relative bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/50 overflow-hidden ring-1 ring-black/5">

                {/* Premium Header */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>

                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-slate-800">
                    <div className="flex items-center gap-4">
                        <div className="bg-gradient-to-br from-green-400 to-green-600 p-3 rounded-xl shadow-lg shadow-green-500/20 text-white">
                            <MessageCircle size={24} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800 dark:text-white tracking-tight">Bulk Notifications</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Reach your customers instantly</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-all duration-200"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-auto p-6 space-y-8 custom-scrollbar">

                    {/* Template Selection Cards */}
                    <div>
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4 block">
                            Select Campaign Type
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            {[
                                { value: 'payment_reminder', label: 'Payment Reminder', icon: IndianRupee, color: 'from-orange-400 to-red-500' },
                                { value: 'birthday', label: 'Birthday Wish', icon: Gift, color: 'from-pink-400 to-rose-500' },
                                { value: 'new_product', label: 'New Arrival', icon: TrendingUp, color: 'from-blue-400 to-indigo-500' },
                                { value: 'festival_offer', label: 'Festival Offer', icon: Calendar, color: 'from-purple-400 to-violet-500' },
                                { value: 'custom', label: 'Custom Message', icon: MessageCircle, color: 'from-emerald-400 to-teal-500' }
                            ].map((template) => {
                                const isSelected = messageTemplate === template.value;
                                return (
                                    <button
                                        key={template.value}
                                        onClick={() => setMessageTemplate(template.value as MessageTemplate)}
                                        className={`relative group p-4 rounded-xl border transition-all duration-300 flex flex-col items-center gap-3 overflow-hidden
                                            ${isSelected
                                                ? 'border-transparent bg-gray-50 dark:bg-slate-800 shadow-md transform scale-[1.02]'
                                                : 'border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800/50'
                                            }
                                        `}
                                    >
                                        {isSelected && (
                                            <div className="absolute inset-0 border-2 border-blue-500/50 rounded-xl pointer-events-none"></div>
                                        )}
                                        <div className={`p-3 rounded-full bg-gradient-to-br ${template.color} text-white shadow-lg transform group-hover:scale-110 transition-transform duration-300`}>
                                            <template.icon size={20} />
                                        </div>
                                        <span className={`text-sm font-semibold ${isSelected ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                                            {template.label}
                                        </span>
                                        {isSelected && (
                                            <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-0.5 animate-scale-in">
                                                <Check size={12} />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Editor Section */}
                        <div className="space-y-6">
                            {messageTemplate === 'custom' && (
                                <div className="animate-fade-in-down">
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">
                                        Compose Message
                                    </label>
                                    <div className="relative">
                                        <textarea
                                            value={customMessage}
                                            onChange={(e) => setCustomMessage(e.target.value)}
                                            rows={6}
                                            className="w-full p-4 text-base border-0 ring-1 ring-gray-200 dark:ring-slate-700 bg-gray-50 dark:bg-slate-800/50 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none dark:text-white"
                                            placeholder="Write your message here... Use {name} for customer name."
                                        />
                                        <div className="absolute bottom-3 right-3 flex gap-2">
                                            <span className="text-xs bg-gray-200 dark:bg-slate-700 px-2 py-1 rounded text-gray-600 dark:text-gray-300 cursor-pointer hover:bg-gray-300" onClick={() => setCustomMessage(prev => prev + '{name}')}>{'{name}'}</span>
                                            <span className="text-xs bg-gray-200 dark:bg-slate-700 px-2 py-1 rounded text-gray-600 dark:text-gray-300 cursor-pointer hover:bg-gray-300" onClick={() => setCustomMessage(prev => prev + '{due}')}>{'{due}'}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">
                                    Preview
                                </label>
                                <div className="bg-[#e5ddd5] dark:bg-[#0b141a] rounded-xl p-4 border border-black/5 dark:border-white/5 relative overflow-hidden">
                                    {/* WhatsApp Background Pattern could go here */}
                                    <div className="bg-white dark:bg-[#202c33] p-3 rounded-lg rounded-tl-none shadow-sm max-w-[90%] self-start relative">
                                        <p className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-100 leading-relaxed font-sans">
                                            {filteredCustomers.length > 0
                                                ? getTemplateMessage(messageTemplate, filteredCustomers[0])
                                                : "Select customers to see preview"}
                                        </p>
                                        <div className="text-[10px] text-gray-400 text-right mt-1 flex justify-end items-center gap-1">
                                            Today <Check size={10} className="text-blue-500" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Audience Selection */}
                        <div className="bg-gray-50 dark:bg-slate-800/30 rounded-2xl p-6 border border-gray-100 dark:border-slate-800">
                            <div className="flex justify-between items-center mb-4">
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
                                    Target Audience
                                </label>
                                <div className="flex gap-3 text-xs font-medium">
                                    <button onClick={selectAll} className="text-blue-600 dark:text-blue-400 hover:underline">Select All</button>
                                    <span className="text-gray-300">|</span>
                                    <button onClick={clearSelection} className="text-gray-500 hover:underline">None</button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <div className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-gray-200 dark:border-slate-700 flex items-center gap-2">
                                    <Tag size={16} className="text-gray-400" />
                                    <select
                                        value={filterTag}
                                        onChange={(e) => setFilterTag(e.target.value)}
                                        className="w-full bg-transparent border-none outline-none text-sm dark:text-white"
                                    >
                                        <option value="all">All Tags</option>
                                        {allTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
                                    </select>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-gray-200 dark:border-slate-700 flex items-center gap-2">
                                    <IndianRupee size={16} className="text-gray-400" />
                                    <input
                                        type="number"
                                        value={filterMinDue}
                                        onChange={(e) => setFilterMinDue(Number(e.target.value))}
                                        className="w-full bg-transparent border-none outline-none text-sm dark:text-white placeholder-gray-400"
                                        placeholder="Min Due"
                                    />
                                </div>
                            </div>

                            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden flex flex-col h-[300px]">
                                <div className="p-3 bg-gray-50/50 dark:bg-slate-700/30 border-b dark:border-slate-700 flex justify-between items-center text-xs font-semibold text-gray-500">
                                    <span>CUSTOMER</span>
                                    <span>STATUS</span>
                                </div>
                                <div className="overflow-y-auto flex-1 p-2 space-y-1 custom-scrollbar">
                                    {filteredCustomers.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                            <Users size={32} className="mb-2 opacity-50" />
                                            <span className="text-xs">No customers match filters</span>
                                        </div>
                                    ) : (
                                        filteredCustomers.map(customer => {
                                            const due = customerDues.get(customer.id) || 0;
                                            const isSelected = selectedCustomers.has(customer.id);
                                            return (
                                                <div
                                                    key={customer.id}
                                                    onClick={() => toggleCustomer(customer.id)}
                                                    className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${isSelected
                                                        ? 'bg-blue-50 dark:bg-blue-900/20'
                                                        : 'hover:bg-gray-50 dark:hover:bg-slate-700/50'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300 dark:border-slate-600'
                                                            }`}>
                                                            {isSelected && <Check size={12} className="text-white" />}
                                                        </div>
                                                        <div>
                                                            <div className={`text-sm font-medium ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-200'}`}>{customer.name}</div>
                                                            <div className="text-[10px] text-gray-400">{customer.phone}</div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        {due > 0 && <span className="text-xs font-bold text-red-500">{formatCurrency(due)}</span>}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-200 dark:border-slate-800 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Recipients:</span>
                        <span className="px-3 py-1 bg-gray-200 dark:bg-slate-700 rounded-full text-sm font-bold text-gray-800 dark:text-white">
                            {selectedCustomers.size} <span className="text-gray-400 font-normal">/ {filteredCustomers.length}</span>
                        </span>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 rounded-xl font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSendMessages}
                            disabled={selectedCustomers.size === 0}
                            className="px-8 py-2.5 rounded-xl font-bold text-white shadow-lg shadow-green-500/30 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 transform active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:shadow-none disabled:transform-none"
                        >
                            <Send size={18} />
                            Send Message
                        </button>
                    </div>
                </div>

            </div>
        </div>,
        document.body
    );
};

export default BulkNotificationModal;
