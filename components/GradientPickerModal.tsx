import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Check, ArrowRightLeft } from 'lucide-react';
import Card from './Card';
import Button from './Button';

interface GradientPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialStartColor: string;
    onChange: (gradient: string, startColor: string) => void;
}

// --- Color Utility Functions (Reused) ---

const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
};

const rgbToHsv = (r: number, g: number, b: number) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s, v = max;
  const d = max - min;
  s = max === 0 ? 0 : d / max;
  if (max === min) h = 0;
  else {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, v: v * 100 };
};

const hsvToRgb = (h: number, s: number, v: number) => {
  s = s / 100;
  v = v / 100;
  let r = 0, g = 0, b = 0;
  const i = Math.floor(h / 60);
  const f = h / 60 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
};

const componentToHex = (c: number) => {
  const hex = c.toString(16);
  return hex.length === 1 ? "0" + hex : hex;
};

const rgbToHex = (r: number, g: number, b: number) => {
  return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
};

const GradientPickerModal: React.FC<GradientPickerModalProps> = ({ isOpen, onClose, initialStartColor, onChange }) => {
    const [activeTab, setActiveTab] = useState<'start' | 'end'>('start');
    const [startColor, setStartColor] = useState(initialStartColor);
    const [endColor, setEndColor] = useState('#4f46e5'); // Default Indigo
    const [angle, setAngle] = useState(135);

    // HSV State for the *Active* color being edited
    const [hue, setHue] = useState(0);
    const [saturation, setSaturation] = useState(0);
    const [value, setValue] = useState(100);
    
    const paletteRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);

    // Sync HSV state when switching tabs or opening
    useEffect(() => {
        if (isOpen) {
            const colorToEdit = activeTab === 'start' ? startColor : endColor;
            const { r, g, b } = hexToRgb(colorToEdit);
            const hsv = rgbToHsv(r, g, b);
            setHue(hsv.h);
            setSaturation(hsv.s);
            setValue(hsv.v);
        }
    }, [isOpen, activeTab, startColor, endColor]);

    // Initialize defaults on open
    useEffect(() => {
        if (isOpen) {
            setStartColor(initialStartColor);
            // Generate a nice default end color (shifted hue)
            const { r, g, b } = hexToRgb(initialStartColor);
            const hsv = rgbToHsv(r, g, b);
            const endRgb = hsvToRgb((hsv.h + 40) % 360, hsv.s, hsv.v);
            setEndColor(rgbToHex(endRgb.r, endRgb.g, endRgb.b));
        }
    }, [isOpen]);

    const updateActiveColor = useCallback((h: number, s: number, v: number) => {
        const { r, g, b } = hsvToRgb(h, s, v);
        const hex = rgbToHex(r, g, b);
        if (activeTab === 'start') {
            setStartColor(hex);
        } else {
            setEndColor(hex);
        }
    }, [activeTab]);

    const handlePaletteInteraction = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (!paletteRef.current) return;
        const rect = paletteRef.current.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

        let x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        let y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));

        const newS = x * 100;
        const newV = (1 - y) * 100;

        setSaturation(newS);
        setValue(newV);
        updateActiveColor(hue, newS, newV);
    }, [hue, updateActiveColor]);

    const handleMouseDown = (e: React.MouseEvent) => {
        isDragging.current = true;
        handlePaletteInteraction(e);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging.current) handlePaletteInteraction(e);
    };

    const handleMouseUp = () => {
        isDragging.current = false;
    };

    const handleApply = () => {
        const gradient = `linear-gradient(${angle}deg, ${startColor} 0%, ${endColor} 100%)`;
        onChange(gradient, startColor);
        onClose();
    };

    const swapColors = () => {
        const temp = startColor;
        setStartColor(endColor);
        setEndColor(temp);
    };

    if (!isOpen) return null;

    // Calculate current color for preview in palette cursor
    const { r, g, b } = hsvToRgb(hue, saturation, value);
    const currentColor = `rgb(${r}, ${g}, ${b})`;
    
    // Base hue color for the palette background
    const { r: hr, g: hg, b: hb } = hsvToRgb(hue, 100, 100);
    const hueColor = `rgb(${hr}, ${hg}, ${hb})`;

    const gradientPreview = `linear-gradient(${angle}deg, ${startColor} 0%, ${endColor} 100%)`;

    return (
        <div 
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-[99999] p-4 animate-fade-in-fast backdrop-blur-sm"
            onMouseUp={handleMouseUp}
            onTouchEnd={handleMouseUp}
        >
            <Card className="w-full max-w-sm p-0 overflow-hidden animate-scale-in bg-white dark:bg-slate-800 border dark:border-slate-700">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-slate-700">
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white">Custom Gradient</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                <div className="p-5 space-y-5">
                    {/* Preview */}
                    <div 
                        className="w-full h-24 rounded-xl shadow-inner border border-gray-200 dark:border-slate-600 flex items-center justify-center"
                        style={{ background: gradientPreview }}
                    >
                        <span className="text-white font-bold drop-shadow-md text-sm">Preview</span>
                    </div>

                    {/* Angle Control */}
                    <div>
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Angle</span>
                            <span>{angle}°</span>
                        </div>
                        <input 
                            type="range" 
                            min="0" 
                            max="360" 
                            value={angle} 
                            onChange={(e) => setAngle(parseInt(e.target.value))}
                            className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gray-200 dark:bg-slate-700 accent-indigo-500"
                        />
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 items-center">
                        <button 
                            onClick={() => setActiveTab('start')}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 border-2 ${activeTab === 'start' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20' : 'border-transparent bg-gray-100 dark:bg-slate-700 text-gray-500'}`}
                        >
                            <div className="w-4 h-4 rounded-full border border-black/10" style={{ background: startColor }}></div>
                            Start
                        </button>
                        <button onClick={swapColors} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400">
                            <ArrowRightLeft size={16} />
                        </button>
                        <button 
                            onClick={() => setActiveTab('end')}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 border-2 ${activeTab === 'end' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20' : 'border-transparent bg-gray-100 dark:bg-slate-700 text-gray-500'}`}
                        >
                            <div className="w-4 h-4 rounded-full border border-black/10" style={{ background: endColor }}></div>
                            End
                        </button>
                    </div>

                    {/* Saturation/Value Pad */}
                    <div 
                        ref={paletteRef}
                        className="w-full h-40 rounded-xl relative cursor-crosshair touch-none shadow-inner ring-1 ring-black/5 overflow-hidden"
                        style={{ backgroundColor: hueColor }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onTouchStart={handlePaletteInteraction}
                        onTouchMove={handlePaletteInteraction}
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-white to-transparent" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
                        
                        <div 
                            className="absolute w-4 h-4 rounded-full border-2 border-white shadow-md transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                            style={{ left: `${saturation}%`, top: `${100 - value}%`, backgroundColor: currentColor }}
                        />
                    </div>

                    {/* Hue Slider */}
                    <div>
                        <input 
                            type="range" 
                            min="0" 
                            max="360" 
                            value={hue}
                            onChange={(e) => {
                                const h = parseInt(e.target.value);
                                setHue(h);
                                updateActiveColor(h, saturation, value);
                            }}
                            className="w-full h-4 rounded-full appearance-none cursor-pointer"
                            style={{
                                background: 'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)'
                            }}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <Button onClick={handleApply} className="flex-1 py-2.5 rounded-xl shadow-lg shadow-primary/20">
                            <Check size={18} className="mr-2" /> Apply Gradient
                        </Button>
                        <Button onClick={onClose} variant="secondary" className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200">
                            Cancel
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default GradientPickerModal;