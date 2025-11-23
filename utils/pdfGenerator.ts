
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Sale, Customer, ProfileData, Purchase, Supplier, Return } from '../types';

// --- Helper: Fetch QR Code ---
const getQrCodeBase64 = async (data: string): Promise<string> => {
    try {
        const response = await fetch(`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(data)}&size=200x200&margin=0`);
        const blob = await response.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        return '';
    }
};

// --- Helper: Add Header (Common for A4/Debit Note, NOT Thermal) ---
const addBusinessHeader = (doc: jsPDF, profile: ProfileData | null) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const centerX = pageWidth / 2;
    let currentY = 10;

    // 1. SACRED TEXT
    doc.setFont('times', 'italic');
    doc.setFontSize(10);
    doc.setTextColor('#000000');
    doc.text('Om Namo Venkatesaya', centerX, currentY, { align: 'center' });
    currentY += 6;

    // 2. BUSINESS DETAILS
    if (profile) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.setTextColor('#0d9488'); // Primary Color
        doc.text(profile.name, centerX, currentY, { align: 'center' });
        currentY += 7;
        
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
    } else {
        doc.setFontSize(22);
        doc.setTextColor('#0d9488');
        doc.text("Business Manager", centerX, currentY, { align: 'center' });
        currentY += 8;
    }
    
    // Separator Line
    currentY += 2;
    doc.setDrawColor('#cccccc');
    doc.setLineWidth(0.5);
    doc.line(14, currentY, pageWidth - 14, currentY);
    
    return currentY + 5; 
};

