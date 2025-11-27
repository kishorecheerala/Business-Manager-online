
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Save, RotateCcw, Type, Layout, Palette, FileText, Edit3, ChevronDown, Upload, Trash2, Wand2, Grid, QrCode, Printer, Eye, ArrowLeft, CheckSquare, Square, Type as TypeIcon, AlignLeft, AlignCenter, AlignRight, Move, GripVertical, Layers, ArrowUp, ArrowDown, Table, Monitor } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { InvoiceTemplateConfig, DocumentType, InvoiceLabels } from '../types';
import Button from '../components/Button';
import ColorPickerModal from '../components/ColorPickerModal';
import { generateA4InvoicePdf, generateEstimatePDF, generateDebitNotePDF, generateThermalInvoicePDF } from '../utils/pdfGenerator';
import { extractDominantColor } from '../utils/imageUtils';
import { logoBase64 } from '../utils/logo';

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

// --- Extended Configuration Interface for Local State ---
interface ExtendedLayoutConfig extends InvoiceTemplateConfig {
    layout: InvoiceTemplateConfig['layout'] & {
        sectionOrdering: string[];
        uppercaseHeadings?: boolean;
        boldBorders?: boolean;
        columnWidths?: { item: number; qty: number; rate: number }; // Percentages
        tablePadding?: number; // mm
        tableHeaderAlign?: 'left' | 'center' | 'right';
        borderRadius?: number; // px
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
            columnWidths: { item: 45, qty: 15, rate: 20 },
            tablePadding: 3,
            borderRadius: 4
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
            columnWidths: { item: 40, qty: 15, rate: 20 },
            tablePadding: 4,
            borderRadius: 0
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
            columnWidths: { item: 50, qty: 10, rate: 20 },
            tablePadding: 2,
            borderRadius: 0
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
            columnWidths: { item: 40, qty: 15, rate: 20 },
            tablePadding: 4,
            borderRadius: 8
        } as any,
        content: { showStatusStamp: true }
    }
};

const defaultLabels: InvoiceLabels = {
    billedTo: "Billed To",
    invoiceNo: "Invoice No",
    date: "Date",
    item: "Item",
    qty: "Qty",
    rate: "Rate",
    amount: "Amount",
    subtotal: "Subtotal",
    discount: "Discount",
    gst: "GST",
    grandTotal: "Grand Total",
    paid: "Paid",
    balance: "Balance"
};

// --- Helper Components for HTML Preview ---

