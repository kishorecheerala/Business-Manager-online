import { ReactNode } from "react";
import { Customer, Supplier, Product, CustomFont } from "./core";
import { Sale, Purchase, Return, Expense, Quote, BankAccount, Budget, FinancialScenario, FinancialGoal, SaleDraft, ParkedSale } from "./financial";
import { Notification, AuditLogEntry, ProfileData, AppMetadata, AppMetadataInvoiceSettings, AppMetadataDashboardConfig, AppMetadataUIPreferences, AppMetadataAutoCleanup, GoogleUser } from "./metadata";
import { InvoiceTemplateConfig } from "./template";

export type Page = 'DASHBOARD' | 'CUSTOMERS' | 'SALES' | 'PURCHASES' | 'SUPPLIERS' | 'REPORTS' | 'RETURNS' | 'PRODUCTS' | 'INSIGHTS' | 'ANALYTICS' | 'EXPENSES' | 'QUOTATIONS' | 'INVOICE_DESIGNER' | 'SYSTEM_OPTIMIZER' | 'SQL_ASSISTANT' | 'TRASH' | 'FINANCIAL_PLANNING';

export type Theme = 'light' | 'dark' | 'system';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

export interface ToastState {
    message: string;
    show: boolean;
    type: 'success' | 'info' | 'error';
}

export interface Snapshot {
    id: string;
    timestamp: string;
    name: string;
    data: any;
}

export interface TrashItem {
    id: string;
    originalStore: string;
    data: any;
    deletedAt: string;
}

export interface ActionItem {
    id: string;
    title: string;
    description: string;
    type: 'restock' | 'promo' | 'collect' | 'general';
    targetId?: string;
    priority: 'high' | 'medium' | 'low';
}

export interface AIResponse {
    businessHealthScore: number;
    healthReason: string;
    growthAnalysis: string;
    riskAnalysis: string;
    actions: ActionItem[];
    strategy: string;
}

export interface DataState {
    customers: Customer[];
    suppliers: Supplier[];
    products: Product[];
    sales: Sale[];
    purchases: Purchase[];
    returns: Return[];
    expenses: Expense[];
    quotes: Quote[];
    customFonts: CustomFont[];
    app_metadata: AppMetadata[];
    notifications: Notification[];
    audit_logs: AuditLogEntry[];
    profile: ProfileData | null;
    invoiceTemplate: InvoiceTemplateConfig;
    estimateTemplate: InvoiceTemplateConfig;
    debitNoteTemplate: InvoiceTemplateConfig;
    receiptTemplate: InvoiceTemplateConfig;
    reportTemplate: InvoiceTemplateConfig;
    invoiceSettings?: AppMetadataInvoiceSettings;

    bankAccounts: BankAccount[];
    budgets: Budget[];
    financialScenarios: FinancialScenario[];
    goals: FinancialGoal[];

    autoCleanupSettings: AppMetadataAutoCleanup;

    selection: { page: Page; id: string; action?: 'edit' | 'new'; data?: any } | null;

    syncStatus: SyncStatus;
    syncMessage?: string;
    syncLogs: string[];
    lastSyncTime: null | number | string;
    lastLocalUpdate: number;
    devMode: boolean;
    performanceMode: boolean;

    isOnline: boolean;
    isLocked: boolean;
    isAuthenticated: boolean;
    protectedPages: Page[];
    isStaffMode: boolean;
    dbError: any | null;

    currentSale: SaleDraft;
    parkedSales: ParkedSale[];
    trash: TrashItem[];
}

export type ReportType = 'TABLE' | 'BAR' | 'LINE' | 'PIE' | 'AREA' | 'SCATTER' | 'COMPOSED' | 'KPI' | 'FUNNEL' | 'TREEMAP';

export type Aggregation = 'SUM' | 'AVG' | 'COUNT' | 'MIN' | 'MAX' | 'NONE';

export interface ReportField {
    id: string;
    label: string;
    type: 'string' | 'number' | 'date' | 'currency';
    aggregation?: Aggregation;
    hidden?: boolean;
}

export interface ReportFilter {
    id: string;
    operator: 'equals' | 'contains' | 'gt' | 'lt' | 'between' | 'in';
    value: any;
}

export interface ReportConfig {
    id: string;
    title: string;
    description?: string;
    dataSource: 'sales' | 'purchases' | 'inventory' | 'customers' | 'expenses' | 'sale_items';
    fields: ReportField[];
    filters: ReportFilter[];
    groupBy?: string;
    chartType: ReportType;
    createdAt: number;
}