// --- Thermal Receipt Generator (80mm) ---
export const generateThermalInvoicePDF = async (sale: Sale, customer: Customer, profile: ProfileData | null): Promise<jsPDF> => {
    // Estimate height dynamically: Base ~150mm + items
    const estimatedHeight = 160 + (sale.items.length * 15);
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, estimatedHeight]
    });

    const pageWidth = 80;
    const margin = 4;
    const centerX = pageWidth / 2;
    let y = 10;

    // 1. Sacred Text (Italic, Centered)
    doc.setFont('times', 'italic');
    doc.setFontSize(12);
    doc.setTextColor('#000000');
    doc.text('Om Namo Venkatesaya', centerX, y, { align: 'center' });
    y += 7;

    // 2. Business Name (Teal, Bold, Centered)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor('#009688'); // Teal color
    doc.text(profile?.name || 'Business Name', centerX, y, { align: 'center' });
    y += 8;

    doc.setTextColor('#000000');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    // 3. Metadata & QR Code
    const qrSize = 20;
    const qrX = pageWidth - margin - qrSize;
    const startHeaderY = y;

    // QR Code generation
    const qrBase64 = await getQrCodeBase64(sale.id);
    if (qrBase64) {
        doc.addImage(qrBase64, 'PNG', qrX, startHeaderY - 2, qrSize, qrSize);
    }

    // Invoice Info (Left aligned)
    doc.text(`Invoice: ${sale.id}`, margin, y);
    y += 5;
    const dateStr = new Date(sale.date).toLocaleString('en-IN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: false
    });
    doc.text(`Date: ${dateStr}`, margin, y);
    y += 5;

    // Ensure Y clears the QR code
    y = Math.max(y + 2, startHeaderY + qrSize + 2);

    // 4. Billed To
    doc.setFont('helvetica', 'bold');
    doc.text('Billed To:', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.text(customer.name, margin, y);
    y += 5;
    const addressLines = doc.splitTextToSize(customer.address, pageWidth - (margin * 2));
    doc.text(addressLines, margin, y);
    y += (addressLines.length * 5) + 3;

    // 5. Separator & Purchase Details
    doc.setLineWidth(0.3);
    doc.setDrawColor(0, 0, 0);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Purchase Details', centerX, y, { align: 'center' });
    y += 3;
    
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    // 6. Table Headers
    doc.setFontSize(9);
    doc.text('Item', margin, y);
    doc.text('Total', pageWidth - margin, y, { align: 'right' });
    y += 6;

    // 7. Items
    doc.setFont('helvetica', 'normal');
    
    sale.items.forEach(item => {
        const itemTotal = Number(item.price) * Number(item.quantity);
        
        // Item Name (Left)
        doc.setTextColor('#000000');
        doc.setFontSize(9);
        const nameLines = doc.splitTextToSize(item.productName, 55);
        doc.text(nameLines, margin, y);
        
        // Item Total (Right, aligned with first line of name)
        doc.text(`Rs. ${itemTotal.toLocaleString('en-IN')}`, pageWidth - margin, y, { align: 'right' });
        
        y += (nameLines.length * 4.5);
        
        // Quantity/Rate Detail (Gray, indented or below)
        doc.setTextColor('#555555');
        doc.setFontSize(8);
        doc.text(`(x${item.quantity} @ Rs. ${Number(item.price).toLocaleString('en-IN')})`, margin + 2, y - 1);
        
        y += 5;
    });

    // 8. Separator
    y += 2;
    doc.setDrawColor(150);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    // 9. Totals Section
    const subTotal = sale.items.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
    const paidAmount = (sale.payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
    const dueAmount = Number(sale.totalAmount) - paidAmount;

    const addRow = (label: string, value: string, isBold = false, size = 9, color = '#000000') => {
        doc.setFont('helvetica', isBold ? 'bold' : 'normal');
        doc.setFontSize(size);
        doc.setTextColor(color);
        doc.text(label, pageWidth - 35, y, { align: 'right' });
        doc.text(value, pageWidth - margin, y, { align: 'right' });
        y += 5;
    };

    addRow('Subtotal', `Rs. ${subTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
    addRow('GST', `Rs. ${Number(sale.gstAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
    addRow('Discount', `Rs. -${Number(sale.discount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
    
    y += 2;
    addRow('Total', `Rs. ${Number(sale.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, true, 11);
    
    addRow('Paid', `Rs. ${paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
    
    y += 2;
    addRow('Due', `Rs. ${dueAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, true, 11);

    return doc;
};

// --- A4 Invoice Generator (Legacy/Print) ---
export const generateA4InvoicePdf = async (sale: Sale, customer: Customer, profile: ProfileData | null): Promise<jsPDF> => {
    const doc = new jsPDF();
    let startY = addBusinessHeader(doc, profile);

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#000000');
    doc.text('TAX INVOICE', 105, startY, { align: 'center' });
    startY += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Billed To:', 14, startY);
    doc.text('Invoice Details:', 120, startY);
    startY += 5;

    doc.setFont('helvetica', 'normal');
    doc.text(customer.name, 14, startY);
    doc.text(`Invoice No: ${sale.id}`, 120, startY);
    startY += 5;

    const customerAddr = doc.splitTextToSize(customer.address || '', 80);
    doc.text(customerAddr, 14, startY);
    doc.text(`Date: ${new Date(sale.date).toLocaleString()}`, 120, startY);
    
    startY += Math.max((customerAddr.length * 5), 10) + 5;

    autoTable(doc, {
        startY: startY,
        head: [['#', 'Item Description', 'Qty', 'Rate', 'Amount']],
        body: sale.items.map((item, index) => [
            index + 1,
            item.productName,
            item.quantity,
            `Rs. ${Number(item.price).toLocaleString('en-IN')}`,
            `Rs. ${(Number(item.quantity) * Number(item.price)).toLocaleString('en-IN')}`
        ]),
        theme: 'grid',
        headStyles: { fillColor: [13, 148, 136] }, 
        styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: { 
            0: { cellWidth: 10 },
            2: { halign: 'right', cellWidth: 20 }, 
            3: { halign: 'right', cellWidth: 30 }, 
            4: { halign: 'right', cellWidth: 35 } 
        }
    });

    let finalY = (doc as any).lastAutoTable.finalY + 10;

    const subTotal = sale.items.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
    const paidAmount = (sale.payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
    const dueAmount = Number(sale.totalAmount) - paidAmount;

    const totalsX = 196;
    const labelX = totalsX - 40;
    
    const addTotalRow = (label: string, value: string, isBold: boolean = false, color: string = '#000000') => {
        doc.setFont('helvetica', isBold ? 'bold' : 'normal');
        doc.setTextColor(color);
        doc.text(label, labelX, finalY, { align: 'right' });
        doc.text(value, totalsX, finalY, { align: 'right' });
        finalY += 6;
    };

    addTotalRow('Subtotal:', `Rs. ${subTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
    addTotalRow('Discount:', `- Rs. ${Number(sale.discount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
    addTotalRow('GST Included:', `Rs. ${Number(sale.gstAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
    
    finalY += 2;
    addTotalRow('Grand Total:', `Rs. ${Number(sale.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, true);
    addTotalRow('Paid:', `Rs. ${paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
    
    const dueColor = dueAmount > 0.01 ? '#dc2626' : '#16a34a';
    doc.setFontSize(12);
    addTotalRow('Amount Due:', `Rs. ${dueAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, true, dueColor);

    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(9);
    doc.setTextColor('#888888');
    doc.text('Thank you for your business!', 105, pageHeight - 10, { align: 'center' });

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
        headStyles: { fillColor: [13, 148, 136] },
        columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' } }
    });

    let finalY = (doc as any).lastAutoTable.finalY + 10;
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Debit Value: Rs. ${Number(returnData.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 196, finalY, { align: 'right' });

    if (returnData.notes) {
        finalY += 15;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Notes:', 14, finalY);
        finalY += 5;
        doc.setFont('helvetica', 'normal');
        const notes = doc.splitTextToSize(returnData.notes, 180);
        doc.text(notes, 14, finalY);
    }

    return doc;
};
