import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { InvoiceTemplateConfig, ProfileData, CustomFont } from '../../types';
import { registerCustomFonts } from './helpers';

export const generateGenericReportPDF = async (title: string, subtitle: string, headers: string[], tableData: string[][], summary: any[], profile: ProfileData | null, templateConfig: InvoiceTemplateConfig, customFonts?: CustomFont[]) => {
    const doc = new jsPDF();
    if (customFonts) registerCustomFonts(doc, customFonts);
    const { colors, fonts, layout, content } = templateConfig;
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = layout.margin || 10;
    const spacingScale = layout.spacing !== undefined ? layout.spacing : 1.0;
    let y = margin;

    const addY = (amount: number) => {
        y += amount * spacingScale;
    };

    doc.setFont(fonts.titleFont, 'bold');
    doc.setFontSize(16);
    doc.setTextColor(colors.primary);
    doc.text(title, pageWidth / 2, y, { align: 'center' });
    addY(7);
    doc.setFontSize(10);
    doc.setTextColor(colors.secondary);
    doc.text(subtitle, pageWidth / 2, y, { align: 'center' });
    addY(10);

    autoTable(doc, {
        startY: y,
        head: [headers],
        body: tableData,
        theme: layout.tableOptions?.stripedRows ? 'striped' : 'plain',
        styles: { font: fonts.bodyFont, fontSize: fonts.bodySize, cellPadding: 2 },
        headStyles: { fillColor: colors.tableHeaderBg, textColor: colors.tableHeaderText },
        margin: { left: margin, right: margin }
    });

    if (summary && summary.length) {
        y = (doc as any).lastAutoTable.finalY + (10 * spacingScale);
        summary.forEach(s => {
            doc.setFont(fonts.bodyFont, 'bold');
            doc.setTextColor(s.color || colors.text);

            const valStr = `${s.value}`;
            doc.text(valStr, pageWidth - margin, y, { align: 'right' });

            const vWidth = doc.getTextWidth(valStr);
            // Align label to left of value
            doc.text(`${s.label}`, pageWidth - margin - vWidth - 3, y, { align: 'right' });

            addY(6);
        });
    }
    return doc;
};
