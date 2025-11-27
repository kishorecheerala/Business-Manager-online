
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Save, RotateCcw, Type, Layout, Palette, FileText, Edit3, ChevronDown, Upload, Trash2, Wand2, Grid, QrCode, Printer, Eye, ArrowLeft, CheckSquare, Square, Type as TypeIcon, AlignLeft, AlignCenter, AlignRight, Move, GripVertical, Layers, ArrowUp, ArrowDown, Table, Monitor, Loader2, ZoomIn, ZoomOut, ExternalLink, Columns, BookOpen, Scaling, Undo, Redo, Rows, EyeOff } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { InvoiceTemplateConfig, DocumentType, InvoiceLabels, CustomFont, ProfileData, Page } from '../types';
import Button from '../components/Button';
import ColorPickerModal from '../components/ColorPickerModal';
import { generateA4InvoicePdf, generateEstimatePDF, generateDebitNotePDF, generateThermalInvoicePDF, generateGenericReportPDF, defaultLabels } from '../utils/pdfGenerator';
import { extractDominantColor } from '../utils/imageUtils';
import * as pdfjsLib from 'pdfjs-dist';
import { useDialog } from '../context/DialogContext';

const pdfjs = (pdfjsLib as any).default || pdfjsLib;
if (pdfjs.GlobalWorkerOptions) {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;
}

// ... (Existing Dummy Data - Keep as is)
const dummyCustomer = { id: 'CUST-001', name: 'John Doe Enterprises', phone: '9876543210', address: '123 Business Park, Tech City, Hyderabad, Telangana 500081', area: 'Tech City', reference: 'Walk-in' };
const dummySale = { id: 'INV-2023-001', customerId: 'CUST-001', items: [{ productId: 'P1', productName: 'Premium Silk Saree - Kanchipuram', quantity: 2, price: 4500, gstPercent: 5 }, { productId: 'P2', productName: 'Cotton Kurti', quantity: 5, price: 850, gstPercent: 5 }, { productId: 'P3', productName: 'Designer Blouse - Gold', quantity: 3, price: 1200, gstPercent: 12 }], discount: 500, gstAmount: 1250, totalAmount: 16350, date: new Date().toISOString(), payments: [{ id: 'PAY-1', amount: 5000, date: new Date().toISOString(), method: 'UPI' as const }] };

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
    paperSize?: 'a4' | 'letter';
}

const PRESETS: Record<string, Partial<ExtendedLayoutConfig>> = {
    'Modern': {
        colors: { primary: '#0f172a', secondary: '#64748b', text: '#334155', tableHeaderBg: '#f1f5f9', tableHeaderText: '#0f172a', borderColor: '#e2e8f0', alternateRowBg: '#f8fafc' },
        fonts: { titleFont: 'helvetica', bodyFont: 'helvetica', headerSize: 24, bodySize: 10 },
        layout: { 
            logoPosition: 'left', logoOffsetX: 0, logoOffsetY: 0, headerAlignment: 'right', headerStyle: 'minimal', margin: 10, logoSize: 25, showWatermark: false, watermarkOpacity: 0.1,
            tableOptions: { hideQty: false, hideRate: false, stripedRows: true, bordered: false, compact: false },
            sectionOrdering: ['header', 'title', 'details', 'table', 'totals', 'terms', 'bankDetails', 'signature', 'footer'],
            uppercaseHeadings: true, columnWidths: { qty: 15, rate: 20, amount: 35 }, tablePadding: 3, borderRadius: 4
        } as any
    },
    'Corporate': {
        colors: { primary: '#1e40af', secondary: '#475569', text: '#1e293b', tableHeaderBg: '#1e40af', tableHeaderText: '#ffffff', bannerBg: '#1e40af', bannerText: '#ffffff' },
        fonts: { titleFont: 'times', bodyFont: 'times', headerSize: 22, bodySize: 11 },
        layout: { 
            logoPosition: 'center', logoOffsetX: 0, logoOffsetY: 0, headerAlignment: 'center', headerStyle: 'banner', margin: 15, logoSize: 30, showWatermark: true, watermarkOpacity: 0.05,
            tableOptions: { hideQty: false, hideRate: false, stripedRows: false, bordered: true, compact: false },
            sectionOrdering: ['header', 'title', 'details', 'table', 'totals', 'terms', 'bankDetails', 'signature', 'footer'],
            uppercaseHeadings: true, columnWidths: { qty: 15, rate: 20, amount: 35 }, tablePadding: 4, borderRadius: 0
        } as any
    },
};

