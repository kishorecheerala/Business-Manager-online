import { AppState, ReportConfig, ReportField, ReportFilter } from "../../types";

export class ReportEngine {

    static process(state: AppState, config: ReportConfig): any[] {
        let rawData: any[] = [];

        // Pre-processing for lookups to avoid O(N^2) complexity
        const productMap = new Map(state.products.map(p => [p.id, p]));
        const customerMap = new Map(state.customers.map(c => [c.id, c]));
        const supplierMap = new Map(state.suppliers.map(s => [s.id, s]));

        // Pre-calculate sales groups for customer reports if needed
        const salesByCustomer = new Map<string, any[]>();
        if (config.dataSource === 'customers') {
            state.sales.forEach(s => {
                const group = salesByCustomer.get(s.customerId) || [];
                group.push(s);
                salesByCustomer.set(s.customerId, group);
            });
        }

        switch (config.dataSource) {
            case 'sales': rawData = state.sales || []; break;
            case 'purchases': rawData = state.purchases || []; break;
            case 'inventory': rawData = state.products || []; break;
            case 'customers': rawData = state.customers || []; break;
            case 'expenses': rawData = state.expenses || []; break;
            case 'sale_items':
                // Expand Sales into Line Items
                state.sales.forEach(sale => {
                    sale.items.forEach((item: any) => {
                        rawData.push({
                            ...item,
                            saleId: sale.id,
                            customerId: sale.customerId,
                            date: sale.date,
                            discount: sale.discount,
                            paymentMethod: sale.payments?.[0]?.method || 'N/A'
                        });
                    });
                });
                break;
            default: rawData = [];
        }

        // 2. Flatten & map fields needed
        const flattenedData = rawData
            .filter(item => this.applyFilters(item, config.filters))
            .map(item => this.flattenItem(item, state, config.dataSource, { productMap, customerMap, supplierMap, salesByCustomer }));

        // 3. Group & Aggregate (if groupBy is set)
        if (config.groupBy) {
            return this.groupData(flattenedData, config.groupBy, config.fields);
        }

        return flattenedData;
    }

    private static flattenItem(item: any, state: AppState, source: string, ctx: { productMap: Map<string, any>, customerMap: Map<string, any>, supplierMap: Map<string, any>, salesByCustomer: Map<string, any[]> }): any {
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
            const cust = ctx.customerMap.get(item.customerId);
            flat['customerName'] = cust?.name || 'Unknown';
            flat['customerArea'] = cust?.area || 'Unknown';
            flat['priceTier'] = cust?.priceTier || 'Standard';

            // Payment Method (Take first for simplicity in flat report)
            flat['paymentMethod'] = item.payments?.[0]?.method || 'UNPAID';

            // Discount
            flat['discount'] = Number(item.discount || 0);

            // GST
            flat['gstAmount'] = Number(item.gstAmount || 0);

            // Net Profit
            let cogs = 0;
            if (item.items && Array.isArray(item.items)) {
                item.items.forEach((si: any) => {
                    const prod = ctx.productMap.get(si.productId);
                    if (prod) {
                        cogs += (Number(prod.purchasePrice) || 0) * (Number(si.quantity) || 0);
                    }
                });
            }
            flat['cogs'] = cogs;
            flat['netProfit'] = (Number(item.totalAmount) || 0) - (Number(item.gstAmount) || 0) - cogs;
        }

        if (source === 'sale_items') {
            const prod = ctx.productMap.get(item.productId);
            const cust = ctx.customerMap.get(item.customerId);

            flat['productName'] = prod?.name || item.productName || 'Unknown';
            flat['category'] = prod?.category || 'Uncategorized';
            flat['customerName'] = cust?.name || 'Unknown';

            const cost = Number(prod?.purchasePrice || 0);
            const salePrice = Number(item.price || 0);
            const qty = Number(item.quantity || 0);

            flat['revenue'] = salePrice * qty;
            flat['cost'] = cost * qty;
            flat['profit'] = flat['revenue'] - flat['cost'];
            flat['marginPercent'] = flat['revenue'] > 0 ? (flat['profit'] / flat['revenue']) * 100 : 0;
        }

