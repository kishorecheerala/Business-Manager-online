import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Card from './Card';
import { Lock, Delete, X, Fingerprint, ScanFace } from 'lucide-react';

interface PinModalProps {
    mode: 'setup' | 'enter';
    onSetPin?: (pin: string) => void;
    onCorrectPin?: () => void;
    correctPin?: string | null;
    onResetRequest?: () => void;
    onCancel?: () => void;
}

const PinModal: React.FC<PinModalProps> = ({ mode, onSetPin, onCorrectPin, correctPin, onResetRequest, onCancel }) => {
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [step, setStep] = useState<'enter' | 'create' | 'confirm'>(mode === 'setup' ? 'create' : 'enter');
    const [error, setError] = useState(false);
    const [shake, setShake] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-focus logic
    useEffect(() => {
        const focusInput = () => inputRef.current?.focus();
        const timeout = setTimeout(focusInput, 100);

        // Keep focus trap
        const interval = setInterval(() => {
            if (document.activeElement !== inputRef.current) {
                // optional: strictly force focus back? might be annoying for user closing modal
                // focusing only on initial load is usually safer
            }
        }, 1000);

        document.body.style.overflow = 'hidden';

        return () => {
            clearTimeout(timeout);
            clearInterval(interval);
            document.body.style.overflow = '';
        };
    }, []);

    // Biometrics Check
    const [biometricsAvailable, setBiometricsAvailable] = useState(false);
    useEffect(() => {
        if (window.PublicKeyCredential &&
            window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
            window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().then(available => {
                setBiometricsAvailable(available);
            });
        }
    }, []);

    const handleBiometricUnlock = async () => {
        try {
            const challenge = new Uint8Array(32);
            window.crypto.getRandomValues(challenge);

            await navigator.credentials.get({
                publicKey: {
                    challenge,
                    timeout: 60000,
                    userVerification: 'required'
                }
            });
            // If we get here, it succeeded (User verified ownership of device)
            onCorrectPin?.();
        } catch (e) {
            console.error("Biometric failed", e);
            triggerError();
        }
    };

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (!/^\d*$/.test(val)) return;
        if (val.length > 4) return;

        setError(false);

        if (step === 'create') {
            setPin(val);
            if (val.length === 4) {
                setTimeout(() => {
                    setStep('confirm');
                    setPin(''); // Clear visual for next step logic, but we need to store the first PIN? 
                    // Wait, we need to store the temporary pin.
                }, 300);
            }
        }
        else if (step === 'confirm') {
            setConfirmPin(val);
            if (val.length === 4) {
                // Validate
                if (val === pin) { // Wait, 'pin' state is cleared above? No, we shouldn't clear it.
                    // Logic fix:
                }
            }
        }
        else if (step === 'enter') {
            setPin(val);
            if (val.length === 4) {
                if (val === correctPin) {
                    onCorrectPin?.();
                } else {
                    triggerError();
                }
            }
        }
    };

    // Correct Logic for State Management
    const [tempPin, setTempPin] = useState(''); // Stores the first PIN during setup

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/\D/g, '').slice(0, 4);

        if (step === 'create') {
            setPin(val);
            if (val.length === 4) {
                setTimeout(() => {
                    setTempPin(val);
                    setPin('');
                    setStep('confirm');
                }, 400);
            }
        } else if (step === 'confirm') {
            setPin(val); // Reuse 'pin' visually
            if (val.length === 4) {
                if (val === tempPin) {
                    onSetPin?.(val);
                } else {
                    triggerError("PINs do not match");
                    setTimeout(() => {
                        setStep('create');
                        setPin('');
                        setTempPin('');
                    }, 1000);
                }
            }
        } else { // enter
            setPin(val);
            if (val.length === 4) {
                if (val === correctPin) {
                    onCorrectPin?.();
                } else {
                    triggerError();
                    setTimeout(() => setPin(''), 500);
                }
            }
        }
    };

    const triggerError = (msg?: string) => {
        setError(true);
        setShake(true);
        setTimeout(() => setShake(false), 500);
    };

    const getTitle = () => {
        if (step === 'create') return 'Create a PIN';
        if (step === 'confirm') return 'Confirm PIN';
        return 'Enter PIN';
    };

    const getSubtitle = () => {
        if (step === 'create') return 'Enter 4 digits to secure your account';
        if (step === 'confirm') return 'Re-enter to verify';
        return error ? 'Incorrect PIN, try again' : 'Enter your 4-digit code';
    };

    return createPortal(
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-lg animate-fade-in" onClick={onCancel} />

            {/* Modal */}
            <Card className={`relative z-10 w-full max-w-sm bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl shadow-2xl border dark:border-slate-700 ring-1 ring-white/10 p-8 flex flex-col items-center gap-8 ${shake ? 'animate-shake' : ''}`}>

                {onCancel && (
                    <button onClick={onCancel} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <X size={24} />
                    </button>
                )}

                {/* Icon */}
                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white transition-colors duration-500 ${error ? 'bg-red-500 shadow-red-500/50' : 'bg-indigo-600 shadow-indigo-600/50'} shadow-lg`}>
                    <Lock size={32} />
                </div>

                {/* Text */}
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{getTitle()}</h2>
                    <p className={`text-sm font-medium transition-colors ${error ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                        {getSubtitle()}
                    </p>
                </div>

                {/* Dots UI */}
                <div className="relative flex gap-6" onClick={() => inputRef.current?.focus()}>
                    {/* The Hidden Input */}
                    <input
                        ref={inputRef}
                        type="password"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={4}
                        value={pin}
                        onChange={handleInputChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        autoFocus
                    />

                    {/* Visual Dots */}
                    {[0, 1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className={`w-4 h-4 rounded-full transition-all duration-300 ${i < pin.length
                                ? `scale-110 ${error ? 'bg-red-500' : 'bg-indigo-600 dark:bg-indigo-400'}`
                                : 'bg-gray-200 dark:bg-slate-700'
                                }`}
                        />
                    ))}
                </div>

                {/* Biometric Button */}
                {step === 'enter' && biometricsAvailable && (
                    <button
                        onClick={handleBiometricUnlock}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                    >
                        <ScanFace size={20} />
                        <span className="text-sm font-semibold">Unlock with FaceID / TouchID</span>
                    </button>
                )}

                {/* Number Pad Visual (Optional, as keyboard is up, but looks good) */}
                <div className="pt-4 text-xs text-gray-400 font-medium">
                    {onResetRequest && step === 'enter' && (
                        <button onClick={onResetRequest} className="hover:text-indigo-500 underline decoration-indigo-500/30">
                            Forgot PIN?
                        </button>
                    )}
                </div>

            </Card >
        </div >,
        document.body
    );
};

export default PinModal;
