import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { GoogleGenAI } from "@google/genai";
import { Send, Bot, User, X, Loader2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from './Button';
import Input from './Input';
import { useAppContext } from '../context/AppContext';

interface Message {
    id: string;
    role: 'user' | 'model';
    text: string;
    timestamp: Date;
}

interface AskAIModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const AskAIModal: React.FC<AskAIModalProps> = ({ isOpen, onClose }) => {
    const { state } = useAppContext();
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            role: 'model',
            text: "Hello! I'm your Business Analyst. Ask me anything about your sales, stock, or customers.",
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            text: input,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const apiKey = localStorage.getItem('gemini_api_key') || process.env.API_KEY;

            if (!state.isOnline) throw new Error("Offline mode. Cannot connect to AI.");
            if (!apiKey) throw new Error("API Key missing. Please check settings.");

            const ai = new GoogleGenAI({ apiKey });

            // --- Context Preparation (Simplified for Chat) ---
            const totalSales = state.sales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
            const salesCount = state.sales.length;
            const topProducts = state.products
                .sort((a, b) => b.quantity < a.quantity ? 1 : -1)
                .slice(0, 5)
                .map(p => `${p.name} (${p.quantity} left)`)
                .join(', ');

            const lowStock = state.products.filter(p => p.quantity < 5).map(p => `${p.name} (ID: ${p.id})`).join(', ');

            const context = `
                Context:
                - Business Name: ${state.profile?.name || 'My Business'}
                - Total Revenue (30 days): ₹${totalSales}
                - Transaction Count: ${salesCount}
                - Top Sellers: ${topProducts}
                - Low Stock Alerts: ${lowStock}
                
                You are a helpful business assitant. Keep answers short (max 2-3 sentences).
             `;

            const model = ai.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: [
                    { role: 'user', parts: [{ text: context + "\n\nUser Question: " + userMsg.text }] }
                ]
            });

            const result = await model;
            const responseText = (result as any).response.text();

            const botMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: responseText,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, botMsg]);

        } catch (error: any) {
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'model',
                text: `Error: ${error.message || "Something went wrong."}`,
                timestamp: new Date()
            }]);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-slate-800 w-full max-w-md h-[600px] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-indigo-100 dark:border-indigo-900"
            >
                {/* Header */}
                <div className="p-4 bg-indigo-600 flex justify-between items-center text-white">
                    <div className="flex items-center gap-2">
                        <Sparkles size={20} />
                        <h3 className="font-bold">AI Analyst</h3>
                    </div>
                    <button onClick={onClose} className="hover:bg-indigo-500 p-1 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Messages */}
                <div ref={scrollRef} className="flex-grow overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900/50">
                    {messages.map(msg => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-2xl p-3 text-sm ${msg.role === 'user'
                                ? 'bg-indigo-600 text-white rounded-br-none'
                                : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-gray-200 shadow-sm rounded-bl-none border border-slate-100 dark:border-slate-600'
                                }`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex justify-start">
                            <div className="bg-white dark:bg-slate-700 p-3 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-2">
                                <Loader2 size={16} className="animate-spin text-indigo-500" />
                                <span className="text-xs text-slate-500">Thinking...</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input */}
                <div className="p-4 bg-white dark:bg-slate-800 border-t dark:border-slate-700">
                    <div className="flex gap-2">
                        <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Ask a question..."
                            className="flex-grow"
                            autoFocus
                        />
                        <Button onClick={handleSend} disabled={loading || !input.trim()} className="px-3">
                            <Send size={18} />
                        </Button>
                    </div>
                </div>
            </motion.div>
        </div>,
        document.body
    );
};

export default AskAIModal;