        if (source === 'purchases' && item.supplierId) {
            const supp = ctx.supplierMap.get(item.supplierId);
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
            flat['brand'] = item.brand || 'Generic';
        }

        if (source === 'customers') {
            const customerSales = ctx.salesByCustomer.get(item.id) || [];
            const totalSpent = customerSales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
            const totalPaid = customerSales.reduce((sum, s) => sum + (s.payments || []).reduce((p, pm) => p + Number(pm.amount), 0), 0);

            flat['totalSpent'] = totalSpent;
            flat['totalPaid'] = totalPaid;
            flat['dueAmount'] = totalSpent - totalPaid;
            flat['creditUtilization'] = 0; // Placeholder
            flat['transactionCount'] = customerSales.length;

            // Last Purchase
            if (customerSales.length > 0) {
                const lastDate = Math.max(...customerSales.map((s: any) => new Date(s.date).getTime()));
                const diffTime = Math.abs(Date.now() - lastDate);
                flat['lastPurchaseDays'] = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            } else {
                flat['lastPurchaseDays'] = 999;
            }
        }

        return flat;
    }

    private static applyFilters(item: any, filters: ReportFilter[]): boolean {
        return filters.every(filter => {
            const val = this.getValue(item, filter.id);
            const target = filter.value;

            switch (filter.operator) {
                case 'equals': return val == target;
                case 'contains': return String(val).toLowerCase().includes(String(target).toLowerCase());
                case 'gt': return Number(val) > Number(target);
                case 'lt': return Number(val) < Number(target);
                case 'between':
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
                else if (f.aggregation === 'AVG') group[f.id] += val;
                else if (f.aggregation === 'MAX') group[f.id] = Math.max(group[f.id], val);
                else if (f.aggregation === 'MIN') group[f.id] = Math.min(group[f.id], val);
                else if (f.aggregation === 'COUNT') group[f.id]++;
            });
        });

        return Object.values(groups).map((group: any) => {
            fields.forEach(f => {
                if (f.aggregation === 'AVG') {
                    group[f.id] = group[f.id] / group._count;
                }
                if (f.aggregation === 'MIN' && group[f.id] === Infinity) group[f.id] = 0;
                if (f.aggregation === 'MAX' && group[f.id] === -Infinity) group[f.id] = 0;
            });
            return group;
        });
    }

    private static getValue(item: any, path: string): any {
        return item[path];
    }
}

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
        groupBy: 'date',
        fields: [
            { id: 'date', label: 'Date', type: 'date' },
            { id: 'totalAmount', label: 'Revenue', type: 'currency', aggregation: 'SUM' }
        ],
        filters: [],
        createdAt: Date.now()
    },
    {
        id: 'category_profitability',
        title: 'Category Profitability',
        description: 'Gross profit distribution across product categories.',
        dataSource: 'sale_items',
        chartType: 'BAR',
        groupBy: 'category',
        fields: [
            { id: 'category', label: 'Category', type: 'string' },
            { id: 'profit', label: 'Gross Profit', type: 'currency', aggregation: 'SUM' }
        ],
        filters: [],
        createdAt: Date.now()
    },
    {
        id: 'high_value_customers',
        title: 'High-Value Customers (LTV)',
        description: 'Top customers ordered by lifetime purchase value.',
        dataSource: 'customers',
        chartType: 'BAR',
        groupBy: 'name',
        fields: [
            { id: 'name', label: 'Customer', type: 'string' },
            { id: 'totalSpent', label: 'Lifetime Spend', type: 'currency', aggregation: 'SUM' }
        ],
        filters: [],
        createdAt: Date.now()
    }
];
