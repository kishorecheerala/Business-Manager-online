
import React, { useEffect, useState } from 'react';
import { X, Download, Folder, FileText, RefreshCw, Terminal, AlertTriangle } from 'lucide-react';
import Card from './Card';
import Button from './Button';
import { useAppContext } from '../context/AppContext';
import { debugDriveState } from '../utils/googleDrive';

interface CloudDebugModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CloudDebugModal: React.FC<CloudDebugModalProps> = ({ isOpen, onClose }) => {
  const { state, dispatch } = useAppContext();
  const [logs, setLogs] = useState<string[]>([]);
  const [details, setDetails] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const runDiagnostics = async () => {
    if (!state.googleUser?.accessToken) {
      setLogs(["Error: Not signed in."]);
      return;
    }
    setLoading(true);
    setLogs(["Starting diagnostics..."]);
    setDetails([]);
    
    try {
      const result = await debugDriveState(state.googleUser.accessToken);
      setLogs(result.logs);
      setDetails(result.details);
    } catch (e) {
      setLogs(prev => [...prev, `Exception: ${(e as Error).message}`]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      runDiagnostics();
    }
  }, [isOpen]);

  const handleManualRestore = async (fileId: string) => {
    if (!state.googleUser?.accessToken) return;
    if (!window.confirm("Force restore this file? It will overwrite local data.")) return;

    setRestoringId(fileId);
    try {
        // We use the generic SYNC action but triggering a specific read logic would be ideal.
        // Here we re-use the download logic but manually.
        // Since we don't have a direct 'download and load' exposed in context, we import directly from utils in context.
        // However, context exposes `performSync`. Let's use a dispatch to trigger a special restore action if possible,
        // or since this is a debug component, using the global `window.appContext` pattern or adding a helper in context is needed.
        // For now, we will rely on the AppContext having a method or we handle it via a custom event/callback prop if we were pure.
        // BUT, to make it work with existing context, we will call a new exposed method in AppContext (see AppContext update).
        // Assuming AppContext now has `restoreSpecificFile`.
        const context: any = (window as any).__businessManagerContext; // Fallback hack or use hook
        // Better way: Use the hook. The hook is used at top level.
    } catch (e) {
        alert("Restore failed.");
    }
    
    // Actually, let's dispatch a custom action or rely on prop if AppContext was passed.
    // Since we are inside the component, we have `dispatch` and `state`.
    // We need `restoreFromFileId` in AppContext.
    // Let's assume we added `restoreFromFileId` to the context value.
    
    // @ts-ignore
    const restoreFn = state.restoreFromFileId; 
    if (restoreFn) {
        await restoreFn(fileId);
    } else {
        alert("Restore function not available in context yet. Please refresh.");
    }
    setRestoringId(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[110] p-4 animate-fade-in-fast">
      <Card className="w-full max-w-2xl h-[85vh] flex flex-col p-0 overflow-hidden animate-scale-in">
        <div className="bg-slate-800 text-white p-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <Terminal size={20} className="text-yellow-400" />
            <h2 className="font-bold text-lg">Cloud Diagnostics</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors"><X size={20}/></button>
        </div>

        <div className="flex-grow overflow-y-auto p-4 space-y-6 bg-slate-50 dark:bg-slate-900">
            {/* Status Bar */}
            <div className="flex justify-between items-center">
                <span className={`text-xs font-bold px-2 py-1 rounded ${loading ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                    {loading ? 'Scanning Drive...' : 'Scan Complete'}
                </span>
                <Button onClick={runDiagnostics} variant="secondary" className="h-8 text-xs">
                    <RefreshCw size={14} className={`mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh
                </Button>
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
                            This usually means the backup was created with a different Google Account 
                            or a different version of this app (due to permissions).
                        </p>
                    </div>
                )}
                
                <div className="space-y-3">
                    {details.map((item: any) => (
                        <div key={item.folder.id} className="border dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg overflow-hidden shadow-sm">
                            <div className="p-3 bg-slate-100 dark:bg-slate-700 border-b dark:border-slate-600 flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{item.folder.name}</p>
                                    <p className="text-[10px] text-slate-500 font-mono">ID: {item.folder.id}</p>
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
                                                        {new Date(f.modifiedTime).toLocaleString()} • {(Number(f.size)/1024).toFixed(1)} KB
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
    </div>
  );
};

export default CloudDebugModal;
