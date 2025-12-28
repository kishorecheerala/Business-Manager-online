import React, { useMemo } from 'react';
import { ShieldCheck, ShieldX, AlertTriangle, User, Package, PackageCheck, Award } from 'lucide-react';
import Card from '../Card';
import WhatsAppIcon from '../WhatsAppIcon';
import { formatCurrency, formatNumber, formatDate } from '../../utils/formatUtils';
import { Sale, Customer, Purchase, Supplier, Product } from '../../types';

// --- Backup Status Alert ---
export const BackupStatusAlert: React.FC<{ lastBackupDate: string | null, lastSyncTime: number | string | null }> = ({ lastBackupDate, lastSyncTime }) => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    let status: 'no-backup' | 'overdue' | 'safe' = 'no-backup';
    let diffDays = 0;
    let backupDate: Date | null = null;
    let isCloud = false;

    // Convert string timestamp to number if needed
    const lastSyncTimeNum = typeof lastSyncTime === 'string' ? new Date(lastSyncTime).getTime() : lastSyncTime;

    if (lastSyncTimeNum) {
        const syncD = new Date(lastSyncTimeNum);
        const syncStr = syncD.toISOString().slice(0, 10);
        if (syncStr === todayStr) {
            status = 'safe';
            backupDate = syncD;
            isCloud = true;
        }
    }

    if (status !== 'safe' && lastBackupDate) {
        const manualD = new Date(lastBackupDate);
        const manualStr = manualD.toISOString().slice(0, 10);
        if (manualStr === todayStr) {
            status = 'safe';
            backupDate = manualD;
            isCloud = false;
        } else {
            const latestDate = lastSyncTimeNum ? (manualD > new Date(lastSyncTimeNum) ? manualD : new Date(lastSyncTimeNum)) : manualD;
            diffDays = Math.floor((now.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24));
            status = 'overdue';
            backupDate = latestDate;
        }
    } else if (status !== 'safe' && lastSyncTimeNum) {
        const syncD = new Date(lastSyncTimeNum);
        diffDays = Math.floor((now.getTime() - syncD.getTime()) / (1000 * 60 * 60 * 24));
        status = 'overdue';
        backupDate = syncD;
    }

    const config = {
        'no-backup': {
            icon: ShieldX,
            classes: 'bg-red-50 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800',
            iconColor: 'text-red-600 dark:text-red-400',
            title: 'No Backup Found',
            message: 'Please create a backup immediately to protect your data.'
        },
        'overdue': {
            icon: ShieldX,
            classes: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800',
            iconColor: 'text-amber-600 dark:text-amber-400',
            title: 'Backup Overdue',
            message: diffDays > 0 ? `Last backup was ${diffDays} day${diffDays > 1 ? 's' : ''} ago.` : "Last backup was not today."
        },
        'safe': {
            icon: ShieldCheck,
            classes: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800',
            iconColor: 'text-emerald-600 dark:text-emerald-400',
            title: `Data is Safe ${isCloud ? '(Cloud Sync)' : '(Manual Backup)'}`,
            message: `Backed up today at ${backupDate?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`
        }
    };

    const current = config[status];
    const Icon = current.icon;

    return (
        <div className={`flex items-start p-4 rounded-lg border ${current.classes} mb-6 group`}>
            <Icon className={`w-6 h-6 mr-3 flex-shrink-0 ${current.iconColor} transition-transform group-hover:scale-110`} />
            <div>
                <h4 className="font-bold text-sm uppercase tracking-wide mb-1">{current.title}</h4>
                <p className="text-sm opacity-90">{current.message}</p>
            </div>
        </div>
    );
};

