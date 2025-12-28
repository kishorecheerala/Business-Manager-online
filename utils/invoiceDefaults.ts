import { InvoiceTemplateConfig, DocumentType, InvoiceLabels, ProfileData, Page, CustomSection } from '../types';

export const dummyCustomer = {
    id: 'CUST-001',
    name: 'John Doe Enterprises',
    phone: '9876543210',
    address: '123 Business Park, Tech City, Hyderabad, Telangana 500081',
    area: 'Tech City',
    reference: 'Walk-in'
};

export const dummySale = {
    id: 'INV-2023-001',
    customerId: 'CUST-001',
    items: [
        { productId: 'P1', productName: 'Premium Silk Saree - Kanchipuram', quantity: 2, price: 4500, gstPercent: 5, hsn: '5208', mrp: 5000 },
        { productId: 'P2', productName: 'Cotton Kurti', quantity: 5, price: 850, gstPercent: 5, hsn: '6204', mrp: 1200 },
        { productId: 'P3', productName: 'Designer Blouse - Gold', quantity: 3, price: 1200, gstPercent: 12, hsn: '6206', mrp: 1800 }
    ],
    discount: 500,
    gstAmount: 1250,
    totalAmount: 16350,
    date: new Date().toISOString(),
    payments: [{ id: 'PAY-1', amount: 5000, date: new Date().toISOString(), method: 'UPI' as const }]
};

