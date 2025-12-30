import jsPDF from 'jspdf';
import { CustomFont } from '../../types';

export const defaultLabels: any = {
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

export const registerCustomFonts = (doc: jsPDF, fonts: CustomFont[]) => {
    fonts.forEach(font => {
        try {
            const fontData = font.url.split(',')[1] || font.url;
            doc.addFileToVFS(`${font.name}.ttf`, fontData);
            doc.addFont(`${font.name}.ttf`, font.name, 'normal');
            doc.addFont(`${font.name}.ttf`, font.name, 'bold');
            doc.addFont(`${font.name}.ttf`, font.name, 'italic'); // Alias for safety
            doc.addFont(`${font.name}.ttf`, font.name, 'bolditalic'); // Alias for safety
        } catch (e) {
            console.warn(`Failed to register font ${font.name}`, e);
        }
    });
};

export const getImageType = (dataUrl: string): string => {
    if (dataUrl.startsWith('data:image/png')) return 'PNG';
    if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) return 'JPEG';
    if (dataUrl.startsWith('data:image/webp')) return 'WEBP';
    return 'JPEG';
};

export const formatDate = (dateStr: string, format: string = 'DD/MM/YYYY'): string => {
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();

        if (format === 'MM/DD/YYYY') return `${month}/${day}/${year}`;
        if (format === 'YYYY-MM-DD') return `${year}-${month}-${day}`;
        return `${day}/${month}/${year}`;
    } catch (e) { return dateStr; }
};

export const formatCurrency = (amount: number, symbol: string = 'Rs.', fontName: string = 'helvetica'): string => {
    const standardFonts = ['helvetica', 'times', 'courier'];
    let displaySymbol = symbol;
    // Basic font fallback for currency symbols
    if (symbol === '₹' && standardFonts.includes(fontName.toLowerCase())) {
        displaySymbol = 'Rs.';
    }
    return `${displaySymbol} ${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const getQrCodeBase64 = async (data: string): Promise<string> => {
    try {
        const url = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(data)}&size=200x200&margin=0`;
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        return '';
    }
};

export const numberToWords = (n: number | undefined | null): string => {
    if (n === undefined || n === null || isNaN(n)) return "";
    const num = Math.round(n);
    if (num === 0) return "Zero Only";

    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const inWords = (num: number): string => {
        if ((num = num.toString() as any).length > 9) return 'Too Large';
        const n: any = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
        if (!n) return "";
        let str = '';
        str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
        str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
        str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
        str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
        str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
        return str;
    };
    const result = inWords(num).trim();
    return result ? result + " Only" : "";
};
