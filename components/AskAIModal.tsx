
import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Sparkles, Bot, User, Loader2, Key } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { useAppContext } from '../context/AppContext';
import Card from './Card';
import Button from './Button';

interface AskAIModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  isError?: boolean;
}

const AskAIModal: React.FC<AskAIModalProps> = ({ isOpen, onClose }) => {
  const { state } = useAppContext();
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'model', text: "Hi! I'm your Business Assistant. Ask me about your sales, stock, or customers." }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showKeyButton, setShowKeyButton] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  // Check for API key availability on open, but don't error out yet
  useEffect(() => {
    const aistudio = (window as any).aistudio;
    if (isOpen && aistudio) {
        aistudio.hasSelectedApiKey().then((hasKey: boolean) => {
            if (!hasKey) setShowKeyButton(true);
        });
    }
  }, [isOpen]);

  const generateSystemContext = () => {
    const totalSales = state.sales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
    const totalPurchases = state.purchases.reduce((sum, p) => sum + Number(p.totalAmount), 0);
    const profit = totalSales - totalPurchases; 
    const lowStockItems = state.products.filter(p => p.quantity < 5).map(p => `${p.name} (${p.quantity})`).join(', ');
    
    return `
      You are a helpful business assistant for a small business owner. 
      Here is the current business snapshot:
      - Business Name: ${state.profile?.name || 'My Business'}
      - Total Revenue (All Time): ₹${totalSales.toLocaleString()}
      - Total Expenses (All Time): ₹${totalPurchases.toLocaleString()}
      - Estimated Gross Profit: ₹${profit.toLocaleString()}
      - Total Customers: ${state.customers.length}
      - Total Products: ${state.products.length}
      - Low Stock Items: ${lowStockItems || 'None'}
      
      Answer questions based on this data. Be concise and helpful.
    `;
  };

  const handleSelectKey = async () => {
      const aistudio = (window as any).aistudio;
      if (aistudio) {
          await aistudio.openSelectKey();
          setShowKeyButton(false);
          // Optional: Retry the last action or just let the user type again
          setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "API Key updated. You can ask me a question now." }]);
      }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    setShowKeyButton(false);

    try {
      // Check if we need to prompt for key first
      const aistudio = (window as any).aistudio;
      if (aistudio) {
          const hasKey = await aistudio.hasSelectedApiKey();
          if (!hasKey) {
              throw new Error("API Key not selected");
          }
      }

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const systemInstruction = generateSystemContext();
      
      const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: { systemInstruction },
        history: messages.filter(m => !m.isError).map(m => ({
            role: m.role,
            parts: [{ text: m.text }]
        }))
      });

      const result = await chat.sendMessage({ message: userMsg.text });
      const responseText = result.text;

      const modelMsg: Message = { id: (Date.now() + 1).toString(), role: 'model', text: responseText || "I couldn't generate a response." };
      setMessages(prev => [...prev, modelMsg]);

    } catch (error: any) {
      console.error("AI Error:", error);
      let errorText = "Sorry, I encountered an error connecting to the AI service.";
      
      if (error.message === "API Key not selected" || ((window as any).aistudio && !process.env.API_KEY)) {
          errorText = "Please configure your API Key to use the assistant.";
          setShowKeyButton(true);
      }

      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: errorText, isError: true }]);
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4 animate-fade-in-fast">
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
                        : msg.isError 
                            ? 'bg-red-50 border border-red-200 text-red-800 dark:bg-red-900/20 dark:text-red-200'
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
            
            {showKeyButton && (
                <div className="flex justify-center mt-4">
                    <Button onClick={handleSelectKey} variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border border-yellow-300">
                        <Key size={16} className="mr-2" />
                        Configure API Key
                    </Button>
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
