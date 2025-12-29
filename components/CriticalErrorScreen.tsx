import React, { useState } from 'react';
import { AlertTriangle, Database, RefreshCw, Trash2, Power } from 'lucide-react';
import Card from './Card';
import Button from './Button';
import { forceEmergencyReset } from '../utils/db';

interface CriticalErrorScreenProps {
    error: any;
}

const CriticalErrorScreen: React.FC<CriticalErrorScreenProps> = ({ error }) => {
    const [isResetting, setIsResetting] = useState(false);

    const handleReset = async () => {
        setIsResetting(true);
        // Add a small delay for UI feedback
        setTimeout(async () => {
            await forceEmergencyReset();
        }, 1000);
    };

    const handleHardRefresh = () => {
        window.location.reload();
    };

    return (
        <div className="fixed inset-0 bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4 z-[9999]">
            <Card className="max-w-md w-full border-l-4 border-red-500 shadow-2xl animate-scale-in">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                        <AlertTriangle className="text-red-500" size={32} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Critical System Error</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Database failed to initialize</p>
                    </div>
                </div>

                <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md mb-6 font-mono text-xs text-red-600 dark:text-red-400 break-words overflow-auto max-h-32">
                    {error?.message || String(error) || "Unknown critical error occurred."}
                </div>

                <div className="space-y-3">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                        The application cannot access the database. This is likely due to browser storage corruption.
                        Please try resetting the database to restore functionality.
                    </p>

                    <Button
                        onClick={handleReset}
                        disabled={isResetting}
                        className={`w-full bg-red-600 hover:bg-red-700 text-white shadow-lg ${isResetting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <Database className={`mr-2 ${isResetting ? 'animate-spin' : ''}`} size={18} />
                        {isResetting ? "Resetting Database..." : "Factory Reset Database"}
                    </Button>

                    <Button
                        onClick={handleHardRefresh}
                        variant="secondary"
                        className="w-full"
                    >
                        <RefreshCw className="mr-2" size={18} />
                        Try Reloading Page
                    </Button>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 text-center">
                    <p className="text-xs text-gray-400">
                        If this persists, please clear your browser cache manually.
                    </p>
                </div>
            </Card>
        </div>
    );
};

export default CriticalErrorScreen;
