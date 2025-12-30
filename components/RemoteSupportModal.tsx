import React, { useState, useEffect } from 'react';
import { X, Copy, Download, Upload, AlertCircle, CheckCircle, Code, HelpCircle, Monitor, Smartphone } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { generateDiagnostics, uploadDiagnostics } from '../utils/adminNotifications';
import Button from './Button';

interface RemoteSupportModalProps {
    isOpen: boolean;
    onClose: () => void;
    supportCode?: string;
    troubleshootingSteps?: string[];
}

const RemoteSupportModal: React.FC<RemoteSupportModalProps> = ({
    isOpen,
    onClose,
    supportCode: initialSupportCode,
    troubleshootingSteps = []
}) => {
    const { showToast } = useData();
    const { authState } = useAuth();
    const [supportCode, setSupportCode] = useState(initialSupportCode || '');
    const [diagnostics, setDiagnostics] = useState<any>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);

    useEffect(() => {
        if (isOpen && !supportCode) {
            // Generate a unique support code
            const code = generateSupportCode();
            setSupportCode(code);
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && supportCode) {
            // Generate diagnostics
            const diag = generateDiagnostics(supportCode);
            setDiagnostics(diag);
        }
    }, [isOpen, supportCode]);

    if (!isOpen) return null;

    const generateSupportCode = (): string => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        const segments = 3;
        const segmentLength = 3;

        const code = Array.from({ length: segments }, () =>
            Array.from({ length: segmentLength }, () =>
                chars.charAt(Math.floor(Math.random() * chars.length))
            ).join('')
        ).join('-');

        return code;
    };

    const handleCopyCode = () => {
        navigator.clipboard.writeText(supportCode);
        showToast('Support code copied!', 'success');
    };

    const handleDownloadDiagnostics = () => {
        if (!diagnostics) return;

        const blob = new Blob([JSON.stringify(diagnostics, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `diagnostics_${supportCode}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Diagnostics downloaded', 'success');
    };

    const handleUploadDiagnostics = async () => {
        if (!authState.googleUser?.accessToken || !diagnostics) {
            showToast('Please sign in with Google first', 'error');
            return;
        }

        setIsUploading(true);
        try {
            const fileId = await uploadDiagnostics(
                authState.googleUser.accessToken,
                supportCode,
                diagnostics
            );

            if (fileId) {
                setUploadSuccess(true);
                showToast('Diagnostics uploaded to your Google Drive!', 'success');
            } else {
                showToast('Failed to upload diagnostics', 'error');
            }
        } catch (error) {
            console.error('Upload failed:', error);
            showToast('Failed to upload diagnostics', 'error');
        } finally {
            setIsUploading(false);
        }
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 KB';
        const k = 1024;
        return `${Math.round(bytes / k)} KB`;
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-primary flex items-center gap-2">
                            <HelpCircle size={24} />
                            Remote Support
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Share this information with the developer for assistance
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Support Code */}
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-6 border border-purple-200 dark:border-purple-800">
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                            Your Support Code
                        </label>
                        <div className="flex items-center gap-3">
                            <div className="flex-1 bg-white dark:bg-slate-900 rounded-lg px-4 py-3 font-mono text-2xl font-bold text-center tracking-wider text-purple-600 dark:text-purple-400 border-2 border-purple-300 dark:border-purple-700">
                                {supportCode}
                            </div>
                            <Button onClick={handleCopyCode} variant="secondary">
                                <Copy size={18} />
                            </Button>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-3">
                            📞 Share this code with the developer (cheeralakishore@gmail.com) when requesting support
                        </p>
                    </div>

                    {/* Troubleshooting Steps */}
                    {troubleshootingSteps.length > 0 && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                            <h3 className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-3 flex items-center gap-2">
                                <AlertCircle size={16} />
                                Troubleshooting Steps from Developer
                            </h3>
                            <ol className="list-decimal list-inside space-y-2 text-sm text-blue-700 dark:text-blue-400">
                                {troubleshootingSteps.map((step, index) => (
                                    <li key={index}>{step}</li>
                                ))}
                            </ol>
                        </div>
                    )}

                    {/* System Information */}
                    {diagnostics && (
                        <div>
                            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                <Monitor size={16} />
                                System Information
                            </h3>
                            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4 space-y-3 text-sm">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <span className="text-gray-500 dark:text-gray-400">Browser:</span>
                                        <p className="font-medium text-gray-900 dark:text-white truncate">
                                            {diagnostics.system.userAgent.split(' ')[0]}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 dark:text-gray-400">Platform:</span>
                                        <p className="font-medium text-gray-900 dark:text-white">
                                            {diagnostics.system.platform}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 dark:text-gray-400">Screen:</span>
                                        <p className="font-medium text-gray-900 dark:text-white">
                                            {diagnostics.system.screenResolution}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 dark:text-gray-400">Viewport:</span>
                                        <p className="font-medium text-gray-900 dark:text-white">
                                            {diagnostics.system.viewport}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 dark:text-gray-400">Online:</span>
                                        <p className="font-medium text-gray-900 dark:text-white">
                                            {diagnostics.system.online ? '✅ Yes' : '❌ No'}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 dark:text-gray-400">Standalone:</span>
                                        <p className="font-medium text-gray-900 dark:text-white">
                                            {diagnostics.app.isStandalone ? '✅ PWA' : '❌ Browser'}
                                        </p>
                                    </div>
                                </div>

                                <div className="pt-3 border-t border-gray-200 dark:border-slate-600">
                                    <span className="text-gray-500 dark:text-gray-400">Storage Used:</span>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                        {formatBytes(diagnostics.storage.localStorageSize)}
                                    </p>
                                </div>

                                {diagnostics.errors.length > 0 && (
                                    <div className="pt-3 border-t border-gray-200 dark:border-slate-600">
                                        <span className="text-red-600 dark:text-red-400 font-medium flex items-center gap-1">
                                            <AlertCircle size={14} />
                                            Recent Errors: {diagnostics.errors.length}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                            Share Diagnostics
                        </h3>

                        <div className="grid grid-cols-2 gap-3">
                            <Button
                                onClick={handleDownloadDiagnostics}
                                variant="secondary"
                                className="w-full"
                            >
                                <Download size={16} className="mr-2" />
                                Download JSON
                            </Button>

                            <Button
                                onClick={handleUploadDiagnostics}
                                disabled={isUploading || !authState.googleUser || uploadSuccess}
                                className="w-full"
                            >
                                {uploadSuccess ? (
                                    <>
                                        <CheckCircle size={16} className="mr-2" />
                                        Uploaded
                                    </>
                                ) : isUploading ? (
                                    <>
                                        <Upload size={16} className="mr-2 animate-bounce" />
                                        Uploading...
                                    </>
                                ) : (
                                    <>
                                        <Upload size={16} className="mr-2" />
                                        Upload to Drive
                                    </>
                                )}
                            </Button>
                        </div>

                        {!authState.googleUser && (
                            <p className="text-xs text-orange-600 dark:text-orange-400 text-center">
                                ⚠️ Sign in with Google to upload diagnostics directly
                            </p>
                        )}
                    </div>

                    {/* Privacy Notice */}
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                        <div className="flex items-start gap-3">
                            <CheckCircle size={20} className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                            <div className="text-xs text-green-800 dark:text-green-300 space-y-1">
                                <p className="font-bold">Privacy Protected</p>
                                <p>
                                    Diagnostics contain only technical information (browser version, screen size, errors).
                                    No business data, customer information, or sales records are included.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-gray-50 dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700 px-6 py-4">
                    <Button onClick={onClose} variant="secondary" className="w-full">
                        Close
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default RemoteSupportModal;
