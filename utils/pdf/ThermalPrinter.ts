import jsPDF from 'jspdf';
import { Sale, Customer, ProfileData, InvoiceTemplateConfig, CustomFont } from '../../types';
import { defaultLabels, registerCustomFonts, getImageType, formatDate, formatCurrency, getQrCodeBase64, numberToWords } from './helpers';

// --- Thermal Receipt Generator (80mm Standard) ---
export const generateThermalInvoicePDF = async (sale: Sale, customer: Customer, profile: ProfileData | null, templateConfig?: InvoiceTemplateConfig, customFonts?: CustomFont[]) => {
    const currency = templateConfig?.currencySymbol || 'Rs.';
    const labels = { ...defaultLabels, ...templateConfig?.content.labels };
    const spacing = templateConfig?.layout.elementSpacing || { logoBottom: 5, titleBottom: 2, addressBottom: 1, headerBottom: 5 };

    const widthFull = 80;
    const margin = templateConfig?.layout.margin ?? 3;
    const pageWidth = widthFull - (margin * 2);
    const centerX = widthFull / 2;

    let qrCodeBase64: string | null = null;
    const showQr = templateConfig?.content.showQr ?? true;
    const showWords = templateConfig?.content.showAmountInWords ?? true;

    // Theme configs
    const primaryColor = templateConfig?.colors.primary || '#0d9488';
    const textColor = templateConfig?.colors.text || '#000000';
    const titleFont = templateConfig?.fonts.titleFont || 'helvetica';
    const bodyFont = templateConfig?.fonts.bodyFont || 'helvetica';

    // Layout Options
    const hideQty = templateConfig?.layout.tableOptions?.hideQty || false;
    const hideRate = templateConfig?.layout.tableOptions?.hideRate || false;
    const headerAlign = templateConfig?.layout.headerAlignment || 'center';

    // Logo Positioning
    const logoPos = templateConfig?.layout.logoPosition || 'center';
    const isAbsoluteLogo = templateConfig?.layout.logoPosX !== undefined && templateConfig?.layout.logoPosY !== undefined;
    const logoPosX = templateConfig?.layout.logoPosX ?? margin;
    const logoPosY = templateConfig?.layout.logoPosY ?? 5;

    // QR Code Config
    const qrSize = templateConfig?.layout.qrOverlaySize || 18;
    const isAbsoluteQr = templateConfig?.layout.qrPosX !== undefined && templateConfig?.layout.qrPosY !== undefined;
    const qrPosX = templateConfig?.layout.qrPosX || 0;
    const qrPosY = templateConfig?.layout.qrPosY || 0;
    const qrPosition = templateConfig?.layout.qrPosition || 'header-right';

    if (showQr) {
        qrCodeBase64 = await getQrCodeBase64(sale.id);
    }

    const renderContent = (doc: jsPDF) => {
        let y = 8;
        if (customFonts) registerCustomFonts(doc, customFonts);

        // 1. Logo
        if (profile?.logo) {
            try {
                const logoSize = templateConfig?.layout.logoSize ? templateConfig.layout.logoSize : 18;
                let x = (widthFull - logoSize) / 2;
                let ly = y;

                if (isAbsoluteLogo) {
                    x = logoPosX;
                    ly = logoPosY;
                } else {
                    if (logoPos === 'left') x = margin;
                    if (logoPos === 'right') x = widthFull - margin - logoSize;
                }

                const imgProps = doc.getImageProperties(profile.logo);
                const ratio = imgProps.width / imgProps.height;
                const h = logoSize / ratio;

                doc.addImage(profile.logo, getImageType(profile.logo), x, ly, logoSize, h);

                if (!isAbsoluteLogo) {
                    y += h + (spacing.logoBottom ?? 4);
                }
            } catch (e) { }
        }

        // 2. Header
        doc.setFont(titleFont, 'bold');
        doc.setFontSize(14);
        doc.setTextColor(primaryColor);

        let alignX = centerX;
        if (headerAlign === 'left') alignX = margin;
        if (headerAlign === 'right') alignX = widthFull - margin;

        doc.text(profile?.name || 'Business Name', alignX, y, { align: headerAlign });
        y += (6 + (spacing.titleBottom ?? 0));

        doc.setTextColor(textColor);
        doc.setFont(bodyFont, 'normal');
        doc.setFontSize(9);

        // 3. Meta & QR (Relative Top)
        const startMetaY = y;

        doc.text(`${labels.invoiceNo}: ${sale.id}`, margin, y);
        y += 4;
        doc.text(`${labels.date}: ${formatDate(sale.date, templateConfig?.dateFormat)}`, margin, y);
        y += 4;

        // Render relative QR (header-right or details-right) if NOT absolute
        if (qrCodeBase64 && !isAbsoluteQr && (qrPosition === 'header-right' || qrPosition === 'details-right')) {
            try {
                doc.addImage(qrCodeBase64, 'PNG', widthFull - margin - qrSize, startMetaY - 2, qrSize, qrSize);
            } catch (e) { }
            // Adjust y to avoid overlap
            y = Math.max(y, startMetaY + qrSize - 2) + 4;
        } else {
            y += 2;
        }

        // 4. Billed To
        doc.setFont(bodyFont, 'bold');
        doc.text(labels.billedTo, margin, y);
        y += 4;
        doc.setFont(bodyFont, 'normal');
        doc.text(customer.name, margin, y);
        y += 4;

        const addressLines = doc.splitTextToSize(customer.address, pageWidth);
        doc.text(addressLines, margin, y);
        y += (addressLines.length * 4) + 2;

        // 5. Purchase Details Divider
        doc.setLineWidth(0.3);
        doc.setDrawColor(textColor);
        doc.line(margin, y, widthFull - margin, y);
        y += 5;
        doc.setFont(bodyFont, 'bold');
        doc.setFontSize(10);
        doc.text('Purchase Details', centerX, y, { align: 'center' });
        y += 2;
        doc.line(margin, y, widthFull - margin, y);
        y += 5;

        // 6. Items
        doc.setFont(bodyFont, 'normal');
        sale.items.forEach(item => {
            const itemTotal = Number(item.price) * Number(item.quantity);

            doc.setFontSize(9);
            doc.setTextColor(textColor);
            doc.setFont(bodyFont, 'bold');

            const totalStr = formatCurrency(itemTotal, currency, bodyFont);
            const totalWidth = doc.getTextWidth(totalStr) + 2;
            const nameWidth = pageWidth - totalWidth - 2;

            const nameLines = doc.splitTextToSize(item.productName, nameWidth);
            doc.text(nameLines, margin, y);

            doc.text(totalStr, widthFull - margin, y, { align: 'right' });

            y += (nameLines.length * 4);

            // Sub-details line (Qty/Rate) if not hidden
            let detailsText = '';
            if (!hideQty && !hideRate) {
                detailsText = `(x${item.quantity} @ ${formatCurrency(Number(item.price), currency, bodyFont)})`;
            } else if (!hideQty) {
                detailsText = `(${labels.qty}: ${item.quantity})`;
            } else if (!hideRate) {
                detailsText = `(@ ${formatCurrency(Number(item.price), currency, bodyFont)})`;
            }

            if (detailsText) {
                doc.setFontSize(8);
                doc.setTextColor('#555555');
                doc.setFont(bodyFont, 'normal');
                doc.text(detailsText, margin + 2, y);
                y += 5;
            } else {
                y += 2;
            }
        });

        doc.setTextColor(textColor);
        doc.setLineWidth(0.2);
        doc.line(margin, y, widthFull - margin, y);
        y += 5;

        // 7. Totals
        const subTotal = sale.items.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
        const paid = (sale.payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
        const due = Number(sale.totalAmount) - paid;

        const addTotalRow = (label: string, value: string, bold: boolean = false, fontSize: number = 9) => {
            doc.setFont(bodyFont, bold ? 'bold' : 'normal');
            doc.setFontSize(fontSize);

            // Align Value Right
            doc.text(value, widthFull - margin, y, { align: 'right' });

            // Dynamic Label Alignment
            const valWidth = doc.getTextWidth(value);
            // Align Label Right, to the left of value with some padding (2mm)
            doc.text(label, widthFull - margin - valWidth - 2, y, { align: 'right' });
            y += 5;
        };

        if (sale.discount > 0 || sale.gstAmount > 0) {
            addTotalRow(labels.subtotal, formatCurrency(subTotal, currency, bodyFont));
            if (templateConfig?.content.showGst !== false && sale.gstAmount > 0) {
                addTotalRow(labels.gst, formatCurrency(Number(sale.gstAmount), currency, bodyFont));
            }
            if (sale.discount > 0) addTotalRow(labels.discount, `-${formatCurrency(Number(sale.discount), currency, bodyFont)}`);
            y += 1;
        }

        addTotalRow(labels.grandTotal, formatCurrency(Number(sale.totalAmount), currency, bodyFont), true, 11);
        if (paid > 0) addTotalRow(labels.paid, formatCurrency(paid, currency, bodyFont));
        if (due > 0.01) {
            addTotalRow(labels.balance, formatCurrency(due, currency, bodyFont), true, 10);
        } else {
            addTotalRow(labels.balance, `${currency} 0.00`, true, 10);
        }

        // Amount In Words
        if (showWords) {
            y += 3;
            doc.setFont(bodyFont, 'italic');
            doc.setFontSize(8);
            doc.setTextColor('#333333');
            const words = numberToWords(Number(sale.totalAmount));
            const wordLines = doc.splitTextToSize(words, pageWidth);
            doc.text(wordLines, widthFull - margin, y, { align: 'right' });
            y += (wordLines.length * 3.5) + 3;
            doc.setTextColor(textColor);
        }

        // 8. Footer
        y += 2;
        doc.setFont(bodyFont, 'italic');
        doc.setFontSize(8);
        const footerText = templateConfig?.content.footerText || 'Thank You!';
        const footerLines = doc.splitTextToSize(footerText, pageWidth);
        doc.text(footerLines, centerX, y, { align: 'center' });
        y += (footerLines.length * 4);

        // UPDATED: Render QR Relative (Footer position)
        if (qrCodeBase64 && !isAbsoluteQr && (qrPosition === 'footer-left' || qrPosition === 'footer-right')) {
            let fQrX = margin;
            if (qrPosition === 'footer-right') fQrX = widthFull - margin - qrSize;

            try {
                doc.addImage(qrCodeBase64, 'PNG', fQrX, y, qrSize, qrSize);
            } catch (e) { }
            y += qrSize + 5;
        }

        // UPDATED: Absolute QR Render
        if (qrCodeBase64 && isAbsoluteQr) {
            try {
                doc.addImage(qrCodeBase64, 'PNG', qrPosX, qrPosY, qrSize, qrSize);
            } catch (e) { }
        }

        return y + 5;
    };

    const dummyDoc = new jsPDF({ orientation: 'p', unit: 'mm', format: [widthFull, 1000] });
    const height = renderContent(dummyDoc);

    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: [widthFull, height] });
    renderContent(doc);

    return doc;
};
