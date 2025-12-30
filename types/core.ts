export interface Customer {
    id: string;
    name: string;
    phone: string;
    address: string;
    area: string;
    reference?: string;
    priceTier?: 'RETAIL' | 'WHOLESALE';
    updatedAt?: string;
    // NEW: Bulk notification preferences
    notificationPreferences?: {
        smsEnabled: boolean;
        whatsappEnabled: boolean;
        emailEnabled?: boolean;
        birthdate?: string; // For birthday notifications
    };
    tags?: string[]; // NEW: For segmentation (e.g., 'VIP', 'Regular')
}

export interface Supplier {
    id: string;
    name: string;
    phone: string;
    location: string;
    gstNumber?: string;
    reference?: string;
    account1?: string;
    account2?: string;
    upi?: string;
    updatedAt?: string;
}

export interface ProductBatch {
    id: string;
    quantity: number;
    expiryDate?: string;
    entryDate: string;
}

export interface CustomFont {
    id: string;
    name: string;
    url: string;
    weight?: string;
    style?: string;
}

export interface Product {
    id: string;
    name: string;
    description?: string;
    category?: string;
    quantity: number;
    purchasePrice: number;
    salePrice: number;
    wholesalePrice?: number;
    gstPercent: number;
    unit?: string;
    hsn?: string;
    mrp?: number;
    image?: string;
    updatedAt?: string;
    additionalImages?: string[];
    batches?: ProductBatch[];
}