const SECTIONS_INFO: Record<string, { label: string, toggle: keyof InvoiceTemplateConfig['content'] | null }> = {
    header: { label: 'Header (Logo & Business)', toggle: 'showBusinessDetails' },
    title: { label: 'Document Title', toggle: null },
    details: { label: 'Customer & Invoice Info', toggle: 'showCustomerDetails' },
    table: { label: 'Item Table', toggle: null },
    totals: { label: 'Totals & Tax', toggle: null },
    words: { label: 'Amount in Words', toggle: 'showAmountInWords' },
    bankDetails: { label: 'Bank Details', toggle: null }, 
    terms: { label: 'Terms & Conditions', toggle: 'showTerms' },
    signature: { label: 'Signature', toggle: 'showSignature' },
    footer: { label: 'Footer', toggle: null }
};

const PDFCanvasPreview: React.FC<{ config: ExtendedLayoutConfig; profile: ProfileData | null; docType: DocumentType; customFonts: CustomFont[]; }> = ({ config, profile, docType, customFonts }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);
    const renderTaskRef = useRef<any>(null);
    const [zoomLevel, setZoomLevel] = useState(1.0);

    useEffect(() => {
        let active = true;
        const render = async () => {
            if (!containerRef.current || !canvasRef.current) return;
            setLoading(true);
            try {
                let doc = docType === 'RECEIPT' 
                    ? await generateThermalInvoicePDF(dummySale, dummyCustomer, profile, config, customFonts)
                    : await generateA4InvoicePdf(dummySale, dummyCustomer, profile, config, customFonts);

                if (!active) return;
                const blob = doc.output('blob');
                const url = URL.createObjectURL(blob);
                const loadingTask = pdfjs.getDocument(url);
                const pdf = await loadingTask.promise;
                const page = await pdf.getPage(1);
                if (!active) { URL.revokeObjectURL(url); return; }

                const viewport = page.getViewport({ scale: zoomLevel * 1.5 });
                const canvas = canvasRef.current;
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                if (renderTaskRef.current) await renderTaskRef.current.cancel();
                renderTaskRef.current = page.render({ canvasContext: context!, viewport: viewport });
                await renderTaskRef.current.promise;
                URL.revokeObjectURL(url);
            } catch (e) { console.error(e); } finally { if (active) setLoading(false); }
        };
        const t = setTimeout(render, 500);
        return () => { active = false; clearTimeout(t); if(renderTaskRef.current) renderTaskRef.current.cancel(); };
    }, [config, profile, docType, customFonts, zoomLevel]);

    return (
        <div className="flex-1 relative h-full flex flex-col overflow-hidden bg-gray-100 dark:bg-slate-900">
            <div className="flex-1 p-8 overflow-auto flex justify-center items-start" ref={containerRef}>
                {loading && <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10"><Loader2 className="w-8 h-8 animate-spin" /></div>}
                <canvas ref={canvasRef} className="bg-white shadow-2xl" />
            </div>
            <div className="absolute bottom-6 right-6 flex gap-2 bg-white/90 p-2 rounded-full shadow-lg z-50">
                <button onClick={() => setZoomLevel(p => Math.max(0.5, p - 0.1))} className="p-2 hover:bg-gray-100 rounded-full"><ZoomOut size={18}/></button>
                <span className="text-xs font-mono self-center w-12 text-center">{(zoomLevel * 100).toFixed(0)}%</span>
                <button onClick={() => setZoomLevel(p => Math.min(2.0, p + 0.1))} className="p-2 hover:bg-gray-100 rounded-full"><ZoomIn size={18}/></button>
            </div>
        </div>
    );
};

interface InvoiceDesignerProps { setIsDirty: (isDirty: boolean) => void; setCurrentPage: (page: Page) => void; }

