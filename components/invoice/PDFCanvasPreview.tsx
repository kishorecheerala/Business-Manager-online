import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { InvoiceTemplateConfig, DocumentType, CustomFont, ProfileData } from '../../types';
import { generateA4InvoicePdf, generateEstimatePDF, generateDebitNotePDF, generateReceiptPDF, generateGenericReportPDF } from '../../utils/pdfGenerator';
import { dummyCustomer, dummySale, REPORT_SCENARIOS, ReportScenarioKey } from '../../utils/invoiceDefaults';

// Setup PDF.js worker
if (pdfjsLib.GlobalWorkerOptions) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.449/build/pdf.worker.min.mjs`;
}

const pdfjs = pdfjsLib;

interface PDFCanvasPreviewProps {
    config: InvoiceTemplateConfig;
    profile: ProfileData | null;
    docType: DocumentType;
    customFonts: CustomFont[];
    reportScenario?: ReportScenarioKey;
    isDraftMode: boolean;
    onLayoutUpdate?: (updates: Partial<InvoiceTemplateConfig['layout']>) => void;
    gridSettings: { enabled: boolean; sizeMm: number; opacity: number };
    realSale?: any; // Sale object or null
}

const PDFCanvasPreview: React.FC<PDFCanvasPreviewProps> = ({ config, profile, docType, customFonts, reportScenario = 'SALES_REPORT', isDraftMode, onLayoutUpdate, gridSettings, realSale = null }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const renderTaskRef = useRef<any>(null);
    const [zoomLevel, setZoomLevel] = useState(1.0);
    const [scaleFactor, setScaleFactor] = useState(1); // px per mm

    // Drag state
    const [dragTarget, setDragTarget] = useState<'logo' | 'qr' | null>(null);
    const dragStartRef = useRef<{ x: number, y: number, initialX: number, initialY: number } | null>(null);

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
                const saleData = realSale || dummySale;
                switch (docType) {
                    case 'INVOICE': doc = await generateA4InvoicePdf(saleData, dummyCustomer, profile, debouncedConfig, customFonts); break;
                    case 'ESTIMATE': doc = await generateEstimatePDF(saleData as any, dummyCustomer, profile, debouncedConfig, customFonts); break;
                    case 'DEBIT_NOTE': doc = await generateDebitNotePDF(saleData as any, dummyCustomer as any, profile, debouncedConfig, customFonts); break;
                    case 'RECEIPT': doc = await generateReceiptPDF(saleData, dummyCustomer, profile, debouncedConfig, customFonts); break;
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
                    const desiredPreviewWidth = Math.min(containerWidth - 40, 380);
                    scale = desiredPreviewWidth / baseViewport.width;
                } else {
                    scale = (containerWidth - 40) / baseViewport.width;
                }

                const finalScale = isDraftMode ? scale * 0.95 : scale * zoomLevel;
                const viewport = page.getViewport({ scale: finalScale });

                const canvas = canvasRef.current;
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                if (renderTaskRef.current) {
                    await renderTaskRef.current.cancel();
                }

                renderTaskRef.current = page.render({ canvasContext: context, viewport: viewport } as any);
                await renderTaskRef.current.promise;

                // Draw Grid Overlay
                if (gridSettings?.enabled) {
                    const ctx = context;
                    if (ctx) {
                        const width = canvas.width;
                        const height = canvas.height;
                        const mmToPx = viewport.scale * (96 / 25.4); // approx px per mm
                        const gridSize = (gridSettings.sizeMm || 10) * mmToPx;

                        ctx.save();
                        ctx.strokeStyle = `rgba(0, 100, 255, ${gridSettings.opacity || 0.2})`;
                        ctx.lineWidth = 1;

                        // Vertical lines
                        for (let x = 0; x <= width; x += gridSize) {
                            ctx.beginPath();
                            ctx.moveTo(x, 0);
                            ctx.lineTo(x, height);
                            ctx.stroke();
                        }
                        // Horizontal lines
                        for (let y = 0; y <= height; y += gridSize) {
                            ctx.beginPath();
                            ctx.moveTo(0, y);
                            ctx.lineTo(width, y);
                            ctx.stroke();
                        }
                        ctx.restore();
                    }
                }

                // Calculate mm to px scale
                // A4 width is 210mm. If formatted differently, adjust.
                const paperWidthMM = docType === 'RECEIPT' ? 72 : 210;
                setScaleFactor(viewport.width / paperWidthMM);

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
        <div className="flex-1 relative flex flex-col min-h-0 bg-gray-100 dark:bg-slate-900 overflow-hidden">
            <div className="flex-1 p-4 md:p-8 overflow-auto flex justify-center items-start scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-slate-700" ref={containerRef}>
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
                    <div className={`relative shadow-2xl rounded-sm overflow-hidden transition-transform duration-200 ease-out ${loading ? 'opacity-80 blur-[1px]' : 'opacity-100'}`}
                        onMouseMove={(e) => {
                            if (!dragTarget || !dragStartRef.current || !onLayoutUpdate) return;
                            const deltaX = (e.clientX - dragStartRef.current.x) / scaleFactor;
                            const deltaY = (e.clientY - dragStartRef.current.y) / scaleFactor;

                            const updates: any = {};
                            if (dragTarget === 'logo') {
                                updates.logoPosX = Math.max(0, dragStartRef.current.initialX + deltaX);
                                updates.logoPosY = Math.max(0, dragStartRef.current.initialY + deltaY);
                            } else if (dragTarget === 'qr') {
                                updates.qrPosX = Math.max(0, dragStartRef.current.initialX + deltaX);
                                updates.qrPosY = Math.max(0, dragStartRef.current.initialY + deltaY);
                            }
                            onLayoutUpdate(updates);
                        }}
                        onMouseUp={() => {
                            setDragTarget(null);
                            dragStartRef.current = null;
                        }}
                        onMouseLeave={() => {
                            setDragTarget(null);
                            dragStartRef.current = null;
                        }}
                    >
                        <canvas ref={canvasRef} className="bg-white block" />

                        {/* Interactive Overlays */}
                        {!loading && !isDraftMode && (
                            <>
                                {/* Logo Overlay */}
                                {profile?.logo && (
                                    <div
                                        className="absolute border-2 border-dashed border-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 cursor-move group flex items-center justify-center transition-colors"
                                        style={{
                                            left: (config.layout.logoPosX || 20) * scaleFactor,
                                            top: (config.layout.logoPosY || 20) * scaleFactor,
                                            width: (config.layout.logoSize || 25) * scaleFactor,
                                            height: (config.layout.logoSize || 25) * scaleFactor, // Assuming square for simplicity or aspect ratio
                                        }}
                                        onMouseDown={(e) => {
                                            if (!onLayoutUpdate) return;
                                            e.preventDefault();
                                            setDragTarget('logo');
                                            dragStartRef.current = {
                                                x: e.clientX,
                                                y: e.clientY,
                                                initialX: config.layout.logoPosX || 20,
                                                initialY: config.layout.logoPosY || 20
                                            };
                                        }}
                                        title="Drag to move Logo"
                                    >
                                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">Move Logo</div>
                                    </div>
                                )}

                                {/* QR Overlay */}
                                <div
                                    className="absolute border-2 border-dashed border-gray-400 bg-gray-500/10 hover:bg-gray-500/20 cursor-move group flex items-center justify-center transition-colors"
                                    style={{
                                        left: (config.layout.qrPosX || (docType === 'RECEIPT' ? 20 : 150)) * scaleFactor,
                                        top: (config.layout.qrPosY || 20) * scaleFactor,
                                        width: (config.layout.qrOverlaySize || 20) * scaleFactor,
                                        height: (config.layout.qrOverlaySize || 20) * scaleFactor,
                                    }}
                                    onMouseDown={(e) => {
                                        if (!onLayoutUpdate) return;
                                        e.preventDefault();
                                        setDragTarget('qr');
                                        dragStartRef.current = {
                                            x: e.clientX,
                                            y: e.clientY,
                                            initialX: config.layout.qrPosX || (docType === 'RECEIPT' ? 20 : 150),
                                            initialY: config.layout.qrPosY || 20
                                        };
                                    }}
                                    title="Drag to move QR Code"
                                >
                                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-600 text-white text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">Move QR</div>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {!isDraftMode && (
                <div className="absolute bottom-6 right-6 flex gap-2 bg-white/90 dark:bg-slate-800/90 p-2 rounded-full shadow-lg backdrop-blur-sm border border-gray-200 dark:border-slate-700 z-50">
                    <button onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.1))} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full">Zoom -</button>
                    <span className="text-xs font-mono self-center w-12 text-center text-gray-700 dark:text-gray-200">{(zoomLevel * 100).toFixed(0)}%</span>
                    <button onClick={() => setZoomLevel(prev => Math.min(2.0, prev + 0.1))} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full">Zoom +</button>
                </div>
            )}
        </div>
    );
};

export default PDFCanvasPreview;
