import { AppState, ReportConfig, ReportField, ReportFilter } from "../../types";

export class ReportEngine {

    static process(state: AppState, config: ReportConfig): any[] {
        // 1. Select Source Data
        let rawData: any[] = [];
        switch (config.dataSource) {
            case 'sales': rawData = state.sales || []; break;
            case 'purchases': rawData = state.purchases || []; break;
            case 'inventory': rawData = state.products || []; break;
            case 'customers': rawData = state.customers || []; break;
            case 'expenses': rawData = state.expenses || []; break;
            default: rawData = [];
        }

        // 2. Flatten & map fields needed
        // For simple reports, we might need to join data (e.g. Sale -> Customer Name)
        // For MVP, we'll do simple lookups
        const flattened = rawData.map(item => this.flattenItem(item, state, config.dataSource));

        // 3. Filter
        const filtered = flattened.filter(item => this.applyFilters(item, config.filters));

        // 4. Group & Aggregate (if groupBy is set)
        if (config.groupBy) {
            return this.groupData(filtered, config.groupBy, config.fields);
        }

        return filtered;
    }

    private static flattenItem(item: any, state: AppState, source: string): any {
        const flat = { ...item };
        let dateObj: Date | null = null;

        if (item.date) {
            dateObj = new Date(item.date);
            flat['dateVal'] = dateObj.getTime();
            flat['year'] = dateObj.getFullYear().toString();
            flat['month'] = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
            flat['day'] = dateObj.getDate().toString();
            flat['hour'] = dateObj.getHours().toString();
            const dayOfWeek = dateObj.getDay();
            flat['isWeekend'] = (dayOfWeek === 0 || dayOfWeek === 6) ? 'Weekend' : 'Weekday';
        }

        // Enrich common relations
        if (source === 'sales' && item.customerId) {
            const cust = state.customers.find(c => c.id === item.customerId);
            flat['customerName'] = cust?.name || 'Unknown';
            flat['customerArea'] = cust?.area || 'Unknown';
            flat['priceTier'] = cust?.priceTier || 'Standard';

            // Payment Method (Take first for simplicity in flat report)
            flat['paymentMethod'] = item.payments?.[0]?.method || 'UNPAID';

            // Discount
            flat['discount'] = Number(item.discount || 0);

            // GST
            flat['gstAmount'] = Number(item.gstAmount || 0);

            // Net Profit (Approximate if COGS not tracked per sale, but let's try)
            // Ideally we sum up (ItemPrice - ItemCost) * Qty
            // But item cost might not be on sale record. We'd need to lookup product.
            let cogs = 0;
            if (item.items && Array.isArray(item.items)) {
                item.items.forEach((si: any) => {
                    const prod = state.products.find(p => p.id === si.productId);
                    if (prod) {
                        cogs += (Number(prod.purchasePrice) || 0) * (Number(si.quantity) || 0);
                    }
                });
            }
            flat['cogs'] = cogs;
            flat['netProfit'] = (Number(item.totalAmount) || 0) - (Number(item.gstAmount) || 0) - cogs;
        }

        if (source === 'purchases' && item.supplierId) {
            const supp = state.suppliers.find(s => s.id === item.supplierId);
            flat['supplierName'] = supp?.name || 'Unknown';
            flat['dueDate'] = item.paymentDueDates?.[0] || 'N/A';
        }

        if (source === 'inventory') {
            // Calculate stock value
            const cost = Number(item.purchasePrice || 0);
            const price = Number(item.salePrice || 0);
            const qty = Number(item.quantity || 0);

            flat['stockValue'] = qty * cost;
            flat['retailValue'] = qty * price;
            flat['margin'] = price - cost;
            flat['marginPercent'] = cost > 0 ? ((price - cost) / cost) * 100 : 100;
            flat['brand'] = item.brand || 'Generic'; // Assuming brand field might exist or be added
        }

        if (source === 'customers') {
            // Customer aggregates are often pre-calculated in state or need to be calc'd here
            // ReportsPage filters usually do this, but for the GENERIC engine, we need to do it here if possible.
            // BUT, calculating "totalSpent" for every customer for every report view is expensive.
            // However, ReportEngine.process() is called on render.
            // We can do lightweight lookups.

            const customerSales = state.sales.filter(s => s.customerId === item.id);
            const totalSpent = customerSales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
            const totalPaid = customerSales.reduce((sum, s) => sum + (s.payments || []).reduce((p, pm) => p + Number(pm.amount), 0), 0);

            flat['totalSpent'] = totalSpent;
            flat['totalPaid'] = totalPaid;
            flat['dueAmount'] = totalSpent - totalPaid;
            flat['creditUtilization'] = 0; // Placeholder
            flat['transactionCount'] = customerSales.length;

            // Last Purchase
            if (customerSales.length > 0) {
                const lastDate = Math.max(...customerSales.map(s => new Date(s.date).getTime()));
                const diffTime = Math.abs(Date.now() - lastDate);
                flat['lastPurchaseDays'] = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            } else {
                flat['lastPurchaseDays'] = 999;
            }
        }

        if (source === 'expenses') {
            // Basic already
        }

        return flat;
    }

