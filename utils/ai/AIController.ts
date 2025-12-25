import { GoogleGenAI } from "@google/genai";
import { OfflineIntelligence } from './OfflineIntelligence';
import { AppState, AIResponse, SaleItem, Product } from '../../types';

export class AIController {

    private static getInfo(state: AppState) {
        return {
            isOnline: state.isOnline,
            apiKey: localStorage.getItem('gemini_api_key') || ((import.meta as any).env.VITE_GEMINI_API_KEY as string) || ''
        };
    }

    /**
     * Generates business insights.
     */
    static async getInsights(state: AppState): Promise<AIResponse> {
        const { isOnline, apiKey } = this.getInfo(state);

        if (isOnline && apiKey) {
            try {
                const ai = new GoogleGenAI({ apiKey });

                // Context prep
                const now = new Date();
                const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 3600 * 1000));
                const sixtyDaysAgo = new Date(now.getTime() - (60 * 24 * 3600 * 1000));

                const currentSales = state.sales.filter(s => new Date(s.date) >= thirtyDaysAgo);
                const previousSales = state.sales.filter(s => new Date(s.date) >= sixtyDaysAgo && new Date(s.date) < thirtyDaysAgo);

                const currentRevenue = currentSales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
                const previousRevenue = previousSales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
                const growth = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;

                const topProducts = state.products
                    .map(p => {
                        const unitsSold = state.sales.reduce((sum, s) => {
                            const item = s.items.find(i => i.productId === p.id);
                            return sum + (item ? Number(item.quantity) : 0);
                        }, 0);
                        return { name: p.name, unitsSold };
                    })
                    .sort((a, b) => b.unitsSold - a.unitsSold)
                    .slice(0, 5);

                const totalExpenses = state.expenses
                    .filter(e => new Date(e.date) >= thirtyDaysAgo)
                    .reduce((sum, e) => sum + e.amount, 0);

                const safeLowStock = state.products.filter(p => p.quantity < 5).slice(0, 10).map(p => p.name).join(', ');

                const prompt = `
                    Analyze this retail business data (Return JSON only):
                    - Revenue (Last 30d): ${currentRevenue}
                    - Revenue (Prev 30d): ${previousRevenue}
                    - Growth: ${growth.toFixed(1)}%
                    - Total Expenses (30d): ${totalExpenses}
                    - Top Products: ${JSON.stringify(topProducts)}
                    - Low Stock: ${safeLowStock}
                    - Transactions (30d): ${currentSales.length}
                    
                    Return JSON matching: { 
                      businessHealthScore: number (0-100), 
                      healthReason: string, 
                      growthAnalysis: string (Include comparison with prev period), 
                      riskAnalysis: string, 
                      strategy: string, 
                      actions: [{id, title, description, type: 'STOCK'|'CASHFLOW'|'MARKETING', targetId, priority: 1-5}] 
                    }
                `;

                const model = ai.models.generateContent({
                    model: 'gemini-2.0-flash',
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    config: { responseMimeType: 'application/json' }
                });

                const result = await model;
                const text = (result as any).response.text();
                return JSON.parse(text);

            } catch (e) {
                console.warn("Online Insight Gen failed, falling back to offline.", e);
            }
        }

        // Fallback
        return OfflineIntelligence.generateInsights(state);
    }

    /**
     * Chat Assistant
     */
    static async chat(query: string, state: AppState): Promise<string> {
        const { isOnline, apiKey } = this.getInfo(state);

        if (isOnline && apiKey) {
            try {
                const ai = new GoogleGenAI({ apiKey });

                // Rich Context
                const totalSales = state.sales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
                const salesCount = state.sales.length;
                const topProducts = state.products
                    .sort((a, b) => b.quantity < a.quantity ? 1 : -1)
                    .slice(0, 5)
                    .map(p => `${p.name} (${p.quantity} left)`)
                    .join(', ');
                const lowStock = state.products.filter(p => p.quantity < 5).map(p => p.name).join(', ');

                const context = `
                    Context:
                    - Business Name: ${state.profile?.name || 'My Business'}
                    - Total Revenue: ₹${totalSales} (${salesCount} txns)
                    - Top Sellers: ${topProducts}
                    - Low Stock Alerts: ${lowStock}
                    - Customers: ${state.customers.length}
                    
                    User Question: "${query}"
                    
                    Answer primarily based on the data above. Be helpful and concise (max 3 sentences).
                `;

                const model = ai.models.generateContent({
                    model: 'gemini-2.0-flash',
                    contents: [{ role: 'user', parts: [{ text: context }] }]
                });

                const res = await model;
                return (res as any).response.text();

            } catch (e) {
                console.warn("Online Chat failed", e);
            }
        }

        return OfflineIntelligence.chat(query, state);
    }

    /**
     * Magic Order Parser
     */
    static async parseOrder(text: string, products: Product[], state: AppState): Promise<SaleItem[]> {
        const { isOnline, apiKey } = this.getInfo(state);
        const catalog = products.map(p => ({ id: p.id, name: p.name, price: p.salePrice }));

        if (isOnline && apiKey) {
            try {
                const ai = new GoogleGenAI({ apiKey });
                const prompt = `
                    Parse order: "${text}"
                    Catalog: ${JSON.stringify(catalog.map(c => ({ id: c.id, n: c.name })))}
                    Return JSON: { items: [{productId, quantity}] }
                    Match names fuzzily.
                `;

                const model = ai.models.generateContent({
                    model: 'gemini-2.0-flash',
                    contents: prompt,
                    config: { responseMimeType: "application/json" }
                });

                const res = await model;
                const json = JSON.parse((res as any).response.text());

                if (json.items) {
                    return json.items.map((item: any) => {
                        const prod = products.find(p => p.id === item.productId);
                        if (!prod) return null;
                        return {
                            productId: prod.id,
                            productName: prod.name,
                            quantity: Number(item.quantity) || 1,
                            price: prod.salePrice
                        };
                    }).filter(Boolean);
                }

            } catch (e) {
                console.warn("Online Order Parse failed", e);
            }
        }

        return OfflineIntelligence.parseOrder(text, catalog);
    }

    /**
     * Marketing Text Generation
     */
    static async generateMarketingCopy(product: Product, state: AppState): Promise<string> {
        const { isOnline, apiKey } = this.getInfo(state);

        if (isOnline && apiKey) {
            try {
                const ai = new GoogleGenAI({ apiKey });
                const prompt = `Write a short, catchy social media caption for selling: ${product.name} (Category: ${product.category}, Price: ${product.salePrice}).`;

                const model = ai.models.generateContent({
                    model: 'gemini-2.0-flash',
                    contents: prompt
                });

                const res = await model;
                return (res as any).response.text();
            } catch (e) {
                console.warn("Online Marketing failed", e);
            }
        }

        return OfflineIntelligence.generateMarketing(product);
    }

    /**
     * SQL Generator
     */
    static async generateSQL(query: string, schema: any, state: AppState): Promise<string> {
        const { isOnline, apiKey } = this.getInfo(state);

        if (isOnline && apiKey) {
            try {
                const ai = new GoogleGenAI({ apiKey });
                const schemaContext = Object.entries(schema).map(([table, cols]) =>
                    `- ${table}(${(cols as string[]).join(', ')})`
                ).join('\n');

                const prompt = `
                    Generate generic SQL (SQLite compatible) for: "${query}"
                    Schema: ${schemaContext}
                    Return ONLY raw SQL string.
                `;

                const model = ai.models.generateContent({
                    model: 'gemini-2.0-flash',
                    contents: prompt
                });

                const res = await model;
                let sql = (res as any).response.text().trim();
                // Cleanup
                return sql.replace(/```sql|```/g, '').trim();

            } catch (e) {
                console.warn("Online SQL failed", e);
            }
        }

        // Offline Fallback (Regex-based SQL Construction)
        const q = query.toLowerCase();

        // 1. "Show products" / "List items"
        if (q.match(/(show|list|get|find)\s+(all\s+)?(product|item)/)) {
            if (q.includes('stock') || q.includes('quantity')) {
                return "SELECT name, quantity, salePrice FROM products ORDER BY quantity ASC LIMIT 50";
            }
            return "SELECT * FROM products ORDER BY name ASC LIMIT 50";
        }

        // 2. "Show customers" / "List clients"
        if (q.match(/(show|list|get|find)\s+(all\s+)?(customer|client)/)) {
            if (q.includes('owe') || q.includes('due')) {
                // Approximate SQL for dues (logic usually in code, but here's a query)
                return "SELECT c.name, SUM(s.totalAmount) as total_bought FROM customers c JOIN sales s ON c.id = s.customerId GROUP BY c.id ORDER BY total_bought DESC LIMIT 20";
            }
            return "SELECT name, phone, area FROM customers ORDER BY name ASC LIMIT 50";
        }

        // 3. "Sales today" / "Revenue last week"
        if (q.includes('sale') || q.includes('invoice') || q.includes('revenue')) {
            if (q.includes('today')) {
                return "SELECT * FROM sales WHERE date >= date('now', 'start of day') ORDER BY date DESC";
            }
            if (q.includes('week') || q.includes('7 days')) {
                return "SELECT * FROM sales WHERE date >= date('now', '-7 days') ORDER BY date DESC";
            }
            if (q.includes('month') || q.includes('30 days')) {
                return "SELECT * FROM sales WHERE date >= date('now', '-30 days') ORDER BY date DESC";
            }
            return "SELECT * FROM sales ORDER BY date DESC LIMIT 50";
        }

        // 4. "Expenses" / "Costs"
        if (q.includes('expense') || q.includes('cost') || q.includes('spent')) {
            if (q.includes('today')) {
                return "SELECT * FROM expenses WHERE date >= date('now', 'start of day') ORDER BY date DESC";
            }
            return "SELECT * FROM expenses ORDER BY date DESC LIMIT 50";
        }

        // 5. Search specific
        const searchMatch = q.match(/find\s+(product|customer)\s+(?:named|called|like)\s+(.+)/);
        if (searchMatch) {
            const table = searchMatch[1] + 's';
            const term = searchMatch[2].trim();
            return `SELECT * FROM ${table} WHERE name LIKE '%${term}%' LIMIT 20`;
        }

        return "-- Offline Mode: AI is unavailable. I can generate SQL for basic queries like 'Show products', 'Sales today', 'List customers', or 'Find product named X'.";
    }
}
