
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Sale, Customer, ProfileData, Purchase, Supplier, Return, Quote, InvoiceTemplateConfig } from '../types';
import { logoBase64 } from './logo'; // Fallback logo

// --- Helper: Fetch QR Code ---
export const getQrCodeBase64 = async (data: string): Promise<string> => {
    try {
        const response = await fetch(`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(data)}&size=200x200&margin=0`);
        const blob = await response.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.warn("Failed to generate QR code", e);
        return '';
    }
};

// --- Helper: Detect Image Type ---
const getImageType = (dataUrl: string): string => {
    if (!dataUrl) return 'PNG';
    if (dataUrl.startsWith('data:image/png')) return 'PNG';
    if (dataUrl.startsWith('data:image/jpeg')) return 'JPEG';
    if (dataUrl.startsWith('data:image/jpg')) return 'JPEG';
    return 'PNG'; // default fallback
};

// --- Helper: Add Header (Legacy support for other docs, updated to be flexible) ---
export const addBusinessHeader = (doc: jsPDF, profile: ProfileData | null, title?: string) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const centerX = pageWidth / 2;
    let currentY = 10;

    // Default Layout for legacy docs (reports, returns)
    const logoToUse = profile?.logo || logoBase64;
    if (logoToUse) {
        try {
            const format = getImageType(logoToUse);
            doc.addImage(logoToUse, format, 14, 10, 25, 25);
        } catch (e) {
            console.warn("Failed to add logo", e);
        }
    }

    doc.setFont('times', 'italic');
    doc.setFontSize(10);
    doc.setTextColor('#000000');
    doc.text('Om Namo Venkatesaya', centerX, currentY, { align: 'center' });
    currentY += 6;

    if (profile) {
        doc.setFont('times', 'bold');
        doc.setFontSize(22);
        doc.setTextColor(0, 128, 128); 
        doc.text(profile.name, centerX, currentY, { align: 'center' });
        currentY += 8;
        
        doc.setFontSize(10);
        doc.setTextColor('#333333');
        doc.setFont('helvetica', 'normal');
        
        const address = profile.address || '';
        const addressLines = doc.splitTextToSize(address, 120);
        doc.text(addressLines, centerX, currentY, { align: 'center' });
        currentY += (addressLines.length * 5);
        
        const details = [];
        if (profile.phone) details.push(`Phone: ${profile.phone}`);
        if (profile.gstNumber) details.push(`GSTIN: ${profile.gstNumber}`);
        
        if (details.length > 0) {
            doc.text(details.join(' | '), centerX, currentY, { align: 'center' });
        }
    }
    
    if (title) {
        currentY += 5;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor('#000000');
        doc.text(title.toUpperCase(), centerX, currentY, { align: 'center' });
        currentY += 2;
    }
    
    currentY = Math.max(currentY, 40);
    currentY += 2;
    doc.setDrawColor('#cccccc');
    doc.setLineWidth(0.5);
    doc.line(14, currentY, pageWidth - 14, currentY);
    
    return currentY + 5; 
};

