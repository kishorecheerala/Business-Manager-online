
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ReportConfig } from '../../types';
import { generateDownloadFilename } from '../formatUtils';

export class ExportEngine {

    static exportToCSV(config: ReportConfig, data: any[]) {
        if (!data || data.length === 0) return;

        const headers = config.fields.map(f => f.label);
        const keys = config.fields.map(f => f.id);

        const rows = data.map(row =>
            keys.map(k => {
                const val = row[k];
                // basic sanitization
                if (val === null || val === undefined) return '';
                return `"${String(val).replace(/"/g, '""')}"`;
            }).join(',')
        );

        const csvContent = [headers.join(','), ...rows].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', generateDownloadFilename(config.title, 'csv'));
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    static exportToPDF(config: ReportConfig, data: any[]) {
        if (!data || data.length === 0) return;

        const doc = new jsPDF();

        // Header
        doc.setFontSize(18);
        doc.text(config.title, 14, 22);

        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
        if (config.description) {
            doc.text(config.description, 14, 38);
        }

        const headers = config.fields.map(f => f.label);
        const keys = config.fields.map(f => f.id);

        const tableData = data.map(row =>
            keys.map(k => {
                const f = config.fields.find(field => field.id === k);
                const val = row[k];
                if (f?.type === 'currency') return `Rs.${Number(val || 0).toLocaleString()}`;
                if (f?.type === 'date') return new Date(val).toLocaleDateString();
                return val;
            })
        );

        // AutoTable
        autoTable(doc, {
            head: [headers],
            body: tableData,
            startY: 45,
            theme: 'grid',
            headStyles: { fillColor: [124, 58, 237] }, // Violet-600
        });

        doc.save(generateDownloadFilename(config.title, 'pdf'));
    }
}
