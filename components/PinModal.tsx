import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Card from './Card';
import { Lock, Delete, X, Fingerprint, ScanFace } from 'lucide-react';
import { usePinSecurity } from '../hooks/usePinSecurity';

interface PinModalProps {
    mode: 'setup' | 'enter';
    onSetPin?: (pin: string) => void;
    onCorrectPin?: () => void;
    correctPin?: string | null;
    onResetRequest?: () => void;
    onCancel?: () => void;
}

const PinModal: React.FC<PinModalProps> = ({ mode, onSetPin, onCorrectPin, correctPin, onResetRequest, onCancel }) => {
    const {
        pin,
        step,
        error,
        shake,
        biometricsAvailable,
        handleInputChange: onPinInput,
        handleBiometricSetup,
        handleBiometricUnlock
    } = usePinSecurity({ mode, correctPin, onSetPin, onCorrectPin });

    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-focus logic
    useEffect(() => {
        const focusInput = () => inputRef.current?.focus();
        const timeout = setTimeout(focusInput, 100);

        // Keep focus trap
        const interval = setInterval(() => {
            if (document.activeElement !== inputRef.current) {
                // optional
            }
        }, 1000);

        document.body.style.overflow = 'hidden';

        return () => {
            clearTimeout(timeout);
            clearInterval(interval);
            document.body.style.overflow = '';
        };
    }, []);

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/\D/g, '').slice(0, 4);
        onPinInput(val);
    };

    const getTitle = () => {
        if (step === 'create') return 'Create a PIN';
        if (step === 'confirm') return 'Confirm PIN';
        if (step === 'biometric-setup') return 'Enable Biometrics?';
        return 'Enter PIN';
    };

    const getSubtitle = () => {
        if (step === 'create') return 'Enter 4 digits to secure your account';
        if (step === 'confirm') return 'Re-enter to verify';
        if (step === 'biometric-setup') return 'Use Fingerprint/FaceID for faster access';
        return error ? 'Incorrect PIN, try again' : 'Enter your 4-digit code';
    };

    return createPortal(
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-lg animate-fade-in" onClick={step === 'enter' ? onCancel : undefined} />

            {/* Modal */}
            <Card className={`relative z-10 w-full max-w-sm bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl shadow-2xl border dark:border-slate-700 ring-1 ring-white/10 p-8 flex flex-col items-center gap-8 ${shake ? 'animate-shake' : ''}`}>

                {onCancel && step === 'enter' && (
                    <button onClick={onCancel} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <X size={24} />
                    </button>
                )}

                {/* Icon */}
                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white transition-colors duration-500 ${error ? 'bg-red-500 shadow-red-500/50' : 'bg-indigo-600 shadow-indigo-600/50'} shadow-lg`}>
                    {step === 'biometric-setup' ? <Fingerprint size={32} /> : <Lock size={32} />}
                </div>

                {/* Text */}
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{getTitle()}</h2>
                    <p className={`text-sm font-medium transition-colors ${error ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                        {getSubtitle()}
                    </p>
                </div>

                {/* UI Content based on Step */}
                {step === 'biometric-setup' ? (
                    <div className="flex flex-col gap-3 w-full animate-fade-in-up">
                        <button
                            onClick={() => handleBiometricSetup(true)}
                            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2"
                        >
                            <Fingerprint size={20} /> Enable
                        </button>
                        <button
                            onClick={() => handleBiometricSetup(false)}
                            className="w-full py-3 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                        >
                            Skip for now
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Visible Text Input Box */}
                        <div className="w-full max-w-[200px]">
                            <input
                                ref={inputRef}
                                type="password"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={4}
                                value={pin}
                                onChange={handleInput}
                                placeholder="••••"
                                className="w-full text-center text-4xl font-bold tracking-[1em] px-4 py-4 bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-600 rounded-xl focus:border-indigo-600 dark:focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all"
                                style={{
                                    letterSpacing: '0.5em',
                                    paddingLeft: '1.5rem'
                                }}
                                autoFocus
                            />
                            <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-2">4-digit PIN</p>
                        </div>

                        {/* Forgot PIN / Reset Link */}
                        {step === 'enter' && onResetRequest && (
                            <button
                                onClick={onResetRequest}
                                className="mt-2 mb-4 text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors font-medium flex items-center gap-1"
                            >
                                <Delete size={12} /> Reset Passcode
                            </button>
                        )}

                        {/* Biometric Button (Enter Mode) */}
                        {step === 'enter' && biometricsAvailable && (
                            <button
                                onClick={handleBiometricUnlock}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                            >
                                <ScanFace size={20} />
                                <span className="text-sm font-semibold">Unlock with FaceID / TouchID</span>
                            </button>
                        )}
                    </>
                )}

            </Card >
        </div >,
        document.body
    );
};

export default PinModal;