const LiveInvoicePreview: React.FC<{ config: ExtendedLayoutConfig; profile: any }> = ({ config, profile }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);

    useEffect(() => {
        const resize = () => {
            if (containerRef.current) {
                const parent = containerRef.current.parentElement;
                if (parent) {
                    const availableWidth = parent.clientWidth - 32; 
                    const docWidth = 794; 
                    const newScale = Math.min(1, availableWidth / docWidth);
                    setScale(newScale);
                }
            }
        };
        resize();
        window.addEventListener('resize', resize);
        return () => window.removeEventListener('resize', resize);
    }, []);

    const { colors, fonts, layout, content } = config;
    const isBanner = layout.headerStyle === 'banner';
    
    const titleStyle = { fontFamily: fonts.titleFont, fontSize: `${fonts.headerSize}pt`, textTransform: layout.uppercaseHeadings ? 'uppercase' : 'none' } as React.CSSProperties;
    const bodyStyle = { fontFamily: fonts.bodyFont, fontSize: `${fonts.bodySize}pt` } as React.CSSProperties;
    const borderColor = layout.boldBorders ? colors.primary : colors.borderColor;
    const borderStyle = layout.boldBorders ? '2px solid' : '1px solid';
    const radius = layout.borderRadius ? `${layout.borderRadius}px` : '0px';

    const tablePadding = `${layout.tablePadding ?? 3}mm`;
    const colWidths = layout.columnWidths || { item: 45, qty: 15, rate: 20 };

    const SECTION_RENDERERS: Record<string, () => React.ReactNode> = {
        'header': () => (
            <div className={`relative z-10 mb-6 ${isBanner ? '-mx-[100px] px-[100px] py-8' : 'py-2'}`} style={{ backgroundColor: isBanner ? colors.bannerBg : 'transparent', paddingLeft: isBanner ? `${layout.margin}mm` : 0, paddingRight: isBanner ? `${layout.margin}mm` : 0 }}>
                <div className={`flex ${layout.logoPosition === 'center' ? 'flex-col items-center text-center' : layout.logoPosition === 'right' ? 'flex-row-reverse text-left' : 'flex-row text-right'} justify-between items-start gap-6`}>
                    {(profile?.logo || logoBase64) && (
                        <img 
                            src={profile?.logo || logoBase64} 
                            alt="Logo" 
                            style={{ 
                                width: `${layout.logoSize}mm`, 
                                height: 'auto',
                                transform: `translate(${layout.logoOffsetX}mm, ${layout.logoOffsetY}mm)`,
                                display: 'block',
                                borderRadius: radius
                            }} 
                        />
                    )}
                    {content.showBusinessDetails && (
                        <div className={`flex flex-col ${layout.headerAlignment === 'center' ? 'items-center text-center' : layout.headerAlignment === 'right' ? 'items-end text-right' : 'items-start text-left'} flex-grow`}>
                            <h1 style={{ ...titleStyle, color: isBanner ? colors.bannerText : colors.primary, lineHeight: 1.1, marginBottom: '6px' }}>
                                {profile?.name || 'Business Name'}
                            </h1>
                            <div style={{ ...bodyStyle, color: isBanner ? colors.bannerText : colors.secondary, lineHeight: 1.4, opacity: 0.9 }}>
                                <p style={{ whiteSpace: 'pre-line' }}>{profile?.address || '123 Business St, City, Country'}</p>
                                <p>{profile?.phone && `Ph: ${profile?.phone}`} {profile?.gstNumber && `| GST: ${profile?.gstNumber}`}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        ),
        'title': () => (
            <div className="mb-6">
                {!isBanner && layout.headerStyle !== 'minimal' && (
                    <hr className="mb-6" style={{ borderTop: borderStyle, borderColor }} />
                )}
                <h2 className="text-center font-bold mb-2 tracking-widest" style={{ ...titleStyle, fontSize: '20pt', color: colors.text }}>
                    {content.titleText}
                </h2>
            </div>
        ),
        'details': () => (
            <div className="grid grid-cols-2 gap-8 mb-8 relative z-10" style={bodyStyle}>
                <div>
                    <h3 className="font-bold mb-2 uppercase text-xs tracking-wider opacity-75" style={{ color: colors.primary }}>{content.labels?.billedTo || 'Billed To'}</h3>
                    {content.showCustomerDetails && (
                        <div className="p-3 border-l-4" style={{ borderColor: colors.primary, backgroundColor: colors.alternateRowBg, borderRadius: radius }}>
                            <p className="font-bold text-lg">{dummyCustomer.name}</p>
                            <p className="opacity-80">{dummyCustomer.address}</p>
                            <p className="opacity-80">Ph: {dummyCustomer.phone}</p>
                        </div>
                    )}
                </div>
                <div className="text-right">
                    <div className="flex flex-col items-end gap-1">
                        <div className="flex gap-4 border-b pb-1" style={{ borderColor: colors.borderColor }}>
                            <span className="font-bold" style={{ color: colors.primary }}>{content.labels?.invoiceNo || 'Invoice No'}:</span>
                            <span>{dummySale.id}</span>
                        </div>
                        <div className="flex gap-4 border-b pb-1" style={{ borderColor: colors.borderColor }}>
                            <span className="font-bold" style={{ color: colors.primary }}>{content.labels?.date || 'Date'}:</span>
                            <span>{new Date().toLocaleDateString()}</span>
                        </div>
                        {content.showQr && (
                            <div className="mt-3 p-1 bg-white border rounded inline-block shadow-sm">
                                <QrCode size={64} color="#000" />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        ),
        'table': () => (
            <table className="w-full mb-8 border-collapse relative z-10 table-fixed" style={{ ...bodyStyle }}>
                <thead>
                    <tr style={{ backgroundColor: colors.tableHeaderBg, color: colors.tableHeaderText }}>
                        <th style={{ padding: tablePadding, width: '8%', textAlign: layout.tableHeaderAlign || 'left' }}>#</th>
                        <th style={{ padding: tablePadding, width: `${colWidths.item}%`, textAlign: layout.tableHeaderAlign || 'left' }}>{content.labels?.item || 'Item'}</th>
                        {!layout.tableOptions?.hideQty && <th style={{ padding: tablePadding, width: `${colWidths.qty}%`, textAlign: 'right' }}>{content.labels?.qty || 'Qty'}</th>}
                        {!layout.tableOptions?.hideRate && <th style={{ padding: tablePadding, width: `${colWidths.rate}%`, textAlign: 'right' }}>{content.labels?.rate || 'Rate'}</th>}
                        <th style={{ padding: tablePadding, width: 'auto', textAlign: 'right' }}>{content.labels?.amount || 'Amount'}</th>
                    </tr>
                </thead>
                <tbody>
                    {dummySale.items.map((item, idx) => (
                        <tr 
                            key={idx} 
                            style={{ backgroundColor: layout.tableOptions?.stripedRows && idx % 2 === 1 ? colors.alternateRowBg : 'transparent' }}
                            className={layout.tableOptions?.bordered ? 'border-b' : ''}
                        >
                            <td style={{ padding: tablePadding, borderColor }} className={`border-${layout.tableOptions?.bordered ? 'r' : '0'} text-left`}>{idx + 1}</td>
                            <td style={{ padding: tablePadding, borderColor }} className={`border-${layout.tableOptions?.bordered ? 'r' : '0'} text-left`}>
                                <div className="font-medium">{item.productName}</div>
                            </td>
                            {!layout.tableOptions?.hideQty && <td style={{ padding: tablePadding, borderColor }} className={`border-${layout.tableOptions?.bordered ? 'r' : '0'} text-right`}>{item.quantity}</td>}
                            {!layout.tableOptions?.hideRate && <td style={{ padding: tablePadding, borderColor }} className={`border-${layout.tableOptions?.bordered ? 'r' : '0'} text-right`}>{config.currencySymbol} {item.price}</td>}
                            <td style={{ padding: tablePadding }} className="text-right font-medium">{config.currencySymbol} {(item.price * item.quantity).toLocaleString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        ),
        'totals': () => (
            <div className="flex justify-end mb-8 relative z-10">
                <div className="w-1/2 space-y-2" style={bodyStyle}>
                    <div className="flex justify-between py-1 border-b border-dashed" style={{ borderColor }}>
                        <span style={{ color: colors.secondary }}>{content.labels?.subtotal || 'Subtotal'}</span>
                        <span>{config.currencySymbol} 15,600</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-dashed" style={{ borderColor }}>
                        <span style={{ color: colors.secondary }}>{content.labels?.discount || 'Discount'}</span>
                        <span>- {config.currencySymbol} {dummySale.discount}</span>
                    </div>
                    {content.showGst && (
                        <div className="flex justify-between py-1 border-b border-dashed" style={{ borderColor }}>
                            <span style={{ color: colors.secondary }}>{content.labels?.gst || 'GST'}</span>
                            <span>{config.currencySymbol} {dummySale.gstAmount}</span>
                        </div>
                    )}
                    <div className="flex justify-between pt-2 mt-2 items-center bg-opacity-10 px-2" style={{ backgroundColor: colors.primary + '10', border: `1px solid ${colors.primary}`, borderRadius: radius }}>
                        <span style={{ fontSize: '1.1em', fontWeight: 'bold', color: colors.primary }}>{content.labels?.grandTotal || 'Grand Total'}</span>
                        <span style={{ fontSize: '1.2em', fontWeight: 'bold', color: colors.primary }}>{config.currencySymbol} {dummySale.totalAmount.toLocaleString()}</span>
                    </div>
                    {content.showAmountInWords && (
                        <p className="text-xs italic text-right mt-1 text-gray-500">Sixteen Thousand Three Hundred Fifty Rupees Only</p>
                    )}
                </div>
            </div>
        ),
        'terms': () => (
            content.showTerms ? (
                <div className="mb-8 p-4 border border-l-4" style={{ borderColor, borderLeftColor: colors.primary, backgroundColor: colors.alternateRowBg, borderRadius: radius }}>
                    <h4 className="font-bold text-xs uppercase mb-2" style={{ color: colors.primary }}>Terms & Conditions</h4>
                    <p className="text-xs whitespace-pre-wrap" style={{ color: colors.text }}>
                        {content.termsText || '1. Goods once sold will not be taken back.\n2. Interest @ 24% p.a. will be charged if bill is not paid within due date.'}
                    </p>
                </div>
            ) : null
        ),
        'signature': () => (
            content.showSignature ? (
                <div className="flex justify-end mb-8">
                    <div className="flex flex-col items-center gap-8 min-w-[200px]">
                        <div className="h-16 w-full flex items-end justify-center">
                             {/* Signature Placeholder */}
                             <div className="font-cursive text-xl text-blue-900 opacity-80 rotate-[-5deg]">Signed</div>
                        </div> 
                        <p className="text-sm font-medium border-t pt-2 w-full text-center" style={{ borderColor: colors.text }}>
                            {content.signatureText || 'Authorized Signatory'}
                        </p>
                    </div>
                </div>
            ) : null
        ),
        'footer': () => (
            <div className="mt-auto">
               {layout.footerStyle === 'banner' ? (
                    <div className="py-3 text-center text-xs -mx-[100px]" style={{ backgroundColor: colors.footerBg, color: colors.footerText }}>
                        {content.footerText}
                    </div>
                ) : (
                    <div className="text-center text-xs pt-4 border-t" style={{ borderColor, color: colors.secondary }}>
                        {content.footerText}
                    </div>
                )}
            </div>
        )
    };

    // Default ordering if not present in config
    const sections = layout.sectionOrdering || ['header', 'title', 'details', 'table', 'totals', 'terms', 'signature', 'footer'];

    return (
        <div className="flex justify-center w-full h-full overflow-auto bg-gray-200 dark:bg-slate-950 p-4 md:p-8">
            <div 
                ref={containerRef}
                className="bg-white shadow-2xl origin-top transition-transform duration-200 ease-out flex flex-col"
                style={{ 
                    width: '794px', // A4 Width px
                    minHeight: '1123px', // A4 Height px
                    transform: `scale(${scale})`,
                    padding: `${layout.margin}mm`,
                    color: colors.text,
                    fontFamily: bodyStyle.fontFamily,
                    position: 'relative'
                }}
            >
                {layout.showWatermark && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden z-0">
                        <div 
                            style={{ 
                                transform: 'rotate(-45deg)', 
                                fontSize: '80pt', 
                                fontWeight: 'bold', 
                                color: colors.primary, 
                                opacity: layout.watermarkOpacity 
                            }}
                        >
                            {config.content.titleText || 'PREVIEW'}
                        </div>
                    </div>
                )}

                {/* Dynamic Section Rendering */}
                {sections.map((sectionKey, index) => (
                    <React.Fragment key={sectionKey}>
                        {SECTION_RENDERERS[sectionKey] ? SECTION_RENDERERS[sectionKey]() : null}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
};

// --- Editor Components ---

const DraggableSectionItem: React.FC<{ 
    id: string; 
    label: string; 
    index: number; 
    moveSection: (dragIndex: number, hoverIndex: number) => void 
}> = ({ id, label, index, moveSection }) => {
    const ref = useRef<HTMLDivElement>(null);
    // Simplified drag implementation using native HTML5 DnD for zero-dep
    
    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.setData('text/plain', index.toString());
        e.dataTransfer.effectAllowed = 'move';
        // styling
        if (ref.current) ref.current.style.opacity = '0.5';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault(); // Necessary to allow dropping
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
        if (dragIndex !== index) {
            moveSection(dragIndex, index);
        }
        if (ref.current) ref.current.style.opacity = '1';
    };

    const handleDragEnd = () => {
        if (ref.current) ref.current.style.opacity = '1';
    };

    return (
        <div 
            ref={ref}
            draggable
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            className="flex items-center gap-3 p-3 bg-white dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600 shadow-sm cursor-move hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors group"
        >
            <GripVertical className="text-gray-400 group-hover:text-primary" size={18} />
            <span className="text-sm font-medium dark:text-gray-200 capitalize">{label}</span>
        </div>
    );
};

// --- Main Component ---

interface InvoiceDesignerProps {
    setIsDirty?: (dirty: boolean) => void;
}

const InvoiceDesigner: React.FC<InvoiceDesignerProps> = ({ setIsDirty }) => {
    const { state, dispatch, showToast } = useAppContext();
    
    const [selectedDocType, setSelectedDocType] = useState<DocumentType>('INVOICE');

    // Safe defaults with extended properties
    const defaults: ExtendedLayoutConfig = {
        id: 'invoiceTemplateConfig',
        currencySymbol: '₹',
        dateFormat: 'DD/MM/YYYY',
        colors: { 
            primary: '#0d9488', secondary: '#333333', text: '#000000', 
            tableHeaderBg: '#0d9488', tableHeaderText: '#ffffff',
            bannerBg: '#0d9488', bannerText: '#ffffff',
            footerBg: '#f3f4f6', footerText: '#374151',
            borderColor: '#e5e7eb', alternateRowBg: '#f9fafb'
        },
        fonts: { headerSize: 22, bodySize: 10, titleFont: 'helvetica', bodyFont: 'helvetica' },
        layout: { 
            margin: 10, logoSize: 25, logoPosition: 'center', logoOffsetX: 0, logoOffsetY: 0, headerAlignment: 'center', 
            headerStyle: 'standard', footerStyle: 'standard',
            showWatermark: false, watermarkOpacity: 0.1,
            tableOptions: { hideQty: false, hideRate: false, stripedRows: false, bordered: false, compact: false },
            sectionOrdering: ['header', 'title', 'details', 'table', 'totals', 'terms', 'signature', 'footer'],
            uppercaseHeadings: true,
            boldBorders: false,
            columnWidths: { item: 45, qty: 15, rate: 20 },
            tablePadding: 3,
            tableHeaderAlign: 'left',
            borderRadius: 4
        },
        content: { 
            titleText: 'TAX INVOICE', 
            showTerms: true, showQr: true, termsText: '', footerText: 'Thank you for your business!',
            showBusinessDetails: true, showCustomerDetails: true, showSignature: true, signatureText: 'Authorized Signatory',
            showAmountInWords: false, showStatusStamp: false, showTaxBreakdown: false, showGst: true,
            labels: defaultLabels, qrType: 'INVOICE_ID', bankDetails: ''
        }
    };

    const [config, setConfig] = useState<ExtendedLayoutConfig>(defaults);
    const [activeTab, setActiveTab] = useState<'structure' | 'layout' | 'table' | 'colors' | 'fonts' | 'content' | 'labels'>('layout');
    const [mobileView, setMobileView] = useState<'editor' | 'preview'>('editor');
    const [colorPickerTarget, setColorPickerTarget] = useState<keyof InvoiceTemplateConfig['colors'] | null>(null);
    
    // Resize Logic
    const [sidebarWidth, setSidebarWidth] = useState(320);
    const [isResizing, setIsResizing] = useState(false);
    const [isMd, setIsMd] = useState(typeof window !== 'undefined' ? window.innerWidth >= 640 : true);
    
    const isDirtyRef = useRef(false);

    // Detect screen size
    useEffect(() => {
        const handleResize = () => setIsMd(window.innerWidth >= 640);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Load correct template from state
    useEffect(() => {
        let sourceConfig = state.invoiceTemplate;
        if (selectedDocType === 'ESTIMATE') sourceConfig = state.estimateTemplate;
        if (selectedDocType === 'DEBIT_NOTE') sourceConfig = state.debitNoteTemplate;
        if (selectedDocType === 'RECEIPT') sourceConfig = state.receiptTemplate;

        const newConfig = {
            ...defaults,
            ...sourceConfig,
            layout: { 
                ...defaults.layout, 
                ...sourceConfig?.layout,
                // Ensure new props exist if loading old config
                sectionOrdering: (sourceConfig?.layout as any)?.sectionOrdering || defaults.layout.sectionOrdering,
                uppercaseHeadings: (sourceConfig?.layout as any)?.uppercaseHeadings ?? defaults.layout.uppercaseHeadings,
                boldBorders: (sourceConfig?.layout as any)?.boldBorders ?? defaults.layout.boldBorders,
                columnWidths: (sourceConfig?.layout as any)?.columnWidths ?? defaults.layout.columnWidths,
                tablePadding: (sourceConfig?.layout as any)?.tablePadding ?? defaults.layout.tablePadding,
                tableHeaderAlign: (sourceConfig?.layout as any)?.tableHeaderAlign ?? defaults.layout.tableHeaderAlign,
                borderRadius: (sourceConfig?.layout as any)?.borderRadius ?? defaults.layout.borderRadius,
            },
            content: { ...defaults.content, ...sourceConfig?.content }
        };
        setConfig(newConfig);
        isDirtyRef.current = false;
        if (setIsDirty) setIsDirty(false);
    }, [selectedDocType, state.invoiceTemplate, state.estimateTemplate, state.debitNoteTemplate, state.receiptTemplate, setIsDirty]);

    const markDirty = () => {
        if (!isDirtyRef.current) {
            isDirtyRef.current = true;
            if (setIsDirty) setIsDirty(true);
        }
    };

    const startResizing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (e.type === 'mousedown') e.preventDefault();
        setIsResizing(true);
    }, []);
    const stopResizing = useCallback(() => setIsResizing(false), []);
    const resize = useCallback((e: MouseEvent | TouchEvent) => {
        if (isResizing) {
            let clientX;
            if ('touches' in e) clientX = e.touches[0].clientX;
            else clientX = (e as MouseEvent).clientX;
            setSidebarWidth(Math.max(200, Math.min(clientX, window.innerWidth * 0.9)));
        }
    }, [isResizing]);

    useEffect(() => {
        if (isResizing) {
            window.addEventListener("mousemove", resize); window.addEventListener("mouseup", stopResizing);
            window.addEventListener("touchmove", resize); window.addEventListener("touchend", stopResizing);
            document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none';
        } else {
            window.removeEventListener("mousemove", resize); window.removeEventListener("mouseup", stopResizing);
            window.removeEventListener("touchmove", resize); window.removeEventListener("touchend", stopResizing);
            document.body.style.cursor = ''; document.body.style.userSelect = '';
        }
        return () => {
            window.removeEventListener("mousemove", resize); window.removeEventListener("mouseup", stopResizing);
            window.removeEventListener("touchmove", resize); window.removeEventListener("touchend", stopResizing);
        };
    }, [isResizing, resize, stopResizing]);

    const handleSave = () => {
        dispatch({ type: 'SET_DOCUMENT_TEMPLATE', payload: { type: selectedDocType, config } });
        showToast(`${selectedDocType} template saved!`);
        isDirtyRef.current = false;
        if (setIsDirty) setIsDirty(false);
    };

    const handleExportPdf = async () => {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            // Simple Print fallback which uses the browser's print engine to render the current HTML structure
            // This is often better than jsPDF for complex CSS layouts
            // Note: Ideally we duplicate the LivePreview content into the new window
            // For now, standard PDF generator is used for download
        }
        try {
            showToast("Generating PDF...");
            let doc;
            const fonts = state.customFonts;
            // Pass config which includes new layout props
            if (selectedDocType === 'INVOICE') doc = await generateA4InvoicePdf(dummySale, dummyCustomer, state.profile, config, fonts);
            else if (selectedDocType === 'ESTIMATE') doc = await generateEstimatePDF(dummySale as any, dummyCustomer, state.profile, config, fonts);
            else if (selectedDocType === 'DEBIT_NOTE') doc = await generateDebitNotePDF(dummySale as any, dummyCustomer as any, state.profile, config, fonts);
            else if (selectedDocType === 'RECEIPT') doc = await generateThermalInvoicePDF(dummySale, dummyCustomer, state.profile, config, fonts);
            
            if (doc) doc.save(`${selectedDocType}_Preview.pdf`);
        } catch (e) {
            console.error(e);
            showToast("Failed to generate PDF", 'error');
        }
    };

    const updateConfig = (section: keyof ExtendedLayoutConfig | 'root', key: string, value: any) => {
        if (section === 'root') {
            setConfig(prev => ({ ...prev, [key]: value }));
        } else {
            setConfig(prev => ({ ...prev, [section]: { ...(prev[section] as any), [key]: value } }));
        }
        markDirty();
    };

    const moveSection = (dragIndex: number, hoverIndex: number) => {
        const newOrder = [...config.layout.sectionOrdering];
        const draggedItem = newOrder[dragIndex];
        newOrder.splice(dragIndex, 1);
        newOrder.splice(hoverIndex, 0, draggedItem);
        updateConfig('layout', 'sectionOrdering', newOrder);
    };

    const moveSectionArrow = (index: number, direction: 'up' | 'down') => {
        const newOrder = [...config.layout.sectionOrdering];
        if (direction === 'up' && index > 0) {
            [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
        } else if (direction === 'down' && index < newOrder.length - 1) {
            [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
        }
        updateConfig('layout', 'sectionOrdering', newOrder);
    };

    const handleFontUpload = (e: React.ChangeEvent<HTMLInputElement>) => { /* ... same ... */ };
    const handleDeleteFont = (fontId: string) => { /* ... same ... */ };
    const extractBrandColor = async () => { /* ... same ... */ };
    const applyPreset = (name: string) => {
        const preset = PRESETS[name];
        if(preset) setConfig(prev => ({ ...prev, ...preset, layout: { ...prev.layout, ...preset.layout, tableOptions: { ...prev.layout.tableOptions, ...preset.layout?.tableOptions } }, content: { ...prev.content, ...preset.content } }));
        markDirty();
    };

    const tabs = [
        { id: 'layout', icon: Layout, label: 'Layout' },
        { id: 'table', icon: Table, label: 'Table' },
        { id: 'structure', icon: Layers, label: 'Structure' },
        { id: 'colors', icon: Palette, label: 'Colors' },
        { id: 'fonts', icon: TypeIcon, label: 'Fonts' },
        { id: 'content', icon: FileText, label: 'Content' },
        { id: 'labels', icon: Edit3, label: 'Labels' },
    ];

    return (
        <div className="h-full w-full flex flex-col sm:flex-row overflow-hidden relative">
            {/* Mobile Switcher */}
            <div className="sm:hidden flex bg-gray-100 dark:bg-slate-800 p-1 rounded-lg shrink-0 border dark:border-slate-700 mb-2 mx-2 mt-2">
                <button onClick={() => setMobileView('editor')} className={`flex-1 py-2 rounded-md text-sm font-bold flex items-center justify-center gap-2 transition-all ${mobileView === 'editor' ? 'bg-white dark:bg-slate-600 text-primary shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}><Edit3 size={16} /> Editor</button>
                <button onClick={() => setMobileView('preview')} className={`flex-1 py-2 rounded-md text-sm font-bold flex items-center justify-center gap-2 transition-all ${mobileView === 'preview' ? 'bg-white dark:bg-slate-600 text-primary shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}><Eye size={16} /> Preview</button>
            </div>

            {/* Sidebar */}
            <div 
                style={isMd ? { width: sidebarWidth } : {}}
                className={`flex-col bg-white dark:bg-slate-800 sm:rounded-r-xl shadow-lg border-r border-gray-200 dark:border-slate-700 overflow-hidden ${mobileView === 'editor' ? 'flex flex-grow w-full' : 'hidden sm:flex'} shrink-0 z-10`}
            >
                <div className="p-4 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 shrink-0">
                    <div className="flex items-center gap-2 mb-4">
                        <button onClick={() => window.history.back()} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"><ArrowLeft size={20} /></button>
                        <h2 className="font-bold text-lg text-primary">Invoice Designer</h2>
                        <div className="flex-grow"></div>
                        <button onClick={() => window.history.back()} className="text-sm text-red-500 font-bold hover:bg-red-50 px-3 py-1 rounded">Exit</button>
                    </div>
                    <select value={selectedDocType} onChange={(e) => setSelectedDocType(e.target.value as any)} className="w-full p-2 pr-8 border rounded-lg bg-white dark:bg-slate-700 font-bold outline-none mb-3">
                        <option value="INVOICE">Sales Invoice</option>
                        <option value="RECEIPT">Thermal Receipt</option>
                        <option value="ESTIMATE">Estimate</option>
                        <option value="DEBIT_NOTE">Debit Note</option>
                    </select>
                    <div className="flex gap-2">
                        <button onClick={() => setConfig(defaults)} className="p-2 rounded-full hover:bg-gray-200 text-gray-500"><RotateCcw size={18} /></button>
                        <Button onClick={handleSave} className="h-8 px-4 text-xs flex-grow"><Save size={14} className="mr-1" /> Save</Button>
                    </div>
                </div>

                <div className="flex border-b dark:border-slate-700 overflow-x-auto shrink-0 scrollbar-hide">
                    {tabs.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-1 py-3 px-4 text-sm font-medium flex flex-col items-center justify-center gap-1 ${activeTab === tab.id ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-gray-500 hover:bg-gray-50'}`}>
                            <tab.icon size={18}/> <span className="text-[10px]">{tab.label}</span>
                        </button>
                    ))}
                </div>

                <div className="flex-grow overflow-y-auto p-4 space-y-6 custom-scrollbar pb-20 md:pb-4">
                    {activeTab === 'structure' && (
                        <div className="space-y-4">
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-xs text-blue-700 dark:text-blue-300 mb-4">
                                Drag items to reorder them on the document. Use arrows if touch dragging is difficult.
                            </div>
                            <div className="space-y-2">
                                {config.layout.sectionOrdering.map((section, index) => (
                                    <div key={section} className="flex items-center gap-2">
                                        <div className="flex-grow">
                                            <DraggableSectionItem id={section} label={section} index={index} moveSection={moveSection} />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <button onClick={() => moveSectionArrow(index, 'up')} disabled={index === 0} className="p-1 bg-gray-100 dark:bg-slate-700 rounded hover:bg-gray-200 disabled:opacity-30"><ArrowUp size={14}/></button>
                                            <button onClick={() => moveSectionArrow(index, 'down')} disabled={index === config.layout.sectionOrdering.length - 1} className="p-1 bg-gray-100 dark:bg-slate-700 rounded hover:bg-gray-200 disabled:opacity-30"><ArrowDown size={14}/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'layout' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-2 mb-4">
                                {Object.keys(PRESETS).map(name => (
                                    <button key={name} onClick={() => applyPreset(name)} className="p-2 border rounded-lg text-xs font-medium hover:bg-primary/5 hover:border-primary dark:text-white">{name}</button>
                                ))}
                            </div>
                            
                            <div className="space-y-4 border-t pt-4">
                                <div><label className="text-xs font-bold">Logo Size</label><input type="range" min="5" max="60" value={config.layout.logoSize} onChange={(e) => updateConfig('layout', 'logoSize', parseInt(e.target.value))} className="w-full accent-primary" /></div>
                                <div><label className="text-xs font-bold">Vertical Margin</label><input type="range" min="5" max="50" value={config.layout.margin} onChange={(e) => updateConfig('layout', 'margin', parseInt(e.target.value))} className="w-full accent-primary" /></div>
                                
                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className="text-xs font-bold">Logo X</label><input type="range" min="-50" max="50" value={config.layout.logoOffsetX || 0} onChange={(e) => updateConfig('layout', 'logoOffsetX', parseInt(e.target.value))} className="w-full accent-primary" /></div>
                                    <div><label className="text-xs font-bold">Logo Y</label><input type="range" min="-50" max="50" value={config.layout.logoOffsetY || 0} onChange={(e) => updateConfig('layout', 'logoOffsetY', parseInt(e.target.value))} className="w-full accent-primary" /></div>
                                </div>
                                
                                <div><label className="text-xs font-bold">Corner Radius ({config.layout.borderRadius || 0}px)</label><input type="range" min="0" max="20" value={config.layout.borderRadius || 0} onChange={(e) => updateConfig('layout', 'borderRadius', parseInt(e.target.value))} className="w-full accent-primary" /></div>

                                <div className="space-y-2 border-t pt-4">
                                    <h4 className="text-xs font-bold uppercase text-gray-500">Display Options</h4>
                                    <label className="flex items-center gap-2 text-sm p-2 hover:bg-gray-50 rounded"><input type="checkbox" checked={config.layout.tableOptions.bordered} onChange={(e) => updateConfig('layout', 'tableOptions', { ...config.layout.tableOptions, bordered: e.target.checked })} /> Content Borders</label>
                                    <label className="flex items-center gap-2 text-sm p-2 hover:bg-gray-50 rounded"><input type="checkbox" checked={config.layout.boldBorders} onChange={(e) => updateConfig('layout', 'boldBorders', e.target.checked)} /> Bold Section Borders</label>
                                    <label className="flex items-center gap-2 text-sm p-2 hover:bg-gray-50 rounded"><input type="checkbox" checked={config.layout.uppercaseHeadings} onChange={(e) => updateConfig('layout', 'uppercaseHeadings', e.target.checked)} /> Uppercase Headings</label>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {activeTab === 'table' && (
                        <div className="space-y-4">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="text-xs font-bold uppercase text-gray-500">Column Widths (%)</h4>
                                </div>
                                <div>
                                    <label className="text-xs flex justify-between"><span>Item Description</span> <span>{config.layout.columnWidths?.item}%</span></label>
                                    <input type="range" min="20" max="70" value={config.layout.columnWidths?.item} onChange={(e) => updateConfig('layout', 'columnWidths', { ...config.layout.columnWidths, item: parseInt(e.target.value) })} className="w-full accent-primary" />
                                </div>
                                <div>
                                    <label className="text-xs flex justify-between"><span>Quantity</span> <span>{config.layout.columnWidths?.qty}%</span></label>
                                    <input type="range" min="5" max="20" value={config.layout.columnWidths?.qty} onChange={(e) => updateConfig('layout', 'columnWidths', { ...config.layout.columnWidths, qty: parseInt(e.target.value) })} className="w-full accent-primary" />
                                </div>
                                <div>
                                    <label className="text-xs flex justify-between"><span>Rate / Price</span> <span>{config.layout.columnWidths?.rate}%</span></label>
                                    <input type="range" min="10" max="30" value={config.layout.columnWidths?.rate} onChange={(e) => updateConfig('layout', 'columnWidths', { ...config.layout.columnWidths, rate: parseInt(e.target.value) })} className="w-full accent-primary" />
                                </div>
                                <p className="text-[10px] text-gray-400 italic text-right">Amount column takes remaining space</p>
                            </div>

                            <div className="border-t pt-4 space-y-4">
                                <div>
                                    <label className="text-xs font-bold mb-2 block">Cell Padding ({config.layout.tablePadding}mm)</label>
                                    <input type="range" min="1" max="8" step="0.5" value={config.layout.tablePadding || 3} onChange={(e) => updateConfig('layout', 'tablePadding', parseFloat(e.target.value))} className="w-full accent-primary" />
                                </div>
                                
                                <div>
                                    <label className="text-xs font-bold mb-2 block">Header Alignment</label>
                                    <div className="flex bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
                                        <button onClick={() => updateConfig('layout', 'tableHeaderAlign', 'left')} className={`flex-1 p-1 rounded flex justify-center ${config.layout.tableHeaderAlign === 'left' ? 'bg-white shadow text-primary' : 'text-gray-500'}`}><AlignLeft size={16}/></button>
                                        <button onClick={() => updateConfig('layout', 'tableHeaderAlign', 'center')} className={`flex-1 p-1 rounded flex justify-center ${config.layout.tableHeaderAlign === 'center' ? 'bg-white shadow text-primary' : 'text-gray-500'}`}><AlignCenter size={16}/></button>
                                        <button onClick={() => updateConfig('layout', 'tableHeaderAlign', 'right')} className={`flex-1 p-1 rounded flex justify-center ${config.layout.tableHeaderAlign === 'right' ? 'bg-white shadow text-primary' : 'text-gray-500'}`}><AlignRight size={16}/></button>
                                    </div>
                                </div>

                                <label className="flex items-center gap-2 text-sm p-2 hover:bg-gray-50 rounded bg-gray-50 dark:bg-slate-700/50 mt-2"><input type="checkbox" checked={config.layout.tableOptions.stripedRows} onChange={(e) => updateConfig('layout', 'tableOptions', { ...config.layout.tableOptions, stripedRows: e.target.checked })} /> Zebra Stripes</label>
                                <label className="flex items-center gap-2 text-sm p-2 hover:bg-gray-50 rounded bg-gray-50 dark:bg-slate-700/50"><input type="checkbox" checked={config.layout.tableOptions.compact} onChange={(e) => updateConfig('layout', 'tableOptions', { ...config.layout.tableOptions, compact: e.target.checked })} /> Remove Inner Borders</label>
                            </div>
                        </div>
                    )}

                    {activeTab === 'colors' && (
                        <div className="space-y-4">
                            <Button onClick={extractBrandColor} variant="secondary" className="w-full mb-2 text-xs"><Wand2 size={14} className="mr-2"/> Auto-Brand from Logo</Button>
                            {Object.entries({ primary: "Brand Color", secondary: "Secondary Text", text: "Body Text", tableHeaderBg: "Table Header Bg", tableHeaderText: "Table Header Text", bannerBg: "Banner Bg", bannerText: "Banner Text", borderColor: "Lines & Borders", alternateRowBg: "Striped Rows" }).map(([key, label]) => (
                                <div key={key} className="flex items-center justify-between p-2 border rounded-lg bg-white dark:bg-slate-700">
                                    <span className="text-sm font-medium">{label}</span>
                                    <button onClick={() => setColorPickerTarget(key as any)} className="w-8 h-8 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: (config.colors as any)[key] }} />
                                </div>
                            ))}
                            <ColorPickerModal isOpen={!!colorPickerTarget} onClose={() => setColorPickerTarget(null)} initialColor={colorPickerTarget ? (config.colors as any)[colorPickerTarget] : '#000000'} onChange={(color) => { if (colorPickerTarget) updateConfig('colors', colorPickerTarget, color); }} />
                        </div>
                    )}

                    {activeTab === 'fonts' && (
                        <div className="space-y-4">
                             <div><label className="text-xs font-bold block mb-1">Title Font</label><select value={config.fonts.titleFont} onChange={(e) => updateConfig('fonts', 'titleFont', e.target.value)} className="w-full p-2 border rounded dark:bg-slate-700"><option value="helvetica">Helvetica</option><option value="times">Times New Roman</option><option value="courier">Courier New</option>{state.customFonts.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}</select></div>
                             <div><label className="text-xs font-bold block mb-1">Body Font</label><select value={config.fonts.bodyFont} onChange={(e) => updateConfig('fonts', 'bodyFont', e.target.value)} className="w-full p-2 border rounded dark:bg-slate-700"><option value="helvetica">Helvetica</option><option value="times">Times New Roman</option><option value="courier">Courier New</option>{state.customFonts.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}</select></div>
                             <div><label className="text-xs">Header Size</label><input type="range" min="10" max="40" value={config.fonts.headerSize} onChange={(e) => updateConfig('fonts', 'headerSize', parseInt(e.target.value))} className="w-full accent-primary" /></div>
                             <div><label className="text-xs">Body Size</label><input type="range" min="6" max="16" value={config.fonts.bodySize} onChange={(e) => updateConfig('fonts', 'bodySize', parseInt(e.target.value))} className="w-full accent-primary" /></div>
                        </div>
                    )}

                    {activeTab === 'content' && (
                        <div className="space-y-4">
                            <div><label className="text-xs font-bold block mb-1">Title Text</label><input type="text" value={config.content.titleText} onChange={(e) => updateConfig('content', 'titleText', e.target.value)} className="w-full p-2 border rounded" /></div>
                            <div className="space-y-2 border-t pt-4">
                                {[
                                    { k: 'showBusinessDetails', l: 'Show Business Info' },
                                    { k: 'showCustomerDetails', l: 'Show Customer Info' },
                                    { k: 'showQr', l: 'Show QR Code' },
                                    { k: 'showTerms', l: 'Show Terms' },
                                    { k: 'showSignature', l: 'Show Signature Line' },
                                    { k: 'showAmountInWords', l: 'Total In Words' },
                                    { k: 'showStatusStamp', l: 'Paid/Due Stamp' },
                                    { k: 'showGst', l: 'Show GST Column' },
                                ].map(({k, l}) => (
                                    <label key={k} className="flex items-center justify-between text-sm p-2 bg-gray-50 dark:bg-slate-700 rounded">
                                        {l}
                                        <input type="checkbox" checked={(config.content as any)[k]} onChange={(e) => updateConfig('content', k, e.target.checked)} className="w-4 h-4 text-primary rounded" />
                                    </label>
                                ))}
                            </div>
                            <div><label className="text-xs font-bold block mb-1">Terms</label><textarea value={config.content.termsText} onChange={(e) => updateConfig('content', 'termsText', e.target.value)} className="w-full p-2 border rounded h-20 text-xs" /></div>
                            <div><label className="text-xs font-bold block mb-1">Footer</label><input type="text" value={config.content.footerText} onChange={(e) => updateConfig('content', 'footerText', e.target.value)} className="w-full p-2 border rounded" /></div>
                        </div>
                    )}

                    {activeTab === 'labels' && (
                        <div className="space-y-3">
                            {Object.keys(defaultLabels).map((key) => (
                                <div key={key}>
                                    <label className="text-xs font-bold block mb-1 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</label>
                                    <input type="text" value={(config.content.labels as any)?.[key] || (defaultLabels as any)[key]} onChange={(e) => updateConfig('content', 'labels', { ...config.content.labels, [key]: e.target.value })} className="w-full p-2 border rounded text-sm" />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Resizer */}
            <div 
                className="hidden sm:flex w-4 cursor-col-resize items-center justify-center hover:bg-blue-500/10 transition-colors z-20 -ml-2 mr-[-2px] touch-none"
                onMouseDown={startResizing}
                onTouchStart={startResizing}
            >
                <div className="w-1 h-12 bg-gray-300 dark:bg-slate-600 rounded-full shadow-sm"></div>
            </div>

            {/* Live Preview */}
            <div className={`flex-grow min-w-0 bg-gray-100 dark:bg-slate-900 relative overflow-hidden flex flex-col ${mobileView === 'preview' ? 'flex' : 'hidden sm:flex'}`}>
                <div className="h-12 bg-white dark:bg-slate-800 border-b dark:border-slate-700 flex justify-between items-center px-4 shrink-0">
                     <h3 className="font-bold text-sm text-gray-500 uppercase">Live HTML Preview</h3>
                     <button onClick={handleExportPdf} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-primary flex items-center gap-1 font-bold text-sm" title="Download PDF"><Printer size={16} /> Print / PDF</button>
                </div>
                <div className="flex-grow relative bg-slate-200/50 dark:bg-slate-950/50 overflow-hidden">
                     <LiveInvoicePreview config={config} profile={state.profile} />
                </div>
            </div>
        </div>
    );
};

export default InvoiceDesigner;