const InvoiceDesigner: React.FC<InvoiceDesignerProps> = ({ setIsDirty, setCurrentPage }) => {
    const { state, dispatch, showToast } = useAppContext();
    const { showConfirm } = useDialog();
    const [docType, setDocType] = useState<DocumentType>('INVOICE');
    const [activeTab, setActiveTab] = useState<'layout' | 'sections' | 'content' | 'labels' | 'branding' | 'fonts'>('layout');
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [activeColorKey, setActiveColorKey] = useState<keyof InvoiceTemplateConfig['colors'] | null>(null);
    const fontFileInputRef = useRef<HTMLInputElement>(null);

    // Initial State & History for Undo/Redo
    const getInitialConfig = () => {
        const conf = JSON.parse(JSON.stringify(state.invoiceTemplate));
        if (!conf.layout.sectionOrdering) {
            conf.layout.sectionOrdering = ['header', 'title', 'details', 'table', 'totals', 'words', 'bankDetails', 'terms', 'signature', 'footer'];
        }
        return conf;
    };
    const [localConfig, setLocalConfig] = useState<ExtendedLayoutConfig>(getInitialConfig());
    const [history, setHistory] = useState<ExtendedLayoutConfig[]>([getInitialConfig()]);
    const [historyIndex, setHistoryIndex] = useState(0);

    const updateConfig = (newConfig: ExtendedLayoutConfig) => {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(newConfig);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
        setLocalConfig(newConfig);
        setIsDirty(true);
    };

    const undo = () => {
        if (historyIndex > 0) {
            setHistoryIndex(historyIndex - 1);
            setLocalConfig(history[historyIndex - 1]);
        }
    };

    const redo = () => {
        if (historyIndex < history.length - 1) {
            setHistoryIndex(historyIndex + 1);
            setLocalConfig(history[historyIndex + 1]);
        }
    };

    const handleConfigChange = (section: keyof ExtendedLayoutConfig, key: string, value: any) => {
        const newConfig = { ...localConfig, [section]: { ...localConfig[section], [key]: value } };
        updateConfig(newConfig);
    };

    const applyPreset = (presetName: string) => {
        const preset = PRESETS[presetName];
        if (!preset) return;
        
        // Merge preset with current config but PRESERVE content fields
        // We only want to overwrite colors, fonts, and layout structure
        const newConfig = {
            ...localConfig,
            colors: { ...localConfig.colors, ...preset.colors },
            fonts: { ...localConfig.fonts, ...preset.fonts },
            layout: { ...localConfig.layout, ...preset.layout }, // Overwrite layout structure (sectionOrdering)
            // Content is PRESERVED, except strictly visual toggles if defined in preset (e.g. showAmountInWords)
            content: { 
                ...localConfig.content, 
                ...preset.content 
            }
        };
        updateConfig(newConfig);
        showToast(`Applied ${presetName} preset`);
    };

    const moveSection = (index: number, direction: 'up' | 'down') => {
        const sections = [...(localConfig.layout.sectionOrdering || [])];
        if (direction === 'up' && index > 0) {
            [sections[index], sections[index - 1]] = [sections[index - 1], sections[index]];
        } else if (direction === 'down' && index < sections.length - 1) {
            [sections[index], sections[index + 1]] = [sections[index + 1], sections[index]];
        }
        handleConfigChange('layout', 'sectionOrdering', sections);
    };

    const handleFontUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    const fontName = file.name.replace(/\.[^/.]+$/, "");
                    dispatch({ type: 'ADD_CUSTOM_FONT', payload: { id: `font-${Date.now()}`, name: fontName, data: event.target.result as string } });
                    showToast(`Font "${fontName}" added.`);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="flex h-full bg-gray-50 dark:bg-slate-950 overflow-hidden font-sans relative">
            <ColorPickerModal isOpen={showColorPicker} onClose={() => setShowColorPicker(false)} initialColor={activeColorKey ? localConfig.colors[activeColorKey] : '#000'} onChange={(c) => activeColorKey && handleConfigChange('colors', activeColorKey, c)} />
            
            <aside className="w-[350px] bg-white dark:bg-slate-900 border-r dark:border-slate-800 flex flex-col h-full z-20">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50 dark:bg-slate-900">
                    <div className="flex items-center gap-2">
                        <button onClick={() => setCurrentPage('DASHBOARD')}><ArrowLeft size={20}/></button>
                        <h2 className="font-bold text-sm">Invoice Designer</h2>
                    </div>
                    <div className="flex gap-1">
                        <button onClick={undo} disabled={historyIndex === 0} className="p-1 disabled:opacity-30"><Undo size={16}/></button>
                        <button onClick={redo} disabled={historyIndex === history.length - 1} className="p-1 disabled:opacity-30"><Redo size={16}/></button>
                        <Button onClick={() => { dispatch({ type: 'SET_DOCUMENT_TEMPLATE', payload: { type: docType, config: localConfig } }); showToast("Saved!"); setIsDirty(false); }} className="h-8 px-3 text-xs bg-emerald-600"><Save size={14} className="mr-1" /> Save</Button>
                    </div>
                </div>

                <div className="flex border-b bg-white dark:bg-slate-900 overflow-x-auto">
                    {[
                        { id: 'layout', icon: Layout, label: 'Layout' },
                        { id: 'sections', icon: Layers, label: 'Sections' },
                        { id: 'branding', icon: Palette, label: 'Style' },
                        { id: 'content', icon: FileText, label: 'Content' },
                        { id: 'labels', icon: Edit3, label: 'Labels' },
                        { id: 'fonts', icon: Type, label: 'Fonts' },
                    ].map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-1 min-w-[60px] py-3 flex flex-col items-center justify-center gap-1 text-[10px] font-medium border-b-2 ${activeTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}>
                            <tab.icon size={16} />{tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar pb-20">
                    {activeTab === 'layout' && (
                        <div className="space-y-4">
                            <label className="text-xs font-bold text-slate-500 uppercase">Presets (Colors & Layout Only)</label>
                            <div className="grid grid-cols-2 gap-2">
                                {Object.keys(PRESETS).map(name => <button key={name} onClick={() => applyPreset(name)} className="px-3 py-2 text-xs border rounded">{name}</button>)}
                            </div>
                            <div className="space-y-2 pt-2 border-t">
                                <div className="flex justify-between"><span className="text-xs">Border Radius</span><span className="text-xs">{localConfig.layout.borderRadius || 0}px</span></div>
                                <input type="range" min="0" max="20" value={localConfig.layout.borderRadius || 0} onChange={e => handleConfigChange('layout', 'borderRadius', parseInt(e.target.value))} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"/>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between"><span className="text-xs">Table Padding</span><span className="text-xs">{localConfig.layout.tablePadding || 3}mm</span></div>
                                <input type="range" min="1" max="10" value={localConfig.layout.tablePadding || 3} onChange={e => handleConfigChange('layout', 'tablePadding', parseInt(e.target.value))} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"/>
                            </div>
                        </div>
                    )}

                    {activeTab === 'sections' && (
                        <div className="space-y-2">
                            <p className="text-xs text-gray-500 mb-2">Drag sections to reorder. Toggle visibility with the eye icon.</p>
                            {(localConfig.layout.sectionOrdering || []).map((section, idx) => {
                                const info = SECTIONS_INFO[section];
                                const isVisible = info.toggle ? (localConfig.content as any)[info.toggle] !== false : true;
                                
                                return (
                                <div key={section} className={`flex items-center justify-between p-2 bg-white border rounded shadow-sm ${!isVisible ? 'opacity-50' : ''}`}>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium">{info?.label || section}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {info.toggle && (
                                            <button 
                                                onClick={() => handleConfigChange('content', info.toggle!, !isVisible)}
                                                className={`p-1 rounded hover:bg-gray-100 ${isVisible ? 'text-indigo-600' : 'text-gray-400'}`}
                                                title={isVisible ? 'Hide Section' : 'Show Section'}
                                            >
                                                {isVisible ? <Eye size={14}/> : <EyeOff size={14}/>}
                                            </button>
                                        )}
                                        <div className="w-px h-4 bg-gray-200 mx-1"></div>
                                        <button onClick={() => moveSection(idx, 'up')} disabled={idx === 0} className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"><ArrowUp size={14}/></button>
                                        <button onClick={() => moveSection(idx, 'down')} disabled={idx === (localConfig.layout.sectionOrdering?.length || 0) - 1} className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"><ArrowDown size={14}/></button>
                                    </div>
                                </div>
                            )})}
                        </div>
                    )}

                    {activeTab === 'branding' && (
                        <div className="grid grid-cols-2 gap-3">
                            {['primary', 'secondary', 'tableHeaderBg', 'tableHeaderText', 'borderColor', 'alternateRowBg'].map(k => (
                                <button key={k} onClick={() => { setActiveColorKey(k as any); setShowColorPicker(true); }} className="flex items-center gap-2 p-2 border rounded hover:bg-gray-50">
                                    <div className="w-6 h-6 rounded-full border" style={{ background: (localConfig.colors as any)[k] }}></div>
                                    <span className="text-xs capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {activeTab === 'content' && (
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1">Bank Details</label>
                                <textarea value={localConfig.content.bankDetails || ''} onChange={e => handleConfigChange('content', 'bankDetails', e.target.value)} rows={4} className="w-full p-2 text-xs border rounded" placeholder="Bank Name, Account No, IFSC..." />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1">Terms & Conditions</label>
                                <textarea value={localConfig.content.termsText || ''} onChange={e => handleConfigChange('content', 'termsText', e.target.value)} rows={3} className="w-full p-2 text-xs border rounded" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1">Footer Text</label>
                                <textarea value={localConfig.content.footerText} onChange={e => handleConfigChange('content', 'footerText', e.target.value)} rows={2} className="w-full p-2 text-xs border rounded" />
                            </div>
                            <div className="space-y-2">
                                {['showTerms', 'showSignature', 'showQr', 'showAmountInWords'].map(k => (
                                    <label key={k} className="flex items-center gap-2 text-xs">
                                        <input type="checkbox" checked={(localConfig.content as any)[k] !== false} onChange={e => handleConfigChange('content', k, e.target.checked)} />
                                        {k.replace(/([A-Z])/g, ' $1').replace('show ', '')}
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'labels' && (
                        <div className="space-y-3">
                            {Object.keys(defaultLabels).map(key => (
                                <div key={key}>
                                    <span className="text-[10px] text-slate-500 block mb-1 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                                    <input type="text" value={(localConfig.content.labels as any)?.[key] || ''} onChange={e => handleConfigChange('content', 'labels', { ...localConfig.content.labels, [key]: e.target.value })} className="w-full p-2 text-xs border rounded" />
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'fonts' && (
                        <div className="space-y-4">
                            <div className="p-3 border border-dashed rounded bg-gray-50">
                                <Button onClick={() => fontFileInputRef.current?.click()} variant="secondary" className="w-full text-xs"><Upload size={14} className="mr-2"/> Upload .ttf Font</Button>
                                <input type="file" accept=".ttf" ref={fontFileInputRef} className="hidden" onChange={handleFontUpload} />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1">Header Font</label>
                                <select value={localConfig.fonts.titleFont} onChange={e => handleConfigChange('fonts', 'titleFont', e.target.value)} className="w-full p-2 text-xs border rounded">
                                    <option value="helvetica">Helvetica</option><option value="times">Times</option><option value="courier">Courier</option>
                                    {state.customFonts.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1">Body Font</label>
                                <select value={localConfig.fonts.bodyFont} onChange={e => handleConfigChange('fonts', 'bodyFont', e.target.value)} className="w-full p-2 text-xs border rounded">
                                    <option value="helvetica">Helvetica</option><option value="times">Times</option><option value="courier">Courier</option>
                                    {state.customFonts.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
                                </select>
                            </div>
                        </div>
                    )}
                </div>
            </aside>

            <main className="flex-1 flex flex-col h-full relative bg-gray-100 dark:bg-slate-900/50">
                <PDFCanvasPreview config={localConfig} profile={state.profile} docType={docType} customFonts={state.customFonts} />
            </main>
        </div>
    );
};

export default InvoiceDesigner;
