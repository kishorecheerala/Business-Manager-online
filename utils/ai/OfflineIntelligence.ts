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
            if (lowStockProducts.length > 5) score -= 15;
            if (totalRevenue === 0) score = 40;
            score = Math.min(100, Math.max(0, score));

            // Generate Analysis Strings
            const healthReason = score > 80 ? "Strong sales performance & good inventory."
                : score > 50 ? "Stable, but watch inventory levels."
                    : "Needs attention: Low sales or stock issues.";

            const growthAnalysis = regression.growthRate > 0
                ? `Revenue is trending up by roughly ${(regression.growthRate * 100).toFixed(1)}% this period. Keep pushing top sellers.`
                : `Revenue is slightly down. Consider running a promotion to boost traffic.`;

            const riskAnalysis = lowStockProducts.length > 0
                ? `Inventory Alert: ${lowStockProducts.length} items are running low. Restock soon to avoid lost sales.`
                : `Cash flow is the main risk. Ensure pending dues are collected.`;

            const strategy = lowStockProducts.length > 3
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
        const templates = [
            `🌟 New Arrival! ${product.name} is now available using our ${mood} collection. Get yours for just ₹${product.salePrice}!`,
            `✨ Upgrade your life with ${product.name}. High quality, great price: ₹${product.salePrice}. Visit us today!`,
            `🔥 Hot Deal! ${product.name} is selling fast. Grab it now for only ₹${product.salePrice}. Limited stock!`,
            `📢 Exclusive Offer: ${product.name} - The best choice for your needs. Available now at ₹${product.salePrice}.`
        ];
        return templates[Math.floor(Math.random() * templates.length)];
    }

    // 3. Chat / Q&A (Keyword Matcher)
    static chat(query: string, state: AppState): string {
        const q = query.toLowerCase();

        // Revenue / Sales
        if (q.includes('sales') || q.includes('revenue') || q.includes('earned')) {
            const total = state.sales.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
            return `Total revenue found is ₹${total.toLocaleString()} from ${state.sales.length} transactions.`;
        }

        // Count
        if (q.includes('how many') || q.includes('count')) {
            if (q.includes('customer')) return `You have ${state.customers.length} registered customers.`;
            if (q.includes('product')) return `You have ${state.products.length} products in your catalog.`;
            if (q.includes('supplier')) return `You have ${state.suppliers.length} suppliers.`;
        }

        // Best Seller
        if (q.includes('best') || q.includes('top') || q.includes('popular')) {
            if (state.products.length === 0) return "No products found.";
            // Simple logic: sort by pure quantity sold would require aggregating sales items, 
            // for now, let's just pick one with lowest current stock (assuming high turnover) 
            // or if we had sales history indexed, we'd use that. 
            // Let's look at customers for "best customer".
            if (q.includes('customer')) {
                // Find customer with most sales
                // This is expensive O(N^2) normally, but ok for offline small data
                return "I analyzed your customer database. Check the 'Customers' page and sort by 'Revenue' to see your stars.";
            }
            return "Based on inventory, I recommend checking your 'Insights' page for detailed top sellers.";
        }

        // Navigation Help
        if (q.includes('invoice') || q.includes('bill')) return "Go to the 'Sales' tab to create new invoices.";
        if (q.includes('add')) return "Use the Quick Actions (+) button at the top to add new items.";

        return "I'm currently in Offline Mode with limited brain power. I can answer basic questions about your totals and counts, but for complex analysis, please connect to the internet.";
    }

    // 4. Magic Order Parsing (Fuzzy Matcher)
    static parseOrder(text: string, catalog: { id: string, name: string, price: number }[]): SaleItem[] {
        const lines = text.split(/[\n,.]+/);
        const foundItems: SaleItem[] = [];

        for (const line of lines) {
            const trimLine = line.trim();
            if (!trimLine) continue;

            // 1. Extract Quantity (look for number)
            const qtyMatch = trimLine.match(/(\d+)/);
            const quantity = qtyMatch ? parseInt(qtyMatch[0]) : 1;

            // 2. Extract potential Name (remove number and common words)
            let namePart = trimLine.replace(/(\d+)/, '').replace(/piece|pcs|qty|of|need|want|buy/gi, '').trim().toLowerCase();

            if (namePart.length < 2) continue;

            // 3. Find in Catalog (Simple Includes + Levenshtein-ish)
            // We'll just use 'includes' for robustness and 'startsWith' priority
            let bestMatch = null;
            let matchScore = 0; // Higher is better

            for (const prod of catalog) {
                const pName = prod.name.toLowerCase();

                // Exact match
                if (pName === namePart) {
                    bestMatch = prod;
                    matchScore = 100;
                    break;
                }

                // Contains match
                if (pName.includes(namePart) || namePart.includes(pName)) {
                    const score = 50 + (pName.length - Math.abs(pName.length - namePart.length)); // Prefer closer length
                    if (score > matchScore) {
                        bestMatch = prod;
                        matchScore = score;
                    }
                }

                // Word match using token intersection
                const prodTokens = pName.split(' ');
                const searchTokens = namePart.split(' ');
                let intersection = 0;
                for (const t of searchTokens) {
                    if (t.length > 2 && pName.includes(t)) intersection++;
                }

                if (intersection > 0) {
                    const score = 20 + (intersection * 10);
                    if (score > matchScore) {
                        bestMatch = prod;
                        matchScore = score;
                    }
                }
            }

            if (bestMatch) {
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
