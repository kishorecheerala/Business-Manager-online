
import React from 'react';
import { X, Sparkles, Zap, Bug, Calendar } from 'lucide-react';
import Card from './Card';
import Button from './Button';
import { releases, APP_VERSION } from '../utils/changelogData';

interface ChangeLogModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ChangeLogModal: React.FC<ChangeLogModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-fade-in-fast">
            <Card className="w-full max-w-md p-0 overflow-hidden animate-scale-in border-none shadow-2xl relative flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 text-white relative shrink-0">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl"></div>
                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-xs font-bold mb-3 backdrop-blur-md border border-white/10">
                            <Sparkles size={12} className="text-yellow-300" />
                            <span>Current Version {APP_VERSION}</span>
                        </div>
                        <h2 className="text-2xl font-bold mb-1">What's New</h2>
                        <p className="text-indigo-100 text-sm">Latest updates and improvements.</p>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/30 rounded-full text-white/80 hover:text-white transition-colors backdrop-blur-sm"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-grow overflow-y-auto p-6 bg-white dark:bg-slate-900 custom-scrollbar">
                    <div className="space-y-8">
                        {releases.map((release, rIdx) => (
                            <div key={rIdx} className="relative pl-4 border-l-2 border-indigo-100 dark:border-slate-700">
                                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-indigo-500 border-4 border-white dark:border-slate-900"></div>
                                <div className="mb-4">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                        v{release.version}
                                        {rIdx === 0 && <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full dark:bg-indigo-900/30 dark:text-indigo-300">Latest</span>}
                                    </h3>
                                    <span className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                        <Calendar size={12} /> {release.date}
                                    </span>
                                </div>

                                <div className="space-y-4">
                                    {release.features.length > 0 && (
                                        <div>
                                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                <Zap size={14} className="text-amber-500" /> New Features
                                            </h4>
                                            <ul className="space-y-2">
                                                {release.features.map((feat, idx) => (
                                                    <li key={idx} className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-slate-800/50 p-2 rounded-lg border border-gray-100 dark:border-slate-700/50">
                                                        {feat}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {release.fixes && release.fixes.length > 0 && (
                                        <div>
                                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                <Bug size={14} className="text-emerald-500" /> Fixes
                                            </h4>
                                            <ul className="space-y-2">
                                                {release.fixes.map((fix, idx) => (
                                                    <li key={idx} className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed flex items-start gap-2">
                                                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0"></span>
                                                        {fix}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-slate-800 border-t dark:border-slate-700 shrink-0">
                    <Button onClick={onClose} className="w-full py-3 text-base shadow-lg shadow-indigo-200 dark:shadow-none">
                        Close
                    </Button>
                </div>
            </Card>
        </div>
    );
};

export default ChangeLogModal;
