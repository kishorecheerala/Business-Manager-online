export interface InvoiceLabels {
    billedTo: string;
    date: string;
    invoiceNo: string;
    item: string;
    qty: string;
    rate: string;
    amount: string;
    subtotal: string;
    discount: string;
    gst: string;
    grandTotal: string;
    paid: string;
    balance: string;
}

export interface CustomSection {
    id: string;
    type: 'text-block' | 'image-block' | 'divider';
    content?: string;
    styles?: {
        fontSize?: number;
        fontWeight?: 'normal' | 'bold';
        align?: 'left' | 'center' | 'right';
        color?: string;
        height?: number;
        width?: number;
        marginTop?: number;
        marginBottom?: number;
    };
}

export interface InvoiceTemplateConfig {
    id: string;
    currencySymbol: string;
    dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
    colors: {
        primary: string;
        secondary: string;
        text: string;
        tableHeaderBg: string;
        tableHeaderText: string;
        bannerBg?: string;
        bannerText?: string;
        footerBg?: string;
        footerText?: string;
        borderColor?: string;
        alternateRowBg?: string;
    };
    fonts: {
        headerSize: number;
        bodySize: number;
        titleFont: string;
        bodyFont: string;
    };
    layout: {
        margin: number;
        logoSize: number;
        logoPosition: 'left' | 'center' | 'right';
        logoOffsetX?: number;
        logoOffsetY?: number;
        logoPosX?: number;
        logoPosY?: number;
        qrPosition?: 'header-right' | 'details-right' | 'footer-left' | 'footer-right';
        qrPosX?: number;
        qrPosY?: number;
        qrOverlaySize?: number;
        headerAlignment: 'left' | 'center' | 'right';
        headerStyle?: 'standard' | 'banner' | 'minimal';
        footerStyle?: 'standard' | 'banner';
        showWatermark: boolean;
        watermarkOpacity: number;
        watermarkText?: string;
        columnWidths?: { qty?: number; rate?: number; amount?: number; };
        tablePadding?: number;
        borderRadius?: number;
        uppercaseHeadings?: boolean;
        boldBorders?: boolean;
        spacing?: number;
        elementSpacing?: {
            logoBottom?: number;
            titleBottom?: number;
            addressBottom?: number;
            headerBottom?: number;
        };
        tableOptions: {
            hideQty: boolean;
            hideRate: boolean;
            stripedRows: boolean;
            bordered?: boolean;
            showHSN?: boolean;
            showMRP?: boolean;
            compact?: boolean;
        };
        tableHeaderAlign?: 'left' | 'center' | 'right';
        sectionOrdering?: string[];
        customSections?: CustomSection[];
        backgroundImage?: string;
        paperSize?: 'a4' | 'letter';
    };
    content: {
        titleText: string;
        showTerms: boolean;
        showQr: boolean;
        termsText: string;
        footerText: string;
        showBusinessDetails?: boolean;
        showCustomerDetails?: boolean;
        showSignature?: boolean;
        signatureText?: string;
        signatureImage?: string;
        showSecondarySignature?: boolean;
        secondarySignatureText?: string;
        secondarySignatureImage?: string;
        showAmountInWords?: boolean;
        showStatusStamp?: boolean;
        showTaxBreakdown?: boolean;
        showGst?: boolean;
        labels?: InvoiceLabels;
        qrType?: 'INVOICE_ID' | 'UPI_PAYMENT';
        upiId?: string;
        payeeName?: string;
        bankDetails?: string;
    };
}
