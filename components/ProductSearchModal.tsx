import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, X } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Product } from '../types';
import Card from './Card';

interface ProductSearchModalProps {
  products: Product[];
  onClose: () => void;
  onSelect: (product: Product) => void;
}

const ProductSearchModal: React.FC<ProductSearchModalProps> = ({ products, onClose, onSelect }) => {
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const parentRef = useRef<HTMLDivElement>(null);

  const filteredProducts = useMemo(() => {
    const lowerTerm = productSearchTerm.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(lowerTerm) ||
      p.id.toLowerCase().includes(lowerTerm)
    );
  }, [products, productSearchTerm]);

  const rowVirtualizer = useVirtualizer({
    count: filteredProducts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72, // Approximate height of each row including margin/padding
    overscan: 5,
  });

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in-fast" onClick={onClose} />
      <Card className="relative z-10 w-full max-w-lg animate-scale-in">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Select Product</h2>
          <button onClick={onClose} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search products..."
            value={productSearchTerm}
            onChange={e => setProductSearchTerm(e.target.value)}
            className="w-full p-2 pl-10 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
            autoFocus
          />
        </div>
        <div
          ref={parentRef}
          className="mt-4 max-h-80 overflow-y-auto space-y-2"
          style={{
            height: '320px', // Explicit height for virtualizer
            contain: 'strict',
          }}
        >
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const p = filteredProducts[virtualRow.index];
              return (
                <div
                  key={p.id}
                  onClick={() => onSelect(p)}
                  className="absolute top-0 left-0 w-full p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg cursor-pointer hover:bg-teal-50 dark:hover:bg-slate-700 flex justify-between items-center transition-colors"
                  style={{
                    transform: `translateY(${virtualRow.start}px)`,
                    height: `${virtualRow.size}px`, // Using dynamic size estimate
                    // Adjusting padding/margin within the item height or use gap in parent (gap is harder with absolute)
                    // We will include margin in the item sizing or just padding
                  }}
                >
                  <div>
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Code: {p.id}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">₹{Number(p.salePrice).toLocaleString('en-IN')}</p>
                    <p className="text-sm">Stock: {p.quantity}</p>
                  </div>
                </div>
              );
            })}
          </div>
          {filteredProducts.length === 0 && <p className="text-center text-gray-500 pt-10">No products found.</p>}
        </div>
      </Card>
    </div>,
    document.body
  );
};

export default ProductSearchModal;