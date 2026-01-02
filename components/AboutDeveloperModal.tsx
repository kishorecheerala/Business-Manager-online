import React, { useEffect, useState } from 'react';
import { X, ShieldCheck, User, Mail, Code } from 'lucide-react';
import Card from './Card';
import { getDeveloperInfo } from '../utils/security';

interface AboutDeveloperModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const AboutDeveloperModal: React.FC<AboutDeveloperModalProps> = ({ isOpen, onClose }) => {
    const [info, setInfo] = useState<{ name: string; role: string; contact: string } | null>(null);

    useEffect(() => {
        if (isOpen) {
            setInfo(getDeveloperInfo());
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="absolute inset-0" onClick={onClose}></div>
            <Card className="w-full max-w-md relative z-10 animate-scale-in border-t-4 border-emerald-500 shadow-2xl">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                >
                    <X size={20} className="text-gray-500" />
                </button>

                <div className="flex flex-col items-center text-center mb-6">
                    <div className="p-4 bg-emerald-100 dark:bg-emerald-900/30 rounded-full mb-4">
                        <ShieldCheck size={48} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">About Developer</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        Verified Signature
                    </p>
                </div>

                <div className="space-y-4">
                    {info ? (
                        <>
                            <div className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700">
                                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                                    <Code size={20} className="text-purple-600 dark:text-purple-400" />
                                </div>
                                <div className="text-left">
                                    <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Designed and Developed by</p>
                                    <p className="font-semibold text-gray-800 dark:text-white">{info.name}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700">
                                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                                    <Mail size={20} className="text-orange-600 dark:text-orange-400" />
                                </div>
                                <div className="text-left">
                                    <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Contact</p>
                                    <p className="font-semibold text-gray-800 dark:text-white">{info.contact}</p>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="text-red-500 text-center py-4 bg-red-50 dark:bg-red-900/10 rounded-xl">
                            Unable to verify developer signature.
                        </div>
                    )}
                </div>

                <div className="mt-8 pt-4 border-t border-gray-100 dark:border-slate-700 text-center">
                    <p className="text-[10px] text-gray-400">
                        This application is protected by a developer integrity check.
                    </p>
                </div>
            </Card>
        </div>
    );
};

export default AboutDeveloperModal;
