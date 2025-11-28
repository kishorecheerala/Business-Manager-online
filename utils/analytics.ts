
import { Sale, Purchase, Product, Customer } from "../types";

// --- Time Series Helpers ---
const getDaysArray = (start: Date, end: Date) => {
    const arr = [];
    for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
        arr.push(new Date(dt));
    }
    return arr;
};

// --- Forecasting: Linear Regression ---
export const calculateRevenueForecast = (sales: Sale[], daysToForecast = 7) => {
    const dailyRevenue: Record<string, number> = {};
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    // 1. Aggregate Daily Revenue
    sales.forEach(s => {
        const d = new Date(s.date);
        if (d >= thirtyDaysAgo) {
            const key = d.toISOString().split('T')[0];
            dailyRevenue[key] = (dailyRevenue[key] || 0) + s.totalAmount;
        }
    });

    // 2. Prepare Data Points (x = day index, y = revenue)
    const points: { x: number, y: number }[] = [];
    const dateRange = getDaysArray(thirtyDaysAgo, today);
    
    dateRange.forEach((d, index) => {
        const key = d.toISOString().split('T')[0];
        points.push({ x: index, y: dailyRevenue[key] || 0 });
    });

    // 3. Linear Regression (Least Squares)
    const n = points.length;
    const sumX = points.reduce((acc, p) => acc + p.x, 0);
    const sumY = points.reduce((acc, p) => acc + p.y, 0);
    const sumXY = points.reduce((acc, p) => acc + (p.x * p.y), 0);
    const sumXX = points.reduce((acc, p) => acc + (p.x * p.x), 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // 4. Generate Forecast
    const forecast: { date: string, value: number }[] = [];
    for (let i = 1; i <= daysToForecast; i++) {
        const futureX = n - 1 + i;
        const predictedY = Math.max(0, slope * futureX + intercept);
        
        const futureDate = new Date();
        futureDate.setDate(today.getDate() + i);
        forecast.push({ 
            date: futureDate.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' }), 
            value: predictedY 
        });
    }

    return { slope, forecast };
};

// --- Customer Lifetime Value (CLV) ---
export const calculateCLV = (sales: Sale[], customers: Customer[]) => {
    if (customers.length === 0 || sales.length === 0) return { clv: 0, avgLifespan: 0, purchaseFreq: 0, avgOrderValue: 0 };

    // 1. Average Purchase Value
    const totalRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalOrders = sales.length;
    const avgOrderValue = totalRevenue / totalOrders;

    // 2. Purchase Frequency Rate (Orders per unique customer)
    const uniqueCustomers = new Set(sales.map(s => s.customerId)).size;
    const purchaseFreq = totalOrders / (uniqueCustomers || 1);

    // 3. Customer Value
    const customerValue = avgOrderValue * purchaseFreq;

    // 4. Average Customer Lifespan (Years)
    // Simplified: Difference between first and last purchase for each customer
    let totalLifespanDays = 0;
    let customersWithMultipleOrders = 0;

    customers.forEach(c => {
        const custSales = sales.filter(s => s.customerId === c.id).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        if (custSales.length > 1) {
            const first = new Date(custSales[0].date);
            const last = new Date(custSales[custSales.length - 1].date);
            const diffTime = Math.abs(last.getTime() - first.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            totalLifespanDays += diffDays;
            customersWithMultipleOrders++;
        }
    });

    const avgLifespanYears = customersWithMultipleOrders > 0 
        ? (totalLifespanDays / customersWithMultipleOrders) / 365 
        : 1; // Default to 1 year if data insufficient

    const clv = customerValue * avgLifespanYears;

    return { 
        clv, 
        avgLifespan: avgLifespanYears, 
        purchaseFreq,
        avgOrderValue
    };
};

// --- Inventory Turnover Ratio ---
export const calculateInventoryTurnover = (sales: Sale[], products: Product[], purchases: Purchase[]) => {
    // COGS (Cost of Goods Sold)
    let cogs = 0;
    sales.forEach(s => {
        s.items.forEach(i => {
            const product = products.find(p => p.id === i.productId);
            // Estimate cost based on current purchase price if historical not tracked per item
            const cost = product ? product.purchasePrice : (i.price * 0.7); 
            cogs += cost * i.quantity;
        });
    });

    // Average Inventory Value
    // (Beginning Inventory + Ending Inventory) / 2
    // Simplified: Current Inventory Value
    const currentInventoryValue = products.reduce((sum, p) => sum + (p.quantity * p.purchasePrice), 0);
    
    // To estimate beginning, we subtract purchases and add COGS (Reverse engineer)
    // Let's assume Beginning = Current for simple estimation in absence of snapshots, 
    // or better: Average = Current Value.
    
    const ratio = currentInventoryValue > 0 ? cogs / currentInventoryValue : 0;
    const daysToSell = ratio > 0 ? 365 / ratio : 0;

    return { ratio, daysToSell, cogs, currentInventoryValue };
};

// --- Seasonality / Heatmap Data ---
export const getSalesHeatmap = (sales: Sale[]) => {
    // 7 Days x 4 Time Slots (Morning, Afternoon, Evening, Night)
    const heatmap = Array(7).fill(0).map(() => Array(4).fill(0));
    
    sales.forEach(s => {
        const d = new Date(s.date);
        const day = d.getDay(); // 0-6
        const hour = d.getHours();
        
        let slot = 0;
        if (hour >= 6 && hour < 12) slot = 0; // Morning
        else if (hour >= 12 && hour < 17) slot = 1; // Afternoon
        else if (hour >= 17 && hour < 21) slot = 2; // Evening
        else slot = 3; // Night

        heatmap[day][slot] += s.totalAmount;
    });

    return heatmap;
}
