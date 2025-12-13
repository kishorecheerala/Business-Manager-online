import { GoogleGenAI } from "@google/genai";
import { OfflineIntelligence } from './OfflineIntelligence';
import { AppState, AIResponse, SaleItem, Product } from '../../types';

export class AIController {

    private static getInfo(state: AppState) {
        return {
            isOnline: state.isOnline,
            isOnline: state.isOnline,
            apiKey: localStorage.getItem('gemini_api_key') || (import.meta.env.VITE_GEMINI_API_KEY as string) || ''
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
                const totalSales = state.sales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
                const safeLowStock = state.products.filter(p => p.quantity < 5).slice(0, 10).map(p => p.name).join(', ');

                const prompt = `
                    Analyze this retail business data (JSON only):
                    - Revenue (30d): ${totalSales}
                    - Tranasctions: ${state.sales.length}
                    - Low Stock: ${safeLowStock}
                    
                    Return JSON matching: { businessHealthScore: number, healthReason: string, growthAnalysis: string, riskAnalysis: string, strategy: string, actions: [{id, title, description, type, targetId, priority}] }
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

        // Offline Fallback (Simple Keyword Mapping)
        const q = query.toLowerCase();
        if (q.includes('product')) return "SELECT * FROM products LIMIT 50";
        if (q.includes('customer')) return "SELECT * FROM customers LIMIT 50";
        if (q.includes('sale') || q.includes('invoice')) return "SELECT * FROM sales ORDER BY date DESC LIMIT 50";
        if (q.includes('expense')) return "SELECT * FROM expenses ORDER BY date DESC LIMIT 50";

        return "-- Offline Mode: AI is unavailable. Please try simple queries like 'show products'.";
    }
}
