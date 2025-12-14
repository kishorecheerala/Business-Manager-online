
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Layout, Smartphone, CreditCard, Bell, Maximize2, Minimize2, ArrowUp, ArrowDown, Type, Navigation, Palette, Check } from 'lucide-react';
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

const gradients = [
    { name: 'Nebula', value: 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)', isDefault: true },
    { name: 'Sunset', value: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)' },
    { name: 'Ocean', value: 'linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%)' },
    { name: 'Forest', value: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' },
    { name: 'Midnight', value: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' },
    { name: 'Royal', value: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)' },
    { name: 'Candy', value: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)' },
    { name: 'Minimal', value: 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)' },
    { name: 'Peachy', value: 'linear-gradient(135deg, #FF9A9E 0%, #FECFEF 100%)' },
    { name: 'Deep Sea', value: 'linear-gradient(135deg, #2E3192 0%, #1BFFFF 100%)' },
    { name: 'Night', value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
    { name: 'Love', value: 'linear-gradient(135deg, #ff9a9e 0%, #fad0c4 99%, #fad0c4 100%)' },
    { name: 'Lemon', value: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)' },
    { name: 'Sky', value: 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)' },
    { name: 'Horizon', value: 'linear-gradient(135deg, #00c6fb 0%, #005bea 100%)' },
    { name: 'Rose', value: 'linear-gradient(135deg, #f43b47 0%, #453a94 100%)' },
    { name: 'None', value: '' }
];

const UISettingsModal: React.FC<UISettingsModalProps> = ({ isOpen, onClose }) => {
    const { state, dispatch, showToast } = useAppContext();
    const [prefs, setPrefs] = useState<AppMetadataUIPreferences>(state.uiPreferences);
    const [dashConfig, setDashConfig] = useState<AppMetadataDashboardConfig>({ ...state.dashboardConfig });
    const logoInputRef = useRef<HTMLInputElement>(null);

    // Drag Logic
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef<{ x: number, y: number, initialPos: { x: number, y: number } } | null>(null);

    const handleDragStart = (e: React.MouseEvent | React.TouchEvent, currentPos: { x: number, y: number }) => {
        setIsDragging(true);
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        dragStartRef.current = {
            x: clientX,
            y: clientY,
            initialPos: { ...currentPos }
        };
    };

    const handleDragMove = (e: React.MouseEvent | React.TouchEvent, isMobileTab: boolean) => {
        if (!isDragging || !dragStartRef.current) return;

        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

        const container = (e.currentTarget as HTMLElement).getBoundingClientRect();

        const deltaX = clientX - dragStartRef.current.x;
        const deltaY = clientY - dragStartRef.current.y;

        const deltaXPercent = (deltaX / container.width) * 100;
        const deltaYPercent = (deltaY / container.height) * 100;

        // Invert delta because dragging right means moving the "view" left (showing left content)
        // OR simply: moving image right means increasing X% in object-position?
        // object-position: 50% (center). 100% (right edge of image at right edge of box).
        // If I drag image RIGHT, I am moving the image content rightwards.
        // This corresponds to DECREASING the percentage (bringing left details into view).
        let newX = dragStartRef.current.initialPos.x - deltaXPercent;
        let newY = dragStartRef.current.initialPos.y - deltaYPercent;

        newX = Math.max(0, Math.min(100, newX));
        newY = Math.max(0, Math.min(100, newY));

        const configKey = isMobileTab ? 'logoPositionMobile' : 'logoPositionDesktop';
        setDashConfig((prev: any) => ({ ...prev, [configKey]: { x: newX, y: newY } }));
    };

    const handleDragEnd = () => {
        setIsDragging(false);
        dragStartRef.current = null;
    };
    const [activeFont, setActiveFont] = useState(state.font || 'Inter');
    const [customFont, setCustomFont] = useState('');
    const [scale, setScale] = useState(100); // Percentage for base font size
    const [radius, setRadius] = useState(0.5); // rem
    const [themeGradient, setThemeGradient] = useState(state.themeGradient || '');
    const [themeColor, setThemeColor] = useState(state.themeColor || '#8b5cf6');



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

            setThemeGradient(state.themeGradient || '');
            setThemeColor(state.themeColor || '#8b5cf6');
        }
    }, [isOpen, state.uiPreferences, state.font, state.dashboardConfig, state.themeGradient, state.themeColor]);

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
        dispatch({ type: 'SET_THEME_GRADIENT', payload: themeGradient });
        dispatch({ type: 'SET_THEME_COLOR', payload: themeColor });
        localStorage.setItem('themeGradient', themeGradient);
        localStorage.setItem('themeColor', themeColor);
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

                    {/* Theme Color & Background */}
                    <section>
                        <h3 className="text-sm font-bold text-slate-500 uppercase mb-4 flex items-center gap-2">
                            <Palette size={16} /> Theme Appearance
                        </h3>
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2">Primary Color</label>
                                <div className="flex gap-3 items-center">
                                    <input
                                        type="color"
                                        value={themeColor}
                                        onChange={(e) => setThemeColor(e.target.value)}
                                        className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0"
                                    />
                                    <span className="text-sm font-mono text-slate-600 dark:text-slate-400 uppercase">{themeColor}</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2">Background Gradient</label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {gradients.map((g) => (
                                        <button
                                            key={g.name}
                                            onClick={() => setThemeGradient(g.value)}
                                            className={`p-2 rounded-lg border text-left text-xs font-medium transition-all ${themeGradient === g.value
                                                ? 'ring-2 ring-indigo-500 border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                                                : 'border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between w-full">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full shadow-sm border border-black/10" style={{ background: g.value || '#f8fafc' }}></div>
                                                    {g.name}
                                                </div>
                                                {/* Explicit Checkmark for selection */}
                                                {themeGradient === g.value && <div className="bg-indigo-600 text-white rounded-full p-0.5"><Check size={12} strokeWidth={3} /></div>}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
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

                                            {/* Logo Settings: Mobile vs Desktop */}
                                            <div className="mt-3 bg-white dark:bg-slate-700/50 rounded-lg p-2 border border-gray-200 dark:border-slate-600">
                                                <div className="flex text-xs font-bold mb-3 bg-gray-100 dark:bg-slate-700 rounded p-0.5">
                                                    <button
                                                        className={`flex-1 py-1 px-2 rounded flex items-center justify-center gap-1 transition-all ${!dashConfig.logoSettingsTab || dashConfig.logoSettingsTab === 'mobile' ? 'bg-white dark:bg-slate-600 shadow text-indigo-600' : 'text-gray-500'}`}
                                                        onClick={() => setDashConfig({ ...dashConfig, logoSettingsTab: 'mobile' } as any)}
                                                    >
                                                        <Smartphone size={12} /> Mobile
                                                    </button>
                                                    <button
                                                        className={`flex-1 py-1 px-2 rounded flex items-center justify-center gap-1 transition-all ${dashConfig.logoSettingsTab === 'desktop' ? 'bg-white dark:bg-slate-600 shadow text-indigo-600' : 'text-gray-500'}`}
                                                        onClick={() => setDashConfig({ ...dashConfig, logoSettingsTab: 'desktop' } as any)}
                                                    >
                                                        <Layout size={12} /> Desktop
                                                    </button>
                                                </div>

                                                {/* Controls based on active tab */}
                                                {(!dashConfig.logoSettingsTab || dashConfig.logoSettingsTab === 'mobile') ? (
                                                    <div className="space-y-3 animate-fade-in">
                                                        <div>
                                                            <div className="flex justify-between text-xs text-slate-500 mb-1">
                                                                <span>Mobile Size ({(dashConfig.logoSizeMobile || dashConfig.logoSize || 1) * 100}%)</span>
                                                            </div>
                                                            <input
                                                                type="range"
                                                                min="0.5"
                                                                max="3.0"
                                                                step="0.1"
                                                                value={dashConfig.logoSizeMobile || dashConfig.logoSize || 1}
                                                                onChange={(e) => setDashConfig({ ...dashConfig, logoSizeMobile: Number(e.target.value) })}
                                                                className="w-full accent-indigo-600 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                                            />
                                                        </div>
                                                        <label className="flex items-center justify-between text-xs font-medium cursor-pointer">
                                                            <span>Stretch to Fill Width</span>
                                                            <input
                                                                type="checkbox"
                                                                checked={!!dashConfig.logoFillMobile}
                                                                onChange={(e) => setDashConfig({ ...dashConfig, logoFillMobile: e.target.checked })}
                                                                className="w-4 h-4 rounded border-gray-300 accent-indigo-600"
                                                            />
                                                        </label>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-3 animate-fade-in">
                                                        <div>
                                                            <div className="flex justify-between text-xs text-slate-500 mb-1">
                                                                <span>Desktop Size ({(dashConfig.logoSizeDesktop || dashConfig.logoSize || 1) * 100}%)</span>
                                                            </div>
                                                            <input
                                                                type="range"
                                                                min="0.5"
                                                                max="4.0"
                                                                step="0.1"
                                                                value={dashConfig.logoSizeDesktop || dashConfig.logoSize || 1}
                                                                onChange={(e) => setDashConfig({ ...dashConfig, logoSizeDesktop: Number(e.target.value) })}
                                                                className="w-full accent-indigo-600 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                                            />
                                                        </div>
                                                        <label className="flex items-center justify-between text-xs font-medium cursor-pointer">
                                                            <span>Stretch to Fill Area</span>
                                                            <input
                                                                type="checkbox"
                                                                checked={!!dashConfig.logoFillDesktop}
                                                                onChange={(e) => setDashConfig({ ...dashConfig, logoFillDesktop: e.target.checked })}
                                                                className="w-4 h-4 rounded border-gray-300 accent-indigo-600"
                                                            />
                                                        </label>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Preview & Drag Area within the specific tab */}
                                            <div className="mt-3">
                                                <div className="flex justify-between items-center mb-1">
                                                    <p className="text-xs font-semibold text-slate-500">Preview (Drag to Adjust)</p>
                                                    <button onClick={() => setDashConfig({ ...dashConfig, [(!dashConfig.logoSettingsTab || dashConfig.logoSettingsTab === 'mobile') ? 'logoPositionMobile' : 'logoPositionDesktop']: { x: 50, y: 50 } } as any)} className="text-[10px] text-indigo-600 hover:underline">Reset Center</button>
                                                </div>
                                                <div
                                                    className={`relative w-full overflow-hidden bg-gray-100 dark:bg-slate-900 rounded-lg border border-dashed border-gray-300 dark:border-slate-600 cursor-move ${isDragging ? 'ring-2 ring-indigo-500' : ''}`}
                                                    style={(() => {
                                                        // Dashboard uses: (Size * 5) rem. 
                                                        // Preview width is constrained by the modal column (approx 300-400px).
                                                        // To show true aspect ratio, we should let the height be proportional.
                                                        // But scaling 1:1 with dashboard might be too big or small.
                                                        // Dashboard width is 'w-full'. 
                                                        // Preview width is 'w-full' (of container).
                                                        // So if we just use the same height calculation (in rem), it should look roughly correct relative to width?
                                                        // Actually, if dashboard is 100vw wide, and preview is 300px wide, 
                                                        // using same height (e.g. 5rem = 80px) means preview is MUCH more "landscape" than dashboard.
                                                        // We need to scale height to maintain Aspect Ratio if we want "WYSIWYG".
                                                        // Dashboard Aspect Ratio (approx) = ScreenWidth / (Size * 5rem).
                                                        // Preview Aspect Ratio should be same.
                                                        // PreviewHeight = PreviewWidth / (ScreenWidth / (Size * 5rem))
                                                        // This is hard because we don't know ScreenWidth.
                                                        //
                                                        // Alternative: User said "I don't see the full image... only see 16:9".
                                                        // They want the preview to show the CROP.
                                                        // The crop is determined by the container shape.
                                                        // If we just use the same height (e.g. 80px), but width is small (300px), 
                                                        // the container is ~3.75:1.
                                                        // On Desktop, width might be 1200px. 1200/80 = 15:1. 
                                                        // So the preview is actually "taller" (less crop) than reality.
                                                        // To match Desktop reality, we need a flexible preview that mimics the aspect ratio.
                                                        // Let's assume a "Standard" Desktop width of ~1200px and Mobile ~400px for estimation.

                                                        const isMobile = (!dashConfig.logoSettingsTab || dashConfig.logoSettingsTab === 'mobile');
                                                        const size = isMobile
                                                            ? (dashConfig.logoSizeMobile || dashConfig.logoSize || 1)
                                                            : (dashConfig.logoSizeDesktop || dashConfig.logoSize || 1);

                                                        // Estimate Aspect Ratio
                                                        // Mobile: 390px width / (size * 80px) height
                                                        // Desktop: 1200px width / (size * 80px) height
                                                        const estimatedWidth = isMobile ? 390 : 1200;
                                                        const heightPx = size * 80; // 5rem = 80px approx
                                                        const aspectRatio = estimatedWidth / heightPx;

                                                        // Apply this AR to the preview container
                                                        return { aspectRatio: `${aspectRatio} / 1` };
                                                    })()}
                                                    onMouseDown={(e) => handleDragStart(e, ((!dashConfig.logoSettingsTab || dashConfig.logoSettingsTab === 'mobile') ? dashConfig.logoPositionMobile : dashConfig.logoPositionDesktop) ?? { x: 50, y: 50 })}
                                                    onTouchStart={(e) => handleDragStart(e, ((!dashConfig.logoSettingsTab || dashConfig.logoSettingsTab === 'mobile') ? dashConfig.logoPositionMobile : dashConfig.logoPositionDesktop) ?? { x: 50, y: 50 })}
                                                    onMouseMove={(e) => handleDragMove(e, (!dashConfig.logoSettingsTab || dashConfig.logoSettingsTab === 'mobile'))}
                                                    onTouchMove={(e) => handleDragMove(e, (!dashConfig.logoSettingsTab || dashConfig.logoSettingsTab === 'mobile'))}
                                                    onMouseUp={handleDragEnd}
                                                    onMouseLeave={handleDragEnd}
                                                    onTouchEnd={handleDragEnd}
                                                >
                                                    <img
                                                        src={dashConfig.useCustomLogo ? dashConfig.customLogo : (state.profile?.logo || '')}
                                                        alt="Preview"
                                                        className="w-full h-full transition-none"
                                                        style={{
                                                            objectFit: ((!dashConfig.logoSettingsTab || dashConfig.logoSettingsTab === 'mobile') ? dashConfig.logoFillMobile : dashConfig.logoFillDesktop) ? 'cover' : 'contain',
                                                            objectPosition: (() => {
                                                                const pos = ((!dashConfig.logoSettingsTab || dashConfig.logoSettingsTab === 'mobile') ? dashConfig.logoPositionMobile : dashConfig.logoPositionDesktop) ?? { x: 50, y: 50 };
                                                                return `${pos.x}% ${pos.y}%`;
                                                            })()
                                                        }}
                                                        draggable={false}
                                                    />
                                                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/10">
                                                        <span className="text-[10px] font-bold text-white bg-black/40 px-2 py-1 rounded">Drag to Reposition</span>
                                                    </div>
                                                </div>
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
                                    {['top-center', 'top-right', 'bottom-center', 'bottom-right'].map(pos => (
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
                                <label className="block text-xs font-bold text-slate-500 mb-2">Notification Opacity ({Math.round((prefs.toastOpacity ?? 0.95) * 100)}%)</label>
                                <input
                                    type="range"
                                    min="0.5"
                                    max="1.0"
                                    step="0.05"
                                    value={prefs.toastOpacity ?? 0.95}
                                    onChange={(e) => setPrefs({ ...prefs, toastOpacity: Number(e.target.value) })}
                                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                />
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

