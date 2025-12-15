import { AppState, Product, AIResponse, ActionItem, SaleItem } from '../../types';
import { calculateLinearRegression } from '../analytics';

// --- Types ---
interface OfflineContext {
    state: AppState;
    fullSchema?: any;
}

export class OfflineIntelligence {

    // 1. Insights Generation (Rule-based)
    static generateInsights(state: AppState): AIResponse {
        try {
            const sales = state.sales || [];
            const products = state.products || [];

            // Calculate basic stats
            const totalRevenue = sales.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
            const lowStockProducts = products.filter(p => p.quantity < 5);

            // Calculate Pending Dues (Debt)
            const totalDue = sales.reduce((sum, s) => {
                const paid = (s.payments || []).reduce((pSum, p) => pSum + Number(p.amount), 0);
                return sum + Math.max(0, Number(s.totalAmount) - paid);
            }, 0);

            // Safe regression
            let regression;
            try {
                regression = calculateLinearRegression(sales, 30);
            } catch (e) {
                console.warn("Regression failed:", e);
                regression = { growthRate: 0, trend: 'stable' };
            }

            // Health Score Logic (0-100)
            let score = 70; // Base score
            if (regression.growthRate > 0) score += 10;
            if (regression.growthRate > 0.1) score += 10;
            if (lowStockProducts.length > 5) score -= 10;
            if (totalDue > (totalRevenue * 0.2)) score -= 15; // Penalty if >20% revenue is pending
            if (totalRevenue === 0) score = 40;
            score = Math.min(100, Math.max(0, score));

            // Generate Analysis Strings
            const healthReason = score > 80 ? "Strong sales performance & healthy cash flow."
                : score > 50 ? "Stable performance. Watch inventory and pending dues."
                    : "Needs attention: Low sales, stock issues, or high pending dues.";

            const growthAnalysis = regression.growthRate > 0
                ? `Revenue is trending up by roughly ${(regression.growthRate * 100).toFixed(1)}% this period. Keep pushing top sellers.`
                : `Revenue is slightly flat or down. Consider running a promotion to boost traffic.`;

            let riskAnalysis = "Operations are stable.";
            if (lowStockProducts.length > 0) riskAnalysis = `Inventory Alert: ${lowStockProducts.length} items are running low.`;
            if (totalDue > 1000) riskAnalysis += ` Outstanding dues: ₹${totalDue.toLocaleString()}. Collect payments soon.`;

            const strategy = totalDue > (totalRevenue * 0.3)
                ? "Immediate Focus: Cash Flow. Follow up with customers for pending payments."
                : lowStockProducts.length > 3
                    ? "Prioritize restocking popular items to maintain sales momentum."
                    : "Focus on customer retention and upselling high-margin products.";

            // Action Items
            const actions: ActionItem[] = [];

            // Restock Action
            if (lowStockProducts.length > 0) {
                const topLow = lowStockProducts[0];
                actions.push({
                    id: 'act_restock_' + topLow.id,
                    title: `Restock ${topLow.name}`,
                    description: `Only ${topLow.quantity} left. Reorder to prevent stockouts.`,
                    type: 'restock',
                    targetId: topLow.id,
                    priority: 'high'
                });
            }

            // Collection Action (New)
            if (totalDue > 0) {
                actions.push({
                    id: 'act_collect_dues',
                    title: `Collect Dues (₹${totalDue.toLocaleString()})`,
                    description: `You have pending payments from customers. Send reminders.`,
                    type: 'default', // Using default as generic action
                    targetId: 'reports', // Redirect to reports/dues
                    priority: 'high'
                });
            }

            // Promo Action (if sales low)
            if (regression.growthRate <= 0 && products.length > 0) {
                const highStock = products.sort((a, b) => b.quantity - a.quantity)[0];
                if (highStock) {
                    actions.push({
                        id: 'act_promo_' + highStock.id,
                        title: `Promote ${highStock.name}`,
                        description: `High stock (${highStock.quantity}). Run a discount to clear inventory.`,
                        type: 'promo',
                        targetId: highStock.id,
                        priority: 'medium'
                    });
                }
            }

            return {
                businessHealthScore: score,
                healthReason,
                growthAnalysis,
                riskAnalysis,
                strategy,
                actions
            };
        } catch (err) {
            console.error("Critical OfflineIntelligence Error:", err);
            return {
                businessHealthScore: 50,
                healthReason: "Unable to calculate detailed score.",
                growthAnalysis: "Data insufficient for analysis.",
                riskAnalysis: "Review your inventory manually.",
                strategy: "Focus on maintaining operations.",
                actions: []
            };
        }
    }

