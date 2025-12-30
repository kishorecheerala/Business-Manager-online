import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { InvoiceTemplateConfig, ProfileData, CustomFont } from '../../types';
import { GenericDocumentData } from './types';
import { PDFLayoutEngine } from './PDFLayoutEngine';
import { registerCustomFonts, getImageType, getQrCodeBase64, formatDate, formatCurrency, defaultLabels, numberToWords } from './helpers';

// Helper to handle logo base64 which might be in helpers or separate.
// I'll assume logoBase64 is imported from ../logo usually, but here I can import it from parent or expect it in helpers if I moved it.
// Actually I didn't move logoBase64 to helpers. I should check where it is.
// It was imported from './logo' in pdfGenerator.ts.
// So in utils/pdf/PDFBuilder.ts it should be imported from '../logo'.
import { logoBase64 as defaultLogo } from '../logo';

export const generateConfigurablePDF = async (
    data: GenericDocumentData,
    profile: ProfileData | null,
    templateConfig: InvoiceTemplateConfig,
    customFonts?: CustomFont[],
    customPaperSize?: [number, number],
    existingDoc?: jsPDF
): Promise<jsPDF> => {
    let doc: jsPDF;

    if (existingDoc) {
        doc = existingDoc;
        doc.addPage();
    } else {
        if (customPaperSize) {
            doc = new jsPDF({ orientation: 'p', unit: 'mm', format: customPaperSize });
        } else {
            const paperSize = templateConfig.layout.paperSize || 'a4';
            doc = new jsPDF({ format: paperSize });
        }
        if (customFonts) registerCustomFonts(doc, customFonts);
    }

    // Create engine (it applies background on init)
    const engine = new PDFLayoutEngine(doc, templateConfig);
    const { colors, fonts, layout, content, currencySymbol } = templateConfig;

    // --- Render Functions ---

    const renderHeader = async () => {
        if (content.showBusinessDetails === false) { engine.addY(5); return; }

        const isBanner = layout.headerStyle === 'banner';
        if (isBanner) {
            doc.setFillColor(colors.bannerBg || colors.primary);
            doc.roundedRect(0, 0, engine.pageWidth, 40 + (layout.logoSize / 2), layout.borderRadius || 0, layout.borderRadius || 0, 'F');
            engine.addY(5);
        }

        const logoUrl = profile?.logo || defaultLogo;
        const isAbsoluteLogo = layout.logoPosX !== undefined && layout.logoPosY !== undefined;
        const hasLogo = !!logoUrl && layout.logoSize > 5;

        // Alignment Logic Fix: Calculate available width
        let textY = engine.currentY();
        let textAlign: 'left' | 'center' | 'right' = 'left';
        let renderedLogoHeight = 0;
        let textX = engine.margin;
        let logoX = engine.margin;
        let logoY = engine.currentY() + (layout.logoOffsetY || 0);

        // Logo Logic
        if (isAbsoluteLogo) {
            logoX = layout.logoPosX!;
            logoY = layout.logoPosY!;
        }

        if (hasLogo) {
            try {
                const imgProps = doc.getImageProperties(logoUrl);
                renderedLogoHeight = layout.logoSize / (imgProps.width / imgProps.height);
                if (renderedLogoHeight > 60) renderedLogoHeight = 60;
            } catch (e) { renderedLogoHeight = layout.logoSize; }
        }

        // Layout Strategy for Header Content
        let availableTextWidth = engine.pageWidth - (engine.margin * 2);

        if (!isAbsoluteLogo) {
            if (layout.logoPosition === 'center') {
                logoX = (engine.pageWidth - layout.logoSize) / 2;
                if (hasLogo) textY = logoY + renderedLogoHeight + (layout.elementSpacing?.logoBottom ?? 5);
                textAlign = 'center';
                textX = engine.pageWidth / 2;
                // Center alignment usually has full width below logo
            } else if (layout.logoPosition === 'right') {
                logoX = engine.pageWidth - engine.margin - layout.logoSize;
                textAlign = 'left';
                textX = engine.margin;
                textY += 5;
                if (hasLogo) availableTextWidth -= (layout.logoSize + 5); // Subtract logo space
            } else { // Left Logo
                logoX = engine.margin;
                textAlign = 'right';
                // Move text to align right edge
                textX = engine.pageWidth - engine.margin;
                textY += 5;
                if (hasLogo) availableTextWidth -= (layout.logoSize + 5);
            }
        } else {
            // Absolute Logo: Text alignment depends on headerAlignment
            if (layout.headerAlignment === 'center') { textAlign = 'center'; textX = engine.pageWidth / 2; }
            else if (layout.headerAlignment === 'right') { textAlign = 'right'; textX = engine.pageWidth - engine.margin; }
            else { textAlign = 'left'; textX = engine.margin; }
        }

        // Render Logo
        if (hasLogo) {
            try { doc.addImage(logoUrl, getImageType(logoUrl), logoX, logoY, layout.logoSize, renderedLogoHeight); } catch (e) { }
        }

        // Render Business Text
        engine.setY(textY);
        if (profile) {
            // Organization Name
            engine.addText(profile.name, textX, {
                align: textAlign,
                font: fonts.titleFont,
                fontStyle: 'bold',
                fontSize: fonts.headerSize,
                color: isBanner ? (colors.bannerText || '#fff') : colors.primary
            });
            engine.addY(layout.elementSpacing?.titleBottom ?? 2);

            // Address - Smart Wrapping
            const addr = engine.splitText(profile.address, availableTextWidth);
            engine.addText(addr, textX, {
                align: textAlign,
                font: fonts.bodyFont,
                fontSize: fonts.bodySize,
                color: isBanner ? (colors.bannerText || '#fff') : colors.secondary
            });
            engine.addY(layout.elementSpacing?.addressBottom ?? 1);

            // Contact
            const contact = [profile.phone && `Ph: ${profile.phone}`, profile.gstNumber && `GST: ${profile.gstNumber}`].filter(Boolean).join(' | ');
            const contactLines = engine.splitText(contact, availableTextWidth);
            engine.addText(contactLines, textX, {
                align: textAlign,
                font: fonts.bodyFont,
                fontSize: fonts.bodySize,
                color: isBanner ? (colors.bannerText || '#fff') : colors.secondary
            });
        }

        // Finalize Header Height
        const contentEnd = engine.currentY() + 5;
        const logoEnd = (hasLogo && !isAbsoluteLogo) ? logoY + renderedLogoHeight + 5 : 0;
        engine.setY(Math.max(contentEnd, logoEnd));

        // Line Seperator
        if (!isBanner && layout.headerStyle !== 'minimal') {
            doc.setDrawColor(colors.borderColor || '#ccc');
            doc.line(engine.margin, engine.currentY(), engine.pageWidth - engine.margin, engine.currentY());
            engine.addY(layout.elementSpacing?.headerBottom ?? 5);
        }

        // Header Width QR
        if (content.showQr && layout.qrPosition === 'header-right' && layout.qrPosX === undefined) {
            const qrImg = await getQrCodeBase64(data.qrString || data.id);
            if (qrImg) {
                try {
                    const size = layout.qrOverlaySize || 20;
                    doc.addImage(qrImg, 'PNG', engine.pageWidth - engine.margin - size, engine.margin + 5, size, size);
                } catch (e) { }
            }
        }
    };

    const renderTitle = () => {
        engine.addText(content.titleText, engine.pageWidth / 2, {
            align: 'center',
            font: fonts.titleFont,
            fontStyle: 'bold',
            fontSize: 16,
            color: colors.text
        });
        engine.addY(5);
    };

    const renderDetails = async () => {
        if (content.showCustomerDetails === false) return;

        const colWidth = (engine.pageWidth - (engine.margin * 3)) / 2;
        const rightColX = engine.pageWidth - engine.margin;
        const startY = engine.currentY();

        // 1. Recipient Details (Left)
        engine.addText(data.recipient.label, engine.margin, {
            font: fonts.bodyFont, fontStyle: 'bold', fontSize: 11, color: colors.primary
        });

        engine.addText(data.recipient.name, engine.margin, {
            font: fonts.bodyFont, fontSize: fonts.bodySize, color: colors.text
        });

        const recipientAddr = engine.splitText(data.recipient.address, colWidth);
        engine.addText(recipientAddr, engine.margin, {
            font: fonts.bodyFont, fontSize: fonts.bodySize, color: colors.text
        });

        // Track Y after left column
        const leftY = engine.currentY();

        // 2. Sender Details (Right) - Reset Y to startY
        engine.setY(startY);

        engine.addText(data.sender.label, rightColX, {
            align: 'right', font: fonts.bodyFont, fontStyle: 'bold', fontSize: 11, color: colors.primary
        });

        engine.addText(`${data.sender.idLabel} ${data.id}`, rightColX, {
            align: 'right', font: fonts.bodyFont, fontSize: fonts.bodySize, color: colors.text
        });

        engine.addText(`${defaultLabels.date}: ${formatDate(data.date, templateConfig.dateFormat)}`, rightColX, {
            align: 'right', font: fonts.bodyFont, fontSize: fonts.bodySize, color: colors.text
        });

        // Right QR
        if (content.showQr && (!layout.qrPosition || layout.qrPosition === 'details-right') && layout.qrPosX === undefined) {
            const qrImg = await getQrCodeBase64(data.qrString || data.id);
            if (qrImg) {
                try {
                    const size = layout.qrOverlaySize || 22;
                    doc.addImage(qrImg, 'PNG', rightColX - size, engine.currentY() + 2, size, size);
                    engine.addY(size / 3); // minimal impact on flow
                } catch (e) { }
            }
        }

        const rightY = engine.currentY();

        // Sync to lowest point
        engine.setY(Math.max(leftY, rightY) + 5);
    };

    const renderTable = () => {
        const tableHead = ['#', defaultLabels.item];
        const hideQty = layout.tableOptions?.hideQty;
        const hideRate = layout.tableOptions?.hideRate;
        const showHSN = layout.tableOptions?.showHSN;
        const showMRP = layout.tableOptions?.showMRP;

        // Construct Headers
        if (showHSN) tableHead.push("HSN/SAC");
        if (showMRP) tableHead.push("MRP");
        if (!hideQty) tableHead.push(defaultLabels.qty);
        if (!hideRate) tableHead.push(defaultLabels.rate);
        tableHead.push(defaultLabels.amount);

        const tableBody = data.items.map((item, i) => {
            const row = [(i + 1).toString(), item.name];
            if (showHSN) row.push(item.hsn || '-');
            if (showMRP) row.push(item.mrp ? formatCurrency(item.mrp, currencySymbol, fonts.bodyFont) : '-');
            if (!hideQty) row.push(item.quantity.toString());
            if (!hideRate) row.push(formatCurrency(item.rate, currencySymbol, fonts.bodyFont));
            row.push(formatCurrency(item.amount, currencySymbol, fonts.bodyFont));
            return row;
        });

        const cw = layout.columnWidths || {};

        // Dynamic Column Styles
        const columnStyles: any = {
            0: { cellWidth: 10, halign: 'center' }, // S.No
            [tableHead.length - 1]: { halign: 'right', cellWidth: cw.amount || 'auto' }, // Amount
        };

        // Find indices for styling
        const hsnIndex = tableHead.indexOf("HSN/SAC");
        const mrpIndex = tableHead.indexOf("MRP");
        const qtyIndex = tableHead.indexOf(defaultLabels.qty);
        const rateIndex = tableHead.indexOf(defaultLabels.rate);

        if (hsnIndex !== -1) columnStyles[hsnIndex] = { halign: 'center' };
        if (mrpIndex !== -1) columnStyles[mrpIndex] = { halign: 'right' };
        if (qtyIndex !== -1) columnStyles[qtyIndex] = { halign: 'center', cellWidth: cw.qty || 'auto' };
        if (rateIndex !== -1) columnStyles[rateIndex] = { halign: 'right', cellWidth: cw.rate || 'auto' };

        // Ensure table doesn't break if near bottom
        engine.checkPageBreak(30);

        autoTable(doc, {
            startY: engine.currentY(),
            head: [tableHead],
            body: tableBody,
            theme: layout.tableOptions?.stripedRows ? 'striped' : 'plain',
            styles: { font: fonts.bodyFont, fontSize: fonts.bodySize, cellPadding: layout.tableOptions?.compact ? 2 : 3, textColor: colors.text },
            headStyles: { fillColor: colors.tableHeaderBg, textColor: colors.tableHeaderText, fontStyle: 'bold', halign: (layout.tableHeaderAlign || 'left'), ...(layout.borderRadius ? { minCellHeight: 8 } : {}) },
            columnStyles: columnStyles,
            margin: { left: engine.margin, right: engine.margin },
        });

        // Update engine cursor
        const lastTable = (doc as any).lastAutoTable;
        const endY = lastTable.finalY + 5;
        engine.setY(endY);

        // Capture final column widths directly from the finished table state
        if (lastTable && lastTable.columns && lastTable.columns.length > 0) {
            const columns = lastTable.columns;
            const amountCol = columns[columns.length - 1]; // Last column is Amount
            if (amountCol) {
                (engine as any).amountColWidth = amountCol.width;
            }
        }
    };

    const renderTotals = () => {
        const totalsX = engine.pageWidth - engine.margin;

        // Dynamic alignment
        const amountColWidth = (engine as any).amountColWidth || 30;

        // Align label to the left of the Amount column, matching table padding
        const labelX = totalsX - amountColWidth - 3;

        // Check space
        const requiredHeight = data.totals.length * 8;
        engine.checkPageBreak(requiredHeight);

        data.totals.forEach((t) => {
            engine.addText(
                t.label,
                labelX,
                { align: 'right', font: fonts.bodyFont, fontStyle: t.isBold ? 'bold' : 'normal', fontSize: t.size || fonts.bodySize, color: t.color || colors.text }
            );
            // We manually drew the label, reset Y to draw value on same line
            engine.addY(-(engine.doc.getLineHeight() / engine.doc.internal.scaleFactor) - 1); // backtrack

            engine.addText(
                t.value,
                totalsX,
                { align: 'right', font: fonts.bodyFont, fontStyle: t.isBold ? 'bold' : 'normal', fontSize: t.size || fonts.bodySize, color: t.color || colors.text }
            );
            engine.addY(1); // bit of spacing
        });
        engine.addY(5);
    };

    const renderWords = () => {
        if (content.showAmountInWords !== false && data.grandTotalNumeric !== undefined) {
            engine.checkPageBreak(25);

            engine.addText("Amount in words:", engine.margin, {
                font: fonts.bodyFont, fontStyle: 'bold', fontSize: fonts.bodySize - 1, color: colors.secondary
            });

            try {
                const words = numberToWords(data.grandTotalNumeric);
                if (words && words !== 'Zero Only') {
                    const splitWords = engine.splitText(words, engine.pageWidth - (engine.margin * 2));
                    engine.addText(splitWords, engine.margin, {
                        font: fonts.bodyFont, fontStyle: 'normal', fontSize: fonts.bodySize, color: colors.text
                    });
                    engine.addY(5);
                }
            } catch (e) {
                // Ignore fallback
            }
        }
    };

    const renderBank = () => {
        if (content.bankDetails) {
            engine.checkPageBreak(30);

            engine.addText("Bank Details:", engine.margin, {
                font: fonts.bodyFont, fontStyle: 'bold', fontSize: fonts.bodySize, color: colors.primary
            });

            const bankLines = engine.splitText(content.bankDetails, 100);
            engine.addText(bankLines, engine.margin, {
                font: fonts.bodyFont, fontSize: fonts.bodySize, color: colors.text
            });
            engine.addY(5);
        }
    };

    const renderTerms = () => {
        if (content.showTerms && content.termsText) {
            engine.checkPageBreak(40);

            engine.addText("Terms & Conditions:", engine.margin, {
                font: fonts.bodyFont, fontStyle: 'bold', fontSize: fonts.bodySize - 2, color: colors.secondary
            });

            const terms = engine.splitText(content.termsText, engine.pageWidth - (engine.margin * 2));
            engine.addText(terms, engine.margin, {
                font: fonts.bodyFont, fontSize: fonts.bodySize, color: colors.text
            });
            engine.addY(5);
        }
    };

    const renderSignature = () => {
        if (content.showSignature || content.showSecondarySignature) {
            // Check huge space to prevent signature being cut
            engine.checkPageBreak(50);

            const sigY = engine.currentY();
            const pageWidth = engine.pageWidth;
            const margin = engine.margin;

            // Helper to render one signature
            const drawSig = (isSecondary: boolean, xPos: number, align: 'left' | 'right') => {
                const img = isSecondary ? content.secondarySignatureImage : content.signatureImage;
                const text = isSecondary ? (content.secondarySignatureText || "Receiver's Signature") : (content.signatureText || "Authorized Signatory");

                if (img) {
                    try {
                        const sigProps = doc.getImageProperties(img);
                        const sigRatio = sigProps.width / sigProps.height;
                        const w = 40;
                        const h = w / sigRatio;
                        // For Right alignment, xPos is the right edge
                        const drawX = align === 'right' ? xPos - w : xPos;
                        doc.addImage(img, getImageType(img), drawX, sigY, w, h);
                    } catch (e) { }
                } else {
                    const drawX = align === 'right' ? xPos - 40 : xPos;
                    doc.text("___________________", drawX + (align === 'right' ? 40 : 0), sigY + 20, { align: align });
                }

                doc.setFontSize(10);
                // Text below
                const textY = sigY + (img ? 35 : 25);
                doc.text(text, xPos, textY, { align: align });
            };

            // Render Primary (Right)
            if (content.showSignature) {
                drawSig(false, pageWidth - margin, 'right');
            }

            // Render Secondary (Left)
            if (content.showSecondarySignature) {
                drawSig(true, margin, 'left');
            }

            engine.addY(40); // Advance cursor
        }
    };

    const renderFooter = async () => {
        // Footer is fixed at bottom of EVERY page? Or just last? 
        // Typically just last for invoices unless specified. 
        // We often re-render footers on all pages in advanced engines, but here let's stick to simple Flow.
        // We will just draw it at the bottom of the CURRENT page (last page)

        const footerHeight = 15;
        const footerY = engine.pageHeight - footerHeight;

        // Ensure we aren't overlapping
        if (engine.currentY() > footerY) {
            doc.addPage();
            engine.applyBackground();
        }

        // Draw Background
        if (layout.footerStyle === 'banner') {
            doc.setFillColor(colors.footerBg || '#f3f4f6');
            doc.rect(0, footerY, engine.pageWidth, footerHeight, 'F');
        }

        // QR Footer
        if (content.showQr && (layout.qrPosition === 'footer-left' || layout.qrPosition === 'footer-right') && layout.qrPosX === undefined) {
            const qrImg = await getQrCodeBase64(data.qrString || data.id);
            if (qrImg) {
                const qrSize = layout.qrOverlaySize || 18;
                const qrY = footerY - qrSize - 2;
                const qrX = layout.qrPosition === 'footer-left' ? engine.margin : engine.pageWidth - engine.margin - qrSize;
                try { doc.addImage(qrImg, 'PNG', qrX, qrY, qrSize, qrSize); } catch (e) { }
            }
        }

        // Footer Text
        if (content.footerText) {
            doc.setTextColor(layout.footerStyle === 'banner' ? (colors.footerText || colors.secondary) : colors.secondary);
            doc.setFontSize(9);
            doc.text(content.footerText, engine.pageWidth / 2, engine.pageHeight - 6, { align: 'center' });
        }
    };

    // --- Execution ---
    const order = layout.sectionOrdering && layout.sectionOrdering.length > 0
        ? layout.sectionOrdering
        : ['header', 'title', 'details', 'table', 'totals', 'words', 'bankDetails', 'terms', 'signature', 'footer'];

    for (const section of order) {
        switch (section) {
            case 'header': await renderHeader(); break;
            case 'title': renderTitle(); break;
            case 'details': await renderDetails(); break;
            case 'table': renderTable(); break;
            case 'totals': renderTotals(); break;
            case 'words': renderWords(); break;
            case 'bankDetails': renderBank(); break;
            case 'terms': renderTerms(); break;
            case 'signature': await renderSignature(); break;
            case 'footer': await renderFooter(); break;
            default:
                if (section.startsWith('custom-')) {
                    const customSection = (layout.customSections || []).find(s => s.id === section);
                    if (customSection) {
                        engine.checkPageBreak(20);
                        if (customSection.type === 'text-block' && customSection.content) {
                            const fontSize = customSection.styles?.fontSize || 10;
                            const align = customSection.styles?.align || 'left';
                            const marginTop = customSection.styles?.marginTop ?? 2;
                            const marginBottom = customSection.styles?.marginBottom ?? 2;

                            engine.addY(marginTop);
                            let x = engine.margin;
                            if (align === 'center') x = engine.pageWidth / 2;
                            if (align === 'right') x = engine.pageWidth - engine.margin;

                            engine.addText(customSection.content, x, {
                                align,
                                fontSize,
                                color: customSection.styles?.color || colors.text
                            });
                            engine.addY(marginBottom);
                        } else if (customSection.type === 'image-block' && customSection.content) {
                            const height = customSection.styles?.height || 30;
                            const align = customSection.styles?.align || 'center';

                            try {
                                const imgProps = doc.getImageProperties(customSection.content);
                                const ratio = imgProps.width / imgProps.height;
                                const width = height * ratio;

                                let x = engine.margin;
                                if (align === 'center') x = (engine.pageWidth - width) / 2;
                                if (align === 'right') x = engine.pageWidth - engine.margin - width;

                                doc.addImage(customSection.content, getImageType(customSection.content), x, engine.currentY(), width, height);
                                engine.addY(height + 2);
                            } catch (e) { console.error("Error adding custom image", e); }
                        } else if (customSection.type === 'divider') {
                            const height = customSection.styles?.height || 5;
                            engine.addY(height / 2);
                            doc.setDrawColor(colors.borderColor || '#e2e8f0');
                            doc.line(engine.margin, engine.currentY(), engine.pageWidth - engine.margin, engine.currentY());
                            engine.addY(height / 2);
                        }
                    }
                }
                break;
        }
    }

    // Absolute QR (Overlay)
    if (content.showQr && layout.qrPosX !== undefined && layout.qrPosY !== undefined) {
        const qrImg = await getQrCodeBase64(data.qrString || data.id);
        if (qrImg) {
            try {
                doc.setPage(1);
                const size = layout.qrOverlaySize || 20;
                doc.addImage(qrImg, 'PNG', layout.qrPosX, layout.qrPosY, size, size);
            } catch (e) { }
        }
    }

    // Status Stamp or Watermark
    if (content.showStatusStamp && data.balanceDue !== undefined) {
        const stampText = data.balanceDue <= 0.01 ? "PAID" : "DUE";
        const color = data.balanceDue <= 0.01 ? "#10b981" : "#ef4444";
        doc.setTextColor(color);
        doc.setFontSize(40);
        doc.setFont('helvetica', 'bold');
        doc.saveGraphicsState();
        doc.setGState(new (doc as any).GState({ opacity: 0.3 }));
        doc.text(stampText, engine.pageWidth / 2, engine.pageHeight / 2, { align: 'center', angle: 45 });
        doc.restoreGraphicsState();
    } else if (layout.showWatermark) {
        // Custom Watermark or Doc Type Default
        const text = layout.watermarkText || data.watermarkText || (content.showStatusStamp ? 'PAID' : '');
        if (text) {
            doc.setTextColor(colors.primary);
            doc.setFontSize(50);
            doc.setFont(fonts.titleFont, 'bold');
            doc.saveGraphicsState();
            doc.setGState(new (doc as any).GState({ opacity: layout.watermarkOpacity || 0.1 }));
            doc.text(text, engine.pageWidth / 2, engine.pageHeight / 2, { align: 'center', angle: 45 });
            doc.restoreGraphicsState();
        }
    }

    return doc;
};
