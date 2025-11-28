
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Purchase, Supplier, Product, PurchaseItem } from '../types';
import { Plus, Info, X, Camera, Sparkles, Loader2 } from 'lucide-react';
import Card from './Card';
import Button from './Button';
import DeleteButton from './DeleteButton';
import DateInput from './DateInput';
import Dropdown from './Dropdown';
import { compressImage } from '../utils/imageUtils';
import { GoogleGenAI } from "@google/genai";

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface PurchaseFormProps {
  mode: 'add' | 'edit';
  initialData?: Purchase | null;
  suppliers: Supplier[];
  products: Product[];
  onSubmit: (purchase: Purchase) => void;
  onBack: () => void;
  setIsDirty: (isDirty: boolean) => void;
  dispatch: React.Dispatch<any>;
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export const PurchaseForm: React.FC<PurchaseFormProps> = ({
  mode,
  initialData,
  suppliers,
  products,
  onSubmit,
  onBack,
  setIsDirty,
  dispatch,
  showToast
}) => {
  const [supplierId, setSupplierId] = useState(initialData?.supplierId || '');
  const [items, setItems] = useState<PurchaseItem[]>(initialData?.items || []);
  const [purchaseDate, setPurchaseDate] = useState(initialData ? getLocalDateString(new Date(initialData.date)) : getLocalDateString());
  const [supplierInvoiceId, setSupplierInvoiceId] = useState(initialData?.supplierInvoiceId || '');
  const [discount, setDiscount] = useState('0');
  const [paymentDueDates, setPaymentDueDates] = useState<string[]>(initialData?.paymentDueDates || []);
  
  const [isAddingSupplier, setIsAddingSupplier] = useState(false);
  
  // AI Scanning State
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const calculations = useMemo(() => {
    const totalItemValue = items.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
    const totalGst = items.reduce((sum, item) => {
        const itemTotal = Number(item.price) * Number(item.quantity);
        const gstPercent = Number.isFinite(item.gstPercent) ? item.gstPercent : 0;
        const itemGst = itemTotal - (itemTotal / (1 + (gstPercent / 100)));
        return sum + itemGst;
    }, 0);
    const subTotal = totalItemValue - totalGst;
    const discountVal = parseFloat(discount) || 0;
    const grandTotal = totalItemValue - discountVal;
    return { subTotal, totalGst, grandTotal };
  }, [items, discount]);

  const handleItemUpdate = (productId: string, field: keyof PurchaseItem, value: string | number) => {
    setItems(items.map(item => item.productId === productId ? { ...item, [field]: value } : item));
  };
  
  const handleItemRemove = (productId: string) => {
    setItems(items.filter(item => item.productId !== productId));
  };

  const handleScanInvoice = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || !e.target.files[0]) return;

      setIsScanning(true);
      try {
          const file = e.target.files[0];
          const base64Full = await compressImage(file, 1024, 0.8);
          const base64Data = base64Full.split(',')[1];
          const mimeType = base64Full.split(';')[0].split(':')[1];

          const apiKey = process.env.API_KEY;
          if (!apiKey) throw new Error("API Key not configured");

          const ai = new GoogleGenAI({ apiKey });
          
          const prompt = `Analyze this purchase invoice image. Extract the list of items purchased. 
          For each item, try to identify:
          1. Product Name (be specific)
          2. Quantity (number)
          3. Unit Price (purchase price per unit)
          4. Total Amount for that line item
          
          Return a JSON object with this structure:
          {
            "items": [
                { "name": "string", "quantity": number, "price": number }
            ],
            "invoiceDate": "YYYY-MM-DD" (optional),
            "invoiceNumber": "string" (optional)
          }
          
          If date or invoice number are visible, extract them too. Do not include currency symbols in numbers.`;

          const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: {
                  parts: [
                      { inlineData: { mimeType, data: base64Data } },
                      { text: prompt }
                  ]
              }
          });

          const text = response.text || '';
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          
          if (jsonMatch) {
              const data = JSON.parse(jsonMatch[0]);
              
              if (data.invoiceDate) setPurchaseDate(data.invoiceDate);
              if (data.invoiceNumber) setSupplierInvoiceId(data.invoiceNumber);

              if (data.items && Array.isArray(data.items)) {
                  const newItems: PurchaseItem[] = data.items.map((item: any) => ({
                      productId: `TEMP-${Date.now()}-${Math.floor(Math.random()*1000)}`, // Temp ID
                      productName: item.name || "Unknown Item",
                      quantity: Number(item.quantity) || 1,
                      price: Number(item.price) || 0,
                      saleValue: (Number(item.price) || 0) * 1.3, // Default 30% margin
                      gstPercent: 0
                  }));
                  
                  setItems(prev => [...prev, ...newItems]);
                  showToast(`Scanned ${newItems.length} items successfully!`, 'success');
              }
          } else {
              throw new Error("Could not interpret AI response");
          }

      } catch (error) {
          console.error("Scanning failed", error);
          showToast("Failed to scan invoice. Please enter details manually.", 'error');
      } finally {
          setIsScanning(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  const handleSubmit = () => {
      if (!supplierId) {
          showToast("Please select a supplier", "info");
          return;
      }
      if (items.length === 0) {
          showToast("Please add at least one item", "info");
          return;
      }

      onSubmit({
          id: initialData?.id || `PUR-${Date.now()}`,
          supplierId,
          items,
          totalAmount: calculations.grandTotal,
          date: new Date(purchaseDate).toISOString(),
          supplierInvoiceId,
          payments: initialData?.payments || [],
          paymentDueDates
      });
  };

  return (
    <div className="space-y-4">
      <Button onClick={onBack}>&larr; Back</Button>
      <Card title={mode === 'add' ? 'Create New Purchase' : `Edit Purchase`}>
         <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Select Supplier</label>
                    <div className="flex gap-3 items-center">
                        <Dropdown
                            options={suppliers.map(s => ({ value: s.id, label: s.name }))}
                            value={supplierId}
                            onChange={setSupplierId}
                            searchable={true}
                        />
                        <Button onClick={() => setIsAddingSupplier(true)} variant="secondary" className="aspect-square"><Plus size={20}/></Button>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Supplier Invoice No.</label>
                    <input 
                        type="text" 
                        value={supplierInvoiceId} 
                        onChange={e => setSupplierInvoiceId(e.target.value)} 
                        className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                        placeholder="e.g. INV-9928"
                    />
                </div>
            </div>
            <DateInput label="Purchase Date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} />
         </div>
      </Card>

      <Card title="Items">
        <div className="space-y-4">
            {/* AI Action Bar */}
            <div className="flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg border border-indigo-100 dark:border-indigo-800">
                <div className="flex items-center gap-2">
                    <Sparkles className="text-indigo-600 dark:text-indigo-400" size={18} />
                    <span className="text-sm font-medium text-indigo-800 dark:text-indigo-200">
                        {isScanning ? 'Analyzing Invoice...' : 'Auto-fill from Invoice Image'}
                    </span>
                </div>
                <button 
                    onClick={() => fileInputRef.current?.click()} 
                    disabled={isScanning}
                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded shadow-sm disabled:opacity-50 transition-colors"
                >
                    {isScanning ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                    Scan Invoice
                </button>
                <input 
                    type="file" 
                    accept="image/*" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleScanInvoice} 
                />
            </div>

            <div className="space-y-2">
            {items.map(item => (
                <div key={item.productId} className="bg-gray-50 dark:bg-slate-700/50 rounded border dark:border-slate-700 overflow-hidden animate-slide-up-fade">
                    <div className="p-2 flex justify-between items-start">
                        <div className="flex-grow">
                            <input 
                                type="text" 
                                value={item.productName} 
                                onChange={e => handleItemUpdate(item.productId, 'productName', e.target.value)}
                                className="font-semibold bg-transparent border-none p-0 focus:ring-0 w-full dark:text-white placeholder-gray-400"
                                placeholder="Product Name"
                            />
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">{item.productId}</p>
                        </div>
                        <div className="flex gap-2">
                            <DeleteButton variant="remove" onClick={() => handleItemRemove(item.productId)} />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm p-2 border-t dark:border-slate-600">
                        <div>
                            <label className="text-[10px] text-gray-500 block">Quantity</label>
                            <input type="number" value={item.quantity} onChange={e => handleItemUpdate(item.productId, 'quantity', parseFloat(e.target.value))} className="w-full p-1 border rounded dark:bg-slate-800 dark:border-slate-600 dark:text-white" placeholder="Qty" />
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-500 block">Buy Price</label>
                            <input type="number" value={item.price} onChange={e => handleItemUpdate(item.productId, 'price', parseFloat(e.target.value))} className="w-full p-1 border rounded dark:bg-slate-800 dark:border-slate-600 dark:text-white" placeholder="Buy Price" />
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-500 block">Sale Price</label>
                            <input type="number" value={item.saleValue} onChange={e => handleItemUpdate(item.productId, 'saleValue', parseFloat(e.target.value))} className="w-full p-1 border rounded dark:bg-slate-800 dark:border-slate-600 dark:text-white" placeholder="Sale Price" />
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-500 block">GST %</label>
                            <input type="number" value={item.gstPercent} onChange={e => handleItemUpdate(item.productId, 'gstPercent', parseFloat(e.target.value))} className="w-full p-1 border rounded dark:bg-slate-800 dark:border-slate-600 dark:text-white" placeholder="GST %" />
                        </div>
                        <div className="flex flex-col justify-end">
                            <div className="p-1 text-right font-bold dark:text-white">₹{(item.quantity * item.price).toLocaleString()}</div>
                        </div>
                    </div>
                </div>
            ))}
            
            <Button onClick={() => setItems([...items, { productId: `NEW-${Date.now()}`, productName: '', quantity: 1, price: 0, saleValue: 0, gstPercent: 0 }])} variant="secondary" className="w-full border-dashed border-2">
                <Plus size={16} className="mr-2" /> Add Item Manually
            </Button>
            </div>
        </div>
      </Card>
      
      <Card title="Total">
          <div className="text-right text-2xl font-bold text-primary">₹{calculations.grandTotal.toLocaleString()}</div>
      </Card>

      <Button onClick={handleSubmit} className="w-full py-3 text-lg font-bold shadow-lg">Complete Purchase</Button>
    </div>
  );
};
