import {
    Customer, Supplier, Product, Sale, Purchase, Return, Expense, Quote,
    AppMetadata, AppMetadataPin, AppMetadataUIPreferences, Notification,
    ProfileData, InvoiceTemplateConfig, Budget, FinancialScenario, SaleDraft,
    ParkedSale, Page, Theme, GoogleUser, SyncStatus, AppMetadataInvoiceSettings,
    CustomFont, Payment, AppMetadataDashboardConfig, FinancialGoal, AppMetadataAutoCleanup,
    TrashItem, BankAccount
} from '../types';
import { StoreName } from '../utils/db'; // We need StoreName for REPLACE_COLLECTION

export type Action =
    | { type: 'SET_STATE'; payload: Partial<any> } // Using any for DataState to avoid circular dep, or we can separate DataState
    | { type: 'ADD_CUSTOMER'; payload: Customer }
    | { type: 'UPDATE_CUSTOMER'; payload: Customer }
    | { type: 'ADD_SUPPLIER'; payload: Supplier }
    | { type: 'UPDATE_SUPPLIER'; payload: Supplier }
    | { type: 'ADD_PRODUCT'; payload: Product }
    | { type: 'UPDATE_PRODUCT_STOCK'; payload: { productId: string; change: number } }
    | { type: 'BATCH_UPDATE_PRODUCTS'; payload: Product[] }
    | { type: 'ADD_SALE'; payload: Sale }
    | { type: 'UPDATE_SALE'; payload: { oldSale: Sale; updatedSale: Sale } }
    | { type: 'DELETE_SALE'; payload: string }
    | { type: 'ADD_PAYMENT_TO_SALE'; payload: { saleId: string; payment: any } }
    | { type: 'UPDATE_PAYMENT_IN_SALE'; payload: { saleId: string; payment: any } }
    | { type: 'ADD_PURCHASE'; payload: Purchase }
    | { type: 'UPDATE_PURCHASE'; payload: { oldPurchase: Purchase; updatedPurchase: Purchase } }
    | { type: 'DELETE_PURCHASE'; payload: string }
    | { type: 'ADD_PAYMENT_TO_PURCHASE'; payload: { purchaseId: string; payment: any } }
    | { type: 'ADD_RETURN'; payload: Return }
    | { type: 'UPDATE_RETURN'; payload: { oldReturn: Return; updatedReturn: Return } }
    | { type: 'DELETE_RETURN'; payload: string }
    | { type: 'ADD_EXPENSE'; payload: Expense }
    | { type: 'UPDATE_EXPENSE'; payload: Expense }
    | { type: 'UPDATE_PAYMENT_IN_PURCHASE'; payload: { purchaseId: string; payment: Payment } }
    | { type: 'DELETE_EXPENSE'; payload: string }
    | { type: 'ADD_QUOTE'; payload: Quote }
    | { type: 'UPDATE_QUOTE'; payload: Quote }
    | { type: 'DELETE_QUOTE'; payload: string }
    | { type: 'ADD_NOTIFICATION'; payload: Notification }
    | { type: 'MARK_NOTIFICATION_AS_READ'; payload: string }
    | { type: 'CLEAR_NOTIFICATIONS' }
    | { type: 'CLEAR_AUDIT_LOGS' }
    | { type: 'SET_PROFILE'; payload: ProfileData }
    | { type: 'UPDATE_PROFILE'; payload: Partial<ProfileData> }
    | { type: 'SET_THEME'; payload: Theme }
    | { type: 'SET_THEME_COLOR'; payload: string }
    | { type: 'SET_HEADER_COLOR'; payload: string }
    | { type: 'SET_THEME_GRADIENT'; payload: string }
    | { type: 'SET_FONT'; payload: string }
    | { type: 'UPDATE_UI_PREFERENCES'; payload: Partial<AppMetadataUIPreferences> }
    | { type: 'UPDATE_DASHBOARD_CONFIG'; payload: Partial<AppMetadataDashboardConfig> }
    | { type: 'SET_PIN'; payload: string | null }
    | { type: 'SET_SELECTION'; payload: { page: Page; id: string; action?: 'edit' | 'new' } | null }
    | { type: 'CLEAR_SELECTION' }
    | { type: 'SHOW_TOAST'; payload: { message: string; type?: 'success' | 'info' | 'error' } }
    | { type: 'HIDE_TOAST' }
    | { type: 'SET_GOOGLE_USER'; payload: GoogleUser | null }
    | { type: 'SET_SYNC_STATUS'; payload: SyncStatus }
    | { type: 'SET_SYNC_MESSAGE'; payload: string | undefined }
    | { type: 'ADD_SYNC_LOG'; payload: string }
    | { type: 'CLEAR_SYNC_LOGS' }
    | { type: 'SET_LAST_SYNC_TIME'; payload: number }
    | { type: 'SET_LAST_BACKUP_DATE'; payload: string }
    | { type: 'ADD_CUSTOM_FONT'; payload: CustomFont }
    | { type: 'REMOVE_CUSTOM_FONT'; payload: string }
    | { type: 'SET_DOCUMENT_TEMPLATE'; payload: { type: string; config: InvoiceTemplateConfig } }
    | { type: 'UPDATE_INVOICE_SETTINGS'; payload: AppMetadataInvoiceSettings }
    | { type: 'UPDATE_NAV_ORDER'; payload: string[] }
    | { type: 'RESET_NAV_ORDER' }
    | { type: 'UPDATE_QUICK_ACTIONS'; payload: string[] }
    | { type: 'TOGGLE_PERFORMANCE_MODE' }
    | { type: 'SET_ONLINE_STATUS'; payload: boolean }
    | { type: 'CLEANUP_OLD_DATA' }
    | { type: 'REPLACE_COLLECTION'; payload: { storeName: StoreName; data: any[] } }
    // Sales Draft Actions
    | { type: 'UPDATE_CURRENT_SALE'; payload: Partial<SaleDraft> }
    | { type: 'PARK_CURRENT_SALE' }
    | { type: 'CLEAR_CURRENT_SALE' }
    | { type: 'RESUME_PARKED_SALE'; payload: ParkedSale }
    | { type: 'DELETE_PARKED_SALE'; payload: string }
    | { type: 'ADD_PARKED_SALES'; payload: ParkedSale[] }
    // Trash Actions
    | { type: 'MOVE_TO_TRASH'; payload: TrashItem }
    | { type: 'RESTORE_FROM_TRASH'; payload: TrashItem }
    | { type: 'PERMANENTLY_DELETE_FROM_TRASH'; payload: string }
    | { type: 'EMPTY_TRASH' }
    | { type: 'RESTORE_SNAPSHOT'; payload: Partial<any> } // DataState
    // Bank Account Actions
    | { type: 'ADD_BANK_ACCOUNT'; payload: BankAccount }
    | { type: 'UPDATE_BANK_ACCOUNT'; payload: BankAccount }
    | { type: 'DELETE_BANK_ACCOUNT'; payload: string }
    // Financial Planning Actions
    | { type: 'ADD_BUDGET'; payload: Budget }
    | { type: 'UPDATE_BUDGET'; payload: Budget }
    | { type: 'DELETE_BUDGET'; payload: string }
    | { type: 'ADD_FINANCIAL_SCENARIO'; payload: FinancialScenario }
    | { type: 'UPDATE_FINANCIAL_SCENARIO'; payload: FinancialScenario }
    | { type: 'DELETE_FINANCIAL_SCENARIO'; payload: string }
    | { type: 'ADD_GOAL'; payload: FinancialGoal }
    | { type: 'UPDATE_GOAL'; payload: FinancialGoal }
    | { type: 'DELETE_GOAL'; payload: string }
    | { type: 'LOCK_APP' }
    | { type: 'UNLOCK_APP' }
    | { type: 'UPDATE_SECURITY_CONFIG'; payload: AppMetadataPin['security'] }
    | { type: 'UPDATE_PROTECTED_PAGES'; payload: Page[] }
    | { type: 'RENAME_PRODUCT_ID'; payload: { oldId: string; newId: string } }
    | { type: 'SET_AUTHENTICATED'; payload: boolean }
    | { type: 'TOGGLE_STAFF_MODE'; payload: boolean }
    | { type: 'UPDATE_AUTO_CLEANUP_SETTINGS'; payload: Partial<AppMetadataAutoCleanup> }
    | { type: 'ADD_AUDIT_LOG'; payload: any }
    | { type: 'SET_DB_ERROR'; payload: any | null }
    | { type: 'SET_FULL_STATE'; payload: any };
