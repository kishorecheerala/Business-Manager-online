import { Sale, Customer, ProfileData, InvoiceTemplateConfig, CustomFont, Quote, Return, Supplier } from '../types';
import { GenericDocumentData } from './pdf/types';
import { defaultLabels, registerCustomFonts, getImageType, formatDate, formatCurrency, getQrCodeBase64, numberToWords } from './pdf/helpers';
import { PDFLayoutEngine } from './pdf/PDFLayoutEngine';
import { generateThermalInvoicePDF } from './pdf/ThermalPrinter';
import { generateConfigurablePDF } from './pdf/PDFBuilder';
import { generateImagesToPDF } from './pdf/ImageToPDF';
import { generateGenericReportPDF } from './pdf/ReportPDF';
import { generateBulkInvoicePdf } from './pdf/BulkInvoice';

// Re-export specific helpers/types if needed by consumers
export {
    registerCustomFonts,
    getImageType,
    formatDate,
    formatCurrency,
    getQrCodeBase64,
    numberToWords,
    PDFLayoutEngine,
    generateThermalInvoicePDF,
    generateImagesToPDF,
    generateGenericReportPDF,
    generateBulkInvoicePdf
};

export type { GenericDocumentData };

// --- Wrapper Functions (Backward Compatibility) ---