// --- Overdue Dues Card ---
export const OverdueDuesCard: React.FC<{
    sales: Sale[];
    customers: Customer[];
    onNavigate: (customerId: string) => void;
    businessName: string;
}> = ({ sales, customers, onNavigate, businessName }) => {
    const overdueCustomersArray = useMemo(() => {
        const overdueCustomers: { [key: string]: { customer: Customer; totalOverdue: number; oldestOverdueDate: string } } = {};
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        sales.forEach(sale => {
            const saleDate = new Date(sale.date);
            if (saleDate < thirtyDaysAgo) {
                const amountPaid = (sale.payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
                const dueAmount = Number(sale.totalAmount) - amountPaid;
                if (dueAmount > 0.01) {
                    const customerId = sale.customerId;
                    if (!overdueCustomers[customerId]) {
                        const customer = customers.find(c => c.id === customerId);
                        if (customer) {
                            overdueCustomers[customerId] = {
                                customer: customer,
                                totalOverdue: 0,
                                oldestOverdueDate: sale.date
                            };
                        }
                    }
                    if (overdueCustomers[customerId]) {
                        overdueCustomers[customerId].totalOverdue += dueAmount;
                        if (new Date(sale.date) < new Date(overdueCustomers[customerId].oldestOverdueDate)) {
                            overdueCustomers[customerId].oldestOverdueDate = sale.date;
                        }
                    }
                }
            }
        });
        return Object.values(overdueCustomers);
    }, [sales, customers]);

    const sendWhatsAppReminder = (e: React.MouseEvent, customer: Customer, totalDue: number) => {
        e.stopPropagation();
        const message = `Dear ${customer.name}, your outstanding balance with ${businessName} is ${formatCurrency(totalDue)}. Please clear it at the earliest. Thank you.`;
        const encodedMessage = encodeURIComponent(message);
        const cleanPhone = customer.phone.replace(/\D/g, '');
        const finalPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
        window.open(`https://wa.me/${finalPhone}?text=${encodedMessage}`, '_blank');
    };

    if (overdueCustomersArray.length === 0) {
        return (
            <Card className="border-l-4 border-green-500 bg-green-50 dark:bg-green-900/20 dark:border-green-600 h-full">
                <div className="flex items-center">
                    <ShieldCheck className="w-8 h-8 text-green-600 dark:text-green-400 mr-4" />
                    <div>
                        <p className="font-bold text-green-800 dark:text-green-200">No Overdue Dues</p>
                        <p className="text-sm text-green-700 dark:text-green-300">All customer payments older than 30 days are settled.</p>
                    </div>
                </div>
            </Card>
        );
    }

    return (
        <Card className="border-l-4 border-rose-500 bg-rose-50 dark:bg-rose-900/20 dark:border-rose-600 h-full">
            <div className="flex items-center mb-4">
                <AlertTriangle className="w-6 h-6 text-rose-600 dark:text-rose-400 mr-3" />
                <h2 className="text-lg font-bold text-rose-800 dark:text-rose-200">Overdue Dues Alert</h2>
            </div>
            <p className="text-sm text-rose-700 dark:text-rose-300 mb-4">The following customers have dues from sales older than 30 days.</p>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {overdueCustomersArray.sort((a, b) => b.totalOverdue - a.totalOverdue).map(({ customer, totalOverdue, oldestOverdueDate }) => (
                    <div
                        key={customer.id}
                        className="p-3 bg-white dark:bg-slate-800 rounded-lg shadow-sm cursor-pointer hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors flex justify-between items-center border dark:border-slate-700"
                        onClick={() => onNavigate(customer.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onNavigate(customer.id)}
                    >
                        <div className="flex items-center gap-3">
                            <User className="w-6 h-6 text-rose-700 dark:text-rose-400 flex-shrink-0" />
                            <div>
                                <p className="font-bold text-rose-900 dark:text-rose-100">{customer.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{customer.area}</p>
                            </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                            <p className="font-bold text-lg text-red-600 dark:text-red-400">{formatCurrency(totalOverdue)}</p>
                            <div className="flex items-center justify-end gap-2">
                                <p className="text-xs text-gray-500 dark:text-gray-400">{Math.floor((new Date().getTime() - new Date(oldestOverdueDate).getTime()) / (1000 * 60 * 60 * 24))} days old</p>
                                <button onClick={(e) => sendWhatsAppReminder(e, customer, totalOverdue)} className="bg-green-500 text-white p-1 rounded-full hover:scale-110 transition-transform" title="Send Reminder"><WhatsAppIcon size={14} /></button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
};

// --- Upcoming Purchase Dues Card ---
export const UpcomingPurchaseDuesCard: React.FC<{
    purchases: Purchase[];
    suppliers: Supplier[];
    onNavigate: (supplierId: string) => void;
}> = ({ purchases, suppliers, onNavigate }) => {
    const upcomingDues = useMemo(() => {
        const dues: any[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        thirtyDaysFromNow.setHours(23, 59, 59, 999);

        purchases.forEach(purchase => {
            const amountPaid = (purchase.payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
            const dueAmount = Number(purchase.totalAmount) - amountPaid;

            if (dueAmount > 0.01 && purchase.paymentDueDates && purchase.paymentDueDates.length > 0) {
                const supplier = suppliers.find(s => s.id === purchase.supplierId);
                if (!supplier) return;

                purchase.paymentDueDates.forEach(dateStr => {
                    const dueDate = new Date(dateStr + 'T00:00:00');
                    if (dueDate <= thirtyDaysFromNow) {
                        const timeDiff = dueDate.getTime() - today.getTime();
                        const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
                        dues.push({ purchaseId: purchase.id, supplier: supplier, totalPurchaseDue: dueAmount, dueDate: dueDate, daysRemaining: daysRemaining });
                    }
                });
            }
        });
        return dues.sort((a, b) => a.daysRemaining - b.daysRemaining);
    }, [purchases, suppliers]);

    if (upcomingDues.length === 0) return (
        <Card className="border-l-4 border-green-500 bg-green-50 dark:bg-green-900/20 dark:border-green-600 h-full">
            <div className="flex items-center">
                <PackageCheck className="w-8 h-8 text-green-600 dark:text-green-400 mr-4" />
                <div>
                    <p className="font-bold text-green-800 dark:text-green-200">No Upcoming Purchase Dues</p>
                    <p className="text-sm text-green-700 dark:text-green-300">There are no payment dues to suppliers in the next 30 days.</p>
                </div>
            </div>
        </Card>
    );

    return (
        <Card className="border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-600 h-full">
            <div className="flex items-center mb-4">
                <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400 mr-3" />
                <h2 className="text-lg font-bold text-amber-800 dark:text-amber-200">Upcoming Purchase Dues</h2>
            </div>
            <p className="text-sm text-amber-700 dark:text-amber-300 mb-4">The following payments to suppliers are due soon or overdue.</p>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {upcomingDues.map((due) => {
                    let countdownText = "";
                    let timeColor = "text-amber-600 dark:text-amber-400";

                    if (due.daysRemaining < 0) {
                        countdownText = `Overdue by ${Math.abs(due.daysRemaining)} day${Math.abs(due.daysRemaining) !== 1 ? 's' : ''}`;
                        timeColor = "text-red-600 dark:text-red-400";
                    } else if (due.daysRemaining === 0) {
                        countdownText = "Due today";
                        timeColor = "text-orange-600 dark:text-orange-400";
                    } else {
                        countdownText = `Due in ${due.daysRemaining} day${due.daysRemaining !== 1 ? 's' : ''}`;
                    }
                    return (
                        <div key={`${due.purchaseId}-${due.dueDate.toISOString()}`} className="p-3 bg-white dark:bg-slate-800 rounded-lg shadow-sm cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors flex justify-between items-center border dark:border-slate-700" onClick={() => onNavigate(due.supplier.id)}>
                            <div className="flex items-center gap-3">
                                <Package className="w-6 h-6 text-amber-700 dark:text-amber-400 flex-shrink-0" />
                                <div>
                                    <p className="font-bold text-amber-900 dark:text-amber-100">{due.supplier.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Inv: {due.purchaseId}</p>
                                </div>
                            </div>
                            <div className="text-right flex-shrink-0 ml-2">
                                <p className={`font-bold text-lg ${timeColor}`}>{countdownText}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Date: {formatDate(due.dueDate)}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </Card>
    );
};

// --- Low Stock Card ---
export const LowStockCard: React.FC<{ products: Product[]; onNavigate: (id: string) => void; }> = ({ products, onNavigate }) => {
    const lowStockProducts = useMemo(() => {
        return products.filter(p => p.quantity < 5).sort((a, b) => a.quantity - b.quantity);
    }, [products]);

    if (lowStockProducts.length === 0) return (
        <Card className="border-l-4 border-green-500 bg-green-50 dark:bg-green-900/20 dark:border-green-600 h-full">
            <div className="flex items-center">
                <PackageCheck className="w-8 h-8 text-green-600 dark:text-green-400 mr-4" />
                <div>
                    <p className="font-bold text-green-800 dark:text-green-200">Stock Healthy</p>
                    <p className="text-sm text-green-700 dark:text-green-300">All products have sufficient stock levels (5+).</p>
                </div>
            </div>
        </Card>
    );

    return (
        <Card className="border-l-4 border-orange-500 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-600 h-full">
            <div className="flex items-center mb-4">
                <AlertTriangle className="w-6 h-6 text-orange-600 dark:text-orange-400 mr-3" />
                <h2 className="text-lg font-bold text-orange-800 dark:text-orange-200">Low Stock Alert</h2>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {lowStockProducts.map(product => (
                    <div key={product.id} className="p-2 bg-white dark:bg-slate-800 rounded shadow-sm flex justify-between items-center cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors border dark:border-slate-700" onClick={() => onNavigate(product.id)}>
                        <div>
                            <p className="font-semibold text-sm dark:text-slate-200">{product.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">ID: {product.id}</p>
                        </div>
                        <span className="font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded text-xs">
                            {product.quantity} left
                        </span>
                    </div>
                ))}
            </div>
        </Card>
    );
};

// --- Top Products Card ---
export const TopProductsCard: React.FC<{ sales: Sale[] }> = ({ sales }) => {
    const topProducts = useMemo(() => {
        const productMap: Record<string, { name: string, quantity: number, revenue: number }> = {};

        sales.forEach(sale => {
            sale.items.forEach(item => {
                if (!productMap[item.productId]) {
                    productMap[item.productId] = {
                        name: item.productName,
                        quantity: 0,
                        revenue: 0
                    };
                }
                productMap[item.productId].quantity += item.quantity;
                productMap[item.productId].revenue += (item.quantity * item.price);
            });
        });

        return Object.values(productMap)
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 3);
    }, [sales]);

    if (topProducts.length === 0) return null;

    return (
        <Card className="border-l-4 border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-600">
            <div className="flex items-center mb-4">
                <Award className="w-6 h-6 text-indigo-600 dark:text-indigo-400 mr-3" />
                <h2 className="text-lg font-bold text-indigo-800 dark:text-indigo-200">Top Selling Products</h2>
            </div>
            <div className="space-y-3">
                {topProducts.map((p, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2 bg-white dark:bg-slate-800 rounded shadow-sm">
                        <div className="flex items-center gap-3 min-w-0">
                            <span className="font-bold text-lg text-indigo-300 w-4">{idx + 1}</span>
                            <div className="truncate">
                                <p className="font-bold text-sm text-gray-800 dark:text-gray-200 truncate">{p.name}</p>
                                <p className="text-xs text-gray-500">{p.quantity} units sold</p>
                            </div>
                        </div>
                        <p className="font-bold text-indigo-600 dark:text-indigo-400 ml-2">{formatCurrency(p.revenue)}</p>
                    </div>
                ))}
            </div>
        </Card>
    );
};
