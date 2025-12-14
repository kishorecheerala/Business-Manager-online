
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Layout, Smartphone, CreditCard, Bell, Maximize2, Minimize2, ArrowUp, ArrowDown, Type, Navigation } from 'lucide-react';
import Card from './Card';
import Button from './Button';
import { useAppContext } from '../context/AppContext';
import { AppMetadataUIPreferences, AppMetadataDashboardConfig } from '../types';
import { compressImage } from '../utils/imageUtils';

interface UISettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const fonts = [
    { name: 'Inter', family: 'Inter, sans-serif' },
    { name: 'Poppins', family: 'Poppins, sans-serif' },
    { name: 'Roboto', family: 'Roboto, sans-serif' },
    { name: 'Open Sans', family: '"Open Sans", sans-serif' },
    { name: 'Lato', family: 'Lato, sans-serif' },
    { name: 'Montserrat', family: 'Montserrat, sans-serif' },
    { name: 'Playfair Display', family: '"Playfair Display", serif' },
    { name: 'Merriweather', family: 'Merriweather, serif' },
    { name: 'Space Mono', family: '"Space Mono", monospace' },
];

const UISettingsModal: React.FC<UISettingsModalProps> = ({ isOpen, onClose }) => {
    const { state, dispatch, showToast } = useAppContext();
    const [prefs, setPrefs] = useState<AppMetadataUIPreferences>(state.uiPreferences);
    const [dashConfig, setDashConfig] = useState<AppMetadataDashboardConfig>(state.dashboardConfig);
    const [activeFont, setActiveFont] = useState(state.font || 'Inter');
    const [customFont, setCustomFont] = useState('');
    const [scale, setScale] = useState(100); // Percentage for base font size
    const [radius, setRadius] = useState(0.5); // rem

    const logoInputRef = React.useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setPrefs(state.uiPreferences);
            setDashConfig(state.dashboardConfig);
            setActiveFont(state.font || 'Inter');

            // Read persisted visual tweaks
            const savedScale = localStorage.getItem('ui_scale');
            if (savedScale) setScale(Number(savedScale));

            const savedRadius = localStorage.getItem('ui_radius');
            if (savedRadius) setRadius(Number(savedRadius));
        }
    }, [isOpen, state.uiPreferences, state.font, state.dashboardConfig]);

    // Live Preview Effect
    useEffect(() => {
        const root = document.documentElement;

        // Apply Font
        const selectedFontObj = fonts.find(f => f.name === activeFont);
        if (selectedFontObj) {
            root.style.setProperty('--font-primary', selectedFontObj.family);
        } else if (activeFont) {
            root.style.setProperty('--font-primary', `${activeFont}, sans-serif`);
        }

        // Apply Scale (Font Size)
        // Base is usually 16px (1rem), we scale this
        // Changing root font-size scales all rem units
        root.style.fontSize = `${(scale / 100) * 16}px`;

        // Apply Radius
        root.style.setProperty('--radius-btn', `${radius}rem`);
        root.style.setProperty('--radius-card', `${radius + 0.25}rem`); // Cards slightly rounder

    }, [activeFont, scale, radius]);


    const handleSave = () => {
        dispatch({ type: 'UPDATE_UI_PREFERENCES', payload: prefs });
        dispatch({ type: 'UPDATE_DASHBOARD_CONFIG', payload: dashConfig });
        // Also update standard Theme Metadata for font
        dispatch({ type: 'SET_FONT', payload: activeFont });
        // Persist Scale/Radius via a metadata update or simply localStorage for now if types not updated
        // For robustness, usually we'd add fields to AppMetadataUIPreferences
        localStorage.setItem('ui_scale', scale.toString());
        localStorage.setItem('ui_radius', radius.toString());

        showToast("UI settings updated successfully.", 'success');
        onClose();
    };

    const handleLoadGoogleFont = () => {
        if (!customFont) return;

        const link = document.createElement('link');
        link.href = `https://fonts.googleapis.com/css2?family=${customFont.replace(/\s+/g, '+')}:wght@300;400;500;700&display=swap`;
        link.rel = 'stylesheet';
        document.head.appendChild(link);

        setActiveFont(customFont);
        setCustomFont('');
        showToast(`Loaded font: ${customFont}`, 'success');
    };

    const handleCustomLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            try {
                const base64 = await compressImage(e.target.files[0], 400, 0.8);
                setDashConfig(prev => ({ ...prev, customLogo: base64, useCustomLogo: true }));
                showToast("Custom dashboard logo uploaded!");
            } catch (err) {
                showToast("Error processing image.", 'error');
            }
        }
    };


    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in-fast" onClick={onClose} />
            <div className="relative z-10 w-full max-w-2xl h-[90vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden animate-scale-in">

                {/* Header */}
                <div className="bg-slate-800 text-white p-4 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-2">
                        <Type className="text-teal-400" />
                        <h2 className="font-bold text-lg">Appearance & Typography</h2>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors"><X size={20} /></button>
                </div>

                <div className="flex-grow overflow-y-auto p-6 space-y-8 bg-slate-50 dark:bg-slate-900 custom-scrollbar">

                    {/* Font Family Section */}
                    <section>
                        <h3 className="text-sm font-bold text-slate-500 uppercase mb-4 flex items-center gap-2">
                            <span className="bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 p-1 rounded">Aa</span> Font Family
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                            {fonts.map(f => (
                                <button
                                    key={f.name}
                                    onClick={() => setActiveFont(f.name)}
                                    className={`p-3 rounded-xl border text-left transition-all hover:scale-[1.02] ${activeFont === f.name
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-200 dark:ring-indigo-900'
                                        : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700'}`}
                                >
                                    <p className="font-bold text-sm">{f.name}</p>
                                    <p className="text-xs opacity-70" style={{ fontFamily: f.family }}>The quick brown fox</p>
                                </button>
                            ))}
                        </div>

                        {/* Custom Google Font */}
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={customFont}
                                onChange={(e) => setCustomFont(e.target.value)}
                                placeholder="Enter Google Font Name (e.g., 'Righteous')"
                                className="flex-1 p-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm"
                            />
                            <Button onClick={handleLoadGoogleFont} size="sm" variant="secondary">Load</Button>
                        </div>
                    </section>

                    <div className="h-px bg-gray-200 dark:bg-slate-700"></div>

                    {/* Pro Customization Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                        {/* Font Scaling */}
                        <section>
                            <h3 className="text-sm font-bold text-slate-500 uppercase mb-4 flex items-center gap-2">
                                <Maximize2 size={16} /> Text Scaling
                            </h3>
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
                                <div className="flex justify-between mb-2">
                                    <span className="text-xs font-bold text-slate-400">Compact</span>
                                    <span className="text-sm font-bold text-indigo-600">{scale}%</span>
                                    <span className="text-xs font-bold text-slate-400">Large</span>
                                </div>
                                <input
                                    type="range"
                                    min="80"
                                    max="130"
                                    step="5"
                                    value={scale}
                                    onChange={(e) => setScale(Number(e.target.value))}
                                    className="w-full accent-indigo-600 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                />
                                <div className="mt-4 p-3 bg-gray-50 dark:bg-slate-900 rounded border border-gray-100 dark:border-slate-700">
                                    <p className="text-sm text-slate-600 dark:text-slate-300">
                                        Adjust the base text size. This affects readable content across the dashboard.
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* Border Radius */}
                        <section>
                            <h3 className="text-sm font-bold text-slate-500 uppercase mb-4 flex items-center gap-2">
                                <Layout size={16} /> Corner Roundness
                            </h3>
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
                                <div className="flex justify-between mb-2">
                                    <span className="text-xs font-bold text-slate-400">Sharp</span>
                                    <span className="text-sm font-bold text-indigo-600">{radius}rem</span>
                                    <span className="text-xs font-bold text-slate-400">Round</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="1.5"
                                    step="0.1"
                                    value={radius}
                                    onChange={(e) => setRadius(Number(e.target.value))}
                                    className="w-full accent-indigo-600 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                />
                                <div className="mt-4 flex gap-3 justify-center">
                                    <button className="px-4 py-2 bg-indigo-600 text-white shadow-sm transition-all" style={{ borderRadius: `${radius}rem` }}>Button</button>
                                    <div className="w-10 h-10 border-2 border-indigo-600 bg-indigo-50" style={{ borderRadius: `${radius}rem` }}></div>
                                </div>
                            </div>
                        </section>
                    </div>

                    <div className="h-px bg-gray-200 dark:bg-slate-700"></div>

                    {/* Dashboard Header Customization */}
                    <section>
                        <h3 className="text-sm font-bold text-slate-500 uppercase mb-4 flex items-center gap-2">
                            <Layout size={16} /> Dashboard Header
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="flex items-center justify-between text-sm font-semibold mb-2">
                                        Show Greeting
                                        <input
                                            type="checkbox"
                                            checked={dashConfig?.showGreeting}
                                            onChange={(e) => setDashConfig({ ...dashConfig, showGreeting: e.target.checked })}
                                            className="w-4 h-4 rounded border-gray-300 accent-indigo-600"
                                        />
                                    </label>
                                    <input
                                        type="text"
                                        value={dashConfig?.greetingText}
                                        onChange={(e) => setDashConfig({ ...dashConfig, greetingText: e.target.value })}
                                        className="w-full p-2 text-sm border bg-white dark:bg-slate-800 rounded-lg dark:border-slate-700 mb-2"
                                        placeholder="e.g. Om Namo Venkatesaya"
                                        disabled={!dashConfig?.showGreeting}
                                    />
                                    <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer mb-3">
                                        <input
                                            type="checkbox"
                                            checked={dashConfig?.uppercaseGreeting !== false}
                                            onChange={(e) => setDashConfig({ ...dashConfig, uppercaseGreeting: e.target.checked })}
                                            className="w-3.5 h-3.5 rounded border-gray-300 accent-indigo-600"
                                            disabled={!dashConfig?.showGreeting}
                                        />
                                        Uppercase Text
                                    </label>

                                    {/* Greeting Font Size */}
                                    {dashConfig?.showGreeting && (
                                        <div className="mb-3">
                                            <p className="text-xs font-semibold text-slate-500 mb-1">Greeting Size</p>
                                            <div className="flex gap-1">
                                                {['xs', 'sm', 'base', 'lg', 'xl'].map(size => (
                                                    <button
                                                        key={size}
                                                        onClick={() => setDashConfig({ ...dashConfig, greetingFontSize: size as any })}
                                                        className={`px-2 py-1 text-xs border rounded ${(dashConfig.greetingFontSize || 'sm') === size
                                                                ? 'bg-indigo-100 border-indigo-500 text-indigo-700 font-bold'
                                                                : 'bg-white dark:bg-slate-700 dark:text-gray-300'
                                                            }`}
                                                    >
                                                        {size.toUpperCase()}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Greeting Color */}
                                    {dashConfig?.showGreeting && (
                                        <div className="mb-2">
                                            <p className="text-xs font-semibold text-slate-500 mb-1">Greeting Color</p>
                                            <div className="flex gap-2 items-center">
                                                <input
                                                    type="color"
                                                    value={dashConfig.greetingColor || '#ea580c'}
                                                    onChange={(e) => setDashConfig({ ...dashConfig, greetingColor: e.target.value })}
                                                    className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                                                />
                                                <button
                                                    onClick={() => setDashConfig({ ...dashConfig, greetingColor: '' })}
                                                    className="text-xs text-slate-400 hover:text-slate-600 underline"
                                                >
                                                    Reset to Orange
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-100 dark:border-slate-700">
                                    <label className="flex items-center justify-between text-sm font-semibold mb-3">
                                        Show Logo
                                        <input
                                            type="checkbox"
                                            checked={dashConfig?.showLogo}
                                            onChange={(e) => setDashConfig({ ...dashConfig, showLogo: e.target.checked })}
                                            className="w-4 h-4 rounded border-gray-300 accent-indigo-600"
                                        />
                                    </label>

                                    {dashConfig?.showLogo && (
                                        <div className="space-y-3">
                                            {/* Logo Source Switch */}
                                            <div className="flex bg-gray-200 dark:bg-slate-700 rounded-lg p-1 text-xs font-medium">
                                                <button
                                                    className={`flex-1 py-1 rounded ${!dashConfig.useCustomLogo ? 'bg-white dark:bg-slate-600 shadow text-indigo-600' : 'text-gray-500'}`}
                                                    onClick={() => setDashConfig({ ...dashConfig, useCustomLogo: false })}
                                                >
                                                    Profile Logo
                                                </button>
                                                <button
                                                    className={`flex-1 py-1 rounded ${dashConfig.useCustomLogo ? 'bg-white dark:bg-slate-600 shadow text-indigo-600' : 'text-gray-500'}`}
                                                    onClick={() => setDashConfig({ ...dashConfig, useCustomLogo: true })}
                                                >
                                                    Custom Image
                                                </button>
                                            </div>

                                            {dashConfig.useCustomLogo && (
                                                <div className="flex gap-2">
                                                    <input type="file" ref={logoInputRef} accept="image/*" className="hidden" onChange={handleCustomLogoUpload} />
                                                    <Button onClick={() => logoInputRef.current?.click()} size="sm" variant="secondary" className="w-full text-xs">
                                                        {dashConfig.customLogo ? 'Change Image' : 'Upload Image'}
                                                    </Button>
                                                </div>
                                            )}

                                            {/* Only show Size Slider if logo is visible */}
                                            <div>
                                                <div className="flex justify-between text-xs text-slate-500 mb-1">
                                                    <span>Size</span>
                                                    <span>{(dashConfig.logoSize || 1) * 100}%</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="0.5"
                                                    max="2.5"
                                                    step="0.1"
                                                    value={dashConfig.logoSize || 1}
                                                    onChange={(e) => setDashConfig({ ...dashConfig, logoSize: Number(e.target.value) })}
                                                    className="w-full accent-indigo-600 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold mb-2">Page Title</label>
                                <input
                                    type="text"
                                    value={dashConfig?.titleText}
                                    onChange={(e) => setDashConfig({ ...dashConfig, titleText: e.target.value })}
                                    className="w-full p-2 text-sm border bg-white dark:bg-slate-800 rounded-lg dark:border-slate-700"
                                    placeholder="Main Title (Business Insights)"
                                />
                                <div className="mt-4 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded border border-indigo-100 dark:border-indigo-800/30 text-xs text-indigo-800 dark:text-indigo-300">
                                    <p>Using a Custom Logo here overrides your main Profile logo only on the Dashboard.</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    <div className="h-px bg-gray-200 dark:bg-slate-700"></div>

                    {/* Legacy UI Preferences (Still useful for specific toggles) */}
                    <section>
                        <h3 className="text-sm font-bold text-slate-500 uppercase mb-4">Other Preferences</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2">Notification Position</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['top-center', 'bottom-right'].map(pos => (
                                        <button
                                            key={pos}
                                            onClick={() => setPrefs({ ...prefs, toastPosition: pos as any })}
                                            className={`p-2 text-xs border rounded transition-all ${prefs.toastPosition === pos ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold' : 'bg-white dark:bg-slate-800 dark:text-slate-300'}`}
                                        >
                                            {pos}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2">Card Style</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['solid', 'glass'].map(style => (
                                        <button
                                            key={style}
                                            onClick={() => setPrefs({ ...prefs, cardStyle: style as any })}
                                            className={`p-2 text-xs border rounded transition-all ${prefs.cardStyle === style ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold' : 'bg-white dark:bg-slate-800 dark:text-slate-300'}`}
                                        >
                                            {style}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2">Navigation Style</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['docked', 'floating'].map(style => (
                                        <button
                                            key={style}
                                            onClick={() => setPrefs({ ...prefs, navStyle: style as any })}
                                            className={`p-2 text-xs border rounded transition-all capitalize ${prefs.navStyle === style ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold' : 'bg-white dark:bg-slate-800 dark:text-slate-300'}`}
                                        >
                                            {style}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>

                </div>

                <div className="p-4 bg-white dark:bg-slate-800 border-t dark:border-slate-700 flex gap-3 shrink-0">
                    <Button onClick={onClose} variant="secondary" className="flex-1">Cancel</Button>
                    <Button onClick={handleSave} className="flex-[2]"><Save size={16} className="mr-2" /> Save Changes</Button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default UISettingsModal;

