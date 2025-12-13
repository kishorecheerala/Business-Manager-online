
import {
    ShoppingCart, UserPlus, PackagePlus, Receipt, Undo2, FileText, Package, BarChart2
} from 'lucide-react';
import { Page } from '../types';

export const QUICK_ACTION_REGISTRY: Record<string, { icon: any, label: string, page: Page, action?: string }> = {
    'add_sale': { icon: ShoppingCart, label: 'Sale', page: 'SALES', action: 'new' },
    'add_customer': { icon: UserPlus, label: 'Customer', page: 'CUSTOMERS', action: 'new' },
    'add_expense': { icon: Receipt, label: 'Expense', page: 'EXPENSES', action: 'new' },
    'add_purchase': { icon: PackagePlus, label: 'Purchase', page: 'PURCHASES', action: 'new' },
    'add_quote': { icon: FileText, label: 'Estimate', page: 'QUOTATIONS', action: 'new' },
    'add_return': { icon: Undo2, label: 'Return', page: 'RETURNS', action: 'new' },
    'view_products': { icon: Package, label: 'Products', page: 'PRODUCTS' },
    'view_reports': { icon: FileText, label: 'Reports', page: 'REPORTS' },
    'view_insights': { icon: BarChart2, label: 'Insights', page: 'INSIGHTS' },
};

export const QUICK_ACTION_SHORTCUTS: Record<string, string> = {
    'add_sale': 'S',
    'add_customer': 'C',
    'add_expense': 'E',
    'add_purchase': 'P',
    'add_quote': 'Q',
    'add_return': 'R',
};
