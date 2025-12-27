import React, { useMemo, useState } from 'react';
import { generateDownloadFilename } from '../utils/formatUtils';
import { Download, XCircle, Users, Package, AlertTriangle, FileSpreadsheet, Loader2, BarChart3, Sparkles } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import Card from '../components/Card';
import Button from '../components/Button';
import { Customer, Sale, Supplier, Page, Product } from '../types';
import Dropdown from '../components/Dropdown';
import { generateGenericReportPDF } from '../utils/pdfGenerator';
import { exportReportToSheet } from '../utils/googleSheets';
import ReportsPageV2 from './ReportsPageV2';
import FormattedNumberInput from '../components/FormattedNumberInput';

interface CustomerWithDue extends Customer {
    dueAmount: number;
    lastPaidDate: string | null;
    salesWithDue: Sale[];
}

interface ReportsPageProps {
    setCurrentPage: (page: Page) => void;
}

const ReportsPage: React.FC<ReportsPageProps> = ({ setCurrentPage }) => {
    const { state, dispatch, showToast } = useAppContext();
    const [activeTab, setActiveTab] = useState<'customer' | 'supplier' | 'stock' | 'tax'>('customer');
    const [isExporting, setIsExporting] = useState(false);

    // --- GST Reports Logic ---
    const [gstMonth, setGstMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

    // Filter sales for GST
    const gstData = useMemo(() => {
        const [year, month] = gstMonth.split('-');
        const filteredSales = state.sales.filter(s => {
            const date = new Date(s.date);
            return date.getFullYear() === parseInt(year) && date.getMonth() + 1 === parseInt(month);
        });

        // Use Service to categorize
        // We import it dynamically or assume it's available. We need to import it at top.
        // For now, let's just inline the categorization calls or lazily load if better, 
        // but robust way is standard import.

        // We need to import GSTExportService. I'll add the import in a separate step or just assume it's there.
        // Wait, I can't add import here. I will just implement the logic here for now or fix imports later.

        // Let's implement active logic here first.
        const b2b: Sale[] = [];
        const b2c: Sale[] = [];

        filteredSales.forEach(sale => {
            const customer = state.customers.find(c => c.id === sale.customerId);
            // Basic check: If reference matches typical GSTIN length (15)
            if (customer && customer.reference && customer.reference.length === 15) {
                b2b.push(sale);
            } else {
                b2c.push(sale);
            }
        });

        const totalTax = filteredSales.reduce((sum, s) => sum + s.gstAmount, 0);
        const totalValue = filteredSales.reduce((sum, s) => sum + s.totalAmount, 0);

        return { b2b, b2c, totalTax, totalValue, all: filteredSales };
    }, [state.sales, state.customers, gstMonth]);

    const handleExportGSTR1_B2B = async () => {
        // Dynamic Import to avoid top-level circular dep if any
        const { GSTExportService } = await import('../utils/gstExportService');
        const csv = GSTExportService.generateB2BCSV(gstData.b2b, state.customers);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `GSTR1_B2B_${gstMonth}.csv`;
        link.click();
        showToast("B2B Report Downloaded");
    };

    const handleExportSalesRegister = async () => {
        const { GSTExportService } = await import('../utils/gstExportService');
        const csv = GSTExportService.generateSalesRegisterCSV(gstData.all, state.customers);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Sales_Register_${gstMonth}.csv`;
        link.click();
        showToast("Sales Register Downloaded");
    };

    // ... (rest of filtering logic)
    const [areaFilter, setAreaFilter] = useState('all');
    const [duesAgeFilter, setDuesAgeFilter] = useState('all');
    const [customDuesAge, setCustomDuesAge] = useState('');

    // --- Supplier Filters ---
    const [supplierFilter, setSupplierFilter] = useState('all');

    const handleCustomerClick = (customerId: string) => {
        dispatch({ type: 'SET_SELECTION', payload: { page: 'CUSTOMERS', id: customerId } });
        setCurrentPage('CUSTOMERS');
    };

    // --- Helper for Sheet Export ---
    const handleSheetExport = async (title: string, headers: string[], rows: string[][]) => {
        if (!state.googleUser?.accessToken) {
            showToast("Please sign in with Google (Menu > Sign In) to use Sheets export.", "info");
            return;
        }

        setIsExporting(true);
        try {
            const url = await exportReportToSheet(
                state.googleUser.accessToken,
                `${title} - ${new Date().toLocaleDateString('en-IN')}`,
                headers,
                rows
            );

            showToast("Export successful! Opening Google Sheet...", "success");
            window.open(url, '_blank');
        } catch (error: any) {
            console.error(error);
            if (error.message.includes('401') || error.message.includes('403')) {
                showToast("Permission denied. Please Sign Out and Sign In again to grant Sheets access.", "error");
            } else {
                showToast("Failed to export to Google Sheets.", "error");
            }
        } finally {
            setIsExporting(false);
        }
    };

    // --- Customer Dues Report Logic ---
    const customerDues = useMemo((): CustomerWithDue[] => {
        const customersWithDuesAndDates = state.customers.map(customer => {
            const customerSales = state.sales.filter(sale => sale.customerId === customer.id);
            let totalDue = 0;
            let lastPaidDate: Date | null = null;
            const salesWithDue: Sale[] = [];

            customerSales.forEach(sale => {
                const amountPaid = (sale.payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
                const due = Number(sale.totalAmount) - amountPaid;
                if (due > 0.01) {
                    totalDue += due;
                    salesWithDue.push(sale);
                }

                (sale.payments || []).forEach(p => {
                    const paymentDate = new Date(p.date);
                    if (!lastPaidDate || paymentDate > lastPaidDate) {
                        lastPaidDate = paymentDate;
                    }
                });
            });

            return {
                ...customer,
                dueAmount: totalDue,
                lastPaidDate: lastPaidDate ? lastPaidDate.toLocaleDateString('en-IN') : null,
                salesWithDue
            };
        });

        return customersWithDuesAndDates
            .filter(c => c.dueAmount > 0.01)
            .filter(c => areaFilter === 'all' || c.area === areaFilter)
            .filter(c => {
                if (duesAgeFilter === 'all') return true;
                const days = duesAgeFilter === 'custom' ? parseInt(customDuesAge) || 0 : parseInt(duesAgeFilter);
                if (days <= 0) return true;
                const thresholdDate = new Date();
                thresholdDate.setDate(thresholdDate.getDate() - days);
                return c.salesWithDue.some(sale => new Date(sale.date) < thresholdDate);
            });
    }, [state.customers, state.sales, areaFilter, duesAgeFilter, customDuesAge]);

    const uniqueAreas = useMemo(() => [...new Set(state.customers.map(c => c.area).filter(Boolean))], [state.customers]);
    const totalDuesFiltered = useMemo(() => customerDues.reduce((sum, c) => sum + c.dueAmount, 0), [customerDues]);

    const generateDuesPDF = async () => {
        if (customerDues.length === 0) { showToast("No data to export.", 'error'); return; }

        try {
            const doc = await generateGenericReportPDF(
                "Customer Dues Report",
                `Filter: Area=${areaFilter}, Age=${duesAgeFilter === 'custom' ? customDuesAge + ' days' : duesAgeFilter}`,
                ['Customer Name', 'Area', 'Last Paid Date', 'Due Amount'],
                customerDues.map(c => [c.name, c.area, c.lastPaidDate || 'N/A', `Rs. ${c.dueAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`]),
                [{ label: 'Total Outstanding Due', value: `Rs. ${totalDuesFiltered.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, color: '#dc2626' }],
                state.profile,
                state.reportTemplate,
                state.customFonts
            );

            doc.save(generateDownloadFilename('Report_CustomerDues', 'pdf'));
        } catch (e) {
            console.error(e);
            showToast("Failed to generate PDF", 'error');
        }
    };

    const generateDuesCSV = () => {
        if (customerDues.length === 0) { showToast("No data to export.", 'error'); return; }
        const headers = ['Customer Name', 'Area', 'Last Paid Date', 'Due Amount'];
        const rows = customerDues.map(c => `"${c.name}","${c.area}","${c.lastPaidDate || 'N/A'}","${c.dueAmount}"`);
        const csv = [headers.join(','), ...rows].join('\n');
        const link = document.createElement("a");
        link.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
        link.download = generateDownloadFilename('customer-dues-report', 'csv');
        link.click();
    };

    const exportDuesToSheets = () => {
        if (customerDues.length === 0) { showToast("No data to export.", 'error'); return; }
        const headers = ['Customer Name', 'Area', 'Last Paid Date', 'Due Amount'];
        const rows = customerDues.map(c => [c.name, c.area, c.lastPaidDate || 'N/A', c.dueAmount.toString()]);
        handleSheetExport("Customer Dues Report", headers, rows);
    };

    // --- Customer Account Summary Logic ---
    const customerAccountSummary = useMemo(() => {
        return state.customers.map(customer => {
            const customerSales = state.sales.filter(s => s.customerId === customer.id);
            const totalPurchased = customerSales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
            const totalPaid = customerSales.reduce((sum, s) => sum + (s.payments || []).reduce((pSum, p) => pSum + Number(p.amount), 0), 0);
            const outstandingDue = totalPurchased - totalPaid;

            let lastPurchaseDate: string | null = null;
            if (customerSales.length > 0) {
                const lastSale = customerSales.reduce((latest, sale) => {
                    return new Date(sale.date) > new Date(latest.date) ? sale : latest;
                });
                lastPurchaseDate = new Date(lastSale.date).toLocaleDateString('en-IN');
            }

            return { customer, totalPurchased, totalPaid, outstandingDue, lastPurchaseDate };
        });
    }, [state.customers, state.sales]);

    const generateCustomerSummaryPDF = async () => {
        if (customerAccountSummary.length === 0) { showToast("No data to export.", 'error'); return; }

        try {
            const doc = await generateGenericReportPDF(
                "Customer Account Summary",
                `Generated on: ${new Date().toLocaleDateString()}`,
                ['Customer Name', 'Last Purchase', 'Total Billed', 'Total Paid', 'Balance'],
                customerAccountSummary.map(s => [
                    s.customer.name,
                    s.lastPurchaseDate || 'N/A',
                    `Rs. ${s.totalPurchased.toLocaleString('en-IN')}`,
                    `Rs. ${s.totalPaid.toLocaleString('en-IN')}`,
                    `Rs. ${s.outstandingDue.toLocaleString('en-IN')}`
                ]),
                [], // No grand totals summary needed here as it's a list
                state.profile,
                state.reportTemplate,
                state.customFonts
            );

            doc.save(generateDownloadFilename('Report_CustomerSummary', 'pdf'));
        } catch (e) {
            console.error(e);
            showToast("Failed to generate PDF", 'error');
        }
    };

    const generateCustomerSummaryCSV = () => {
        if (customerAccountSummary.length === 0) { showToast("No data to export.", 'error'); return; }
        const headers = ['Customer Name', 'Last Purchase Date', 'Total Purchased', 'Total Paid', 'Outstanding Due'];
        const rows = customerAccountSummary.map(s => `"${s.customer.name}","${s.lastPurchaseDate || 'N/A'}",${s.totalPurchased},${s.totalPaid},${s.outstandingDue}`);
        const csv = [headers.join(','), ...rows].join('\n');
        const link = document.createElement("a");
        link.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
        link.download = generateDownloadFilename('customer-account-summary', 'csv');
        link.click();
    };

    const exportCustomerSummaryToSheets = () => {
        if (customerAccountSummary.length === 0) { showToast("No data to export.", 'error'); return; }
        const headers = ['Customer Name', 'Last Purchase Date', 'Total Purchased', 'Total Paid', 'Outstanding Due'];
        const rows = customerAccountSummary.map(s => [
            s.customer.name,
            s.lastPurchaseDate || 'N/A',
            s.totalPurchased.toString(),
            s.totalPaid.toString(),
            s.outstandingDue.toString()
        ]);
        handleSheetExport("Customer Account Summary", headers, rows);
    };

    // --- Supplier Reports Logic ---
    const uniqueSuppliers = useMemo(() => state.suppliers, [state.suppliers]);

    const supplierDues = useMemo(() => {
        return state.purchases
            .map(purchase => {
                const paid = (purchase.payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
                const dueAmount = Number(purchase.totalAmount) - paid;
                return { ...purchase, dueAmount };
            })
            .filter(p => p.dueAmount > 0.01 && (supplierFilter === 'all' || p.supplierId === supplierFilter))
            .map(purchase => {
                const supplier = state.suppliers.find(s => s.id === purchase.supplierId);
                const now = new Date();
                now.setHours(0, 0, 0, 0);

                const futureDueDates = (purchase.paymentDueDates || [])
                    .map(d => new Date(d))
                    .filter(d => d >= now)
                    .sort((a, b) => a.getTime() - b.getTime());

                let nextDueDate: string | null = null;
                if (futureDueDates.length > 0) {
                    nextDueDate = futureDueDates[0].toLocaleDateString('en-IN');
                } else {
                    const pastDueDates = (purchase.paymentDueDates || [])
                        .map(d => new Date(d))
                        .sort((a, b) => b.getTime() - a.getTime());
                    if (pastDueDates.length > 0) {
                        nextDueDate = `${pastDueDates[0].toLocaleDateString('en-IN')} (Overdue)`;
                    }
                }
                return { ...purchase, supplierName: supplier?.name || 'Unknown', nextDueDate };
            });
    }, [state.purchases, state.suppliers, supplierFilter]);

    const supplierAccountSummary = useMemo(() => {
        return state.suppliers.map(supplier => {
            const supplierPurchases = state.purchases.filter(p => p.supplierId === supplier.id);
            const totalPurchased = supplierPurchases.reduce((sum, p) => sum + Number(p.totalAmount), 0);
            const totalPaid = supplierPurchases.reduce((sum, p) => sum + (p.payments || []).reduce((pSum, payment) => pSum + Number(payment.amount), 0), 0);
            const outstandingDue = totalPurchased - totalPaid;
            return { supplier, totalPurchased, totalPaid, outstandingDue };
        });
    }, [state.suppliers, state.purchases]);

    const generateSupplierDuesPDF = async () => {
        if (supplierDues.length === 0) { showToast("No data to export.", 'error'); return; }

        try {
            const totalDue = supplierDues.reduce((sum, p) => sum + p.dueAmount, 0);
            const doc = await generateGenericReportPDF(
                "Supplier Dues Report",
                `Filter: Supplier=${supplierFilter === 'all' ? 'All' : state.suppliers.find(s => s.id === supplierFilter)?.name}`,
                ['Supplier', 'Purchase ID', 'Next Due Date', 'Due Amount'],
                supplierDues.map(p => [
                    p.supplierName,
                    p.id,
                    p.nextDueDate || 'N/A',
                    `Rs. ${p.dueAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                ]),
                [{ label: 'Total Payable', value: `Rs. ${totalDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, color: '#dc2626' }],
                state.profile,
                state.reportTemplate,
                state.customFonts
            );

            doc.save(generateDownloadFilename('Report_SupplierDues', 'pdf'));
        } catch (e) {
            console.error(e);
            showToast("Failed to generate PDF", 'error');
        }
    };

    const generateSupplierDuesCSV = () => {
        if (supplierDues.length === 0) { showToast("No data to export.", 'error'); return; }
        const headers = ['Supplier', 'Purchase ID', 'Next Due Date', 'Due Amount'];
        const rows = supplierDues.map(p => `"${p.supplierName}","${p.id}","${p.nextDueDate || 'N/A'}",${p.dueAmount}`);
        const csv = [headers.join(','), ...rows].join('\n');
        const link = document.createElement("a");
        link.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
        link.download = generateDownloadFilename('supplier-dues-report', 'csv');
        link.click();
    };

    const exportSupplierDuesToSheets = () => {
        if (supplierDues.length === 0) { showToast("No data to export.", 'error'); return; }
        const headers = ['Supplier', 'Purchase ID', 'Next Due Date', 'Due Amount'];
        const rows = supplierDues.map(p => [
            p.supplierName,
            p.id,
            p.nextDueDate || 'N/A',
            p.dueAmount.toString()
        ]);
        handleSheetExport("Supplier Dues Report", headers, rows);
    };

    const generateSupplierSummaryPDF = async () => {
        if (supplierAccountSummary.length === 0) { showToast("No data to export.", 'error'); return; }

        try {
            const doc = await generateGenericReportPDF(
                "Supplier Account Summary",
                `Generated on: ${new Date().toLocaleDateString()}`,
                ['Supplier Name', 'Total Purchased', 'Total Paid', 'Outstanding Due'],
                supplierAccountSummary.map(s => [
                    s.supplier.name,
                    `Rs. ${s.totalPurchased.toLocaleString('en-IN')}`,
                    `Rs. ${s.totalPaid.toLocaleString('en-IN')}`,
                    `Rs. ${s.outstandingDue.toLocaleString('en-IN')}`
                ]),
                [],
                state.profile,
                state.reportTemplate,
                state.customFonts
            );

            doc.save(generateDownloadFilename('Report_SupplierSummary', 'pdf'));
        } catch (e) {
            console.error(e);
            showToast("Failed to generate PDF", 'error');
        }
    };

    const generateSupplierSummaryCSV = () => {
        if (supplierAccountSummary.length === 0) { showToast("No data to export.", 'error'); return; }
        const headers = ['Supplier Name', 'Total Purchased', 'Total Paid', 'Outstanding Due'];
        const rows = supplierAccountSummary.map(s => `"${s.supplier.name}",${s.totalPurchased},${s.totalPaid},${s.outstandingDue}`);
        const csv = [headers.join(','), ...rows].join('\n');
        const link = document.createElement("a");
        link.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
        link.download = generateDownloadFilename('supplier-account-summary', 'csv');
        link.click();
    };

    const exportSupplierSummaryToSheets = () => {
        if (supplierAccountSummary.length === 0) { showToast("No data to export.", 'error'); return; }
        const headers = ['Supplier Name', 'Total Purchased', 'Total Paid', 'Outstanding Due'];
        const rows = supplierAccountSummary.map(s => [
            s.supplier.name,
            s.totalPurchased.toString(),
            s.totalPaid.toString(),
            s.outstandingDue.toString()
        ]);
        handleSheetExport("Supplier Account Summary", headers, rows);
    };

    // --- Low Stock Report Logic ---
    const lowStockItems = useMemo(() => {
        return state.products
            .filter(p => p.quantity < 5)
            .sort((a, b) => a.quantity - b.quantity);
    }, [state.products]);

    const generateLowStockPDF = async () => {
        if (lowStockItems.length === 0) { showToast("No low stock items found.", 'info'); return; }

        try {
            const doc = await generateGenericReportPDF(
                "Low Stock Reorder Report",
                "Items with quantity < 5",
                ['Product Name', 'Current Stock', 'Last Cost'],
                lowStockItems.map(p => [
                    p.name,
                    p.quantity.toString(),
                    `Rs. ${p.purchasePrice.toLocaleString('en-IN')}`
                ]),
                [],
                state.profile,
                state.reportTemplate,
                state.customFonts
            );

            doc.save(generateDownloadFilename('Report_LowStock', 'pdf'));
        } catch (e) {
            console.error(e);
            showToast("Failed to generate PDF", 'error');
        }
    };

    const exportLowStockToSheets = () => {
        if (lowStockItems.length === 0) { showToast("No low stock items found.", 'info'); return; }
        const headers = ['Product Name', 'Current Stock', 'Last Cost'];
        const rows = lowStockItems.map(p => [p.name, p.quantity.toString(), p.purchasePrice.toString()]);
        handleSheetExport("Low Stock Report", headers, rows);
    };

    const SheetButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
        <Button
            onClick={onClick}
            className="bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm border-transparent"
        >
            {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 mr-2" />}
            Sheets
        </Button>
    );

    // --- Mode Switching ---
    // We default to V2 for the new experience, but allow fallback
    const [reportMode, setReportMode] = useState<'STANDARD' | 'ENTERPRISE'>('ENTERPRISE');
    // Lazy load V2 to avoid circular dep issues in this file if any, though here it is fine.
    // If strict separation needed, we'd use React.Suspense but direct import is okay for now if ReportsPageV2 is a sibling.

    // We will conditionally render V2 if customized.
    // For now, let's keep the file simpler:

    // Check if we render V2
    if (reportMode === 'ENTERPRISE') {
        // We need to pass the toggle back to allow returning to legacy if needed
        return (
            <div className="space-y-4">
                <div className="flex justify-end px-4">
                    <Button onClick={() => setReportMode('STANDARD')} variant="secondary" className="text-xs">
                        Switch to Standard Reports
                    </Button>
                </div>
                <ReportsPageV2 />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                        <BarChart3 className="w-6 h-6" />
                    </div>
                    <h1 className="text-2xl font-bold text-primary">Standad Reports</h1>
                </div>
                <Button onClick={() => setReportMode('ENTERPRISE')} className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-none shadow-lg hover:shadow-xl hover:scale-105 transition-all">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Try Enterprise Reporting
                </Button>
            </div>

            <div className="border-b dark:border-slate-700">
                <nav className="-mb-px flex space-x-6 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('customer')}
                        className={`py-2 px-1 border-b-2 font-semibold flex items-center gap-2 ${activeTab === 'customer' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-500'}`}
                    >
                        <Users size={16} /> Customer Reports
                    </button>
                    <button
                        onClick={() => setActiveTab('supplier')}
                        className={`py-2 px-1 border-b-2 font-semibold flex items-center gap-2 ${activeTab === 'supplier' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-500'}`}
                    >
                        <Package size={16} /> Supplier Reports
                    </button>
                    <button
                        onClick={() => setActiveTab('stock')}
                        className={`py-2 px-1 border-b-2 font-semibold flex items-center gap-2 ${activeTab === 'stock' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-500'}`}
                    >
                        <AlertTriangle size={16} /> Inventory Reports
                    </button>
                    <button
                        onClick={() => setActiveTab('tax')}
                        className={`py-2 px-1 border-b-2 font-semibold flex items-center gap-2 ${activeTab === 'tax' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-500'}`}
                    >
                        <FileSpreadsheet size={16} /> Tax / GST
                    </button>
                </nav>
            </div>

            {activeTab === 'customer' && (
                <div className="animate-fade-in-fast space-y-6">
                    <Card title="Filters">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Filter by Area</label>
                                <div className="mt-1">
                                    <Dropdown
                                        options={[{ value: 'all', label: 'All Areas' }, ...uniqueAreas.map(area => ({ value: area, label: area }))]}
                                        value={areaFilter}
                                        onChange={setAreaFilter}
                                        searchable={true}
                                        searchPlaceholder="Search areas..."
                                        icon="search"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Filter by Dues Age</label>
                                <div className="mt-1">
                                    <Dropdown
                                        options={[
                                            { value: 'all', label: 'All Dues' },
                                            { value: '30', label: 'Older than 30 days' },
                                            { value: '60', label: 'Older than 60 days' },
                                            { value: '90', label: 'Older than 90 days' },
                                            { value: 'custom', label: 'Custom' },
                                        ]}
                                        value={duesAgeFilter}
                                        onChange={setDuesAgeFilter}
                                    />
                                </div>
                                {duesAgeFilter === 'custom' && (
                                    <FormattedNumberInput
                                        value={customDuesAge}
                                        onChange={e => setCustomDuesAge(e.target.value)}
                                        placeholder="Enter days"
                                        className="w-full p-2 border rounded-lg mt-2 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                    />
                                )}
                            </div>
                        </div>
                        <div className="text-right mt-4">
                            <Button onClick={() => { setAreaFilter('all'); setDuesAgeFilter('all'); setCustomDuesAge(''); }} variant="secondary" className="bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">
                                <XCircle className="w-4 h-4 mr-2" />
                                Clear Filters
                            </Button>
                        </div>
                    </Card>

                    <Card title="Customer Dues Report">
                        <div className="flex gap-2 mb-4">
                            <Button onClick={generateDuesPDF}><Download className="w-4 h-4 mr-2" /> PDF</Button>
                            <Button onClick={generateDuesCSV} variant="secondary"><Download className="w-4 h-4 mr-2" /> CSV</Button>
                            <SheetButton onClick={exportDuesToSheets} />
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-slate-700 dark:text-gray-300">
                                    <tr>
                                        <th className="px-4 py-3">Customer</th>
                                        <th className="px-4 py-3">Area</th>
                                        <th className="px-4 py-3">Last Paid</th>
                                        <th className="px-4 py-3 text-right">Due Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {customerDues.map(c => (
                                        <tr key={c.id} onClick={() => handleCustomerClick(c.id)} className="bg-white border-b dark:bg-slate-800 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer">
                                            <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{c.name}</td>
                                            <td className="px-4 py-3">{c.area}</td>
                                            <td className="px-4 py-3">{c.lastPaidDate || '-'}</td>
                                            <td className="px-4 py-3 text-right font-bold text-red-600 dark:text-red-400">₹{c.dueAmount.toLocaleString('en-IN')}</td>
                                        </tr>
                                    ))}
                                    {customerDues.length === 0 && <tr><td colSpan={4} className="px-4 py-3 text-center text-gray-500">No dues found matching filters.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    <Card title="Customer Account Summary">
                        <div className="flex gap-2 mb-4">
                            <Button onClick={generateCustomerSummaryPDF}><Download className="w-4 h-4 mr-2" /> PDF</Button>
                            <Button onClick={generateCustomerSummaryCSV} variant="secondary"><Download className="w-4 h-4 mr-2" /> CSV</Button>
                            <SheetButton onClick={exportCustomerSummaryToSheets} />
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-slate-700 dark:text-gray-300">
                                    <tr>
                                        <th className="px-4 py-3">Customer</th>
                                        <th className="px-4 py-3 text-right">Total Billed</th>
                                        <th className="px-4 py-3 text-right">Total Paid</th>
                                        <th className="px-4 py-3 text-right">Balance</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {customerAccountSummary.map(c => (
                                        <tr key={c.customer.id} onClick={() => handleCustomerClick(c.customer.id)} className="bg-white border-b dark:bg-slate-800 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer">
                                            <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{c.customer.name}</td>
                                            <td className="px-4 py-3 text-right">₹{c.totalPurchased.toLocaleString('en-IN')}</td>
                                            <td className="px-4 py-3 text-right text-green-600">₹{c.totalPaid.toLocaleString('en-IN')}</td>
                                            <td className={`px-4 py-3 text-right font-bold ${c.outstandingDue > 0 ? 'text-red-600' : 'text-gray-600'}`}>₹{c.outstandingDue.toLocaleString('en-IN')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {activeTab === 'supplier' && (
                <div className="animate-fade-in-fast space-y-6">
                    <Card title="Filters">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Filter by Supplier</label>
                            <div className="mt-1">
                                <Dropdown
                                    options={[{ value: 'all', label: 'All Suppliers' }, ...uniqueSuppliers.map(s => ({ value: s.id, label: s.name }))]}
                                    value={supplierFilter}
                                    onChange={setSupplierFilter}
                                    searchable={true}
                                />
                            </div>
                        </div>
                    </Card>

                    <Card title="Supplier Payables (Dues)">
                        <div className="flex gap-2 mb-4">
                            <Button onClick={generateSupplierDuesPDF}><Download className="w-4 h-4 mr-2" /> PDF</Button>
                            <Button onClick={generateSupplierDuesCSV} variant="secondary"><Download className="w-4 h-4 mr-2" /> CSV</Button>
                            <SheetButton onClick={exportSupplierDuesToSheets} />
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-slate-700 dark:text-gray-300">
                                    <tr>
                                        <th className="px-4 py-3">Supplier</th>
                                        <th className="px-4 py-3">Invoice / Next Due</th>
                                        <th className="px-4 py-3 text-right">Due Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {supplierDues.map((p, idx) => (
                                        <tr key={idx} className="bg-white border-b dark:bg-slate-800 dark:border-slate-700">
                                            <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{p.supplierName}</td>
                                            <td className="px-4 py-3">
                                                <div className="text-xs text-gray-500">Inv: {p.id}</div>
                                                <div>{p.nextDueDate || 'No Schedule'}</div>
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold text-red-600 dark:text-red-400">₹{p.dueAmount.toLocaleString('en-IN')}</td>
                                        </tr>
                                    ))}
                                    {supplierDues.length === 0 && <tr><td colSpan={3} className="px-4 py-3 text-center text-gray-500">No supplier dues found.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    <Card title="Supplier Account Summary">
                        <div className="flex gap-2 mb-4">
                            <Button onClick={generateSupplierSummaryPDF}><Download className="w-4 h-4 mr-2" /> PDF</Button>
                            <Button onClick={generateSupplierSummaryCSV} variant="secondary"><Download className="w-4 h-4 mr-2" /> CSV</Button>
                            <SheetButton onClick={exportSupplierSummaryToSheets} />
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-slate-700 dark:text-gray-300">
                                    <tr>
                                        <th className="px-4 py-3">Supplier</th>
                                        <th className="px-4 py-3 text-right">Total Purchased</th>
                                        <th className="px-4 py-3 text-right">Total Paid</th>
                                        <th className="px-4 py-3 text-right">Balance</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {supplierAccountSummary.map(s => (
                                        <tr key={s.supplier.id} className="bg-white border-b dark:bg-slate-800 dark:border-slate-700">
                                            <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{s.supplier.name}</td>
                                            <td className="px-4 py-3 text-right">₹{s.totalPurchased.toLocaleString('en-IN')}</td>
                                            <td className="px-4 py-3 text-right text-green-600">₹{s.totalPaid.toLocaleString('en-IN')}</td>
                                            <td className={`px-4 py-3 text-right font-bold ${s.outstandingDue > 0 ? 'text-red-600' : 'text-gray-600'}`}>₹{s.outstandingDue.toLocaleString('en-IN')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {activeTab === 'stock' && (
                <div className="animate-fade-in-fast space-y-6">
                    <Card title="Low Stock Report (Reorder)">
                        <div className="flex gap-2 mb-4">
                            <Button onClick={generateLowStockPDF}><Download className="w-4 h-4 mr-2" /> PDF</Button>
                            <SheetButton onClick={exportLowStockToSheets} />
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-slate-700 dark:text-gray-300">
                                    <tr>
                                        <th className="px-4 py-3">Product Name</th>
                                        <th className="px-4 py-3 text-center">Current Stock</th>
                                        <th className="px-4 py-3 text-right">Last Purchase Price</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lowStockItems.map(p => (
                                        <tr key={p.id} className="bg-white border-b dark:bg-slate-800 dark:border-slate-700">
                                            <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{p.name}</td>
                                            <td className="px-4 py-3 text-center font-bold text-red-600">{p.quantity}</td>
                                            <td className="px-4 py-3 text-right">₹{p.purchasePrice.toLocaleString('en-IN')}</td>
                                        </tr>
                                    ))}
                                    {lowStockItems.length === 0 && <tr><td colSpan={3} className="px-4 py-3 text-center text-gray-500">Stock is healthy (No items &lt; 5).</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {activeTab === 'tax' && (
                <div className="animate-fade-in-fast space-y-6">
                    <Card title="GST Filing Period">
                        <div className="flex items-end gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Month</label>
                                <input
                                    type="month"
                                    value={gstMonth}
                                    onChange={(e) => setGstMonth(e.target.value)}
                                    className="p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                />
                            </div>
                            <div className="pb-2 text-sm text-gray-500">
                                Showing data for: <span className="font-bold text-gray-800 dark:text-gray-200">{new Date(gstMonth + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</span>
                            </div>
                        </div>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow border border-indigo-100 dark:border-slate-700">
                            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Tax Liability</h3>
                            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">₹{gstData.totalTax.toLocaleString('en-IN')}</p>
                            <p className="text-xs text-gray-400 mt-2">IGST + CGST + SGST</p>
                        </div>
                        <div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow border border-blue-100 dark:border-slate-700">
                            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">B2B Invoices</h3>
                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{gstData.b2b.length}</p>
                            <p className="text-xs text-gray-400 mt-2">Registered Customers</p>
                        </div>
                        <div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow border border-green-100 dark:border-slate-700">
                            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Sales Value</h3>
                            <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">₹{gstData.totalValue.toLocaleString('en-IN')}</p>
                            <p className="text-xs text-gray-400 mt-2">Taxable + Tax</p>
                        </div>
                    </div>

                    <Card title="GSTR-1 Actions">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <h4 className="font-bold flex items-center gap-2 mb-2">
                                    <FileSpreadsheet className="text-green-600" size={20} />
                                    B2B CSV (GSTR-1)
                                </h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Export list of invoices for registered customers (with GSTIN) in GSTR-1 format.</p>
                                <Button onClick={handleExportGSTR1_B2B} disabled={gstData.b2b.length === 0}>
                                    Download B2B CSV
                                </Button>
                            </div>

                            <div className="p-4 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <h4 className="font-bold flex items-center gap-2 mb-2">
                                    <FileSpreadsheet className="text-blue-600" size={20} />
                                    Sales Register
                                </h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Export comprehensive list of all monthly sales with tax breakdown for auditor.</p>
                                <Button onClick={handleExportSalesRegister} disabled={gstData.all.length === 0}>
                                    Download Full Register
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default ReportsPage;
