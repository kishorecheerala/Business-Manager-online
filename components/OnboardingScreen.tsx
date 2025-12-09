
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

    return (
        <div className="min-h-screen bg-[#FAFAFD] flex items-center justify-center p-6 animate-fade-in-fast font-sans text-[#0D0D26]">
            <div className="w-full max-w-sm">
                
                {/* Header */}
                <div className="mb-10 text-center">
                    <h1 className="text-2xl font-bold text-[#356899] mb-2">Saree Manager</h1>
                    <h2 className="text-3xl font-extrabold mb-3">Welcome 👋</h2>
                    <p className="text-[#AFB0B6] text-sm">
                        Let's set up your business profile to track sales and purchases.
                    </p>
                </div>

                {/* Form */}
                <div className="space-y-5 mb-8">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Building2 className="text-[#AFB0B6] w-5 h-5" />
                        </div>
                        <input
                            type="text"
                            placeholder="Business Name (e.g. My Saree Shop)"
                            value={businessName}
                            onChange={(e) => setBusinessName(e.target.value)}
                            className="w-full h-14 pl-12 pr-4 rounded-xl bg-white border border-[#E0E0E0] text-[#0D0D26] placeholder-[#AFB0B6] focus:outline-none focus:border-[#356899] focus:ring-1 focus:ring-[#356899] transition-all shadow-sm"
                        />
                    </div>

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
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
                    </button>
                </div>

                {/* Footer */}
                <div className="text-center">
                    <p className="text-[#AFB0B6] text-sm">
                        Already have a file? <button className="text-[#356899] font-medium hover:underline">Import JSON</button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default OnboardingScreen;