export const generateA4InvoicePdf = async (sale: Sale, customer: Customer, profile: ProfileData | null, templateConfig?: InvoiceTemplateConfig, customFonts?: CustomFont[]) => {
    const defaultConfig: InvoiceTemplateConfig = {
        id: 'default', currencySymbol: 'Rs.', dateFormat: 'DD/MM/YYYY',
        colors: { primary: '#0d9488', secondary: '#333333', text: '#000000', tableHeaderBg: '#0d9488', tableHeaderText: '#ffffff', bannerBg: '#0d9488', bannerText: '#ffffff', footerBg: '#f3f4f6', footerText: '#374151', borderColor: '#e5e7eb', alternateRowBg: '#f9fafb' },
        fonts: { headerSize: 22, bodySize: 10, titleFont: 'helvetica', bodyFont: 'helvetica' },
        layout: { margin: 10, logoSize: 25, logoPosition: 'center', logoOffsetX: 0, logoOffsetY: 0, headerAlignment: 'center', headerStyle: 'standard', footerStyle: 'standard', showWatermark: false, watermarkOpacity: 0.1, qrPosition: 'details-right', tableOptions: { hideQty: false, hideRate: false, stripedRows: false, bordered: false, compact: false }, elementSpacing: { logoBottom: 5, titleBottom: 2, addressBottom: 1, headerBottom: 5 } },
        content: { titleText: 'TAX INVOICE', labels: defaultLabels, showQr: true, showTerms: true, showSignature: true, termsText: '', footerText: 'Thank you for your business', showBusinessDetails: true, showCustomerDetails: true, signatureText: '', showAmountInWords: true, showStatusStamp: true, showTaxBreakdown: false, showGst: true, qrType: 'INVOICE_ID', bankDetails: '' }
    };
    const config = templateConfig || defaultConfig;
    const labels = { ...defaultLabels, ...config.content.labels };
    const currency = config.currencySymbol || 'Rs.';

    const subTotal = sale.items.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
    const paidAmount = (sale.payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
    const dueAmount = Number(sale.totalAmount) - paidAmount;

    let qrString = sale.id;
    if (config.content.qrType === 'UPI_PAYMENT' && config.content.upiId) {
        const pa = config.content.upiId;
        const pn = config.content.payeeName || 'Merchant';
        const am = sale.totalAmount.toFixed(2);
        const tr = sale.id;
        qrString = `upi://pay?pa=${pa}&pn=${encodeURIComponent(pn)}&am=${am}&tr=${tr}&tn=Invoice%20${sale.id}&cu=INR`;
    }

    const totals: GenericDocumentData['totals'] = [
        { label: labels.subtotal, value: formatCurrency(subTotal, currency, config.fonts.bodyFont) },
        { label: labels.discount, value: `- ${formatCurrency(Number(sale.discount), currency, config.fonts.bodyFont)}` },
    ];
    if (config.content.showGst !== false) totals.push({ label: labels.gst, value: formatCurrency(Number(sale.gstAmount), currency, config.fonts.bodyFont) });
    totals.push(
        { label: labels.grandTotal, value: formatCurrency(Number(sale.totalAmount), currency, config.fonts.bodyFont), isBold: true, color: config.colors.primary, size: config.fonts.bodySize + 2 },
        { label: labels.paid, value: formatCurrency(paidAmount, currency, config.fonts.bodyFont) },
        { label: labels.balance, value: formatCurrency(dueAmount, currency, config.fonts.bodyFont), isBold: true, color: dueAmount > 0.01 ? '#dc2626' : '#16a34a', size: config.fonts.bodySize + 2 }
    );

    const data: GenericDocumentData = {
        id: sale.id, date: sale.date,
        recipient: { label: labels.billedTo, name: customer.name, address: customer.address },
        sender: { label: 'Invoice Details:', idLabel: labels.invoiceNo },
        items: sale.items.map(item => ({ name: item.productName, quantity: item.quantity, rate: Number(item.price), amount: Number(item.quantity) * Number(item.price), hsn: item.hsn, mrp: item.mrp })),
        totals, qrString, grandTotalNumeric: Number(sale.totalAmount), balanceDue: dueAmount
    };
    return generateConfigurablePDF(data, profile, config, customFonts);
};

export const generateReceiptPDF = async (sale: Sale, customer: Customer, profile: ProfileData | null, templateConfig: InvoiceTemplateConfig, customFonts?: CustomFont[]) => {
    return generateThermalInvoicePDF(sale, customer, profile, templateConfig, customFonts);
};

export const generateEstimatePDF = async (quote: Quote, customer: Customer, profile: ProfileData | null, templateConfig: InvoiceTemplateConfig, customFonts?: CustomFont[]) => {
    const labels = { ...defaultLabels, ...templateConfig.content.labels };
    const currency = templateConfig.currencySymbol || 'Rs.';
    const subTotal = quote.items.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
    const totals: GenericDocumentData['totals'] = [
        { label: labels.subtotal, value: formatCurrency(subTotal, currency, templateConfig.fonts.bodyFont) },
        { label: labels.discount, value: `- ${formatCurrency(Number(quote.discount), currency, templateConfig.fonts.bodyFont)}` },
    ];
    if (templateConfig.content.showGst !== false) totals.push({ label: labels.gst, value: formatCurrency(Number(quote.gstAmount), currency, templateConfig.fonts.bodyFont) });
    totals.push({ label: labels.grandTotal, value: formatCurrency(Number(quote.totalAmount), currency, templateConfig.fonts.bodyFont), isBold: true, color: templateConfig.colors.primary, size: templateConfig.fonts.bodySize + 2 });

    const data: GenericDocumentData = {
        id: quote.id, date: quote.date,
        recipient: { label: 'Estimate For:', name: customer.name, address: customer.address },
        sender: { label: 'Estimate Details:', idLabel: labels.invoiceNo },
        items: quote.items.map(item => ({ name: item.productName, quantity: item.quantity, rate: Number(item.price), amount: Number(item.quantity) * Number(item.price) })),
        totals, watermarkText: 'ESTIMATE', grandTotalNumeric: Number(quote.totalAmount)
    };
    return generateConfigurablePDF(data, profile, templateConfig, customFonts);
};

export const generateDebitNotePDF = async (returnData: Return, supplier: Supplier | undefined, profile: ProfileData | null, templateConfig: InvoiceTemplateConfig, customFonts?: CustomFont[]) => {
    const labels = { ...defaultLabels, ...templateConfig.content.labels };
    const currency = templateConfig.currencySymbol || 'Rs.';
    const data: GenericDocumentData = {
        id: returnData.id, date: returnData.returnDate,
        recipient: { label: labels.billedTo, name: supplier?.name || 'Unknown Supplier', address: supplier?.location || '' },
        sender: { label: 'Reference Details:', idLabel: labels.invoiceNo },
        items: returnData.items.map(item => ({ name: item.productName, quantity: item.quantity, rate: Number(item.price), amount: Number(item.quantity) * Number(item.price) })),
        totals: [{ label: 'Total Debit Value:', value: formatCurrency(Number(returnData.amount), currency, templateConfig.fonts.bodyFont), isBold: true, size: templateConfig.fonts.bodySize + 2 }],
        watermarkText: 'DEBIT NOTE', grandTotalNumeric: Number(returnData.amount)
    };
    return generateConfigurablePDF(data, profile, templateConfig, customFonts);
};
