import React, { useState } from 'react';
import { Lock, Unlock, Shield, X, Save } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useDialog } from '../context/DialogContext';
import { Page } from '../types';

interface SecuritySettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const PROTECTABLE_PAGES: { id: Page; label: string }[] = [
    { id: 'SYSTEM_OPTIMIZER', label: 'System Optimizer' },
    { id: 'SQL_ASSISTANT', label: 'SQL AI Assistant' },
    { id: 'TRASH', label: 'Recycle Bin' },
    { id: 'REPORTS', label: 'Reports & Analytics' },
    { id: 'FINANCIAL_PLANNING', label: 'Financial Planning' },
    { id: 'CUSTOMERS', label: 'Customer Management' },
    { id: 'SUPPLIERS', label: 'Supplier Management' },
    { id: 'PURCHASES', label: 'Purchases' },
    { id: 'EXPENSES', label: 'Expenses' },
    { id: 'DASHBOARD', label: 'Dashboard' }
];

const SecuritySettingsModal: React.FC<SecuritySettingsModalProps> = ({ isOpen, onClose }) => {
    const { state, dispatch, showToast } = useAppContext();
    const { showConfirm } = useDialog();

    // Initialize with existing protected pages
    const [selectedPages, setSelectedPages] = useState<Page[]>(state.protectedPages || []);

    const handleToggle = (page: Page) => {
        if (selectedPages.includes(page)) {
            setSelectedPages(selectedPages.filter(p => p !== page));
        } else {
            setSelectedPages([...selectedPages, page]);
        }
    };

    const handleSave = async () => {
        dispatch({ type: 'UPDATE_PROTECTED_PAGES', payload: selectedPages });
        showToast('Security settings updated successfully.');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true" onClick={onClose} >
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" aria-hidden="true" />
            <div
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-lg relative z-[101] animate-scale-in flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-6 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
                            <Shield className="w-6 h-6 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold dark:text-white">Security Settings</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Manage granular access control</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                <div className="mb-6 overflow-y-auto custom-scrollbar">
                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800">
                        Select pages that require <strong>PIN / Biometric authentication</strong> to access.
                        Once authenticated, the session remains active until you click "Lock Session" or reload.
                    </p>

                    <div className="space-y-2 p-1">
                        {PROTECTABLE_PAGES.map(page => {
                            const isLocked = selectedPages.includes(page.id);
                            return (
                                <button
                                    key={page.id}
                                    onClick={() => handleToggle(page.id)}
                                    className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${isLocked
                                        ? 'bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800'
                                        : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        {isLocked ? (
                                            <Lock size={18} className="text-red-500" />
                                        ) : (
                                            <Unlock size={18} className="text-slate-400" />
                                        )}
                                        <span className={`font-medium ${isLocked ? 'text-red-700 dark:text-red-300' : 'text-slate-700 dark:text-slate-300'}`}>
                                            {page.label}
                                        </span>
                                    </div>
                                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${isLocked ? 'bg-red-500 border-red-500' : 'border-slate-300 dark:border-slate-600'
                                        }`}>
                                        {isLocked && <Shield size={10} className="text-white" />}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-700 flex-shrink-0">
                    <button
                        onClick={handleSave}
                        className="flex items-center gap-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-6 py-2.5 rounded-xl font-bold hover:opacity-90 transition-opacity"
                    >
                        <Save size={18} />
                        Save Settings
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SecuritySettingsModal;