    // 2. Marketing Copy (Template-based)
    static generateMarketing(product: Product, mood: string = 'professional'): string {
        const category = product.category ? product.category.toLowerCase() : 'general';

        // Base Templates
        let templates = [
            `🌟 New Arrival! ${product.name} is now available. Get yours for just ₹${product.salePrice}!`,
            `✨ Upgrade your experience with ${product.name}. High quality, great price: ₹${product.salePrice}. Visit us today!`,
            `🔥 Hot Deal! ${product.name} is selling fast. Grab it now for only ₹${product.salePrice}. Limited stock!`,
            `📢 Exclusive Offer: ${product.name} - The best choice for you. Available now at ₹${product.salePrice}.`
        ];

        // Category Specific Overrides
        if (category.includes('food') || category.includes('snack') || category.includes('drink')) {
            templates = [
                `😋 Delicious Deal! Taste the best ${product.name} for only ₹${product.salePrice}. Fresh and tasty!`,
                `🍔 Craving something good? Grab ${product.name} at a special price of ₹${product.salePrice}.`,
                `🥤 Thirsty? ${product.name} is the perfect refreshment. Yours for ₹${product.salePrice}.`
            ];
        } else if (category.includes('cloth') || category.includes('fashion') || category.includes('wear')) {
            templates = [
                `👗 Style Alert! Look great in ${product.name}. Now available for ₹${product.salePrice}.`,
                `✨ Fashion Forward: ${product.name} is the perfect addition to your wardrobe. Only ₹${product.salePrice}.`
            ];
        } else if (category.includes('tech') || category.includes('mobile') || category.includes('gadget')) {
            templates = [
                `📱 Tech Upgrade: Get the ${product.name} for the best performance. Deal Price: ₹${product.salePrice}.`,
                `⚡ High Performance: ${product.name} is in stock. Boost your productivity for ₹${product.salePrice}.`
            ];
        }

        return templates[Math.floor(Math.random() * templates.length)];
    }

    // 3. Chat / Q&A (Keyword Matcher)
    static chat(query: string, state: AppState): string {
        const q = query.toLowerCase().trim();

        // 1. "Price of [X]" or "Rate of [X]"
        const priceMatch = q.match(/(?:price|rate|cost)\s+(?:of|for)\s+(.+)/i);
        if (priceMatch) {
            const prodName = priceMatch[1].trim();
            const product = state.products.find(p => p.name.toLowerCase().includes(prodName));
            if (product) return `The price of ${product.name} is ₹${product.salePrice}.`;
            return `I couldn't find a product named "${prodName}".`;
        }

        // 2. "Stock of [X]" or "How many [X]"
        const stockMatch = q.match(/(?:stock|quantity|qty)\s+(?:of|for)\s+(.+)/i) || q.match(/how\s+many\s+(.+)\s+(?:do we have|are there)/i);
        if (stockMatch) {
            const prodName = stockMatch[1].replace('do we have', '').replace('are there', '').trim();
            const product = state.products.find(p => p.name.toLowerCase().includes(prodName));
            if (product) return `We have ${product.quantity} units of ${product.name} in stock.`;
            return `I couldn't find a product named "${prodName}".`;
        }

        // 3. Debtors / Dues
        if (q.includes('owe') || q.includes('due') || q.includes('balanc') || q.includes('unpaid')) {
            // Find customers with unpaid invoices
            const unpaidSales = state.sales.filter(s => {
                const paid = (s.payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
                return Number(s.totalAmount) > paid;
            });

            if (unpaidSales.length === 0) return "Great news! You have no pending customer payments.";

            const customerDues: Record<string, number> = {};
            unpaidSales.forEach(s => {
                const customer = state.customers.find(c => c.id === s.customerId);
                const name = customer ? customer.name : 'Unknown Customer';

                if (!customerDues[name]) customerDues[name] = 0;
                const paid = (s.payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
                customerDues[name] += (Number(s.totalAmount) - paid);
            });

            const topDebtors = Object.entries(customerDues)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 3)
                .map(([name, amount]) => `${name} (₹${amount})`)
                .join(', ');

            return `${Object.keys(customerDues).length} customers owe you money. Top debtors: ${topDebtors}. Check 'Reports' for details.`;
        }

        // 4. Top Customers / Best Sellers (Simple Calculation)
        if (q.includes('top customer') || q.includes('best customer')) {
            const customerSpend: Record<string, number> = {};
            state.sales.forEach(s => {
                const customer = state.customers.find(c => c.id === s.customerId);
                const name = customer ? customer.name : 'Unknown Customer';

                if (!customerSpend[name]) customerSpend[name] = 0;
                customerSpend[name] += Number(s.totalAmount);
            });
            const top = Object.entries(customerSpend)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 1)
                .map(([name, amount]) => `${name} (₹${amount})`);

            if (top.length) return `Your top customer is ${top[0]}.`;
            return "Not enough sales data explicitly linked to customers yet.";
        }

        // 5. Revenue / Sales
        if (q.includes('sales') || q.includes('revenue') || q.includes('earned') || q.includes('income')) {
            const total = state.sales.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
            return `Total revenue found is ₹${total.toLocaleString()} from ${state.sales.length} transactions.`;
        }

        // 6. Counts
        if (q.includes('count') || q.includes('total')) {
            if (q.includes('customer')) return `You have ${state.customers.length} registered customers.`;
            if (q.includes('product') || q.includes('item')) return `You have ${state.products.length} products in your catalog.`;
            if (q.includes('supplier')) return `You have ${state.suppliers.length} suppliers.`;
        }

        // 7. Navigation Help
        if (q.includes('invoice') || q.includes('bill')) return "Go to the 'Sales' tab to create new invoices.";
        if (q.includes('add')) return "Use the Quick Actions (+) button at the top to add new items.";

        return "I'm currently in Offline Mode. I can check prices ('Price of [Item]'), stock ('Stock of [Item]'), or summarize your data. For complex advice, please connect to the internet.";
    }

