import { useState, useEffect, useRef } from 'react';
import { hashPin, verifyPin } from '../utils/encryption';

interface UsePinSecurityProps {
    mode: 'setup' | 'enter';
    correctPin?: string | null;
    onSetPin?: (pin: string) => void;
    onCorrectPin?: () => void;
}

export const usePinSecurity = ({ mode, correctPin, onSetPin, onCorrectPin }: UsePinSecurityProps) => {
    const [pin, setPin] = useState('');
    const [step, setStep] = useState<'enter' | 'create' | 'confirm' | 'biometric-setup'>(mode === 'setup' ? 'create' : 'enter');
    const [error, setError] = useState(false);
    const [shake, setShake] = useState(false);

    // Setup state
    const [tempPin, setTempPin] = useState('');
    const [finalPin, setFinalPin] = useState('');

    const [biometricsAvailable, setBiometricsAvailable] = useState(false);

    useEffect(() => {
        if (window.PublicKeyCredential &&
            window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
            window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().then(available => {
                setBiometricsAvailable(available);
            });
        }
    }, []);

    const triggerError = (msg?: string) => {
        setError(true);
        setShake(true);
        setTimeout(() => setShake(false), 500);
    };

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
            const enabled = localStorage.getItem('biometric_enabled') === 'true';
            if (enabled) {
                const timer = setTimeout(() => {
                    handleBiometricUnlock();
                }, 500);
                return () => clearTimeout(timer);
            }
        }
    }, [mode, step, biometricsAvailable]);

    const handleInputChange = async (val: string) => {
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
                    if (biometricsAvailable) {
                        setFinalPin(val);
                        setStep('biometric-setup');
                        setPin('');
                    } else {
                        const hashed = await hashPin(val);
                        onSetPin?.(hashed);
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
                const isCorrect = await verifyPin(val, correctPin || '');
                if (isCorrect) {
                    // Auto-migrate legacy PINs (length 4 -> Hash)
                    if (correctPin && correctPin.length === 4 && onSetPin) {
                        const hashed = await hashPin(val);
                        onSetPin(hashed);
                    }
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
            await registerBiometric();
        }
        const hashed = await hashPin(finalPin);
        onSetPin?.(hashed);
    };

    return {
        pin,
        step,
        error,
        shake,
        biometricsAvailable,
        handleInputChange,
        handleBiometricSetup,
        handleBiometricUnlock,
        setStep,
        setPin,
        setTempPin // helper if needed
    };
};
