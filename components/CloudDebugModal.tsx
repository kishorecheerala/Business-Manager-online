import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, Folder, FileText, RefreshCw, Terminal, AlertTriangle, LogIn, Settings } from 'lucide-react';
import Card from './Card';
import Button from './Button';
import { useAppContext } from '../context/AppContext';

import { debugDriveState, getFolderById, createFolder } from '../utils/googleDrive';
import { useDialog } from '../context/DialogContext';
import * as db from '../utils/db';

interface CloudDebugModalProps {
    isOpen: boolean;
    onClose: () => void;
    onOpenAPIConfig?: () => void;
}

const CloudDebugModal: React.FC<CloudDebugModalProps> = ({ isOpen, onClose, onOpenAPIConfig }) => {
    const { state, dispatch, googleSignIn, showToast } = useAppContext();
    const { showConfirm, showAlert } = useDialog();
    const [logs, setLogs] = useState<string[]>([]);
    const [details, setDetails] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [restoringId, setRestoringId] = useState<string | null>(null);
    const [manualId, setManualId] = useState('');

    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    const runDiagnostics = async () => {
        if (!state.googleUser?.accessToken) {
            setLogs(["Error: Not signed in."]);
            return;
        }
        setLoading(true);
        setLogs(prev => ["Starting diagnostics...", ...prev]);
        setDetails([]);

        try {
            const result = await debugDriveState(state.googleUser.accessToken);
            setLogs(result.logs);
            setDetails(result.details);
        } catch (e) {
            const msg = (e as Error).message;
            setLogs(prev => [...prev, `❌ EXCEPTION: ${msg}`]);
            if (msg.includes('401') || msg.includes('403')) {
                setLogs(prev => ["⚠️ Session Expired or Client ID Changed.", "👉 ACTION REQUIRED: Click the orange 'Re-Auth' button above.", ...prev]);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && state.googleUser) {
            runDiagnostics();
        }
    }, [isOpen]);

    const handleCheckFolder = async () => {
        if (!manualId.trim() || !state.googleUser?.accessToken) return;
        setLogs(prev => [`checking ID: ${manualId}...`, ...prev]);

        try {
            const folder = await getFolderById(state.googleUser.accessToken, manualId.trim());
            if (folder) {
                setLogs(prev => [`✅ FOUND: ${folder.name} (Created: ${new Date(folder.createdTime).toLocaleString()})`, ...prev]);
                // Automatically add to details to "reveal" it
                setDetails(prev => [{ folder, files: [] }, ...prev]);
            } else {
                setLogs(prev => [`❌ NOT FOUND (or Access Denied). This app only sees folders it created.`, ...prev]);
            }
        } catch (e) {
            setLogs(prev => [`❌ Error checking ID.`, ...prev]);
        }
    };

    const handleCreateFolder = async () => {
        if (!state.googleUser?.accessToken) return;
        const confirmed = await showConfirm("Create a new 'BusinessManager_AppData' folder? You will need to move your backup files into it.", { variant: 'info', confirmText: 'Create Folder' });
        if (!confirmed) return;

        setLogs(prev => ["Creating new app folder...", ...prev]);
        try {
            const newId = await createFolder(state.googleUser.accessToken);
            if (newId) {
                setLogs(prev => [`✅ Folder Created! ID: ${newId}`, "ACTION REQUIRED: Move your 'BusinessManager_Core_...' files into this new folder in Google Drive.", ...prev]);
                runDiagnostics(); // Refresh list
            } else {
                setLogs(prev => ["❌ Failed to create folder.", ...prev]);
            }
        } catch (e) {
            setLogs(prev => [`❌ Exception creating folder: ${(e as Error).message}`, ...prev]);
        }
    };

    const handleLocalRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const confirmed = await showConfirm(`Restore data from '${file.name}'? This will REPLACE all current data.`, { variant: 'danger', confirmText: 'Restore & Reload' });
        if (!confirmed) {
            if (e.target) e.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                setLogs(prev => ["Restoring from local definition...", ...prev]);
                await db.importData(json);
                setLogs(prev => ["✅ Restore complete. Reloading...", ...prev]);
                setTimeout(() => window.location.reload(), 1000);
            } catch (err) {
                setLogs(prev => [`❌ Restore Failed: Invalid JSON file.`, ...prev]);
                showToast("Invalid Backup File", 'error');
            }
        };
        reader.readAsText(file);
    };

    const handleManualRestore = async (fileId: string) => {
        if (!state.googleUser?.accessToken) return;
        const confirmed = await showConfirm("Force restore this file? It will overwrite local data.", { variant: 'danger', confirmText: 'Restore' });
        if (!confirmed) return;

        setRestoringId(fileId);
        try {
            // @ts-ignore
            const restoreFn = state.restoreFromFileId;
            if (restoreFn) {
                await restoreFn(fileId);
            } else {
                showToast("Restore function not available in context yet. Please refresh.", 'error');
            }
        } catch (e) {
            showToast("Restore failed.", 'error');
        }
        setRestoringId(null);
        onClose();
    };

    const handleForceAuth = () => {
        googleSignIn({ forceConsent: true });
        onClose();
    };

    if (!isOpen) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[80] flex items-center justify-center p-4"
        >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in-fast" onClick={onClose} />
            <Card className="relative z-10 w-full max-w-2xl h-full flex flex-col p-0 overflow-hidden animate-scale-in">
                <div className="bg-slate-800 text-white p-4 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-2">
                        <Terminal size={20} className="text-yellow-400" />
                        <h2 className="font-bold text-lg">Cloud Diagnostics</h2>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors"><X size={20} /></button>
                </div>

                <div className="flex-grow overflow-y-auto p-4 space-y-6 bg-slate-50 dark:bg-slate-900">
                    {/* Status Bar */}
                    {/* Status Bar */}
                    <div className="flex flex-col gap-2">
                        {/* Upper Bar actions */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <span className={`text-xs font-bold px-2 py-1 rounded ${loading ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                    {loading ? 'Scanning...' : 'Idle'}
                                </span>
                                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded px-1">
                                    <input
                                        value={manualId}
                                        onChange={(e) => setManualId(e.target.value)}
                                        placeholder="Paste Folder ID to test..."
                                        className="h-7 text-xs bg-transparent border-none focus:ring-0 w-32 sm:w-40"
                                    />
                                    <Button onClick={handleCheckFolder} variant="secondary" className="h-6 text-[10px] px-2" disabled={!manualId}>Check</Button>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <Button onClick={runDiagnostics} variant="primary" className="h-8 text-xs">
                                    <RefreshCw size={14} className={`mr-1 ${loading ? 'animate-spin' : ''}`} /> Scan
                                </Button>
                                <Button onClick={handleForceAuth} variant="secondary" className="h-8 text-xs bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-200">
                                    <LogIn size={14} className="mr-1" /> Re-Auth
                                </Button>
                            </div>
                        </div>

                        {/* Lower Bar Links */}
                        <div className="flex justify-end gap-2">
                            <Button onClick={onOpenAPIConfig} variant="secondary" className="h-7 text-xs text-purple-600 hover:bg-purple-50">
                                <Settings size={12} className="mr-1" /> Project Code
                            </Button>
                            <Button onClick={() => window.open('https://console.cloud.google.com/apis/credentials', '_blank')} variant="secondary" className="h-7 text-xs text-slate-600 hover:bg-slate-50">
                                <Terminal size={12} className="mr-1" /> Console
                            </Button>
                        </div>
                    </div>

                    {/* Found Data Section */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                            <Folder size={16} /> Found Backup Folders ({details.length})
                        </h3>
                        {details.length === 0 && !loading && (
                            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-center">
                                <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                                <p className="text-sm text-red-700 dark:text-red-300 font-bold">No Backup Folders Found</p>
                                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                    The app cannot see any folder named 'BusinessManager_AppData'.
                                </p>
                                <div className="mt-3">
                                    <Button onClick={handleCreateFolder} className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 py-2 h-auto">
                                        <Folder size={14} className="mr-2" /> Create New App Folder
                                    </Button>
                                    <p className="text-[10px] text-gray-500 mt-2">
                                        After creating, move your backup files into the new folder <br />
                                        so the app can see them.
                                    </p>
                                </div>

                                <div className="mt-4 pt-4 border-t border-red-200 dark:border-red-800">
                                    <p className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-2">OR: Bypass Drive issues entirely</p>
                                    <label className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs px-4 py-2 rounded cursor-pointer inline-flex items-center">
                                        <Download size={14} className="mr-2" /> Upload Backup File (.json)
                                        <input type="file" accept=".json" className="hidden" onChange={handleLocalRestore} />
                                    </label>
                                </div>
                            </div>
                        )}

                        <div className="space-y-3">
                            {details.map((item: any) => (
                                <div key={item.folder.id} className="border dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg overflow-hidden shadow-sm">
                                    <div className="p-3 bg-slate-100 dark:bg-slate-700 border-b dark:border-slate-600 flex justify-between items-center">
                                        <div>
                                            <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{item.folder.name}</p>
                                            <div className="text-[10px] text-slate-500 font-mono space-y-0.5 mt-1">
                                                <p>ID: {item.folder.id}</p>
                                                <p>Created: {new Date(item.folder.createdTime).toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <span className="text-xs bg-slate-200 dark:bg-slate-600 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300">
                                            {item.files.length} files
                                        </span>
                                    </div>
                                    <div className="divide-y dark:divide-slate-700">
                                        {item.files.length === 0 ? (
                                            <p className="p-3 text-xs text-gray-400 italic">Empty folder.</p>
                                        ) : (
                                            item.files.map((f: any) => (
                                                <div key={f.id} className="p-3 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                        <FileText size={18} className="text-blue-500 flex-shrink-0" />
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{f.name}</p>
                                                            <p className="text-[10px] text-gray-500">
                                                                {new Date(f.modifiedTime).toLocaleString()} • {(Number(f.size) / 1024).toFixed(1)} KB
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        onClick={() => handleManualRestore(f.id)}
                                                        className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700"
                                                        disabled={restoringId === f.id}
                                                    >
                                                        {restoringId === f.id ? 'Restoring...' : 'Restore'}
                                                    </Button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Logs Section */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Debug Log</h3>
                        <div className="bg-slate-900 text-green-400 font-mono text-xs p-3 rounded-lg h-40 overflow-y-auto border border-slate-700">
                            {logs.map((line, i) => (
                                <div key={i} className="whitespace-pre-wrap mb-1">{line}</div>
                            ))}
                            {logs.length === 0 && <span className="opacity-50">Waiting to start...</span>}
                        </div>
                    </div>
                </div>
            </Card>
        </div>,
        document.body
    );
};

export default CloudDebugModal;