    // 4. Magic Order Parsing (Fuzzy Matcher)
    static parseOrder(text: string, catalog: { id: string, name: string, price: number }[]): SaleItem[] {
        const lines = text.split(/[\n,]+/); // Split by newline or comma
        const foundItems: SaleItem[] = [];

        for (const line of lines) {
            const trimLine = line.trim();
            if (!trimLine) continue;

            // 1. Extract Quantity (look for number)
            const qtyMatch = trimLine.match(/(\d+)/);
            const quantity = qtyMatch ? parseInt(qtyMatch[0]) : 1;

            // 2. Extract potential Name (remove number and common words)
            // Enhanced cleaner to remove more noise words and "kg", "g", "l" if not relevant to product name
            let namePart = trimLine
                .replace(/(\d+)\s*(?:kg|g|l|ml|pc|piece|pack|box)s?/gi, '') // Remove unit with number
                .replace(/(\d+)/, '') // Remove generic number
                .replace(/piece|pcs|qty|of|need|want|buy|please|send/gi, '')
                .trim()
                .toLowerCase();

            if (namePart.length < 2) continue;

            // 3. Find in Catalog (Improved Scoring)
            let bestMatch = null;
            let matchScore = 0; // Higher is better

            for (const prod of catalog) {
                const pName = prod.name.toLowerCase();

                // Exact match (highest priority)
                if (pName === namePart) {
                    bestMatch = prod;
                    matchScore = 100;
                    break;
                }

                // Starts With (high priority)
                if (pName.startsWith(namePart)) {
                    bestMatch = prod;
                    matchScore = 90;
                    continue;
                }

                // Contains match
                if (pName.includes(namePart)) {
                    // Score based on how much of the string it covers
                    // e.g. "Apple" found in "Green Apple" (5/11) vs "Apple" found in "Pineapple" (5/9)
                    const coverage = namePart.length / pName.length;
                    const score = 60 + (coverage * 20);
                    if (score > matchScore) {
                        bestMatch = prod;
                        matchScore = score;
                    }
                }

                // Reverse Contains (User typed "Green Apple" for "Apple") - likely rare but possible
                if (namePart.includes(pName)) {
                    const score = 85;
                    if (score > matchScore) {
                        bestMatch = prod;
                        matchScore = score;
                    }
                }
            }

            // Only accept if score is reasonable confidence
            if (bestMatch && matchScore > 50) {
                // Check if already added, verify logic? No, just add.
                foundItems.push({
                    productId: bestMatch.id,
                    productName: bestMatch.name,
                    quantity: quantity,
                    price: bestMatch.price
                });
            }
        }

        return foundItems;
    }
}
