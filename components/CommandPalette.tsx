import React, { useState, useEffect, useRef } from 'react';
import { Search, Command, ArrowRight, CornerDownLeft, Sparkles, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Page } from '../types';
import { ICON_MAP, LABEL_MAP } from '../utils/iconMap';
import { useAppContext } from '../context/AppContext';
import { useHotkeys } from '../hooks/useHotkeys';

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (page: Page) => void;
}

interface ActionItem {
    id: string;
    label: string;
    description?: string;
    icon: React.ElementType;
    shortcut?: string;
    perform: () => void;
    group: 'Navigation' | 'Actions' | 'Recently Used';
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onNavigate }) => {
    const { state, dispatch, showToast } = useAppContext();
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    // Filtered Actions
    const [filteredActions, setFilteredActions] = useState<ActionItem[]>([]);

    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    // Build Action List
    useEffect(() => {
        const actions: ActionItem[] = [
            // Navigation
            ...Object.keys(ICON_MAP).map((pageKey) => ({
                id: `nav-${pageKey}`,
                label: `Go to ${LABEL_MAP[pageKey] || pageKey}`,
                icon: ICON_MAP[pageKey],
                perform: () => onNavigate(pageKey as Page),
                group: 'Navigation' as const
            })),
            // Global Actions
            {
                id: 'new-invoice',
                label: 'New Invoice',
                description: 'Create a new sale invoice',
                icon: ICON_MAP['SALES'],
                shortcut: 'Cmd+N',
                perform: () => {
                    dispatch({ type: 'SET_SELECTION', payload: { page: 'SALES', id: 'new' } });
                    onNavigate('SALES');
                },
                group: 'Actions' as const
            },
            {
                id: 'new-purchase',
                label: 'New Purchase Bill',
                description: 'Record a new purchase',
                icon: ICON_MAP['PURCHASES'],
                shortcut: 'Cmd+B',
                perform: () => {
                    dispatch({ type: 'SET_SELECTION', payload: { page: 'PURCHASES', id: 'new' } });
                    onNavigate('PURCHASES');
                },
                group: 'Actions' as const
            },
            {
                id: 'add-customer',
                label: 'Add New Customer',
                icon: ICON_MAP['CUSTOMERS'],
                perform: () => {
                    dispatch({ type: 'SET_SELECTION', payload: { page: 'CUSTOMERS', id: 'new' } });
                    onNavigate('CUSTOMERS');
                },
                group: 'Actions' as const
            },
            {
                id: 'add-product',
                label: 'Add New Product',
                icon: ICON_MAP['PRODUCTS'],
                perform: () => {
                    dispatch({ type: 'SET_SELECTION', payload: { page: 'PRODUCTS', id: 'new' } });
                    onNavigate('PRODUCTS');
                },
                group: 'Actions' as const
            }
        ];

        if (!query) {
            setFilteredActions(actions);
        } else {
            const lowerQuery = query.toLowerCase();
            const filtered = actions.filter(action =>
                action.label.toLowerCase().includes(lowerQuery) ||
                action.description?.toLowerCase().includes(lowerQuery)
            );
            setFilteredActions(filtered);
        }
        setSelectedIndex(0); // Reset selection on search
    }, [query, onNavigate, dispatch]);


    // Keyboard Navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % filteredActions.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + filteredActions.length) % filteredActions.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (filteredActions[selectedIndex]) {
                filteredActions[selectedIndex].perform();
                onClose();
            }
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[3000] flex items-start justify-center pt-[20vh] px-4 animate-fade-in-fast">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />

            <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden relative animate-scale-in flex flex-col max-h-[60vh]">

                {/* Header / Input */}
                <div className="flex items-center p-4 border-b border-gray-100 dark:border-slate-800 gap-3">
                    <Search className="text-gray-400" size={20} />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type to search..."
                        className="flex-1 bg-transparent border-none outline-none text-lg text-gray-800 dark:text-gray-100 placeholder-gray-400"
                    />
                    <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-slate-800 rounded text-gray-500 font-mono">Esc</span>
                    </div>
                </div>

                {/* Results */}
                <div className="overflow-y-auto p-2 scrollbar-hide">
                    {filteredActions.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                            <Command size={32} className="mx-auto mb-2 opacity-20" />
                            <p>No results found</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {filteredActions.map((action, index) => {
                                const active = index === selectedIndex;
                                return (
                                    <button
                                        key={action.id}
                                        onClick={() => {
                                            action.perform();
                                            onClose();
                                        }}
                                        className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${active
                                                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-900 dark:text-indigo-100'
                                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                                            }`}
                                    >
                                        <div className={`p-2 rounded-md ${active ? 'bg-indigo-200/50 dark:bg-indigo-800' : 'bg-gray-100 dark:bg-slate-800'
                                            }`}>
                                            <action.icon size={18} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                                <span className={`font-medium ${active ? 'font-semibold' : ''}`}>{action.label}</span>
                                                {action.shortcut && (
                                                    <span className="text-xs opacity-50 font-mono flex items-center gap-1">
                                                        {action.shortcut}
                                                    </span>
                                                )}
                                            </div>
                                            {action.description && (
                                                <p className="text-xs text-indigo-500/70 dark:text-indigo-200/50 mt-0.5 opacity-80">
                                                    {action.description}
                                                </p>
                                            )}
                                        </div>
                                        {active && <CornerDownLeft size={16} className="opacity-50" />}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-gray-50 dark:bg-slate-900/50 p-2 text-xs text-gray-400 border-t border-gray-100 dark:border-slate-800 flex justify-between px-4">
                    <span className="flex items-center gap-2">
                        <Sparkles size={12} className="text-amber-500" />
                        <span>Pro Tip: Use arrow keys to navigate</span>
                    </span>
                    <span>Business Manager AI</span>
                </div>
            </div>
        </div>
    );
};

export default CommandPalette;
