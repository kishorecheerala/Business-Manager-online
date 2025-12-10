
import React, { useState } from 'react';
import { User, Building2, Lock, ArrowRight, Cloud, ShieldCheck } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { ProfileData } from '../types';

const OnboardingScreen: React.FC = () => {
    const { dispatch, googleSignIn, showToast } = useAppContext();
    const [businessName, setBusinessName] = useState('');
    const [ownerName, setOwnerName] = useState('');
    const [pin, setPin] = useState('');

    const handleStart = () => {
        if (!businessName.trim() || !ownerName.trim()) {
            showToast("Please enter your business and owner names.", 'error');
            return;
        }

        // Save Profile
        const newProfile: ProfileData = {
            id: 'userProfile',
            name: businessName,
            ownerName: ownerName,
            phone: '',
            address: '',
            gstNumber: '',
            logo: ''
        };
        dispatch({ type: 'SET_PROFILE', payload: newProfile });

        // Save PIN if provided
        if (pin.length === 4) {
            dispatch({ type: 'SET_PIN', payload: pin });
            showToast("Welcome! Your business is set up.", 'success');
        } else if (pin.length > 0) {
            showToast("PIN must be 4 digits. Skipping PIN setup.", 'info');
        } else {
            showToast("Welcome! Your business is set up.", 'success');
        }
    };

    const handleSkip = () => {
        const defaultProfile: ProfileData = {
            id: 'userProfile',
            name: 'My Business',
            ownerName: 'Owner',
            phone: '',
            address: '',
            gstNumber: '',
            logo: ''
        };
        dispatch({ type: 'SET_PROFILE', payload: defaultProfile });
        showToast("Welcome! You can update details later in Settings.", 'info');
    };

    const handleManualImport = () => {
        // Trigger a hidden file input or explain functionality
        showToast("To import a file, please skip setup or use the 'Import' button in the Admin menu after entering dummy details.", 'info');
    };

    return (
        <div className="min-h-screen bg-[#FAFAFD] flex items-center justify-center p-6 animate-fade-in-fast font-sans text-[#0D0D26]">
            <div className="w-full max-w-sm">
                
                {/* Header */}
                <div className="mb-10 text-center">
                    <h1 className="text-2xl font-bold text-[#356899] mb-2">Business Manager</h1>
                    <h2 className="text-3xl font-extrabold mb-3">Welcome 👋</h2>
                    <p className="text-[#AFB0B6] text-sm">
                        Let's set up your business profile to track sales and purchases.
                    </p>
                </div>

                {/* Form */}
                <div className="space-y-5 mb-8">
                    {/* Business Name */}
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Building2 className="text-[#AFB0B6] w-5 h-5" />
                        </div>
                        <input
                            type="text"
                            placeholder="Business Name (e.g. My Shop)"
                            value={businessName}
                            onChange={(e) => setBusinessName(e.target.value)}
                            className="w-full h-14 pl-12 pr-4 rounded-xl bg-white border border-[#E0E0E0] text-[#0D0D26] placeholder-[#AFB0B6] focus:outline-none focus:border-[#356899] focus:ring-1 focus:ring-[#356899] transition-all shadow-sm"
                        />
                    </div>

                    {/* Owner Name */}
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <User className="text-[#AFB0B6] w-5 h-5" />
                        </div>
                        <input
                            type="text"
                            placeholder="Owner Name"
                            value={ownerName}
                            onChange={(e) => setOwnerName(e.target.value)}
                            className="w-full h-14 pl-12 pr-4 rounded-xl bg-white border border-[#E0E0E0] text-[#0D0D26] placeholder-[#AFB0B6] focus:outline-none focus:border-[#356899] focus:ring-1 focus:ring-[#356899] transition-all shadow-sm"
                        />
                    </div>

                    {/* PIN */}
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Lock className="text-[#AFB0B6] w-5 h-5" />
                        </div>
                        <input
                            type="password"
                            inputMode="numeric"
                            maxLength={4}
                            placeholder="Set 4-Digit Security PIN (Optional)"
                            value={pin}
                            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                            className="w-full h-14 pl-12 pr-4 rounded-xl bg-white border border-[#E0E0E0] text-[#0D0D26] placeholder-[#AFB0B6] focus:outline-none focus:border-[#356899] focus:ring-1 focus:ring-[#356899] transition-all shadow-sm"
                        />
                    </div>

                    <button
                        onClick={handleStart}
                        className="w-full h-14 bg-[#356899] hover:bg-[#2B557D] active:scale-[0.98] text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 mt-4"
                    >
                        Start Business <ArrowRight size={20} />
                    </button>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-4 mb-8">
                    <div className="h-px bg-[#AFB0B6] opacity-30 flex-1"></div>
                    <span className="text-xs text-[#AFB0B6] font-medium">Or restore existing data</span>
                    <div className="h-px bg-[#AFB0B6] opacity-30 flex-1"></div>
                </div>

                {/* Social / Restore */}
                <div className="flex justify-center gap-5 mb-8">
                    <button 
                        onClick={() => googleSignIn()}
                        className="w-14 h-14 bg-white rounded-full shadow-md border border-gray-100 flex items-center justify-center hover:scale-110 transition-transform"
                        title="Restore from Google Drive"
                    >
                        {/* Inline SVG for Google Logo to speed up load */}
                        <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                            <path fill="none" d="M0 0h48v48H0z"/>
                        </svg>
                    </button>
                </div>

                {/* Footer */}
                <div className="text-center space-y-4">
                    <p className="text-[#AFB0B6] text-sm">
                        Already have a backup file? <button onClick={handleManualImport} className="text-[#356899] font-medium hover:underline">Info</button>
                    </p>
                    <button onClick={handleSkip} className="text-gray-400 text-sm hover:text-[#356899] transition-colors underline decoration-dotted underline-offset-4">
                        Skip setup & try app
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OnboardingScreen;
