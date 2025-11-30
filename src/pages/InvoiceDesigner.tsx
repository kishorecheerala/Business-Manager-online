
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Save, RotateCcw, Type, Layout, Palette, FileText, Edit3, ChevronDown, Upload, Trash2, Wand2, Grid, QrCode, Printer, Eye, ArrowLeft, CheckSquare, Square, Type as TypeIcon, AlignLeft, AlignCenter, AlignRight, Move, GripVertical, Layers, ArrowUp, ArrowDown, Table, Monitor, Loader2, ZoomIn, ZoomOut, ExternalLink, Columns, Download, FileJson, Image as ImageIcon, Plus, Landmark, Calendar, Coins, Zap, RotateCw, MoveHorizontal, MoveVertical, ArrowRight as ArrowRightIcon, Circle } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { InvoiceTemplateConfig, DocumentType, InvoiceLabels, CustomFont, ProfileData, Page } from '../types';
import Button from '../components/Button';
import ColorPickerModal from '../components/ColorPickerModal';
import { generateA4InvoicePdf, generateEstimatePDF, generateDebitNotePDF, generateReceiptPDF, generateGenericReportPDF } from '../utils/pdfGenerator';
import { compressImage } from '../utils/imageUtils';
import * as pdfjsLib from 'pdfjs-dist';
import { useDialog } from '../context/DialogContext';

// Fix for PDF.js import structure in Vite/ESM environments
const pdfjs = (pdfjsLib as any).default || pdfjsLib;

// Setup PDF.js worker
if (pdfjs.GlobalWorkerOptions) {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;
}

// --- Dummy Data for Previews ---
const dummyCustomer = {
    id: 'CUST-001',
    name: 'John Doe Enterprises',
    phone: '9876543210',
    address: '123 Business Park, Tech City, Hyderabad, Telangana 500081',
    area: 'Tech City',
    reference: 'Walk-in'
};

const dummySale = {
    id: 'INV-2023-001',
    customerId: 'CUST-001',
    items: [
        { productId: 'P1', productName: 'Premium Silk Saree - Kanchipuram', quantity: 2, price: 4500, gstPercent: 5 },
        { productId: 'P2', productName: 'Cotton Kurti', quantity: 5, price: 850, gstPercent: 5 },
        { productId: 'P3', productName: 'Designer Blouse - Gold', quantity: 3, price: 1200, gstPercent: 12 }
    ],
    discount: 500,
    gstAmount: 1250,
    totalAmount: 16350,
    date: new Date().toISOString(),
    payments: [{ id: 'PAY-1', amount: 5000, date: new Date().toISOString(), method: 'UPI' as const }]
};

// --- Report Dummy Data Scenarios ---
const REPORT_SCENARIOS = {
    'SALES_REPORT': {
        title: "Sales Report",
        subtitle: "Summary of monthly performance",
        headers: ['Item Name', 'Category', 'Qty', 'Amount'],
        data: [['Silk Saree', 'Apparel', '10', '45,000'], ['Cotton Shirt', 'Apparel', '25', '12,500'], ['Gold Jewellery', 'Accessories', '2', '80,000']],
        summary: [{ label: 'Total Sales', value: 'Rs. 1,37,500' }]
    },
    'CUSTOMER_DUES': {
        title: "Customer Dues Summary",
        subtitle: "Statement For: John Doe Enterprises",
        headers: ['Invoice ID', 'Date', 'Total', 'Paid', 'Due'],
        data: [
            ['INV-001', '01/10/2023', 'Rs. 15,000', 'Rs. 5,000', 'Rs. 10,000'],
            ['INV-005', '15/10/2023', 'Rs. 8,500', 'Rs. 0', 'Rs. 8,500'],
            ['INV-012', '20/10/2023', 'Rs. 22,000', 'Rs. 10,000', 'Rs. 12,000']
        ],
        summary: [{ label: 'Total Outstanding Due', value: 'Rs. 30,500', color: '#dc2626' }]
    },
    'LOW_STOCK': {
        title: "Low Stock Reorder Report",
        subtitle: "Items with quantity < 5",
        headers: ['Product Name', 'Current Stock', 'Last Cost'],
        data: [
            ['Blue Cotton Saree', '2', 'Rs. 800'],
            ['Kids Wear Set - Red', '0', 'Rs. 450'],
            ['Silk Scarf', '4', 'Rs. 300']
        ],
        summary: []
    }
};

type ReportScenarioKey = keyof typeof REPORT_SCENARIOS;

interface ExtendedLayoutConfig extends InvoiceTemplateConfig {
    layout: InvoiceTemplateConfig['layout'] & {
        sectionOrdering: string[];
        uppercaseHeadings?: boolean;
        boldBorders?: boolean;
        columnWidths?: { qty?: number; rate?: number; amount?: number; }; 
        tablePadding?: number; 
        tableHeaderAlign?: 'left' | 'center' | 'right';
        borderRadius?: number;
    };
}

