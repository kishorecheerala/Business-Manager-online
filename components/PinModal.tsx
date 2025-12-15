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
    const [confirmPin, setConfirmPin] = useState(''); // Not actively used but kept to avoid breakage

    // Correct Logic for State Management
    const [tempPin, setTempPin] = useState(''); // Stores the first PIN during setup
    const [finalPin, setFinalPin] = useState(''); // Stores PIN while waiting for biometric setup

    // Biometric Registration
    const [step, setStep] = useState<'enter' | 'create' | 'confirm' | 'biometric-setup'>(mode === 'setup' ? 'create' : 'enter');
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

    const registerBiometric = async () => {
        if (!biometricsAvailable) return false;
        try {
            const challenge = new Uint8Array(32);
            window.crypto.getRandomValues(challenge);

            const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
                challenge,
                rp: {
                    name: "Business Manager",
                    id: window.location.hostname,
                },
                user: {
                    id: Uint8Array.from("USER_ID", c => c.charCodeAt(0)),
                    name: "user@local",
                    displayName: "Local User",
                },
                pubKeyCredParams: [{ alg: -7, type: "public-key" }, { alg: -257, type: "public-key" }],
                authenticatorSelection: {
                    authenticatorAttachment: "platform",
                    userVerification: "required",
                    requireResidentKey: false,
                },
                timeout: 60000,
                attestation: "none"
            };

            const credential = await navigator.credentials.create({
                publicKey: publicKeyCredentialCreationOptions
            });

            if (credential) {
                localStorage.setItem('biometric_enabled', 'true');
                return true;
            }
            return false;
        } catch (e) {
            console.error("Registration failed", e);
            return false;
        }
    };

    const handleBiometricUnlock = async () => {
        try {
            const challenge = new Uint8Array(32);
            window.crypto.getRandomValues(challenge);

            await navigator.credentials.get({
                publicKey: {
                    challenge,
                    timeout: 60000,
                    userVerification: 'required',
                    rpId: window.location.hostname
                }
            });
            // If we get here, it succeeded
            onCorrectPin?.();
        } catch (e) {
            console.error("Biometric failed", e);
            triggerError();
        }
    };

    // Auto-trigger Biometrics
    useEffect(() => {
        if (mode === 'enter' && step === 'enter' && biometricsAvailable) {
            // Check if user has enabled it previously
            const enabled = localStorage.getItem('biometric_enabled') === 'true';
            if (enabled) {
                // Small delay to ensure modal execution is ready
                const timer = setTimeout(() => {
                    handleBiometricUnlock();
                }, 500);
                return () => clearTimeout(timer);
            }
        }
    }, [mode, step, biometricsAvailable]);

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        // ... (unused legacy handler)
    };

    // Correct Logic for State Management (Moved logic to hooks, this block is just methods now)

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
            setPin(val);
            if (val.length === 4) {
                if (val === tempPin) {
                    // Check for biometrics before finishing
                    if (biometricsAvailable) {
                        setFinalPin(val);
                        setStep('biometric-setup');
                        setPin('');
                    } else {
                        onSetPin?.(val);
                    }
                } else {
                    triggerError("PINs do not match");
                    setTimeout(() => {
                        setStep('create');
                        setPin('');
                        setTempPin('');
                    }, 1000);
                }
            }
        } else if (step === 'biometric-setup') {
            // No input handling here
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

    const handleBiometricSetup = async (enable: boolean) => {
        if (enable) {
            const success = await registerBiometric();
            if (success) {
                // Toast handled by parent or implied? PinModal doesn't have showToast. 
                // Just proceed.
            }
        }
        onSetPin?.(finalPin);
    };

    const triggerError = (msg?: string) => {
        setError(true);
        setShake(true);
        setTimeout(() => setShake(false), 500);
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