export const defaultLabels: InvoiceLabels = {
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

export const REPORT_SCENARIOS = {
    'SALES_REPORT': {
        title: "Sales Report",
        subtitle: "Summary of monthly performance",
        headers: ['Item Name', 'Category', 'Qty', 'Amount'],
        data: [['Silk Saree', 'Apparel', '10', '45,000'], ['Cotton Shirt', 'Apparel', '25', '12,500'], ['Gold Jewellery', 'Accessories', '2', '80,000']],
        summary: [{ label: 'Total Sales', value: 'Rs. 1,37,500' }]
    },
    'CUSTOMER_DUES': {
        title: "Customer Dues Summary",
        subtitle: "Statement For: John Doe Enterprises",
        headers: ['Invoice ID', 'Date', 'Total', 'Paid', 'Due'],
        data: [
            ['INV-001', '01/10/2023', 'Rs. 15,000', 'Rs. 5,000', 'Rs. 10,000'],
            ['INV-005', '15/10/2023', 'Rs. 8,500', 'Rs. 0', 'Rs. 8,500'],
            ['INV-012', '20/10/2023', 'Rs. 22,000', 'Rs. 10,000', 'Rs. 12,000']
        ],
        summary: [{ label: 'Total Outstanding Due', value: 'Rs. 30,500', color: '#dc2626' }]
    },
    'LOW_STOCK': {
        title: "Low Stock Reorder Report",
        subtitle: "Items with quantity < 5",
        headers: ['Product Name', 'Current Stock', 'Last Cost'],
        data: [
            ['Blue Cotton Saree', '2', 'Rs. 800'],
            ['Kids Wear Set - Red', '0', 'Rs. 450'],
            ['Silk Scarf', '4', 'Rs. 300']
        ],
        summary: []
    }
};

export type ReportScenarioKey = keyof typeof REPORT_SCENARIOS;

export const PRESETS: Record<string, any> = {
    'Modern': {
        colors: { primary: '#0f172a', secondary: '#64748b', text: '#334155', tableHeaderBg: '#f1f5f9', tableHeaderText: '#0f172a', borderColor: '#e2e8f0', alternateRowBg: '#f8fafc' },
        fonts: { titleFont: 'helvetica', bodyFont: 'helvetica', headerSize: 24, bodySize: 10 },
        layout: {
            logoPosition: 'left', logoOffsetX: 0, logoOffsetY: 0, headerAlignment: 'right', headerStyle: 'minimal', margin: 10, logoSize: 25, showWatermark: false, watermarkOpacity: 0.1,
            tableOptions: { hideQty: false, hideRate: false, stripedRows: true, bordered: false, compact: false },
            sectionOrdering: ['header', 'title', 'details', 'table', 'totals', 'words', 'terms', 'signature', 'footer'],
            uppercaseHeadings: true,
            columnWidths: {},
            tablePadding: 3,
            borderRadius: 4,
            spacing: 1.0,
            elementSpacing: { logoBottom: 5, titleBottom: 2, addressBottom: 1, headerBottom: 5 }
        } as any,
        content: { showAmountInWords: true, showStatusStamp: true, footerText: 'Thank you for your business' }
    },
    'Corporate': {
        colors: { primary: '#1e40af', secondary: '#475569', text: '#1e293b', tableHeaderBg: '#1e40af', tableHeaderText: '#ffffff', bannerBg: '#1e40af', bannerText: '#ffffff' },
        fonts: { titleFont: 'times', bodyFont: 'times', headerSize: 22, bodySize: 11 },
        layout: {
            logoPosition: 'center', logoOffsetX: 0, logoOffsetY: 0, headerAlignment: 'center', headerStyle: 'banner', margin: 15, logoSize: 30, showWatermark: true, watermarkOpacity: 0.05,
            tableOptions: { hideQty: false, hideRate: false, stripedRows: false, bordered: true, compact: false },
            sectionOrdering: ['header', 'title', 'details', 'table', 'totals', 'words', 'terms', 'signature', 'footer'],
            uppercaseHeadings: true,
            columnWidths: {},
            tablePadding: 4,
            borderRadius: 0,
            spacing: 1.1,
            elementSpacing: { logoBottom: 8, titleBottom: 4, addressBottom: 2, headerBottom: 8 }
        } as any,
        content: { showAmountInWords: true, showStatusStamp: true, footerText: 'Thank you for your business' }
    },
    'Minimal': {
        colors: { primary: '#000000', secondary: '#52525b', text: '#27272a', tableHeaderBg: '#ffffff', tableHeaderText: '#000000', borderColor: '#d4d4d8' },
        fonts: { titleFont: 'courier', bodyFont: 'courier', headerSize: 20, bodySize: 9 },
        layout: {
            logoPosition: 'right', logoOffsetX: 0, logoOffsetY: 0, headerAlignment: 'left', headerStyle: 'minimal', margin: 12, logoSize: 20, showWatermark: false, watermarkOpacity: 0.1,
            tableOptions: { hideQty: false, hideRate: false, stripedRows: false, bordered: false, compact: true },
            sectionOrdering: ['header', 'details', 'title', 'table', 'totals', 'words', 'footer'],
            uppercaseHeadings: false,
            columnWidths: {},
            tablePadding: 2,
            borderRadius: 0,
            spacing: 0.9,
            elementSpacing: { logoBottom: 3, titleBottom: 1, addressBottom: 1, headerBottom: 3 }
        } as any,
        content: { showAmountInWords: true, showStatusStamp: true, footerText: 'Thank you for your business' }
    },
    'Bold': {
        colors: { primary: '#dc2626', secondary: '#1f2937', text: '#111827', tableHeaderBg: '#dc2626', tableHeaderText: '#ffffff', bannerBg: '#dc2626', bannerText: '#ffffff' },
        fonts: { titleFont: 'helvetica', bodyFont: 'helvetica', headerSize: 28, bodySize: 10 },
        layout: {
            logoPosition: 'left', logoOffsetX: 0, logoOffsetY: 0, headerAlignment: 'left', headerStyle: 'banner', margin: 10, logoSize: 35, showWatermark: true, watermarkOpacity: 0.15,
            tableOptions: { hideQty: false, hideRate: false, stripedRows: true, bordered: true, compact: false },
            sectionOrdering: ['header', 'title', 'details', 'table', 'totals', 'words', 'signature', 'footer'],
            uppercaseHeadings: true,
            columnWidths: {},
            tablePadding: 4,
            borderRadius: 8,
            spacing: 1.0,
            elementSpacing: { logoBottom: 5, titleBottom: 2, addressBottom: 1, headerBottom: 5 }
        } as any,
        content: { showStatusStamp: true, showAmountInWords: true, footerText: 'Thank you for your business' }
    },
    'Classic': {
        colors: { primary: '#2c3e50', secondary: '#7f8c8d', text: '#2c3e50', tableHeaderBg: '#ecf0f1', tableHeaderText: '#2c3e50', borderColor: '#bdc3c7' },
        fonts: { titleFont: 'times', bodyFont: 'times', headerSize: 26, bodySize: 11 },
        layout: {
            logoPosition: 'center', headerAlignment: 'center', headerStyle: 'standard', margin: 15, logoSize: 28, showWatermark: false,
            tableOptions: { hideQty: false, hideRate: false, stripedRows: false, bordered: true, compact: false },
            sectionOrdering: ['header', 'title', 'details', 'table', 'totals', 'words', 'terms', 'signature', 'footer'],
            uppercaseHeadings: true,
            columnWidths: {},
            tablePadding: 3,
            borderRadius: 0,
            spacing: 1.1,
            elementSpacing: { logoBottom: 6, titleBottom: 3, addressBottom: 2, headerBottom: 6 }
        } as any,
        content: { showAmountInWords: true, showStatusStamp: true, footerText: 'Thank you for your business' }
    },
    'Creative': {
        colors: { primary: '#8b5cf6', secondary: '#a78bfa', text: '#4c1d95', tableHeaderBg: '#f5f3ff', tableHeaderText: '#5b21b6', borderColor: '#ddd6fe', alternateRowBg: '#fcfaff' },
        fonts: { titleFont: 'helvetica', bodyFont: 'helvetica', headerSize: 28, bodySize: 10 },
        layout: {
            logoPosition: 'right', headerAlignment: 'left', headerStyle: 'minimal', margin: 12, logoSize: 32, showWatermark: true, watermarkOpacity: 0.08,
            tableOptions: { hideQty: false, hideRate: false, stripedRows: true, bordered: false, compact: false },
            sectionOrdering: ['header', 'title', 'details', 'table', 'totals', 'words', 'footer', 'signature'],
            uppercaseHeadings: false,
            columnWidths: {},
            tablePadding: 4,
            borderRadius: 12,
            spacing: 1.2,
            elementSpacing: { logoBottom: 4, titleBottom: 2, addressBottom: 1, headerBottom: 4 }
        } as any,
        content: { showAmountInWords: true, showStatusStamp: true, footerText: 'Thank you for your business' }
    },
    'Compact': {
        colors: { primary: '#111827', secondary: '#374151', text: '#1f2937', tableHeaderBg: '#e5e7eb', tableHeaderText: '#000000', borderColor: '#9ca3af' },
        fonts: { titleFont: 'helvetica', bodyFont: 'helvetica', headerSize: 18, bodySize: 9 },
        layout: {
            logoPosition: 'left', headerAlignment: 'right', headerStyle: 'standard', margin: 8, logoSize: 20, showWatermark: false,
            tableOptions: { hideQty: false, hideRate: false, stripedRows: false, bordered: true, compact: true },
            sectionOrdering: ['header', 'title', 'details', 'table', 'totals', 'words', 'footer'],
            uppercaseHeadings: true,
            columnWidths: {},
            tablePadding: 2,
            borderRadius: 2,
            spacing: 0.9,
            elementSpacing: { logoBottom: 2, titleBottom: 1, addressBottom: 0, headerBottom: 2 }
        } as any,
        content: { showAmountInWords: true, showStatusStamp: true, footerText: 'Thank you for your business' }
    },
    'Elegant': {
        colors: { primary: '#b4975a', secondary: '#5e503f', text: '#231f20', tableHeaderBg: '#231f20', tableHeaderText: '#b4975a', borderColor: '#e5e5e5' },
        fonts: { titleFont: 'times', bodyFont: 'times', headerSize: 24, bodySize: 10 },
        layout: {
            logoPosition: 'left', headerAlignment: 'right', headerStyle: 'minimal', margin: 15, logoSize: 30, showWatermark: true, watermarkOpacity: 0.05,
            tableOptions: { hideQty: false, hideRate: false, stripedRows: false, bordered: false, compact: false },
            sectionOrdering: ['header', 'details', 'title', 'table', 'totals', 'words', 'signature', 'terms', 'footer'],
            uppercaseHeadings: true,
            columnWidths: {},
            tablePadding: 3,
            borderRadius: 0,
            spacing: 1.2,
            elementSpacing: { logoBottom: 5, titleBottom: 3, addressBottom: 2, headerBottom: 8 }
        } as any,
        content: { showAmountInWords: true, showStatusStamp: true, footerText: 'Thank you for your business' }
    },
    'Tech': {
        colors: { primary: '#0ea5e9', secondary: '#334155', text: '#0f172a', tableHeaderBg: '#0f172a', tableHeaderText: '#0ea5e9', borderColor: '#cbd5e1', alternateRowBg: '#f1f5f9' },
        fonts: { titleFont: 'courier', bodyFont: 'courier', headerSize: 22, bodySize: 10 },
        layout: {
            logoPosition: 'right', headerAlignment: 'left', headerStyle: 'standard', margin: 10, logoSize: 24, showWatermark: false,
            tableOptions: { hideQty: false, hideRate: false, stripedRows: true, bordered: true, compact: true },
            sectionOrdering: ['header', 'title', 'details', 'table', 'totals', 'words', 'footer'],
            uppercaseHeadings: true,
            columnWidths: {},
            tablePadding: 2,
            borderRadius: 4,
            spacing: 1.0,
            elementSpacing: { logoBottom: 3, titleBottom: 2, addressBottom: 1, headerBottom: 4 }
        } as any,
        content: { showAmountInWords: true, showStatusStamp: true, footerText: 'Thank you for your business' }
    },
    'Retail': {
        colors: { primary: '#ea580c', secondary: '#431407', text: '#292524', tableHeaderBg: '#ea580c', tableHeaderText: '#ffffff', borderColor: '#fdba74' },
        fonts: { titleFont: 'helvetica', bodyFont: 'helvetica', headerSize: 28, bodySize: 11 },
        layout: {
            logoPosition: 'center', headerAlignment: 'center', headerStyle: 'banner', margin: 12, logoSize: 35, showWatermark: true, watermarkOpacity: 0.1,
            tableOptions: { hideQty: false, hideRate: false, stripedRows: true, bordered: true, compact: false },
            sectionOrdering: ['header', 'title', 'details', 'table', 'totals', 'words', 'signature', 'footer'],
            uppercaseHeadings: true,
            columnWidths: {},
            tablePadding: 4,
            borderRadius: 6,
            spacing: 1.0,
            elementSpacing: { logoBottom: 4, titleBottom: 2, addressBottom: 1, headerBottom: 5 }
        } as any,
        content: { showAmountInWords: true, showStatusStamp: true, footerText: 'Thank you for your business' }
    },
    'Glassmorphism': {
        colors: { primary: '#6366f1', secondary: '#94a3b8', text: '#1e293b', tableHeaderBg: 'rgba(99, 102, 241, 0.1)', tableHeaderText: '#4338ca', borderColor: 'rgba(226, 232, 240, 0.5)', alternateRowBg: 'rgba(248, 250, 252, 0.5)' },
        fonts: { titleFont: 'helvetica', bodyFont: 'helvetica', headerSize: 26, bodySize: 10 },
        layout: {
            logoPosition: 'left', logoOffsetX: 0, logoOffsetY: 0, headerAlignment: 'right', headerStyle: 'minimal', margin: 12, logoSize: 28, showWatermark: true, watermarkOpacity: 0.05,
            tableOptions: { hideQty: false, hideRate: false, stripedRows: true, bordered: false, compact: false },
            sectionOrdering: ['header', 'title', 'details', 'table', 'totals', 'words', 'signature', 'footer'],
            uppercaseHeadings: true,
            columnWidths: {},
            tablePadding: 4,
            borderRadius: 16,
            spacing: 1.1,
            elementSpacing: { logoBottom: 6, titleBottom: 3, addressBottom: 2, headerBottom: 6 }
        } as any,
        content: { showAmountInWords: true, showStatusStamp: true, footerText: 'Thank you for your business' }
    }
};