// --- Templates Presets ---
const PRESETS: Record<string, any> = {
    'Modern': {
        colors: { primary: '#0f172a', secondary: '#64748b', text: '#334155', tableHeaderBg: '#f1f5f9', tableHeaderText: '#0f172a', borderColor: '#e2e8f0', alternateRowBg: '#f8fafc' },
        fonts: { titleFont: 'helvetica', bodyFont: 'helvetica', headerSize: 24, bodySize: 10 },
        layout: { 
            logoPosition: 'left', logoOffsetX: 0, logoOffsetY: 0, headerAlignment: 'right', headerStyle: 'minimal', margin: 10, logoSize: 25, showWatermark: false, watermarkOpacity: 0.1,
            tableOptions: { hideQty: false, hideRate: false, stripedRows: true, bordered: false, compact: false },
            sectionOrdering: ['header', 'title', 'details', 'table', 'totals', 'terms', 'signature', 'footer'],
            uppercaseHeadings: true,
            columnWidths: { qty: 15, rate: 20, amount: 35 },
            tablePadding: 3,
            borderRadius: 4,
            spacing: 1.0,
            elementSpacing: { logoBottom: 5, titleBottom: 2, addressBottom: 1, headerBottom: 5 }
        } as any
    },
    'Corporate': {
        colors: { primary: '#1e40af', secondary: '#475569', text: '#1e293b', tableHeaderBg: '#1e40af', tableHeaderText: '#ffffff', bannerBg: '#1e40af', bannerText: '#ffffff' },
        fonts: { titleFont: 'times', bodyFont: 'times', headerSize: 22, bodySize: 11 },
        layout: { 
            logoPosition: 'center', logoOffsetX: 0, logoOffsetY: 0, headerAlignment: 'center', headerStyle: 'banner', margin: 15, logoSize: 30, showWatermark: true, watermarkOpacity: 0.05,
            tableOptions: { hideQty: false, hideRate: false, stripedRows: false, bordered: true, compact: false },
            sectionOrdering: ['header', 'title', 'details', 'table', 'totals', 'terms', 'signature', 'footer'],
            uppercaseHeadings: true,
            columnWidths: { qty: 15, rate: 20, amount: 35 },
            tablePadding: 4,
            borderRadius: 0,
            spacing: 1.1,
            elementSpacing: { logoBottom: 8, titleBottom: 4, addressBottom: 2, headerBottom: 8 }
        } as any,
        content: { showAmountInWords: true }
    },
    'Minimal': {
        colors: { primary: '#000000', secondary: '#52525b', text: '#27272a', tableHeaderBg: '#ffffff', tableHeaderText: '#000000', borderColor: '#d4d4d8' },
        fonts: { titleFont: 'courier', bodyFont: 'courier', headerSize: 20, bodySize: 9 },
        layout: { 
            logoPosition: 'right', logoOffsetX: 0, logoOffsetY: 0, headerAlignment: 'left', headerStyle: 'minimal', margin: 12, logoSize: 20, showWatermark: false, watermarkOpacity: 0.1,
            tableOptions: { hideQty: false, hideRate: false, stripedRows: false, bordered: false, compact: true },
            sectionOrdering: ['header', 'details', 'title', 'table', 'totals', 'footer'],
            uppercaseHeadings: false,
            columnWidths: { qty: 10, rate: 20, amount: 35 },
            tablePadding: 2,
            borderRadius: 0,
            spacing: 0.9,
            elementSpacing: { logoBottom: 3, titleBottom: 1, addressBottom: 1, headerBottom: 3 }
        } as any
    },
    'Bold': {
        colors: { primary: '#dc2626', secondary: '#1f2937', text: '#111827', tableHeaderBg: '#dc2626', tableHeaderText: '#ffffff', bannerBg: '#dc2626', bannerText: '#ffffff' },
        fonts: { titleFont: 'helvetica', bodyFont: 'helvetica', headerSize: 28, bodySize: 10 },
        layout: { 
            logoPosition: 'left', logoOffsetX: 0, logoOffsetY: 0, headerAlignment: 'left', headerStyle: 'banner', margin: 10, logoSize: 35, showWatermark: true, watermarkOpacity: 0.15,
            tableOptions: { hideQty: false, hideRate: false, stripedRows: true, bordered: true, compact: false },
            sectionOrdering: ['header', 'title', 'details', 'table', 'totals', 'signature', 'footer'],
            uppercaseHeadings: true,
            columnWidths: { qty: 15, rate: 20, amount: 35 },
            tablePadding: 4,
            borderRadius: 8,
            spacing: 1.0,
            elementSpacing: { logoBottom: 5, titleBottom: 2, addressBottom: 1, headerBottom: 5 }
        } as any,
        content: { showStatusStamp: true }
    }
};

// --- PDF Canvas Preview Component (PDF.js Based) ---
const PDFCanvasPreview: React.FC<{ 
    config: ExtendedLayoutConfig; 
    profile: ProfileData | null;
    docType: DocumentType;
    customFonts: CustomFont[];
    reportScenario?: ReportScenarioKey;
    isDraftMode: boolean;
}> = ({ config, profile, docType, customFonts, reportScenario = 'SALES_REPORT', isDraftMode }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const renderTaskRef = useRef<any>(null);
    const [zoomLevel, setZoomLevel] = useState(1.0);

    // Debounce configuration changes to prevent rapid re-renders
    const debouncedConfig = useMemo(() => config, [JSON.stringify(config)]);

    useEffect(() => {
        let active = true;
        let timeoutId: ReturnType<typeof setTimeout>;

        const render = async () => {
            if (!containerRef.current || !canvasRef.current) return;
            setLoading(true);
            setError(null);

            try {
                let doc;
                switch (docType) {
                    case 'INVOICE': doc = await generateA4InvoicePdf(dummySale, dummyCustomer, profile, debouncedConfig, customFonts); break;
                    case 'ESTIMATE': doc = await generateEstimatePDF(dummySale as any, dummyCustomer, profile, debouncedConfig, customFonts); break;
                    case 'DEBIT_NOTE': doc = await generateDebitNotePDF(dummySale as any, dummyCustomer as any, profile, debouncedConfig, customFonts); break;
                    case 'RECEIPT': doc = await generateReceiptPDF(dummySale, dummyCustomer, profile, debouncedConfig, customFonts); break;
                    case 'REPORT': 
                        const scenario = REPORT_SCENARIOS[reportScenario];
                        doc = await generateGenericReportPDF(
                            scenario.title, 
                            scenario.subtitle,
                            scenario.headers,
                            scenario.data,
                            scenario.summary,
                            profile, 
                            debouncedConfig, 
                            customFonts
                        ); 
                        break;
                    default: doc = await generateA4InvoicePdf(dummySale, dummyCustomer, profile, debouncedConfig, customFonts);
                }

                if (!active) return;

                const blob = doc.output('blob');
                const url = URL.createObjectURL(blob);

                const loadingTask = pdfjs.getDocument(url);
                const pdf = await loadingTask.promise;
                const page = await pdf.getPage(1);

                if (!active) { URL.revokeObjectURL(url); return; }

                const containerWidth = containerRef.current.clientWidth;
                const baseViewport = page.getViewport({ scale: 1 });
                
                let scale = 1.0;
                
                if (docType === 'RECEIPT') {
                    // Receipt Logic: It's narrow (80mm). 
                    // Calculate scale to fill about 40-50% of the screen width max, or fill mobile width.
                    // 80mm is approx 227 points.
                    const desiredPreviewWidth = Math.min(containerWidth - 40, 380); 
                    scale = desiredPreviewWidth / baseViewport.width;
                } else {
                    // Standard Documents (A4)
                    // Scale to fit container with padding
                    scale = (containerWidth - 40) / baseViewport.width;
                }

                // In Draft Mode, render at lower resolution
                const finalScale = isDraftMode ? scale * 0.8 : scale * zoomLevel;
                const viewport = page.getViewport({ scale: finalScale });

                const canvas = canvasRef.current;
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                if (renderTaskRef.current) {
                    await renderTaskRef.current.cancel();
                }

                const renderContext = {
                    canvasContext: context!,
                    viewport: viewport,
                };
                
                renderTaskRef.current = page.render(renderContext);
                await renderTaskRef.current.promise;

                URL.revokeObjectURL(url);
            } catch (e: any) {
                if (e.name !== 'RenderingCancelledException') {
                    console.error("Preview Render Error:", e);
                    setError("Failed to render preview. " + (e.message || ''));
                }
            } finally {
                if (active) setLoading(false);
            }
        };

        const delay = isDraftMode ? 800 : 1200;
        timeoutId = setTimeout(render, delay);
        return () => {
            active = false;
            clearTimeout(timeoutId);
            if (renderTaskRef.current) renderTaskRef.current.cancel();
        };
    }, [debouncedConfig, profile, docType, customFonts, zoomLevel, reportScenario, isDraftMode]);

    return (
        <div className="flex-1 relative h-full flex flex-col overflow-hidden min-h-0">
            <div className="flex-1 bg-gray-100 dark:bg-slate-900 p-4 md:p-8 overflow-auto flex justify-center items-start" ref={containerRef}>
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-black/50 z-10 backdrop-blur-sm pointer-events-none">
                        <div className="bg-white dark:bg-slate-800 p-2 rounded-full shadow-lg">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                    </div>
                )}
                {error ? (
                    <div className="text-red-500 p-4 text-center">{error}</div>
                ) : (
                    <div className={`relative shadow-2xl rounded-sm overflow-hidden transition-transform duration-200 ease-out ${loading ? 'opacity-80 blur-[1px]' : 'opacity-100'}`}>
                        <canvas ref={canvasRef} className="bg-white block" />
                    </div>
                )}
            </div>
            
            {!isDraftMode && (
                <div className="absolute bottom-6 right-6 flex gap-2 bg-white/90 dark:bg-slate-800/90 p-2 rounded-full shadow-lg backdrop-blur-sm border border-gray-200 dark:border-slate-700 z-50">
                    <button onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.1))} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full"><ZoomOut size={18}/></button>
                    <span className="text-xs font-mono self-center w-12 text-center text-gray-700 dark:text-gray-200">{(zoomLevel * 100).toFixed(0)}%</span>
                    <button onClick={() => setZoomLevel(prev => Math.min(2.0, prev + 0.1))} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full"><ZoomIn size={18}/></button>
                </div>
            )}
        </div>
    );
};

