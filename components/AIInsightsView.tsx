import React, { useState, useEffect, useMemo } from 'react';
import { GoogleGenAI } from "@google/genai";
import {
    Sparkles, Brain, AlertTriangle, TrendingUp, TrendingDown, Loader2, RefreshCw,
    Gauge, ArrowRight, Target, ShoppingBag, Users, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../context/AppContext';
import Card from './Card';
import Button from './Button';
import { calculateLinearRegression } from '../utils/analytics';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface AIInsightsViewProps {
    className?: string;
    onNavigate?: (page: string, id?: string) => void;
}

interface ActionItem {
    id: string;
    title: string;
    description: string;
    type: 'restock' | 'promo' | 'collect' | 'general';
    targetId?: string; // e.g. productId to restock
    priority: 'high' | 'medium' | 'low';
}

interface AIResponse {
    businessHealthScore: number; // 0-100
    healthReason: string;
    growthAnalysis: string;
    riskAnalysis: string;
    actions: ActionItem[];
    strategy: string;
}

const AIInsightsView: React.FC<AIInsightsViewProps> = ({ className, onNavigate }) => {
    const { state } = useAppContext();
    const [data, setData] = useState<AIResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'strategy' | 'actions'>('overview');

    const regression = useMemo(() => calculateLinearRegression(state.sales, 30), [state.sales]);

    const generateInsight = async () => {
        if (!state.isOnline) {
            setError("Offline: Go online for AI insights.");
            return;
        }

        const apiKey = localStorage.getItem('gemini_api_key') || process.env.API_KEY;
        if (!apiKey) {
            setError("Missing API Key.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const ai = new GoogleGenAI({ apiKey });

            // --- Context Preparation ---
            const totalSales = state.sales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
            const salesCount = state.sales.length;
            const topProducts = state.products
                .sort((a, b) => b.quantity < a.quantity ? 1 : -1)
                .slice(0, 5)
                .map(p => `${p.name} (${p.quantity} left)`)
                .join(', ');

            const lowStock = state.products.filter(p => p.quantity < 5).map(p => `${p.name} (ID: ${p.id})`).join(', ');

            const totalDues = state.customers.reduce((acc, c) => {
                const cSales = state.sales.filter(s => s.customerId === c.id);
                const paid = cSales.reduce((sum, s) => sum + s.payments.reduce((p, pay) => p + Number(pay.amount), 0), 0);
                const billed = cSales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
                return acc + (billed - paid);
            }, 0);

            const trendDescription = `Sales Trend: ${regression.trend.toUpperCase()} (Growth Rate: ${(regression.growthRate * 100).toFixed(1)}%)`;

            const prompt = `
                You are a Strategic CFO for a retail business. 
                Analyze this data and output strictly Valid JSON. Do not output markdown code blocks.

                **Data:**
                - 30-Day Revenue: ₹${totalSales} (${salesCount} txns)
                - ${trendDescription}
                - Top Sellers: ${topProducts || "None"}
                - Critical Low Stock: ${lowStock || "None"}
                - Pending Dues: ₹${totalDues}

                **JSON Schema:**
                {
                    "businessHealthScore": number (0-100),
                    "healthReason": "Short sentence explaining score",
                    "growthAnalysis": "1-2 sentences on what is driving growth or what is missing.",
                    "riskAnalysis": "1-2 sentences on biggest risk (stock, cash flow, stagnation).",
                    "strategy": "One key strategic move for next week.",
                    "actions": [
                        {
                            "id": "unique_string",
                            "title": "Short Action Title",
                            "description": "Why do this?",
                            "type": "restock" | "promo" | "collect" | "general",
                            "targetId": "product_id_if_restock_or_customer_id_if_collect",
                            "priority": "high" | "medium" | "low"
                        }
                    ] (Max 3 actions)
                }
            `;

            const model = ai.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                config: { responseMimeType: 'application/json' }
            });

            const result = await model;
            const text = (result as any).response.text();

            try {
                const parsed = JSON.parse(text);
                setData(parsed);
            } catch (e) {
                console.error("JSON Parse Error", text);
                setError("AI returned invalid data format.");
            }

        } catch (err) {
            console.error("AI Error:", err);
            setError("Failed to generate insights.");
        } finally {
            setLoading(false);
        }
    };

    // Auto-generate if empty
    useEffect(() => {
        if (!data && !loading && !error && state.isOnline) {
            generateInsight();
        }
    }, []);

    // Helper for Gauge Color
    const getHealthColor = (score: number) => {
        if (score >= 80) return 'text-emerald-500';
        if (score >= 50) return 'text-amber-500';
        return 'text-red-500';
    };

    return (
        <Card className={`relative overflow-hidden bg-white dark:bg-slate-800 border-indigo-100 dark:border-indigo-900 shadow-lg ${className}`}>
            {/* Header */}
            <div className="flex justify-between items-center mb-6 relative z-10 border-b border-indigo-50 dark:border-indigo-900/50 pb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-200 dark:shadow-none">
                        <Sparkles className="text-white" size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-slate-800 dark:text-white">AI Command Center</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Strategic Intelligence</p>
                    </div>
                </div>
                <Button variant="ghost" size="sm" onClick={generateInsight} disabled={loading} className="hover:bg-indigo-50 dark:hover:bg-slate-700">
                    <RefreshCw size={18} className={loading ? "animate-spin text-indigo-500" : "text-slate-400"} />
                </Button>
            </div>

            {/* Content Area */}
            <div className="min-h-[200px] relative z-10">
                <AnimatePresence mode="wait">
                    {loading ? (
                        <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-10">
                            <Loader2 size={40} className="text-indigo-500 animate-spin mb-4" />
                            <p className="text-indigo-600 dark:text-indigo-300 font-medium animate-pulse">Consulting virtual CFO...</p>
                        </motion.div>
                    ) : error ? (
                        <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-10 text-center">
                            <AlertTriangle size={40} className="text-red-500 mb-3" />
                            <p className="text-slate-600 dark:text-slate-300 mb-4">{error}</p>
                            <Button onClick={generateInsight} variant="primary" size="sm">Retry Analysis</Button>
                        </motion.div>
                    ) : data ? (
                        <motion.div key="content" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

                            {/* Top Stats Row */}
                            <div className="flex items-center justify-between mb-6 px-2">
                                <div className="text-center">
                                    <div className="relative inline-flex items-center justify-center">
                                        <Gauge size={64} className={`opacity-20 text-slate-400`} />
                                        <span className={`absolute text-2xl font-black ${getHealthColor(data.businessHealthScore)}`}>{data.businessHealthScore}</span>
                                    </div>
                                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mt-1">Health Score</p>
                                </div>
                                <div className="flex-1 ml-6">
                                    <p className={`text-sm font-medium ${getHealthColor(data.businessHealthScore)} mb-1`}>{data.healthReason}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm">{data.strategy}</p>
                                </div>
                            </div>

                            {/* Tabs Navigation */}
                            <div className="flex gap-2 mb-4 bg-slate-50 dark:bg-slate-900/50 p-1 rounded-lg">
                                {[
                                    { id: 'overview', label: 'Overview', icon: Target },
                                    { id: 'strategy', label: 'Growth & Risks', icon: TrendingUp },
                                    { id: 'actions', label: 'Actions', icon: Zap }
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as any)}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-bold transition-all ${activeTab === tab.id
                                                ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-300'
                                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                            }`}
                                    >
                                        <tab.icon size={14} />
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* Tab Content */}
                            <div className="min-h-[120px]">
                                {activeTab === 'overview' && (
                                    <div className="space-y-3 animate-fade-in">
                                        <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800">
                                            <h4 className="text-xs font-bold text-indigo-800 dark:text-indigo-300 uppercase mb-2 flex items-center gap-2">
                                                <TrendingUp size={14} /> Revenue Projection (Simulated)
                                            </h4>
                                            {/* Simple Sparkline simulation using regression */}
                                            <div className="h-24 w-full">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <LineChart data={
                                                        Array.from({ length: 7 }, (_, i) => ({
                                                            day: i,
                                                            value: regression.predict(30 + i) // Forecast next 7 days
                                                        }))
                                                    }>
                                                        <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={3} dot={{ r: 3, fill: '#6366f1' }} />
                                                        <Tooltip
                                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                            labelFormatter={() => ''}
                                                            formatter={(value: number) => [`₹${Math.round(value)}`, 'Forecast']}
                                                        />
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'strategy' && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fade-in">
                                        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800">
                                            <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase mb-2 flex items-center gap-2">
                                                <Sparkles size={14} /> Growth Engine
                                            </h4>
                                            <p className="text-sm text-emerald-900 dark:text-emerald-100 leading-relaxed font-medium">
                                                {data.growthAnalysis}
                                            </p>
                                        </div>
                                        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800">
                                            <h4 className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase mb-2 flex items-center gap-2">
                                                <AlertTriangle size={14} /> Risk Radar
                                            </h4>
                                            <p className="text-sm text-amber-900 dark:text-amber-100 leading-relaxed font-medium">
                                                {data.riskAnalysis}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'actions' && (
                                    <div className="space-y-2 animate-fade-in">
                                        {data.actions.map((action, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-3 bg-white dark:bg-slate-700 rounded-xl border border-slate-100 dark:border-slate-600 shadow-sm hover:shadow-md transition-shadow group">
                                                <div className="flex items-start gap-3">
                                                    <div className={`p-2 rounded-full mt-1 ${action.priority === 'high' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                                                        }`}>
                                                        {action.type === 'restock' ? <ShoppingBag size={16} /> :
                                                            action.type === 'collect' ? <Users size={16} /> : <Target size={16} />}
                                                    </div>
                                                    <div>
                                                        <h5 className="text-sm font-bold text-slate-800 dark:text-white group-hover:text-indigo-600 transition-colors">{action.title}</h5>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[200px]">{action.description}</p>
                                                    </div>
                                                </div>
                                                {(action.targetId && onNavigate) && (
                                                    <Button size="xs" variant="secondary" onClick={() => onNavigate(
                                                        action.type === 'restock' ? 'PRODUCTS' :
                                                            action.type === 'collect' ? 'CUSTOMERS' : 'DASHBOARD',
                                                        action.targetId
                                                    )}>
                                                        Act <ArrowRight size={12} className="ml-1" />
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
                                        {data.actions.length === 0 && <p className="text-center text-slate-400 text-sm py-4">No immediate actions needed.</p>}
                                    </div>
                                )}
                            </div>

                        </motion.div>
                    ) : null}
                </AnimatePresence>
            </div>

            {/* Background Decoration */}
            <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
                <Brain size={150} />
            </div>
        </Card>
    );
};

export default AIInsightsView;

