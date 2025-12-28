import jsPDF from 'jspdf';
import { Sale, Customer, ProfileData, InvoiceTemplateConfig, CustomFont } from '../../types';
import { GenericDocumentData } from './types';
import { defaultLabels, registerCustomFonts, formatCurrency } from './helpers';
import { generateConfigurablePDF } from './PDFBuilder';

export const generateBulkInvoicePdf = async (
    sales: Sale[],
    customers: Customer[],
    profile: ProfileData | null,
    templateConfig?: InvoiceTemplateConfig,
    customFonts?: CustomFont[]
) => {
    if (sales.length === 0) return null;

    // Create Main Doc
    const configToUse: InvoiceTemplateConfig = templateConfig || {
        id: 'default',
        currencySymbol: 'Rs.',
        dateFormat: 'DD/MM/YYYY',
        colors: { primary: '#000', secondary: '#555', text: '#000', tableHeaderBg: '#f3f4f6', tableHeaderText: '#000', bannerBg: '#eee', bannerText: '#000', footerBg: '#fff', footerText: '#000', borderColor: '#eee', alternateRowBg: '#f9fafb' },
        fonts: { titleFont: 'helvetica', bodyFont: 'helvetica', headerSize: 20, bodySize: 10 },
        layout: { margin: 10, logoSize: 20, headerStyle: 'standard', logoPosition: 'center', headerAlignment: 'center', footerStyle: 'standard', showWatermark: false, watermarkOpacity: 0.1, tableOptions: { hideQty: false, hideRate: false, stripedRows: false, bordered: false, compact: false }, elementSpacing: {} },
        content: { titleText: 'INVOICE', labels: defaultLabels, showQr: true, showTerms: true, showSignature: true, termsText: '', footerText: '', showBusinessDetails: true, showCustomerDetails: true, signatureText: '', showAmountInWords: true, showStatusStamp: true, showTaxBreakdown: false, showGst: true, qrType: 'INVOICE_ID', bankDetails: '' }
    };

    const paperSize = configToUse.layout.paperSize || 'a4';
    const doc = new jsPDF({ format: paperSize });

    if (customFonts) registerCustomFonts(doc, customFonts);

    let isFirst = true;

    for (const sale of sales) {
        const customer = customers.find(c => c.id === sale.customerId);
        if (!customer) continue;

        const currencySymbol = configToUse.currencySymbol || 'Rs.';
        const labels = { ...defaultLabels, ...configToUse.content.labels };
        const paid = (sale.payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
        const due = Number(sale.totalAmount) - paid;

        const data: GenericDocumentData = {
            id: sale.id,
            date: new Date(sale.date).toISOString(),
            recipient: {
                label: labels.billedTo,
                name: customer.name,
                address: customer.address,
                contact: customer.phone
            },
            sender: {
                label: "From",
                idLabel: labels.invoiceNo
            },
            items: sale.items.map(i => ({
                name: i.productName,
                quantity: i.quantity,
                rate: Number(i.price),
                amount: Number(i.price) * Number(i.quantity),
                hsn: i.hsn,
                mrp: i.mrp
            })),
            totals: [],
            qrString: sale.id,
            grandTotalNumeric: Number(sale.totalAmount)
        };

        const subTotal = sale.items.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);

        if (sale.discount > 0 || sale.gstAmount > 0) {
            data.totals.push({ label: labels.subtotal, value: formatCurrency(subTotal, currencySymbol) });
            if (configToUse.content.showGst !== false && sale.gstAmount > 0) {
                data.totals.push({ label: labels.gst, value: formatCurrency(Number(sale.gstAmount), currencySymbol) });
            }
            if (sale.discount > 0) data.totals.push({ label: labels.discount, value: `-${formatCurrency(Number(sale.discount), currencySymbol)}` });
        }

        data.totals.push({ label: labels.grandTotal, value: formatCurrency(Number(sale.totalAmount), currencySymbol), isBold: true, size: 11 });
        if (paid > 0) data.totals.push({ label: labels.paid, value: formatCurrency(paid, currencySymbol) });
        if (due > 0.01) {
            data.totals.push({ label: labels.balance, value: formatCurrency(due, currencySymbol), isBold: true, size: 10 });
        }

        // If it's the first sale, we use the doc as is (which has 1 blank page from init).
        // BUT _generateConfigurablePDF ADDS a page if existingDoc is passed.
        // So for the FIRST one, we pass existingDoc, it adds page 2.
        // We delete page 1 at the end.
        await generateConfigurablePDF(data, profile, configToUse, customFonts, undefined, doc);
        isFirst = false;
    }

    // New jsPDF() creates 1 blank page. _generateConfigurablePDF adds a page for each call.
    // So if we have 3 sales, we have Page 1 (Blank), Page 2, Page 3, Page 4.
    // We always delete Page 1.
    if (doc.getNumberOfPages() > 1) {
        doc.deletePage(1);
    }

    return doc;
};
