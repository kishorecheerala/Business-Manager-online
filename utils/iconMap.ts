import React from 'react';
import {
    Home, Users, ShoppingCart, Package, FileText, Receipt, Undo2, PenTool, Gauge, Database, Trash2, BarChart2, Calculator
} from 'lucide-react';
import { Page } from '../types';

export const ICON_MAP: Record<string, React.ElementType> = {
    'DASHBOARD': Home,
    'CUSTOMERS': Users,
    'SALES': ShoppingCart,
    'PURCHASES': Package,
    'INSIGHTS': BarChart2,
    'PRODUCTS': Package,
    'REPORTS': FileText,
    'EXPENSES': Receipt,
    'RETURNS': Undo2,
    'QUOTATIONS': FileText,
    'FINANCIAL_PLANNING': Calculator,
    'INVOICE_DESIGNER': PenTool,
    'SYSTEM_OPTIMIZER': Gauge,
    'SQL_ASSISTANT': Database,
    'TRASH': Trash2
};

export const LABEL_MAP: Record<string, string> = {
    'DASHBOARD': 'Home',
    'CUSTOMERS': 'Customers',
    'SALES': 'Sales',
    'PURCHASES': 'Purchases',
    'INSIGHTS': 'Insights',
    'PRODUCTS': 'Products',
    'REPORTS': 'Reports',
    'EXPENSES': 'Expenses',
    'RETURNS': 'Returns',
    'QUOTATIONS': 'Estimates',
    'FINANCIAL_PLANNING': 'Planning',
    'INVOICE_DESIGNER': 'Designer',
    'SYSTEM_OPTIMIZER': 'System',
    'SQL_ASSISTANT': 'SQL AI',
    'TRASH': 'Recycle Bin'
};
