export interface Payment {
    id: string;
    amount: number;
    date: string;
    method: 'CASH' | 'UPI' | 'CHEQUE' | 'RETURN_CREDIT';
    reference?: string;
    accountId?: string;
}

export interface SaleItem {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    hsn?: string;
    mrp?: number;
}

export interface RecurringConfig {
    frequency: 'weekly' | 'monthly' | 'quarterly';
    nextOccurrence: string;
    active: boolean;
}

export interface Sale {
    id: string;
    customerId: string;
    items: SaleItem[];
    discount: number;
    gstAmount: number;
    totalAmount: number;
    date: string;
    payments: Payment[];
    updatedAt?: string;
    recurring?: RecurringConfig;
}

export interface SaleDraft {
    customerId: string;
    items: SaleItem[];
    discount: string;
    date: string;
    paymentDetails: {
        amount: string;
        method: 'CASH' | 'UPI' | 'CHEQUE' | 'RETURN_CREDIT';
        date: string;
        reference: string;
    };
    editId?: string;
    recurring?: RecurringConfig;
}

export interface ParkedSale extends SaleDraft {
    id: string;
    parkedAt: number;
}

export interface PurchaseItem {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    gstPercent: number;
    saleValue: number;
    batchNumber?: string;
    expiryDate?: string;
}

export interface Purchase {
    id: string;
    supplierId: string;
    items: PurchaseItem[];
    totalAmount: number;
    discount?: number;
    gstAmount?: number;
    date: string;
    invoiceUrl?: string;
    invoiceImages?: string[];
    supplierInvoiceId?: string;
    payments: Payment[];
    paymentDueDates?: string[];
    updatedAt?: string;
}

export interface ReturnItem {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
}

export interface Return {
    id: string;
    type: 'CUSTOMER' | 'SUPPLIER';
    referenceId: string;
    partyId: string;
    items: ReturnItem[];
    returnDate: string;
    amount: number;
    reason?: string;
    notes?: string;
    updatedAt?: string;
}

export type ExpenseCategory = 'Rent' | 'Salary' | 'Electricity' | 'Transport' | 'Maintenance' | 'Marketing' | 'Food' | 'Other';

export interface Expense {
    id: string;
    category: ExpenseCategory;
    amount: number;
    date: string;
    note?: string;
    paymentMethod: 'CASH' | 'UPI' | 'CHEQUE';
    receiptImage?: string;
    accountId?: string;
}

export interface QuoteItem {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
}

export interface Quote {
    id: string;
    customerId: string;
    items: QuoteItem[];
    totalAmount: number;
    discount: number;
    gstAmount: number;
    date: string;
    validUntil?: string;
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CONVERTED';
    convertedSaleId?: string;
    updatedAt?: string;
}

export interface BankAccount {
    id: string;
    name: string;
    accountNumber: string;
    type: 'SAVINGS' | 'CURRENT' | 'OD' | 'CASH';
    openingBalance: number;
    currentBalance?: number;
    isDefault?: boolean;
}

export interface Budget {
    id: string;
    category: string;
    amount: number;
    period: 'monthly' | 'quarterly' | 'yearly';
    startDate: string;
}

export interface FinancialGoal {
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    deadline?: string;
    monthlyContribution?: number;
    category: 'revenue' | 'savings' | 'expense_limit';
    active: boolean;
    createdAt: string;
    startDate?: string;
    isAutomatic?: boolean;
}

export interface FinancialScenario {
    id: string;
    name: string;
    description?: string;
    changes: {
        revenueChangePercent: number;
        expenseChangePercent: number;
        cogsChangePercent: number;
    };
    isActive: boolean;
}
