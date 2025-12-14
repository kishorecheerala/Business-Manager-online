import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Cloud, Shield, RefreshCw, Calendar, FileSpreadsheet, AlertTriangle } from 'lucide-react';
import Card from './Card';
import { useAppContext } from '../context/AppContext';

interface SignInModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const SignInModal: React.FC<SignInModalProps> = ({ isOpen, onClose }) => {
    const { googleSignIn, state, showToast } = useAppContext();

    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSignIn = () => {
        if (!state.isOnline) {
            showToast("Internet connection required to sign in.", 'error');
            return;
        }
        googleSignIn();
        onClose();
    };

    return createPortal(
        <div
            className="fixed inset-0 z-[80] flex items-center justify-center p-4"
        >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in-fast" onClick={onClose} />
            <Card className="relative z-10 w-full max-w-md p-0 max-h-[85vh] overflow-y-auto animate-scale-in border-none shadow-2xl bg-white dark:bg-slate-900 custom-scrollbar">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full bg-black/10 hover:bg-black/20 text-white transition-colors z-20"
                >
                    <X size={20} />
                </button>

                {/* Compact Hero Section */}
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-5 text-center text-white relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-white/10 opacity-30" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '16px 16px' }}></div>
                    <div className="relative z-10 flex flex-col items-center">
                        <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md mb-2 shadow-inner">
                            <Cloud size={24} className="text-white drop-shadow-md" />
                        </div>
                        <h2 className="text-lg font-bold mb-1">Sync & Integration</h2>
                        <p className="text-blue-100 text-xs max-w-xs mx-auto">
                            Secure your data and enable powerful integrations.
                        </p>
                    </div>
                </div>

                {/* Content */}
                <div className="p-5 space-y-5">

                    {/* 1. Actions (Moved to Top) */}
                    <div className="space-y-3">
                        <button
                            onClick={handleSignIn}
                            disabled={!state.isOnline}
                            className={`w-full py-3 ${!state.isOnline ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} text-white font-bold rounded-xl shadow-lg shadow-blue-200 dark:shadow-none transition-all flex items-center justify-center gap-2 group`}
                        >
                            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className={`w-5 h-5 bg-white rounded-full p-0.5 ${!state.isOnline ? 'opacity-50' : ''}`} />
                            {state.isOnline ? 'Sign In with Google' : 'Offline - Connect to Internet'}
                        </button>
                        <button
                            onClick={onClose}
                            className="w-full py-2 text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors underline decoration-dotted underline-offset-4"
                        >
                            Skip Login for Now
                        </button>
                    </div>

                    {/* 2. Sync Warning (Moved Below Buttons) */}
                    <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400 dark:border-amber-600 p-3 rounded-r-lg">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-bold text-amber-800 dark:text-amber-200 text-xs">Important Note on Syncing</h4>
                                <p className="text-[10px] text-amber-700 dark:text-amber-300 mt-1 leading-relaxed">
                                    Google sessions expire after one hour. If sync fails, you may be signed out. Simply sign in again here to refresh.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* 3. Benefits List (Moved to Bottom) */}
                    <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-slate-700">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center mb-1">Features enabled by Sync</p>
                        <div className="flex items-start gap-3">
                            <div className="p-1.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg shrink-0">
                                <Shield size={16} />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-800 dark:text-white text-xs">Secure Cloud Backup</h3>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Automated backups to your private Google Drive.</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg shrink-0">
                                <Calendar size={16} />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-800 dark:text-white text-xs">Calendar Integration</h3>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Add payment due dates to Google Calendar.</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg shrink-0">
                                <FileSpreadsheet size={16} />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-800 dark:text-white text-xs">Export to Sheets</h3>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Export reports & inventory to Google Sheets.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>
        </div>,
        document.body
    );
};

export default SignInModal;
