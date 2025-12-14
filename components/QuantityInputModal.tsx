import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Card from './Card';
import Button from './Button';
import FormattedNumberInput from './FormattedNumberInput'; // Added import
import { Product } from '../types';
import { X } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

interface QuantityInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (quantity: number) => void;
  product: Product | null;
}

const QuantityInputModal: React.FC<QuantityInputModalProps> = ({ isOpen, onClose, onSubmit, product }) => {
  const { showToast } = useAppContext();
  const [quantity, setQuantity] = useState(1); // Changed initial state to number
  // inputRef is no longer directly used for focus, autoFocus prop is used on FormattedNumberInput

  useEffect(() => {
    if (isOpen) {
      setQuantity(1); // Reset quantity when modal opens
      // Autofocus is handled by FormattedNumberInput's autoFocus prop
      document.body.style.overflow = 'hidden';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen || !product) return null;

  const handleSubmit = () => {
    if (quantity > 0) { // quantity is already a number due to FormattedNumberInput
      onSubmit(quantity);
    } else {
      showToast('Please enter a valid quantity.', 'error');
    }
  };

  // handleKeyPress is no longer needed as FormattedNumberInput handles its own input
  // and the submit logic is tied to the button or external trigger.

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/50 animate-fade-in-fast" onClick={onClose} />
      <Card className="relative z-10 w-full max-w-sm animate-scale-in">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-primary">Enter Quantity</h2>
          <button onClick={onClose} className="p-2 -mr-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="space-y-4 mt-4">
          <p className="font-semibold dark:text-white">{product.name}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Current stock: {product.quantity}</p>
          <div>
            <label htmlFor="quantity-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Quantity</label>
            <FormattedNumberInput
              id="quantity-input"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              autoFocus
              placeholder="Enter quantity"
              min={1}
              className="w-full py-3 border rounded mt-1 text-center text-lg dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSubmit} className="w-full">Add to Purchase</Button>
            <Button onClick={onClose} variant="secondary" className="w-full">Cancel</Button>
          </div>
        </div>
      </Card>
    </div>,
    document.body
  );
};

export default QuantityInputModal;