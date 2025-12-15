import React, { useState, useEffect } from 'react';
import { StickyNote, Save } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const QuickMemoCard: React.FC = () => {
    const { showToast } = useAppContext();
    const [memo, setMemo] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const savedMemo = localStorage.getItem('dashboard_quick_memo');
        if (savedMemo) {
            setMemo(savedMemo);
        }
    }, []);

    const handleSave = () => {
        setIsSaving(true);
        localStorage.setItem('dashboard_quick_memo', memo);

        // Simulate a brief delay for better UX
        setTimeout(() => {
            setIsSaving(false);
            showToast("Memo saved successfully", "success");
        }, 500);
    };

    return (
        <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-xl shadow-sm p-4 h-full flex flex-col relative group transition-all hover:shadow-md">
            <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg text-yellow-600 dark:text-yellow-400">
                        <StickyNote size={16} />
                    </div>
                    <h3 className="font-bold text-sm text-yellow-800 dark:text-yellow-200">Quick Memo</h3>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className={`p-1.5 rounded-full bg-white dark:bg-slate-800 text-yellow-600 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-700 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-all ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title="Save Memo"
                >
                    <Save size={14} className={isSaving ? "animate-pulse" : ""} />
                </button>
            </div>

            <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="Type a quick note here... (e.g., Call distributor, Check stock)"
                className="flex-grow w-full bg-transparent border-none resize-none focus:ring-0 text-sm text-slate-700 dark:text-slate-300 placeholder-slate-400 dark:placeholder-slate-500 leading-relaxed custom-scrollbar p-0"
                spellCheck={false}
            />

            <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-yellow-600/60 dark:text-yellow-400/60 pointer-events-none">
                {memo.length} chars
            </div>
        </div>
    );
};

export default QuickMemoCard;