    private static applyFilters(item: any, filters: ReportFilter[]): boolean {
        return filters.every(filter => {
            const val = this.getValue(item, filter.id);
            const target = filter.value;

            switch (filter.operator) {
                case 'equals': return val == target; // strict eq might fail on types
                case 'contains': return String(val).toLowerCase().includes(String(target).toLowerCase());
                case 'gt': return Number(val) > Number(target);
                case 'lt': return Number(val) < Number(target);
                case 'between':
                    // Assume target is [min, max]
                    return Array.isArray(target) && val >= target[0] && val <= target[1];
                case 'in':
                    return Array.isArray(target) && target.includes(val);
                default: return true;
            }
        });
    }

    private static groupData(data: any[], groupByField: string, fields: ReportField[]): any[] {
        const groups: Record<string, any> = {};

        data.forEach(item => {
            const key = String(this.getValue(item, groupByField));
            if (!groups[key]) {
                groups[key] = {
                    [groupByField]: key,
                    _count: 0,
                    _items: []
                };
                // Init aggregators
                fields.forEach(f => {
                    if (f.aggregation && f.id !== groupByField) {
                        groups[key][f.id] = 0;
                        if (f.aggregation === 'MIN') groups[key][f.id] = Infinity;
                        if (f.aggregation === 'MAX') groups[key][f.id] = -Infinity;
                    }
                });
            }

            const group = groups[key];
            group._count++;
            group._items.push(item);

            fields.forEach(f => {
                if (f.id === groupByField) return;
                const val = Number(this.getValue(item, f.id)) || 0;

                if (f.aggregation === 'SUM') group[f.id] += val;
                else if (f.aggregation === 'AVG') group[f.id] += val; // We divide later
                else if (f.aggregation === 'MAX') group[f.id] = Math.max(group[f.id], val);
                else if (f.aggregation === 'MIN') group[f.id] = Math.min(group[f.id], val);
                else if (f.aggregation === 'COUNT') group[f.id]++;
            });
        });

        // Finalize averages
        return Object.values(groups).map((group: any) => {
            fields.forEach(f => {
                if (f.aggregation === 'AVG') {
                    group[f.id] = group[f.id] / group._count;
                }
                // Cleanup Min/Max inits if no data
                if (f.aggregation === 'MIN' && group[f.id] === Infinity) group[f.id] = 0;
                if (f.aggregation === 'MAX' && group[f.id] === -Infinity) group[f.id] = 0;
            });
            return group;
        });
    }

    private static getValue(item: any, path: string): any {
        if (!path.includes('.')) return item[path];
        // Nested lookup (e.g. sale.items.length - tough, but simple 'customer.name' works if flattened)
        // Our 'process' step flattens common relations, so we mostly check top level.
        return item[path];
    }
}

// --- Prebuilt Templates ---
export const PREBUILT_REPORTS: ReportConfig[] = [
    {
        id: 'sales_by_customer',
        title: 'Sales by Customer',
        description: 'Total revenue grouped by customer.',
        dataSource: 'sales',
        chartType: 'BAR',
        groupBy: 'customerName',
        fields: [
            { id: 'customerName', label: 'Customer', type: 'string' },
            { id: 'totalAmount', label: 'Total Sales', type: 'currency', aggregation: 'SUM' }
        ],
        filters: [],
        createdAt: Date.now()
    },
    {
        id: 'daily_sales',
        title: 'Daily Sales Trend',
        description: 'Revenue over time.',
        dataSource: 'sales',
        chartType: 'LINE',
        groupBy: 'date', // Note: Needs date flattening to string 'YYYY-MM-DD'
        fields: [
            { id: 'date', label: 'Date', type: 'date' },
            { id: 'totalAmount', label: 'Revenue', type: 'currency', aggregation: 'SUM' }
        ],
        filters: [],
        createdAt: Date.now()
    },
    {
        id: 'category_performance',
        title: 'Sales by Category',
        description: 'Which product categories are selling best? (Approx based on products)',
        dataSource: 'inventory',
        chartType: 'PIE',
        groupBy: 'category',
        fields: [
            { id: 'category', label: 'Category', type: 'string' },
            { id: 'quantity', label: 'Stock Quantity', type: 'number', aggregation: 'SUM' },
            { id: 'stockValue', label: 'Stock Value', type: 'currency', aggregation: 'SUM' }
        ],
        filters: [],
        createdAt: Date.now()
    }
];
