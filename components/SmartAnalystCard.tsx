import React, { useState, useMemo, useRef } from 'react';
import { User, Archive, Sparkles, Volume2, StopCircle, ArrowRight, UserX, RotateCw, Loader2, Phone, X, BrainCircuit } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import Button from './Button';
import { Page, Customer, Sale, Purchase, Return, Expense, Product } from '../types';
import { GoogleGenAI, Modality } from "@google/genai";
import { formatCurrency, formatDate } from '../utils/formatUtils';

// Helper for TTS decoding
async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}

function decodeBase64(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

const SmartAnalystCard: React.FC<{
    sales: Sale[],
    products: Product[],
    customers: Customer[],
    purchases: Purchase[],
    returns: Return[],
    expenses: Expense[],
    ownerName: string,
    onNavigate: (page: Page, id: string) => void;
}> = ({ sales, products, customers, purchases, returns, expenses, ownerName, onNavigate }) => {
    const { showToast } = useAppContext();
    const [detailType, setDetailType] = useState<'deadStock' | 'churn' | null>(null);
    const [aiBriefing, setAiBriefing] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

    const analysis = useMemo(() => {
        const now = new Date();
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        // 1. Today's Collection (Payments received today)
        let todaysCollection = 0;
        sales.forEach(s => {
            s.payments?.forEach(p => {
                const pDate = new Date(p.date);
                if (pDate >= todayStart) {
                    todaysCollection += Number(p.amount);
                }
            });
        });

        // 2. Dead Stock (No sales in 60 days)
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
        const activeProductIds = new Set<string>();
        sales.forEach(s => {
            if (new Date(s.date) > sixtyDaysAgo) {
                s.items.forEach(i => activeProductIds.add(i.productId));
            }
        });

        const deadStockList = products
            .filter(p => !activeProductIds.has(p.id) && p.quantity > 0)
            .sort((a, b) => (b.quantity * b.purchasePrice) - (a.quantity * a.purchasePrice));

        // 3. Churn Risk (Active historically but no purchase in 60 days)
        const recentCustomerIds = new Set<string>();
        sales.forEach(s => {
            if (new Date(s.date) > sixtyDaysAgo) {
                recentCustomerIds.add(s.customerId);
            }
        });

        const customersWithHistory = new Set(sales.map(s => s.customerId));
        const churnList = customers
            .filter(c => customersWithHistory.has(c.id) && !recentCustomerIds.has(c.id))
            .map(c => {
                const cSales = sales.filter(s => s.customerId === c.id);
                const lastSale = cSales.reduce((latest, s) => new Date(s.date) > new Date(latest.date) ? s : latest, cSales[0]);
                return { ...c, lastSeen: lastSale ? new Date(lastSale.date) : null };
            })
            .sort((a, b) => (b.lastSeen?.getTime() || 0) - (a.lastSeen?.getTime() || 0));

        // Briefing
        const greeting = now.getHours() < 12 ? 'Good Morning' : now.getHours() < 17 ? 'Good Afternoon' : 'Good Evening';
        const briefing = `${greeting}, ${ownerName}. Today's collection so far is ${formatCurrency(todaysCollection)}. You have ${deadStockList.length} dead stock items and ${churnList.length} customers at risk.`;

        return { todaysCollection, deadStockList, churnList, briefing };
    }, [sales, products, customers, ownerName]);

    const handleGenerateBriefing = async () => {
        setIsGenerating(true);
        try {
            const apiKey = process.env.API_KEY || localStorage.getItem('gemini_api_key');
            if (!apiKey) throw new Error("API Key not found");

            const ai = new GoogleGenAI({ apiKey });

            const totalDue = customers.reduce((acc, c) => {
                const cSales = sales.filter(s => s.customerId === c.id);
                const paid = cSales.reduce((sum, s) => sum + s.payments.reduce((p, pay) => p + Number(pay.amount), 0), 0);
                const billed = cSales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
                return acc + (billed - paid);
            }, 0);

            const prompt = `Act as a business analyst for owner ${ownerName}. 
            Data: Today's Collection ${formatCurrency(analysis.todaysCollection)}, Outstanding Dues ${formatCurrency(totalDue)}, Dead Stock Items ${analysis.deadStockList.length}.
            Write a 2-bullet point executive briefing. Focus on today's cash flow or inventory action. Keep it encouraging but realistic. Max 30 words per bullet.`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: [{ role: 'user', parts: [{ text: prompt }] }]
            });

            if (response.response.text()) {
                setAiBriefing(response.response.text());
            }
        } catch (error) {
            console.error("AI Error", error);
            showToast("Could not generate briefing. Check API Key or connection.", 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleStopAudio = () => {
        if (audioSourceRef.current) {
            audioSourceRef.current.stop();
            audioSourceRef.current = null;
        }
        setIsPlaying(false);
    };

    const handlePlayBriefing = async () => {
        if (isPlaying) {
            handleStopAudio();
            return;
        }

        setIsPlaying(true);
        try {
            const apiKey = process.env.API_KEY || localStorage.getItem('gemini_api_key');
            if (!apiKey) {
                // Fallback to browser speech synthesis if no API key
                const utterance = new SpeechSynthesisUtterance(aiBriefing || analysis.briefing);
                utterance.onend = () => setIsPlaying(false);
                window.speechSynthesis.speak(utterance);
                return;
            }

            const ai = new GoogleGenAI({ apiKey });
            const briefingText = aiBriefing || analysis.briefing;

            const prompt = `Say in a professional, encouraging news-anchor voice: "${briefingText.replace(/[*#]/g, '')}"`;

            const response = await ai.models.generateContent({
                model: "gemini-2.0-flash-exp",
                contents: [{ parts: [{ text: prompt }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName: 'Kore' },
                        },
                    },
                },
            });

            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (!base64Audio) throw new Error("No audio returned");

            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            }

            const audioBuffer = await decodeAudioData(
                decodeBase64(base64Audio),
                audioContextRef.current,
                24000,
                1
            );

            const source = audioContextRef.current.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContextRef.current.destination);
            source.onended = () => setIsPlaying(false);
            source.start();
            audioSourceRef.current = source;

        } catch (e) {
            console.error("TTS Error", e);
            // Fallback to browser speech
            const utterance = new SpeechSynthesisUtterance(aiBriefing || analysis.briefing);
            utterance.onend = () => setIsPlaying(false);
            window.speechSynthesis.speak(utterance);
        }
    };

    return (
        <>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-4 animate-slide-up-fade border-t-4 border-primary transition-all hover:shadow-xl hover:scale-[1.01]">
                <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                            <BrainCircuit className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-base text-slate-800 dark:text-white">Smart Analyst</h3>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handlePlayBriefing}
                            className={`p-1.5 rounded-full transition-all border ${isPlaying ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-50'}`}
                        >
                            {isPlaying ? <StopCircle size={16} /> : <Volume2 size={16} />}
                        </button>
                        <button
                            onClick={handleGenerateBriefing}
                            disabled={isGenerating}
                            className="p-1.5 rounded-full bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 transition-colors"
                            title="Refresh AI Insights"
                        >
                            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <RotateCw size={16} />}
                        </button>
                    </div>
                </div>

                <div className="mb-4 bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg border border-indigo-100 dark:border-indigo-800">
                    <div className="flex items-start gap-2">
                        <Sparkles size={16} className="text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
                        <p className="text-sm text-indigo-900 dark:text-indigo-100 font-medium leading-relaxed">
                            "{aiBriefing || analysis.briefing}"
                        </p>
                    </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => setDetailType('deadStock')}
                        className="p-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-all text-left group relative"
                    >
                        <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ArrowRight size={14} className="text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="p-1 bg-amber-100 dark:bg-amber-900/30 rounded text-amber-600 dark:text-amber-400">
                                <Archive size={14} />
                            </div>
                            <p className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wide">Dead Stock</p>
                        </div>
                        <p className="font-bold text-xl text-slate-800 dark:text-white">{analysis.deadStockList.length}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">Items &gt; 60 days</p>
                    </button>

                    <button
                        onClick={() => setDetailType('churn')}
                        className="p-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/20 transition-all text-left group relative"
                    >
                        <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ArrowRight size={14} className="text-red-600 dark:text-red-400" />
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="p-1 bg-red-100 dark:bg-red-900/30 rounded text-red-600 dark:text-red-400">
                                <UserX size={14} />
                            </div>
                            <p className="text-[10px] font-bold text-red-700 dark:text-red-300 uppercase tracking-wide">Churn Risk</p>
                        </div>
                        <p className="font-bold text-xl text-slate-800 dark:text-white">{analysis.churnList.length}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">Inactive users</p>
                    </button>
                </div>


            </div>

            {/* Details Modal */}
            {detailType && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4 animate-fade-in-fast"
                    onClick={() => setDetailType(null)}
                >
                    <div
                        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden animate-scale-in border dark:border-slate-700"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-4 border-b dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800">
                            <h3 className="font-bold text-lg text-gray-800 dark:text-white flex items-center gap-2">
                                {detailType === 'deadStock' ? <Archive className="w-5 h-5 text-amber-600" /> : <UserX className="w-5 h-5 text-red-600" />}
                                {detailType === 'deadStock' ? 'Dead Stock Items' : 'At-Risk Customers'}
                            </h3>
                            <button onClick={() => setDetailType(null)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="overflow-y-auto p-4 space-y-3 bg-white dark:bg-slate-900 custom-scrollbar">
                            {detailType === 'deadStock' ? (
                                analysis.deadStockList.length > 0 ? (
                                    analysis.deadStockList.map(p => (
                                        <div key={p.id} className="flex justify-between items-center p-3 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm hover:border-indigo-200 dark:hover:border-indigo-800 cursor-pointer transition-colors" onClick={() => { setDetailType(null); onNavigate('PRODUCTS', p.id); }}>
                                            <div>
                                                <p className="font-bold text-sm text-gray-800 dark:text-white">{p.name}</p>
                                                <p className="text-xs text-gray-500">ID: {p.id}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-red-600 text-sm">{p.quantity} Units</p>
                                                <p className="text-[10px] text-gray-400">Value: {formatCurrency(p.quantity * p.purchasePrice)}</p>
                                            </div>
                                        </div>
                                    ))
                                ) : <p className="text-center text-gray-500 py-8 italic">No dead stock found. Great job!</p>
                            ) : (
                                analysis.churnList.length > 0 ? (
                                    analysis.churnList.map(c => (
                                        <div key={c.id} className="flex justify-between items-center p-3 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm hover:border-indigo-200 dark:hover:border-indigo-800 cursor-pointer transition-colors" onClick={() => { setDetailType(null); onNavigate('CUSTOMERS', c.id); }}>
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-full text-red-600">
                                                    <User size={16} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm text-gray-800 dark:text-white">{c.name}</p>
                                                    <p className="text-xs text-gray-500 flex items-center gap-1"><Phone size={10} /> {c.phone}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-gray-600 dark:text-gray-300 text-xs">Last Seen</p>
                                                <p className="text-xs text-gray-500">{formatDate(c.lastSeen)}</p>
                                            </div>
                                        </div>
                                    ))
                                ) : <p className="text-center text-gray-500 py-8 italic">No at-risk customers found.</p>
                            )}
                        </div>
                        <div className="p-3 border-t dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
                            <Button onClick={() => setDetailType(null)} variant="secondary" className="w-full">Close</Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default SmartAnalystCard;
