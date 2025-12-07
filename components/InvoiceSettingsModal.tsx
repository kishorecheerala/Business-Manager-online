import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save } from 'lucide-react';
import Card from './Card';
import Button from './Button';
import { useAppContext } from '../context/AppContext';

interface InvoiceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const InvoiceSettingsModal: React.FC<InvoiceSettingsModalProps> = ({ isOpen, onClose }) => {
  const { state, dispatch, showToast } = useAppContext();
  const [terms, setTerms] = useState('');
  const [footer, setFooter] = useState('');
  const [showQr, setShowQr] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setTerms(state.invoiceSettings?.terms || '');
      setFooter(state.invoiceSettings?.footer || 'Thank you for your business!');
      setShowQr(state.invoiceSettings?.showQr ?? true);
      document.body.style.overflow = 'hidden';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen, state.invoiceSettings]);

  const handleSave = () => {
    dispatch({
      type: 'UPDATE_INVOICE_SETTINGS',
      payload: { terms, footer, showQr }
    });
    showToast('Invoice settings updated');
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div 
        className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in-fast" onClick={onClose} />
      <Card className="relative z-10 w-full max-w-md animate-scale-in">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-primary">Invoice Settings</h2>
          <button onClick={onClose} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Terms & Conditions</label>
            <textarea
              rows={4}
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              placeholder="e.g., No returns after 7 days. Goods once sold cannot be taken back."
              className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Footer Message</label>
            <input
              type="text"
              value={footer}
              onChange={(e) => setFooter(e.target.value)}
              placeholder="e.g., Thank you! Visit Again."
              className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="showQr"
              checked={showQr}
              onChange={(e) => setShowQr(e.target.checked)}
              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <label htmlFor="showQr" className="text-sm font-medium text-gray-700 dark:text-gray-300">Show QR Code on Invoice</label>
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} className="w-full">
              <Save size={16} className="mr-2" /> Save Settings
            </Button>
            <Button onClick={onClose} variant="secondary" className="w-full">
              Cancel
            </Button>
          </div>
        </div>
      </Card>
    </div>,
    document.body
  );
};

export default InvoiceSettingsModal;