// --- Main Editor Component ---
interface InvoiceDesignerProps {
    setIsDirty: (isDirty: boolean) => void;
    setCurrentPage: (page: Page) => void;
}

const InvoiceDesigner: React.FC<InvoiceDesignerProps> = ({ setIsDirty, setCurrentPage }) => {
    const { state, dispatch, showToast } = useAppContext();
    
    const [docType, setDocType] = useState<DocumentType>('INVOICE');
    const [activeTab, setActiveTab] = useState<'layout' | 'content' | 'branding' | 'fonts'>('layout');
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [activeColorKey, setActiveColorKey] = useState<keyof InvoiceTemplateConfig['colors'] | null>(null);
    const [reportScenario, setReportScenario] = useState<ReportScenarioKey>('SALES_REPORT');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const signatureInputRef = useRef<HTMLInputElement>(null);
    const fontInputRef = useRef<HTMLInputElement>(null);
    const templateInputRef = useRef<HTMLInputElement>(null);
    const [showLabels, setShowLabels] = useState(false);
    const [isDraftMode, setIsDraftMode] = useState(true);
    const [sidebarWidth, setSidebarWidth] = useState(350);
    const sidebarRef = useRef<HTMLDivElement>(null);
    const isResizing = useRef(false);

    const startResizing = (e: React.MouseEvent | React.TouchEvent) => {
        document.body.style.overflow = 'hidden';
        if ('touches' in e && e.touches.length > 0) {
            const target = e.target as HTMLElement;
            if(target.closest('.resize-handle')) isResizing.current = true;
        } else {
            isResizing.current = true;
        }
    };

    const stopResizing = useCallback(() => {
        isResizing.current = false;
        document.body.style.overflow = '';
    }, []);

    const resize = useCallback((e: MouseEvent | TouchEvent) => {
        if (isResizing.current) {
            e.preventDefault();
            let clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
            const newWidth = Math.max(280, Math.min(clientX, 600));
            setSidebarWidth(newWidth);
        }
    }, []);

    useEffect(() => {
        window.addEventListener('mousemove', resize);
        window.addEventListener('mouseup', stopResizing);
        window.addEventListener('touchmove', resize, { passive: false });
        window.addEventListener('touchend', stopResizing);
        return () => {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
            window.removeEventListener('touchmove', resize);
            window.removeEventListener('touchend', stopResizing);
        };
    }, [resize, stopResizing]);

    const getInitialConfig = (type: DocumentType): ExtendedLayoutConfig => {
        let baseConfig: InvoiceTemplateConfig;
        switch (type) {
            case 'ESTIMATE': baseConfig = state.estimateTemplate; break;
            case 'DEBIT_NOTE': baseConfig = state.debitNoteTemplate; break;
            case 'RECEIPT': baseConfig = state.receiptTemplate; break;
            case 'REPORT': baseConfig = state.reportTemplate; break;
            default: baseConfig = state.invoiceTemplate; break;
        }

        if (!baseConfig || !baseConfig.layout || Object.keys(baseConfig).length === 0) {
             baseConfig = PRESETS['Modern']; 
        }

        const defaults = {
            margin: 10,
            logoSize: 25,
            logoPosition: 'center' as const,
            headerAlignment: 'center' as const,
            showWatermark: false,
            watermarkOpacity: 0.1,
            tableOptions: { hideQty: false, hideRate: false, stripedRows: false, bordered: false, compact: false }
        };

        const srcLayout = (baseConfig.layout || {}) as any;

        const config = {
            ...baseConfig,
            layout: {
                ...defaults,
                ...srcLayout,
                sectionOrdering: srcLayout.sectionOrdering || ['header', 'title', 'details', 'table', 'totals', 'terms', 'signature', 'footer'],
                columnWidths: srcLayout.columnWidths || { qty: 15, rate: 20, amount: 35 },
                tablePadding: srcLayout.tablePadding || 3,
                borderRadius: srcLayout.borderRadius ?? 4,
                uppercaseHeadings: srcLayout.uppercaseHeadings ?? true,
                spacing: srcLayout.spacing ?? 1.0,
                elementSpacing: srcLayout.elementSpacing || { logoBottom: 5, titleBottom: 2, addressBottom: 1, headerBottom: 5 },
                qrOverlaySize: srcLayout.qrOverlaySize || 20, // Default size
            }
        };

        // Enforce smart defaults for receipts if they seem off (e.g. A4 margins on narrow paper)
        if (type === 'RECEIPT') {
            if (config.layout.margin > 5) config.layout.margin = 2;
            if (config.layout.logoSize > 20) config.layout.logoSize = 15;
        }

        return config;
    };

    const [localConfig, setLocalConfig] = useState<ExtendedLayoutConfig>(getInitialConfig('INVOICE'));
    // Ref to hold the latest config for solving race condition
    const configRef = useRef<ExtendedLayoutConfig>(localConfig);
    const [initialConfigJson, setInitialConfigJson] = useState('');
    const [history, setHistory] = useState<ExtendedLayoutConfig[]>([getInitialConfig('INVOICE')]);
    const [historyIndex, setHistoryIndex] = useState(0);

    useEffect(() => {
        const current = history[historyIndex];
        setLocalConfig(current);
        configRef.current = current; // Sync ref on history navigation
    }, [historyIndex, history]);

    useEffect(() => {
        const conf = getInitialConfig(docType);
        setHistory([conf]);
        setHistoryIndex(0);
        setInitialConfigJson(JSON.stringify(conf));
        setIsDirty(false);
    }, [docType]);

    useEffect(() => {
        if (!initialConfigJson) return;
        const isChanged = JSON.stringify(localConfig) !== initialConfigJson;
        setIsDirty(isChanged);
    }, [localConfig, initialConfigJson, setIsDirty]);

    const pushToHistory = (newConfig: ExtendedLayoutConfig) => {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(newConfig);
        if (newHistory.length > 50) newHistory.shift();
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    };

    const handleUndo = () => {
        if (historyIndex > 0) setHistoryIndex(historyIndex - 1);
    };

    const handleRedo = () => {
        if (historyIndex < history.length - 1) setHistoryIndex(historyIndex + 1);
    };

    const handleConfigChange = (section: 'layout' | 'content' | 'fonts' | 'colors', key: string, value: any) => {
        const current = configRef.current;
        const newConfig = {
            ...current,
            [section]: {
                ...(current[section] as any),
                [key]: value
            }
        };
        configRef.current = newConfig; // Optimistic update
        pushToHistory(newConfig);
    };

    const handleBatchLayoutChange = (updates: Partial<ExtendedLayoutConfig['layout']>) => {
        const current = configRef.current;
        const newConfig = {
            ...current,
            layout: {
                ...current.layout,
                ...updates
            }
        };
        configRef.current = newConfig; // Optimistic update
        pushToHistory(newConfig);
    };

    const handleLabelsChange = (key: string, value: string) => {
        const current = configRef.current;
        const newConfig = {
            ...current,
            content: {
                ...current.content,
                labels: {
                    ...current.content.labels,
                    [key]: value
                }
            }
        };
        configRef.current = newConfig;
        pushToHistory(newConfig);
    };

    const handleElementSpacingChange = (key: string, value: number) => {
        const currentSpacing = configRef.current.layout.elementSpacing || { logoBottom: 5, titleBottom: 2, addressBottom: 1, headerBottom: 5 };
        const newSpacing = { ...currentSpacing, [key]: value };
        handleConfigChange('layout', 'elementSpacing', newSpacing);
    };

    const getMaxWidth = () => {
        if (docType === 'RECEIPT') return 70; // 72-80mm width usually
        return 190; // A4 printable width roughly
    };

    const handleQRPosChange = (axis: 'x' | 'y', val: number) => {
        const updates: any = {};
        const safeX = docType === 'RECEIPT' ? 20 : 150;
        
        if (axis === 'x') {
            updates.qrPosX = val;
            if (configRef.current.layout.qrPosY === undefined) updates.qrPosY = 20; 
        } else {
            updates.qrPosY = val;
            if (configRef.current.layout.qrPosX === undefined) updates.qrPosX = safeX;
        }
        handleBatchLayoutChange(updates);
    };

    const nudgeQR = (dx: number, dy: number) => {
        const currentLayout = configRef.current.layout;
        const safeX = docType === 'RECEIPT' ? 20 : 150;
        const currentX = currentLayout.qrPosX ?? safeX;
        const currentY = currentLayout.qrPosY ?? 20;
        handleBatchLayoutChange({
            qrPosX: currentX + dx,
            qrPosY: currentY + dy
        });
    };

    const handleLogoPosChange = (axis: 'x' | 'y', val: number) => {
        const updates: any = {};
        if (axis === 'x') {
            updates.logoPosX = val;
            if (configRef.current.layout.logoPosY === undefined) updates.logoPosY = 20;
        } else {
            updates.logoPosY = val;
            if (configRef.current.layout.logoPosX === undefined) updates.logoPosX = 20;
        }
        handleBatchLayoutChange(updates);
    };

    const nudgeLogo = (dx: number, dy: number) => {
        const currentLayout = configRef.current.layout;
        const currentX = currentLayout.logoPosX ?? 20;
        const currentY = currentLayout.logoPosY ?? 20;
        handleBatchLayoutChange({
            logoPosX: currentX + dx,
            logoPosY: currentY + dy
        });
    };

    const applyPreset = (presetName: string) => {
        const preset = PRESETS[presetName];
        if (preset) {
            let layoutUpdate = { ...preset.layout };
            
            // Smart Preset Logic for Receipts
            if (docType === 'RECEIPT') {
                layoutUpdate.margin = 2; // Narrow margins
                layoutUpdate.logoSize = Math.min(layoutUpdate.logoSize, 18);
                layoutUpdate.paperSize = undefined; // Force custom size calc
            }

            const current = configRef.current;
            const newConfig = {
                ...current,
                colors: { ...current.colors, ...preset.colors },
                fonts: { ...current.fonts, ...preset.fonts },
                layout: { ...current.layout, ...layoutUpdate },
                content: { ...current.content, ...preset.content }
            };
            configRef.current = newConfig;
            pushToHistory(newConfig);
        }
    };

    const handleSave = () => {
        dispatch({ 
            type: 'SET_DOCUMENT_TEMPLATE', 
            payload: { type: docType, config: localConfig } 
        });
        showToast(`${docType} template saved successfully!`);
        setInitialConfigJson(JSON.stringify(localConfig));
        setIsDirty(false);
    };

    const handleOpenPdf = async () => {
        try {
            let doc;
            switch (docType) {
                case 'INVOICE': doc = await generateA4InvoicePdf(dummySale, dummyCustomer, state.profile, localConfig, state.customFonts); break;
                case 'ESTIMATE': doc = await generateEstimatePDF(dummySale as any, dummyCustomer, state.profile, localConfig, state.customFonts); break;
                case 'DEBIT_NOTE': doc = await generateDebitNotePDF(dummySale as any, dummyCustomer as any, state.profile, localConfig, state.customFonts); break;
                case 'RECEIPT': doc = await generateReceiptPDF(dummySale, dummyCustomer, state.profile, localConfig, state.customFonts); break;
                case 'REPORT': 
                    const scenario = REPORT_SCENARIOS[reportScenario];
                    doc = await generateGenericReportPDF(
                        scenario.title, scenario.subtitle, scenario.headers, scenario.data, scenario.summary, state.profile, localConfig, state.customFonts
                    ); 
                    break;
                default: doc = await generateA4InvoicePdf(dummySale, dummyCustomer, state.profile, localConfig, state.customFonts);
            }
            const blob = doc.output('blob');
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
        } catch (e) {
            console.error(e);
            showToast("Failed to open PDF.", "error");
        }
    };

    const handleDownloadTestPdf = async () => {
        try {
            let doc;
            switch (docType) {
                case 'INVOICE': doc = await generateA4InvoicePdf(dummySale, dummyCustomer, state.profile, localConfig, state.customFonts); break;
                case 'ESTIMATE': doc = await generateEstimatePDF(dummySale as any, dummyCustomer, state.profile, localConfig, state.customFonts); break;
                case 'DEBIT_NOTE': doc = await generateDebitNotePDF(dummySale as any, dummyCustomer as any, state.profile, localConfig, state.customFonts); break;
                case 'RECEIPT': doc = await generateReceiptPDF(dummySale, dummyCustomer, state.profile, localConfig, state.customFonts); break;
                case 'REPORT': 
                    const scenario = REPORT_SCENARIOS[reportScenario];
                    doc = await generateGenericReportPDF(
                        scenario.title, scenario.subtitle, scenario.headers, scenario.data, scenario.summary, state.profile, localConfig, state.customFonts
                    ); 
                    break;
                default: doc = await generateA4InvoicePdf(dummySale, dummyCustomer, state.profile, localConfig, state.customFonts);
            }
            doc.save(`Test_${docType}.pdf`);
        } catch (e) {
            console.error(e);
            showToast("Failed to generate PDF.", "error");
        }
    };

    const handleColorPick = (key: keyof InvoiceTemplateConfig['colors']) => {
        setActiveColorKey(key);
        setShowColorPicker(true);
    };

    const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            try {
                const base64 = await compressImage(e.target.files[0], 1200, 0.8);
                handleConfigChange('layout', 'backgroundImage', base64);
            } catch (error) {
                showToast("Error processing image.", 'error');
            }
        }
    };

    const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            try {
                const base64 = await compressImage(e.target.files[0], 300, 0.8);
                handleConfigChange('content', 'signatureImage', base64);
            } catch (error) {
                showToast("Error processing image.", 'error');
            }
        }
    };

    const handleExportTemplate = () => {
        const dataStr = JSON.stringify(localConfig, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${docType.toLowerCase()}_template.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleImportTemplate = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                if (json && json.id && json.colors) {
                    pushToHistory(json);
                    showToast("Template imported successfully!");
                } else {
                    showToast("Invalid template file.", "error");
                }
            } catch (err) {
                showToast("Error reading template file.", "error");
            }
        };
        reader.readAsText(file);
        e.target.value = ''; 
    };

    const handleFontUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (!file.name.match(/\.(ttf|otf)$/i)) {
                showToast("Only .ttf or .otf files allowed.", 'error');
                return;
            }
            
            const reader = new FileReader();
            reader.onload = async (event) => {
                const result = event.target?.result as string;
                if (result) {
                    const fontName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, ""); 
                    
                    const newFont: CustomFont = {
                        id: `font-${Date.now()}`,
                        name: fontName,
                        data: result
                    };
                    
                    dispatch({ type: 'ADD_CUSTOM_FONT', payload: newFont });
                    showToast(`Font "${fontName}" added successfully!`);
                }
            };
            reader.readAsDataURL(file);
            e.target.value = '';
        }
    };

    const handleRemoveFont = (id: string) => {
        dispatch({ type: 'REMOVE_CUSTOM_FONT', payload: id });
    };

    const moveSection = (index: number, direction: 'up' | 'down') => {
        const ordering = [...(localConfig.layout.sectionOrdering || ['header', 'title', 'details', 'table', 'totals', 'terms', 'signature', 'footer'])];
        if (direction === 'up' && index > 0) {
            [ordering[index], ordering[index - 1]] = [ordering[index - 1], ordering[index]];
        } else if (direction === 'down' && index < ordering.length - 1) {
            [ordering[index], ordering[index + 1]] = [ordering[index + 1], ordering[index]];
        }
        handleConfigChange('layout', 'sectionOrdering', ordering);
    };

    return (
        <div className="flex h-full bg-gray-50 dark:bg-slate-950 overflow-hidden font-sans relative">
            <ColorPickerModal
                isOpen={showColorPicker}
                onClose={() => setShowColorPicker(false)}
                initialColor={activeColorKey ? localConfig.colors[activeColorKey] : '#000000'}
                onChange={(color) => {
                    if (activeColorKey) {
                        handleConfigChange('colors', activeColorKey, color);
                    }
                }}
            />

            <aside 
                ref={sidebarRef}
                style={{ width: sidebarWidth }}
                className="relative bg-white dark:bg-slate-900 border-r dark:border-slate-800 flex flex-col h-full shadow-xl z-20 flex-shrink-0 transition-width duration-75 ease-out"
            >
                {/* Header */}
                <div className="p-4 border-b dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-900">
                    <div className="flex items-center gap-2">
                        <button onClick={() => setCurrentPage('DASHBOARD')} className="p-2 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-500 transition-colors mr-1" title="Exit to Dashboard">
                             <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h2 className="font-bold text-sm text-slate-800 dark:text-white">Designer</h2>
                        </div>
                    </div>
                    <div className="flex gap-1 items-center">
                        <div className="flex bg-slate-200 dark:bg-slate-800 rounded-lg p-0.5 mr-2">
                            <button onClick={handleUndo} disabled={historyIndex === 0} className="p-1.5 rounded hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 disabled:opacity-30 transition-all">
                                <RotateCcw size={14} />
                            </button>
                            <button onClick={handleRedo} disabled={historyIndex === history.length - 1} className="p-1.5 rounded hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 disabled:opacity-30 transition-all">
                                <RotateCw size={14} />
                            </button>
                        </div>

                        <button onClick={() => templateInputRef.current?.click()} className="p-2 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300" title="Import Template">
                            <Upload size={14} />
                        </button>
                        <input type="file" ref={templateInputRef} className="hidden" accept=".json" onChange={handleImportTemplate} />
                        
                        <button onClick={handleExportTemplate} className="p-2 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300" title="Export Template">
                            <Download size={14} />
                        </button>
                        
                        <Button onClick={handleSave} className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 shadow-md ml-1">
                            <Save size={14} className="mr-1.5" /> Save
                        </Button>
                    </div>
                </div>

                {/* Document Type Selector */}
                <div className="px-4 py-3 border-b dark:border-slate-800">
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Document Type</label>
                    <div className="grid grid-cols-2 gap-2">
                        {['INVOICE', 'ESTIMATE', 'DEBIT_NOTE', 'RECEIPT', 'REPORT'].map(t => (
                            <button
                                key={t}
                                onClick={() => setDocType(t as DocumentType)}
                                className={`px-2 py-1.5 rounded text-xs font-semibold transition-all border ${docType === t ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-700 dark:text-indigo-300' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-gray-50'}`}
                            >
                                {t.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10">
                    {[
                        { id: 'layout', icon: Layout, label: 'Layout' },
                        { id: 'branding', icon: Palette, label: 'Style' },
                        { id: 'content', icon: FileText, label: 'Content' },
                        { id: 'fonts', icon: Type, label: 'Text' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex-1 py-3 flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors border-b-2 ${activeTab === tab.id ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 dark:bg-slate-800' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar pb-20">
                    
                    {/* LAYOUT TAB */}
                    {activeTab === 'layout' && (
                        <div className="space-y-6 animate-fade-in-fast">
                            {/* Presets */}
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Quick Presets</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {Object.keys(PRESETS).map(name => (
                                        <button key={name} onClick={() => applyPreset(name)} className="px-3 py-2 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-sm transition-all text-left">
                                            {name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Header Style */}
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-slate-500 uppercase block">Header Layout</label>
                                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                                    {['standard', 'banner', 'minimal'].map(s => (
                                        <button 
                                            key={s} 
                                            onClick={() => handleConfigChange('layout', 'headerStyle', s)}
                                            className={`flex-1 py-1.5 text-xs font-medium rounded capitalize ${localConfig.layout.headerStyle === s ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500'}`}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                                {docType !== 'RECEIPT' && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-slate-600 dark:text-slate-400">Paper Size</span>
                                        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded">
                                            <button 
                                                onClick={() => handleConfigChange('layout', 'paperSize', 'a4')}
                                                className={`px-3 py-1.5 rounded text-xs font-medium ${localConfig.layout.paperSize !== 'letter' ? 'bg-white dark:bg-slate-600 shadow-sm text-indigo-600 dark:text-white' : 'text-slate-400'}`}
                                            >
                                                A4
                                            </button>
                                            <button 
                                                onClick={() => handleConfigChange('layout', 'paperSize', 'letter')}
                                                className={`px-3 py-1.5 rounded text-xs font-medium ${localConfig.layout.paperSize === 'letter' ? 'bg-white dark:bg-slate-600 shadow-sm text-indigo-600 dark:text-white' : 'text-slate-400'}`}
                                            >
                                                Letter
                                            </button>
                                        </div>
                                    </div>
                                )}
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-slate-600 dark:text-slate-400">Header Align</span>
                                    <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded">
                                        {[
                                            { v: 'left', i: AlignLeft }, 
                                            { v: 'center', i: AlignCenter }, 
                                            { v: 'right', i: AlignRight }
                                        ].map(({v, i: Icon}) => (
                                            <button 
                                                key={v} 
                                                onClick={() => handleConfigChange('layout', 'headerAlignment', v)}
                                                className={`p-1.5 rounded ${localConfig.layout.headerAlignment === v ? 'bg-white dark:bg-slate-600 shadow-sm text-indigo-600 dark:text-white' : 'text-slate-400'}`}
                                            >
                                                <Icon size={14} />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Section Reordering */}
                            <div className="space-y-3 border-t dark:border-slate-800 pt-4">
                                <label className="text-xs font-bold text-slate-500 uppercase block">Section Order</label>
                                <div className="space-y-1">
                                    {(localConfig.layout.sectionOrdering || ['header', 'title', 'details', 'table', 'totals', 'terms', 'signature', 'footer']).map((section, idx, arr) => (
                                        <div key={section} className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded text-xs capitalize">
                                            <span className="font-medium text-slate-700 dark:text-slate-300">{section}</span>
                                            <div className="flex gap-1">
                                                <button disabled={idx === 0} onClick={() => moveSection(idx, 'up')} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded disabled:opacity-30"><ArrowUp size={12}/></button>
                                                <button disabled={idx === arr.length - 1} onClick={() => moveSection(idx, 'down')} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded disabled:opacity-30"><ArrowDown size={12}/></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Spacing & Margins */}
                            <div className="space-y-3 border-t dark:border-slate-800 pt-4">
                                <label className="text-xs font-bold text-slate-500 uppercase block">Global Spacing</label>
                                
                                {/* Margin Control */}
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[10px] text-slate-500">Page Margin</span>
                                        <span className="text-[10px] font-mono text-indigo-600">{localConfig.layout.margin}mm</span>
                                    </div>
                                    <input 
                                        type="range" min="0" max="30" step="1"
                                        value={localConfig.layout.margin} 
                                        onChange={e => handleConfigChange('layout', 'margin', parseInt(e.target.value))} 
                                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                    />
                                </div>

                                {/* Vertical Spacing Control */}
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[10px] text-slate-500">Layout Density</span>
                                        <span className="text-[10px] font-mono text-indigo-600">{localConfig.layout.spacing?.toFixed(1) || '1.0'}x</span>
                                    </div>
                                    <input 
                                        type="range" min="5" max="15" 
                                        value={(localConfig.layout.spacing || 1.0) * 10} 
                                        onChange={e => handleConfigChange('layout', 'spacing', parseInt(e.target.value) / 10)} 
                                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                    />
                                    <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                                        <span>Tight</span>
                                        <span>Normal</span>
                                        <span>Loose</span>
                                    </div>
                                </div>
                                
                                {/* Border Radius Control */}
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[10px] text-slate-500">Border Radius (Roundness)</span>
                                        <span className="text-[10px] font-mono text-indigo-600">{localConfig.layout.borderRadius || 0}mm</span>
                                    </div>
                                    <input 
                                        type="range" min="0" max="20" step="1"
                                        value={localConfig.layout.borderRadius || 0} 
                                        onChange={e => handleConfigChange('layout', 'borderRadius', parseInt(e.target.value))} 
                                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                    />
                                </div>
                            </div>

                            {/* Detailed Element Spacing */}
                            <div className="space-y-3 border-t dark:border-slate-800 pt-4">
                                <label className="text-xs font-bold text-slate-500 uppercase block">Detailed Spacing (mm)</label>
                                
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[10px] text-slate-500">Logo Bottom Space</span>
                                        <span className="text-[10px] font-mono text-indigo-600">{localConfig.layout.elementSpacing?.logoBottom ?? 5}mm</span>
                                    </div>
                                    <input 
                                        type="range" min="0" max="20" step="1"
                                        value={localConfig.layout.elementSpacing?.logoBottom ?? 5} 
                                        onChange={e => handleElementSpacingChange('logoBottom', parseInt(e.target.value))} 
                                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                    />
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[10px] text-slate-500">Business Name Bottom</span>
                                        <span className="text-[10px] font-mono text-indigo-600">{localConfig.layout.elementSpacing?.titleBottom ?? 2}mm</span>
                                    </div>
                                    <input 
                                        type="range" min="0" max="20" step="1"
                                        value={localConfig.layout.elementSpacing?.titleBottom ?? 2} 
                                        onChange={e => handleElementSpacingChange('titleBottom', parseInt(e.target.value))} 
                                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                    />
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[10px] text-slate-500">Address Bottom</span>
                                        <span className="text-[10px] font-mono text-indigo-600">{localConfig.layout.elementSpacing?.addressBottom ?? 1}mm</span>
                                    </div>
                                    <input 
                                        type="range" min="0" max="20" step="1"
                                        value={localConfig.layout.elementSpacing?.addressBottom ?? 1} 
                                        onChange={e => handleElementSpacingChange('addressBottom', parseInt(e.target.value))} 
                                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                    />
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[10px] text-slate-500">Header Bottom (Section)</span>
                                        <span className="text-[10px] font-mono text-indigo-600">{localConfig.layout.elementSpacing?.headerBottom ?? 5}mm</span>
                                    </div>
                                    <input 
                                        type="range" min="0" max="30" step="1"
                                        value={localConfig.layout.elementSpacing?.headerBottom ?? 5} 
                                        onChange={e => handleElementSpacingChange('headerBottom', parseInt(e.target.value))} 
                                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                    />
                                </div>
                            </div>

                            {/* Logo Config */}
                            <div className="space-y-3 border-t dark:border-slate-800 pt-4">
                                <label className="text-xs font-bold text-slate-500 uppercase block">Logo Settings</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <span className="text-[10px] text-slate-500 block mb-1">Size (mm)</span>
                                        <input 
                                            type="range" min="10" max="60" 
                                            value={localConfig.layout.logoSize} 
                                            onChange={e => handleConfigChange('layout', 'logoSize', parseInt(e.target.value))} 
                                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                        />
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-slate-500 block mb-1">Position</span>
                                        <div className="flex gap-1">
                                            {['left', 'center', 'right'].map(p => (
                                                <button 
                                                    key={p} 
                                                    onClick={() => handleConfigChange('layout', 'logoPosition', p)}
                                                    className={`flex-1 py-1 text-[10px] uppercase font-bold border rounded ${localConfig.layout.logoPosition === p ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'border-slate-200 text-slate-500'}`}
                                                >
                                                    {p[0]}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded border dark:border-slate-700 mt-2">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Absolute Position (Overrides above)</p>
                                    
                                    {/* Logo Nudge Controls */}
                                    <div className="flex flex-col items-center gap-1 mb-3">
                                        <button onClick={() => nudgeLogo(0, -1)} className="p-1 bg-white border rounded shadow hover:bg-gray-100"><ArrowUp size={14} /></button>
                                        <div className="flex gap-2">
                                            <button onClick={() => nudgeLogo(-1, 0)} className="p-1 bg-white border rounded shadow hover:bg-gray-100"><ArrowLeft size={14} /></button>
                                            <div className="w-6 h-6 rounded bg-slate-200 flex items-center justify-center text-[8px] font-bold text-slate-500">Logo</div>
                                            <button onClick={() => nudgeLogo(1, 0)} className="p-1 bg-white border rounded shadow hover:bg-gray-100"><ArrowRightIcon size={14} /></button>
                                        </div>
                                        <button onClick={() => nudgeLogo(0, 1)} className="p-1 bg-white border rounded shadow hover:bg-gray-100"><ArrowDown size={14} /></button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-[10px] text-slate-500 flex items-center gap-1"><MoveHorizontal size={10} /> Horizontal</span>
                                                <span className="text-[10px] font-mono text-indigo-600">{localConfig.layout.logoPosX ?? 'Auto'}</span>
                                            </div>
                                            <input 
                                                type="range" min="0" max={getMaxWidth()} step="1"
                                                value={localConfig.layout.logoPosX ?? 0} 
                                                onChange={e => handleLogoPosChange('x', parseInt(e.target.value))} 
                                                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                            />
                                        </div>
                                        <div>
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-[10px] text-slate-500 flex items-center gap-1"><MoveVertical size={10} /> Vertical</span>
                                                <span className="text-[10px] font-mono text-indigo-600">{localConfig.layout.logoPosY ?? 'Auto'}</span>
                                            </div>
                                            <input 
                                                type="range" min="0" max="300" step="1"
                                                value={localConfig.layout.logoPosY ?? 0} 
                                                onChange={e => handleLogoPosChange('y', parseInt(e.target.value))} 
                                                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                            />
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            handleBatchLayoutChange({ logoPosX: undefined, logoPosY: undefined });
                                        }}
                                        className="text-[10px] text-red-500 mt-2 hover:underline"
                                    >
                                        Reset Position
                                    </button>
                                </div>
                            </div>
                            
                            {/* QR Code Position & Size */}
                            <div className="space-y-3 border-t dark:border-slate-800 pt-4">
                                <label className="text-xs font-bold text-slate-500 uppercase block flex items-center gap-2">
                                    <QrCode size={14} /> QR Code Settings
                                </label>
                                <select 
                                    value={localConfig.layout.qrPosition || 'details-right'} 
                                    onChange={e => handleConfigChange('layout', 'qrPosition', e.target.value)}
                                    className="w-full p-2 text-xs border rounded bg-white dark:bg-slate-800 dark:border-slate-700"
                                >
                                    <option value="header-right">Header Right (Near Logo)</option>
                                    <option value="details-right">Details Section (Right)</option>
                                    <option value="footer-left">Footer Left</option>
                                    <option value="footer-right">Footer Right</option>
                                </select>
                                
                                {/* NEW: QR Size Control */}
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[10px] text-slate-500">QR Size (mm)</span>
                                        <span className="text-[10px] font-mono text-indigo-600">{localConfig.layout.qrOverlaySize || 20}mm</span>
                                    </div>
                                    <input 
                                        type="range" min="10" max="50" step="1"
                                        value={localConfig.layout.qrOverlaySize || 20} 
                                        onChange={e => handleConfigChange('layout', 'qrOverlaySize', parseInt(e.target.value))} 
                                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                    />
                                </div>
                                
                                <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded border dark:border-slate-700 mt-2">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Absolute Adjustment (Overrides above)</p>
                                    
                                    {/* Nudge Controls */}
                                    <div className="flex flex-col items-center gap-1 mb-3">
                                        <button onClick={() => nudgeQR(0, -1)} className="p-1 bg-white border rounded shadow hover:bg-gray-100"><ArrowUp size={14} /></button>
                                        <div className="flex gap-2">
                                            <button onClick={() => nudgeQR(-1, 0)} className="p-1 bg-white border rounded shadow hover:bg-gray-100"><ArrowLeft size={14} /></button>
                                            <div className="w-6 h-6 rounded bg-slate-200 flex items-center justify-center text-[8px] font-bold text-slate-500">QR</div>
                                            <button onClick={() => nudgeQR(1, 0)} className="p-1 bg-white border rounded shadow hover:bg-gray-100"><ArrowRightIcon size={14} /></button>
                                        </div>
                                        <button onClick={() => nudgeQR(0, 1)} className="p-1 bg-white border rounded shadow hover:bg-gray-100"><ArrowDown size={14} /></button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-[10px] text-slate-500 flex items-center gap-1"><MoveHorizontal size={10} /> Horizontal</span>
                                                <span className="text-[10px] font-mono text-indigo-600">{localConfig.layout.qrPosX ?? 'Auto'}</span>
                                            </div>
                                            <input 
                                                type="range" min="0" max="200" step="1"
                                                value={localConfig.layout.qrPosX ?? 0} 
                                                onChange={e => handleQRPosChange('x', parseInt(e.target.value))} 
                                                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                            />
                                        </div>
                                        <div>
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-[10px] text-slate-500 flex items-center gap-1"><MoveVertical size={10} /> Vertical</span>
                                                <span className="text-[10px] font-mono text-indigo-600">{localConfig.layout.qrPosY ?? 'Auto'}</span>
                                            </div>
                                            <input 
                                                type="range" min="0" max="300" step="1"
                                                value={localConfig.layout.qrPosY ?? 0} 
                                                onChange={e => handleQRPosChange('y', parseInt(e.target.value))} 
                                                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                            />
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            handleBatchLayoutChange({ qrPosX: undefined, qrPosY: undefined });
                                        }}
                                        className="text-[10px] text-red-500 mt-2 hover:underline"
                                    >
                                        Reset Position
                                    </button>
                                </div>
                            </div>

                            {/* Table Column Sizes */}
                            <div className="space-y-3 border-t dark:border-slate-800 pt-4">
                                <label className="text-xs font-bold text-slate-500 uppercase block flex items-center gap-2">
                                    <Columns size={14} /> Table Configuration
                                </label>
                                <div className="space-y-4 bg-gray-50 dark:bg-slate-800 p-3 rounded-lg border dark:border-slate-700">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-slate-600 dark:text-slate-400">Header Align</span>
                                        <div className="flex gap-1 bg-white dark:bg-slate-700 p-1 rounded">
                                            {[
                                                { v: 'left', i: AlignLeft }, 
                                                { v: 'center', i: AlignCenter }, 
                                                { v: 'right', i: AlignRight }
                                            ].map(({v, i: Icon}) => (
                                                <button 
                                                    key={v} 
                                                    onClick={() => handleConfigChange('layout', 'tableHeaderAlign', v)}
                                                    className={`p-1 rounded ${localConfig.layout.tableHeaderAlign === v ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}
                                                >
                                                    <Icon size={12} />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-[10px] text-slate-500">Qty Column Width</span>
                                            <span className="text-[10px] font-mono text-indigo-600">{localConfig.layout.columnWidths?.qty || 15}mm</span>
                                        </div>
                                        <input 
                                            type="range" min="10" max="30" 
                                            value={localConfig.layout.columnWidths?.qty || 15} 
                                            onChange={e => handleConfigChange('layout', 'columnWidths', { ...localConfig.layout.columnWidths, qty: parseInt(e.target.value) })} 
                                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                        />
                                    </div>
                                    <div>
                                        <div className="flex justify-