
import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Sparkles, Bot, User, Loader2 } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { useAppContext } from '../context/AppContext';
import Card from './Card';

interface AskAIModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
}

const AskAIModal: React.FC<AskAIModalProps> = ({ isOpen, onClose }) => {
  const { state } = useAppContext();
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'model', text: "Hi! I'm your Business Assistant. Ask me about your sales, stock, or customers." }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  // Initialize AI only when modal is open
  const aiRef = useRef<GoogleGenAI | null>(null);

  useEffect(() => {
    if (isOpen && !aiRef.current) {
        // Initialize with the API Key from environment
        aiRef.current = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
  }, [isOpen]);

  const generateSystemContext = () => {
    const totalSales = state.sales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
    const totalPurchases = state.purchases.reduce((sum, p) => sum + Number(p.totalAmount), 0);
    const profit = totalSales - totalPurchases; // Simplified profit
    const lowStockItems = state.products.filter(p => p.quantity < 5).map(p => `${p.name} (${p.quantity})`).join(', ');
    const topCustomers = state.customers.slice(0, 5).map(c => c.name).join(', ');

    return `
      You are a helpful business assistant for a small business owner. 
      Here is the current business snapshot:
      - Business Name: ${state.profile?.name || 'My Business'}
      - Total Revenue (All Time): ₹${totalSales.toLocaleString()}
      - Total Expenses (All Time): ₹${totalPurchases.toLocaleString()}
      - Estimated Gross Profit: ₹${profit.toLocaleString()}
      - Total Customers: ${state.customers.length}
      - Total Products in DB: ${state.products.length}
      - Low Stock Items (<5 qty): ${lowStockItems || 'None'}
      - Recent Sales Count: ${state.sales.length}
      
      Answer questions based on this data. Be concise, friendly, and encouraging. 
      If asked about specific details not listed here, say you don't have that granular data in your current context view.
      Do not hallucinate data.
    `;
  };

  const handleSend = async () => {
    if (!input.trim() || !aiRef.current) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const systemInstruction = generateSystemContext();
      
      // We use generateContent for a single turn or construct a chat history if needed.
      // For simplicity and robustness with the flash model, we'll send the history + context each time 
      // or use the chat API if we want multi-turn state management.
      // Here, using the chat API is best for conversation.
      
      // Note: In a real app, we might persist the chat session object, but for now re-creating it 
      // with history is fine, or just keeping it simple with single queries.
      // Let's try to maintain a simple chat session.
      
      const chat = aiRef.current.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: systemInstruction,
        },
        history: messages.map(m => ({
            role: m.role,
            parts: [{ text: m.text }]
        }))
      });

      const result = await chat.sendMessage({ message: userMsg.text });
      const responseText = result.text;

      const modelMsg: Message = { id: (Date.now() + 1).toString(), role: 'model', text: responseText || "I couldn't generate a response." };
      setMessages(prev => [...prev, modelMsg]);

    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "Sorry, I encountered an error connecting to the AI service." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in-fast">
      <Card className="w-full max-w-lg h-[80vh] flex flex-col p-0 overflow-hidden animate-scale-in relative">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 flex justify-between items-center text-white shrink-0">
            <div className="flex items-center gap-2">
                <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                    <Sparkles size={18} className="text-yellow-300" />
                </div>
                <h2 className="font-bold text-lg">Business Assistant</h2>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
                <X size={20} />
            </button>
        </div>

        {/* Chat Area */}
        <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900/50">
            {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl p-3 shadow-sm ${
                        msg.role === 'user' 
                        ? 'bg-indigo-600 text-white rounded-br-none' 
                        : 'bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 text-gray-800 dark:text-gray-200 rounded-bl-none'
                    }`}>
                        <div className="flex items-center gap-2 mb-1 opacity-70 text-[10px] font-bold uppercase tracking-wider">
                            {msg.role === 'user' ? <User size={10} /> : <Bot size={10} />}
                            {msg.role === 'user' ? 'You' : 'Assistant'}
                        </div>
                        <div className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</div>
                    </div>
                </div>
            ))}
            {isLoading && (
                <div className="flex justify-start">
                    <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-2 border border-gray-100 dark:border-slate-700">
                        <Loader2 size={16} className="animate-spin text-indigo-600" />
                        <span className="text-xs text-gray-500">Thinking...</span>
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-3 bg-white dark:bg-slate-800 border-t dark:border-slate-700 shrink-0">
            <div className="flex gap-2 items-end bg-gray-100 dark:bg-slate-900 p-2 rounded-xl border border-gray-200 dark:border-slate-700 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
                <textarea 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Ask about sales, stock, or profit..."
                    className="flex-grow bg-transparent border-none focus:ring-0 resize-none text-sm max-h-24 py-2 px-2 dark:text-white"
                    rows={1}
                />
                <button 
                    onClick={handleSend}
                    disabled={isLoading || !input.trim()}
                    className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-0.5"
                >
                    <Send size={18} />
                </button>
            </div>
            <p className="text-[10px] text-center text-gray-400 mt-2">
                AI can make mistakes. Please verify important financial data.
            </p>
        </div>
      </Card>
    </div>
  );
};

export default AskAIModal;
