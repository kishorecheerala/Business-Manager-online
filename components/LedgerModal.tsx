import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, FileText, Download, FileSpreadsheet } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { generateGenericReportPDF } from '../utils/pdfGenerator';
import { exportReportToSheet } from '../utils/googleSheets';
import Button from './Button';
import Card from './Card';

interface LedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  partyId: string;
  partyType: 'CUSTOMER' | 'SUPPLIER';
}

interface LedgerEntry {
  date: string;
  id: string;
  type: 'INVOICE' | 'PAYMENT' | 'RETURN' | 'OPENING';
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

const LedgerModal: React.FC<LedgerModalProps> = ({ isOpen, onClose, partyId, partyType }) => {
  const { state, showToast } = useAppContext();
  const [isExporting, setIsExporting] = useState(false);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const party = useMemo(() => {
    if (partyType === 'CUSTOMER') {
      return state.customers.find((c) => c.id === partyId);
    }
    return state.suppliers.find((s) => s.id === partyId);
  }, [partyId, partyType, state.customers, state.suppliers]);

  const ledgerData = useMemo(() => {
    const entries: LedgerEntry[] = [];

    if (partyType === 'CUSTOMER') {
      // Sales (Debit)
      state.sales
        .filter((s) => s.customerId === partyId)
        .forEach((sale) => {
          entries.push({
            date: sale.date,
            id: sale.id,
            type: 'INVOICE',
            description: `Sale Invoice (${sale.items.length} items)`,
            debit: Number(sale.totalAmount),
            credit: 0,
            balance: 0,
          });
        });

      // Payments (Credit)
      state.sales
        .filter((s) => s.customerId === partyId)
        .forEach((sale) => {
          sale.payments.forEach((pay) => {
            entries.push({
              date: pay.date,
              id: pay.id,
              type: 'PAYMENT',
              description: `Payment via ${pay.method}`,
              debit: 0,
              credit: Number(pay.amount),
              balance: 0,
            });
          });
        });

      // Returns (Credit)
      state.returns
        .filter((r) => r.type === 'CUSTOMER' && r.partyId === partyId)
        .forEach((ret) => {
          entries.push({
            date: ret.returnDate,
            id: ret.id,
            type: 'RETURN',
            description: `Return Credit (${ret.reason || 'No Reason'})`,
            debit: 0,
            credit: Number(ret.amount),
            balance: 0,
          });
        });
    } else {
      // SUPPLIER
      state.purchases
        .filter((p) => p.supplierId === partyId)
        .forEach((purchase) => {
          entries.push({
            date: purchase.date,
            id: purchase.id,
            type: 'INVOICE',
            description: `Purchase Invoice ${purchase.supplierInvoiceId ? `Ref: ${purchase.supplierInvoiceId}` : ''}`,
            debit: 0,
            credit: Number(purchase.totalAmount),
            balance: 0,
          });
        });

      state.purchases
        .filter((p) => p.supplierId === partyId)
        .forEach((purchase) => {
          purchase.payments.forEach((pay) => {
            entries.push({
              date: pay.date,
              id: pay.id,
              type: 'PAYMENT',
              description: `Paid via ${pay.method}`,
              debit: Number(pay.amount),
              credit: 0,
              balance: 0,
            });
          });
        });

      state.returns
        .filter((r) => r.type === 'SUPPLIER' && r.partyId === partyId)
        .forEach((ret) => {
          entries.push({
            date: ret.returnDate,
            id: ret.id,
            type: 'RETURN',
            description: `Debit Note (${ret.reason || 'Return'})`,
            debit: Number(ret.amount),
            credit: 0,
            balance: 0,
          });
        });
    }

    // Sort by Date
    entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate Running Balance
    let balance = 0;
    entries.forEach((entry) => {
      if (partyType === 'CUSTOMER') {
        balance += entry.debit - entry.credit;
      } else {
        balance += entry.credit - entry.debit;
      }
      entry.balance = balance;
    });

    return entries;
  }, [partyId, partyType, state.sales, state.purchases, state.returns]);

  const totalDebit = ledgerData.reduce((sum, e) => sum + e.debit, 0);
  const totalCredit = ledgerData.reduce((sum, e) => sum + e.credit, 0);
  const closingBalance = ledgerData.length > 0 ? ledgerData[ledgerData.length - 1].balance : 0;

  const handleDownloadPDF = async () => {
    try {
      const title = partyType === 'CUSTOMER' ? 'Customer Statement' : 'Supplier Ledger';
      const subtitle = `Statement for: ${party?.name || 'Unknown'}`;
      const headers = ['Date', 'Ref', 'Description', 'Debit', 'Credit', 'Balance'];
      const rows = ledgerData.map((e) => [
        new Date(e.date).toLocaleDateString(),
        e.id,
        e.description,
        e.debit ? e.debit.toLocaleString() : '-',
        e.credit ? e.credit.toLocaleString() : '-',
        e.balance.toLocaleString(),
      ]);

      const summary = [
        { label: 'Total Debit', value: totalDebit.toLocaleString() },
        { label: 'Total Credit', value: totalCredit.toLocaleString() },
        {
          label: 'Closing Balance',
          value: closingBalance.toLocaleString(),
          color: closingBalance > 0 ? '#dc2626' : '#16a34a',
        },
      ];

      const doc = await generateGenericReportPDF(
        title,
        subtitle,
        headers,
        rows,
        summary,
        state.profile,
        state.reportTemplate,
        state.customFonts
      );
      doc.save(`Statement_${party?.name.replace(/[^a-z0-9]/gi, '_')}.pdf`);
    } catch (e) {
      console.error(e);
      showToast('Failed to generate statement', 'error');
    }
  };

  const handleExportSheets = async () => {
    if (!state.googleUser?.accessToken) {
      showToast('Sign in with Google required for Sheets export.', 'info');
      return;
    }

    setIsExporting(true);
    try {
      const title = `${partyType === 'CUSTOMER' ? 'Customer' : 'Supplier'} Statement - ${party?.name}`;
      const headers = ['Date', 'Transaction ID', 'Type', 'Description', 'Debit', 'Credit', 'Running Balance'];
      const rows = ledgerData.map((e) => [
        new Date(e.date).toLocaleDateString(),
        e.id,
        e.type,
        e.description,
        e.debit.toString(),
        e.credit.toString(),
        e.balance.toString(),
      ]);

      rows.push(['', '', '', 'TOTALS', totalDebit.toString(), totalCredit.toString(), closingBalance.toString()]);

      const url = await exportReportToSheet(
        state.googleUser.accessToken,
        title,
        headers,
        rows
      );
      window.open(url, '_blank');
      showToast('Statement exported to Google Sheets!', 'success');
    } catch (e) {
      console.error(e);
      showToast('Export failed.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen || !party) return null;

  // Use Portal to render at body level, bypassing parent z-index contexts
  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in-fast"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <Card className="relative z-10 w-full max-w-4xl h-full sm:h-[85vh] flex flex-col p-0 overflow-hidden animate-scale-in border-none shadow-2xl rounded-none sm:rounded-lg bg-white dark:bg-slate-900">
        {/* Header */}
        <div className="bg-slate-800 text-white p-4 flex justify-between items-center shrink-0">
          <div>
            <h2 className="font-bold text-lg flex items-center gap-2">
              <FileText size={20} className="text-yellow-400" />
              {party.name}
            </h2>
            <p className="text-xs text-slate-400">Statement of Accounts</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="bg-gray-100 dark:bg-slate-700/50 p-3 border-b dark:border-slate-700 flex justify-between items-center flex-wrap gap-2 shrink-0">
          <div className="flex gap-4 text-sm">
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 dark:text-gray-400">Total Debit</span>
              <span className="font-bold text-gray-800 dark:text-gray-200">
                ₹{totalDebit.toLocaleString()}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 dark:text-gray-400">Total Credit</span>
              <span className="font-bold text-gray-800 dark:text-gray-200">
                ₹{totalCredit.toLocaleString()}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 dark:text-gray-400">Closing Bal.</span>
              <span
                className={`font-bold text-lg ${
                  closingBalance > 0 ? 'text-red-600' : 'text-green-600'
                }`}
              >
                ₹{closingBalance.toLocaleString()}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleExportSheets}
              variant="secondary"
              className="h-8 text-xs bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
              disabled={isExporting}
            >
              <FileSpreadsheet size={14} className="mr-2" />
              {isExporting ? 'Exporting...' : 'Sheets'}
            </Button>
            <Button onClick={handleDownloadPDF} variant="secondary" className="h-8 text-xs">
              <Download size={14} className="mr-2" /> PDF
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-grow overflow-auto bg-white dark:bg-slate-900 custom-scrollbar">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-slate-800 dark:text-gray-300 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Ref ID</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 text-right">Debit</th>
                <th className="px-4 py-3 text-right">Credit</th>
                <th className="px-4 py-3 text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {ledgerData.map((entry, idx) => (
                <tr
                  key={idx}
                  className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                    {new Date(entry.date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-gray-500 dark:text-gray-500">
                    {entry.id}
                  </td>
                  <td className="px-4 py-2 text-gray-800 dark:text-gray-200 max-w-xs truncate">
                    <div className="flex items-center gap-2">
                      {entry.type === 'INVOICE' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                      )}
                      {entry.type === 'PAYMENT' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                      )}
                      {entry.type === 'RETURN' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                      )}
                      {entry.description}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-right font-medium text-gray-700 dark:text-gray-300">
                    {entry.debit > 0 ? entry.debit.toLocaleString() : '-'}
                  </td>
                  <td className="px-4 py-2 text-right font-medium text-gray-700 dark:text-gray-300">
                    {entry.credit > 0 ? entry.credit.toLocaleString() : '-'}
                  </td>
                  <td className="px-4 py-2 text-right font-bold text-gray-800 dark:text-gray-100 bg-gray-50/50 dark:bg-slate-800/30">
                    {entry.balance.toLocaleString()}
                  </td>
                </tr>
              ))}
              {ledgerData.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">
                    No transactions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>,
    document.body
  );
};

export default LedgerModal;