// --- Thermal Receipt Generator ---
export const generateThermalInvoicePDF = async (
    sale: Sale, 
    customer: Customer, 
    profile: ProfileData | null, 
    templateConfig: InvoiceTemplateConfig
): Promise<jsPDF> => {
    
    const { content } = templateConfig;
    const terms = content.termsText || '';
    const footer = content.footerText || 'Thank You! Visit Again.';
    const showQr = content.showQr;

    const estimatedHeight = 200 + (sale.items.length * 15) + (terms.length > 0 ? 30 : 0);
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, estimatedHeight]
    });

    const pageWidth = 80;
    const margin = 3;
    const centerX = pageWidth / 2;
    let y = 8;

    const logoToUse = profile?.logo || logoBase64;
    if (logoToUse) {
        try {
            const format = getImageType(logoToUse);
            doc.addImage(logoToUse, format, centerX - 7.5, y, 15, 15);
            y += 18;
        } catch (e) {}
    }

    doc.setFont('times', 'italic');
    doc.setFontSize(9);
    doc.setTextColor('#000000');
    doc.text('Om Namo Venkatesaya', centerX, y, { align: 'center' });
    y += 5;

    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(0, 128, 128); 
    const busName = doc.splitTextToSize(profile?.name || 'Business Name', pageWidth - 10);
    doc.text(busName, centerX, y, { align: 'center' });
    y += (busName.length * 5) + 2;

    doc.setTextColor('#000000');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    const qrSize = 20;
    const qrX = pageWidth - margin - qrSize;
    const startHeaderY = y;

    doc.setFontSize(8);
    doc.text(`Inv: ${sale.id}`, margin, y);
    y += 4;
    
    const d = new Date(sale.date);
    const dateStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth()+1).toString().padStart(2, '0')}/${d.getFullYear()}, ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    doc.text(`${dateStr}`, margin, y);
    y += 4;

    if (showQr) {
        try {
            const qrBase64 = await getQrCodeBase64(sale.id);
            if (qrBase64) {
                doc.addImage(qrBase64, 'PNG', qrX, startHeaderY, qrSize, qrSize);
            }
        } catch (e) {}
    }

    y = Math.max(y + 2, startHeaderY + (showQr ? qrSize : 0) + 2);

    doc.setFont('helvetica', 'bold');
    doc.text('To:', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(customer.name, margin + 7, y);
    y += 4;
    
    if (customer.phone) {
        doc.text(`Ph: ${customer.phone}`, margin, y);
        y += 4;
    }

    doc.setDrawColor(0);
    doc.setLineWidth(0.2);
    doc.line(margin, y, pageWidth - margin, y);
    y += 4;
    
    doc.setFont('helvetica', 'bold');
    doc.text('Item', margin, y);
    doc.text('Amt', pageWidth - margin, y, { align: 'right' });
    y += 2;
    doc.line(margin, y, pageWidth - margin, y);
    y += 4;

    doc.setFont('helvetica', 'normal');
    sale.items.forEach(item => {
        const itemTotal = Number(item.price) * Number(item.quantity);
        doc.setTextColor('#000000');
        doc.setFontSize(9);
        const nameLines = doc.splitTextToSize(item.productName, 55); 
        doc.text(nameLines, margin, y);
        doc.text(`${itemTotal.toLocaleString('en-IN')}`, pageWidth - margin, y, { align: 'right' });
        y += (nameLines.length * 4);
        doc.setTextColor('#555555');
        doc.setFontSize(8);
        doc.text(`${item.quantity} x ${Number(item.price).toLocaleString('en-IN')}`, margin, y);
        y += 4;
    });

    y += 1;
    doc.setDrawColor(200); 
    doc.line(margin, y, pageWidth - margin, y);
    y += 4;

    const subTotal = sale.items.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
    const paidAmount = (sale.payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
    const dueAmount = Number(sale.totalAmount) - paidAmount;

    const addTotalRow = (label: string, value: string, isBold = false, fontSize = 9) => {
        doc.setFont('helvetica', isBold ? 'bold' : 'normal');
        doc.setFontSize(fontSize);
        doc.setTextColor('#000000');
        doc.text(label, pageWidth - 30, y, { align: 'right' });
        doc.text(value, pageWidth - margin, y, { align: 'right' });
        y += 4;
    };

    addTotalRow('Subtotal', `${subTotal.toLocaleString('en-IN')}`);
    if (sale.discount > 0) addTotalRow('Discount', `-${Number(sale.discount).toLocaleString('en-IN')}`);
    
    y += 1;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Total', pageWidth - 30, y, { align: 'right' });
    doc.text(`Rs. ${Number(sale.totalAmount).toLocaleString('en-IN')}`, pageWidth - margin, y, { align: 'right' });
    y += 6;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    addTotalRow('Paid', `${paidAmount.toLocaleString('en-IN')}`);
    
    if (dueAmount > 0) {
        doc.setFont('helvetica', 'bold');
        addTotalRow('Balance', `${dueAmount.toLocaleString('en-IN')}`);
    }

    if (terms) {
        y += 4;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text("Terms & Conditions:", margin, y);
        y += 4;
        doc.setFont('helvetica', 'normal');
        const termsLines = doc.splitTextToSize(terms, pageWidth - (margin*2));
        doc.text(termsLines, margin, y);
        y += (termsLines.length * 4);
    }

    y += 5;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor('#555555');
    doc.text(footer, centerX, y, { align: 'center' });

    return doc;
};

// --- Fully Configurable A4 Invoice Generator ---
export const generateA4InvoicePdf = async (
    sale: Sale, 
    customer: Customer, 
    profile: ProfileData | null, 
    templateConfig: InvoiceTemplateConfig
): Promise<jsPDF> => {
    
    const doc = new jsPDF();
    const { 
        colors, 
        fonts, 
        layout, 
        content 
    } = templateConfig;

    // Conversions
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = layout.margin; // mm
    const centerX = pageWidth / 2;
    let currentY = margin;

    // --- 1. HEADER & LOGO ---
    const logoToUse = profile?.logo || logoBase64;
    
    if (logoToUse) {
        try {
            const format = getImageType(logoToUse);
            let logoX = margin;
            
            if (layout.logoPosition === 'center') {
                logoX = (pageWidth - layout.logoSize) / 2;
            } else if (layout.logoPosition === 'right') {
                logoX = pageWidth - margin - layout.logoSize;
            }

            doc.addImage(logoToUse, format, logoX, currentY, layout.logoSize, layout.logoSize);
            
            // Push content down only if logo is big or centered/blocking
            if (layout.logoPosition === 'center') {
                currentY += layout.logoSize + 5;
            }
        } catch (e) {}
    }

    // Business Details
    const headerAlign = layout.headerAlignment;
    // Determine X position based on alignment
    const headerX = headerAlign === 'center' ? centerX : (headerAlign === 'right' ? pageWidth - margin : margin);
    
    // If logo is left and text is left, we need to offset text Y or X. 
    // Simplest approach: If aligned left/right, text starts at top (next to logo if space permits).
    // For simplicity in this engine, we'll stack text below logo if center, else distinct.
    
    let textY = layout.logoPosition === 'center' ? currentY : margin;
    
    // Adjust text X offset if logo is left and alignment is left to avoid overlap
    let textXOffset = (layout.logoPosition === 'left' && headerAlign === 'left') ? (layout.logoSize + 5) : 0;
    
    if (profile) {
        doc.setFont(fonts.titleFont, 'bold');
        doc.setFontSize(fonts.headerSize);
        doc.setTextColor(colors.primary);
        doc.text(profile.name, headerX + textXOffset, textY, { align: headerAlign });
        
        textY += (fonts.headerSize * 0.4) + 2; // Line height approx
        
        doc.setFont(fonts.bodyFont, 'normal');
        doc.setFontSize(fonts.bodySize);
        doc.setTextColor(colors.secondary);
        
        const addressLines = doc.splitTextToSize(profile.address, (pageWidth / 2));
        doc.text(addressLines, headerX + textXOffset, textY, { align: headerAlign });
        textY += (addressLines.length * 4);
        
        const contactLine = [
            profile.phone ? `Ph: ${profile.phone}` : '',
            profile.gstNumber ? `GSTIN: ${profile.gstNumber}` : ''
        ].filter(Boolean).join(' | ');
        
        doc.text(contactLine, headerX + textXOffset, textY, { align: headerAlign });
        textY += 6;
    }

    // Update main cursor Y to be below the lowest element (logo or text)
    currentY = Math.max(currentY, textY, layout.logoPosition !== 'center' ? margin + layout.logoSize + 5 : 0);

    // Separator
    doc.setDrawColor(colors.secondary);
    doc.setLineWidth(0.5);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 10;

    // --- 2. TITLE & INVOICE METADATA ---
    doc.setFont(fonts.titleFont, 'bold');
    doc.setFontSize(16);
    doc.setTextColor(colors.text);
    doc.text(content.titleText, centerX, currentY, { align: 'center' });
    currentY += 10;

    // Two Columns: Billed To (Left), Invoice Details (Right)
    const colWidth = (pageWidth - (margin * 2)) / 2;
    
    // Left Col
    doc.setFontSize(11);
    doc.setFont(fonts.bodyFont, 'bold');
    doc.setTextColor(colors.primary);
    doc.text('Billed To:', margin, currentY);
    
    doc.setFont(fonts.bodyFont, 'normal');
    doc.setFontSize(fonts.bodySize);
    doc.setTextColor(colors.text);
    const custY = currentY + 5;
    doc.text(customer.name, margin, custY);
    const custAddrLines = doc.splitTextToSize(customer.address || '', colWidth - 5);
    doc.text(custAddrLines, margin, custY + 5);
    
    // Right Col
    const rightColX = pageWidth - margin;
    doc.setFont(fonts.bodyFont, 'bold');
    doc.setFontSize(11);
    doc.setTextColor(colors.primary);
    doc.text('Invoice Details:', rightColX, currentY, { align: 'right' });
    
    doc.setFont(fonts.bodyFont, 'normal');
    doc.setFontSize(fonts.bodySize);
    doc.setTextColor(colors.text);
    doc.text(`Invoice No: ${sale.id}`, rightColX, custY, { align: 'right' });
    doc.text(`Date: ${new Date(sale.date).toLocaleDateString()}`, rightColX, custY + 5, { align: 'right' });

    // QR Code (if enabled) - Positioned in the white space of right column if possible
    if (content.showQr) {
        try {
            const qrBase64 = await getQrCodeBase64(sale.id);
            if (qrBase64) {
                // Place QR to the left of the Invoice Details text
                doc.addImage(qrBase64, 'PNG', rightColX - 55, currentY, 20, 20);
            }
        } catch (e) {}
    }

    currentY = Math.max(custY + 5 + (custAddrLines.length * 4), custY + 25) + 5;

    // --- 3. ITEMS TABLE ---
    autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        head: [['#', 'Item Description', 'Qty', 'Rate', 'Amount']],
        body: sale.items.map((item, index) => [
            index + 1,
            item.productName,
            item.quantity,
            `Rs. ${Number(item.price).toLocaleString('en-IN')}`,
            `Rs. ${(Number(item.quantity) * Number(item.price)).toLocaleString('en-IN')}`
        ]),
        theme: 'grid',
        styles: {
            font: fonts.bodyFont,
            fontSize: fonts.bodySize,
            textColor: colors.text,
            lineColor: [200, 200, 200],
            lineWidth: 0.1,
        },
        headStyles: { 
            fillColor: colors.tableHeaderBg,
            textColor: colors.tableHeaderText,
            fontStyle: 'bold'
        },
        columnStyles: { 
            0: { halign: 'center', cellWidth: 10 },
            2: { halign: 'center', cellWidth: 20 }, 
            3: { halign: 'right', cellWidth: 30 }, 
            4: { halign: 'right', cellWidth: 35 } 
        }
    });

    // --- 4. TOTALS ---
    let finalY = (doc as any).lastAutoTable.finalY + 10;
    
    const subTotal = sale.items.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
    const paidAmount = (sale.payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
    const dueAmount = Number(sale.totalAmount) - paidAmount;

    const totalsX = pageWidth - margin;
    const labelX = totalsX - 40;
    
    const addTotalRow = (label: string, value: string, isBold: boolean = false, colorOverride?: string, sizeOverride?: number) => {
        doc.setFont(fonts.bodyFont, isBold ? 'bold' : 'normal');
        doc.setFontSize(sizeOverride || fonts.bodySize);
        doc.setTextColor(colorOverride || colors.text);
        doc.text(label, labelX, finalY, { align: 'right' });
        doc.text(value, totalsX, finalY, { align: 'right' });
        finalY += 6;
    };

    addTotalRow('Subtotal:', `Rs. ${subTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
    addTotalRow('Discount:', `- Rs. ${Number(sale.discount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
    addTotalRow('GST Included:', `Rs. ${Number(sale.gstAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
    
    finalY += 2;
    // Draw line above Grand Total
    doc.setDrawColor(colors.secondary);
    doc.line(labelX - 20, finalY - 4, totalsX, finalY - 4);

    addTotalRow('Grand Total:', `Rs. ${Number(sale.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, true, colors.primary, fonts.bodySize + 2);
    addTotalRow('Paid:', `Rs. ${paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
    
    const dueColor = dueAmount > 0.01 ? '#dc2626' : '#16a34a'; // Red if due, Green if clear
    addTotalRow('Amount Due:', `Rs. ${dueAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, true, dueColor, fonts.bodySize + 2);

    // --- 5. TERMS & FOOTER ---
    
    // Ensure we have space for terms, else new page
    if (pageHeight - finalY < 40) {
        doc.addPage();
        finalY = margin;
    } else {
        finalY += 10;
    }

    if (content.showTerms && content.termsText) {
        doc.setFontSize(fonts.bodySize);
        doc.setFont(fonts.bodyFont, 'bold');
        doc.setTextColor(colors.text);
        doc.text("Terms & Conditions:", margin, finalY);
        finalY += 5;
        
        doc.setFont(fonts.bodyFont, 'normal');
        doc.setTextColor(colors.secondary);
        const termsLines = doc.splitTextToSize(content.termsText, pageWidth - (margin * 2));
        doc.text(termsLines, margin, finalY);
    }

    // Watermark (optional)
    if (layout.showWatermark) {
        doc.saveGraphicsState();
        doc.setGState(new doc.GState({ opacity: 0.1 }));
        doc.setFontSize(60);
        doc.setTextColor(colors.primary);
        doc.text(profile?.name || 'INVOICE', pageWidth/2, pageHeight/2, { align: 'center', angle: 45 });
        doc.restoreGraphicsState();
    }

    // Footer
    doc.setFontSize(9);
    doc.setTextColor(colors.secondary);
    doc.text(content.footerText, centerX, pageHeight - 10, { align: 'center' });

    return doc;
};

// --- Estimate Generator (Wraps the Invoice Logic with minimal tweaks) ---
export const generateEstimatePDF = async (quote: Quote, customer: Customer, profile: ProfileData | null): Promise<jsPDF> => {
    // Legacy/Simple fallback for estimates or create a separate template config later
    // For now, using the standard function but just hardcoding the title.
    const doc = new jsPDF();
    let startY = addBusinessHeader(doc, profile);

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#000000');
    doc.text('ESTIMATE / QUOTATION', 105, startY, { align: 'center' });
    startY += 10;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Estimate For:', 14, startY);
    doc.text('Estimate Details:', 120, startY);
    startY += 5;

    doc.setFont('helvetica', 'normal');
    doc.text(customer.name, 14, startY);
    doc.text(`Estimate No: ${quote.id}`, 120, startY);
    startY += 5;

    const customerAddr = doc.splitTextToSize(customer.address || '', 80);
    doc.text(customerAddr, 14, startY);
    doc.text(`Date: ${new Date(quote.date).toLocaleDateString()}`, 120, startY);
    
    if (quote.validUntil) {
        startY += 5;
        doc.text(`Valid Until: ${new Date(quote.validUntil).toLocaleDateString()}`, 120, startY);
        startY -= 5;
    }
    
    startY += Math.max((customerAddr.length * 5), 10) + 5;

    autoTable(doc, {
        startY: startY,
        head: [['#', 'Item Description', 'Qty', 'Rate', 'Amount']],
        body: quote.items.map((item, index) => [
            index + 1,
            item.productName,
            item.quantity,
            `Rs. ${Number(item.price).toLocaleString('en-IN')}`,
            `Rs. ${(Number(item.quantity) * Number(item.price)).toLocaleString('en-IN')}`
        ]),
        theme: 'grid',
        headStyles: { fillColor: [100, 116, 139] },
        columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } }
    });

    let finalY = (doc as any).lastAutoTable.finalY + 10;
    const subTotal = quote.items.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
    const totalsX = 196;
    const labelX = totalsX - 40;
    
    doc.text('Subtotal:', labelX, finalY, { align: 'right' });
    doc.text(`Rs. ${subTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, totalsX, finalY, { align: 'right' });
    
    return doc;
};

// --- Debit Note Generator ---
export const generateDebitNotePDF = async (returnData: Return, supplier: Supplier | undefined, profile: ProfileData | null): Promise<jsPDF> => {
    const doc = new jsPDF();
    let startY = addBusinessHeader(doc, profile);

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#000000');
    doc.text('DEBIT NOTE', 105, startY, { align: 'center' });
    startY += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('To Supplier:', 14, startY);
    doc.text('Reference Details:', 120, startY);
    startY += 5;

    doc.setFont('helvetica', 'normal');
    doc.text(supplier?.name || 'Unknown Supplier', 14, startY);
    doc.text(`Debit Note #: ${returnData.id}`, 120, startY);
    startY += 5;

    const suppAddr = doc.splitTextToSize(supplier?.location || '', 80);
    doc.text(suppAddr, 14, startY);
    doc.text(`Date: ${new Date(returnData.returnDate).toLocaleDateString()}`, 120, startY);
    startY += 5;
    doc.text(`Original Inv #: ${returnData.referenceId}`, 120, startY);
    
    startY += Math.max((suppAddr.length * 5), 10) + 5;

    autoTable(doc, {
        startY: startY,
        head: [['#', 'Item Description', 'Qty', 'Rate', 'Amount']],
        body: returnData.items.map((item, index) => [
            index + 1,
            item.productName,
            item.quantity,
            `Rs. ${Number(item.price).toLocaleString('en-IN')}`,
            `Rs. ${(Number(item.quantity) * Number(item.price)).toLocaleString('en-IN')}`
        ]),
        theme: 'grid',
        headStyles: { fillColor: [0, 128, 128] },
        columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' } }
    });

    let finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Debit Value: Rs. ${Number(returnData.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 196, finalY, { align: 'right' });

    return doc;
};
