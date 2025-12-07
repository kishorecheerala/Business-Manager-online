import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Layout, Smartphone, CreditCard } from 'lucide-react';
import Card from './Card';
import Button from './Button';
import { useAppContext } from '../context/AppContext';
import { AppMetadataUIPreferences } from '../types';

interface UISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UISettingsModal: React.FC<UISettingsModalProps> = ({ isOpen, onClose }) => {
  const { state, dispatch, showToast } = useAppContext();
  const [prefs, setPrefs] = useState<AppMetadataUIPreferences>(state.uiPreferences);

  useEffect(() => {
    if (isOpen) {
      setPrefs(state.uiPreferences);
      document.body.style.overflow = 'hidden';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen, state.uiPreferences]);

  const handleSave = () => {
    dispatch({ type: 'UPDATE_UI_PREFERENCES', payload: prefs });
    showToast("UI settings updated. Preferences will sync with your account.", 'success');
    onClose();
  };

  const handleApplyPreset = (preset: 'modern' | 'classic' | 'playful') => {
      let newPrefs: Partial<AppMetadataUIPreferences> = {};
      if (preset === 'modern') {
          newPrefs = { buttonStyle: 'rounded', cardStyle: 'solid', toastPosition: 'top-center', density: 'comfortable' };
      } else if (preset === 'classic') {
          newPrefs = { buttonStyle: 'sharp', cardStyle: 'bordered', toastPosition: 'bottom-right', density: 'compact' };
      } else if (preset === 'playful') {
          newPrefs = { buttonStyle: 'pill', cardStyle: 'glass', toastPosition: 'top-center', density: 'comfortable' };
      }
      setPrefs(prev => ({ ...prev, ...newPrefs }));
  };

  if (!isOpen) return null;

  return createPortal(
    <div 
        className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in-fast" onClick={onClose} />
      <Card className="relative z-10 w-full max-w-lg h-full flex flex-col p-0 overflow-hidden animate-scale-in border-none shadow-2xl">
        <div className="bg-slate-800 text-white p-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <Layout className="text-teal-400" />
            <h2 className="font-bold text-lg">UI Customizer</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors"><X size={20}/></button>
        </div>

        <div className="flex-grow overflow-y-auto p-5 space-y-6 bg-slate-50 dark:bg-slate-900">
          
          {/* Quick Presets */}
          <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                  <Layout size={14} /> Quick Themes
              </h3>
              <div className="grid grid-cols-3 gap-3">
                  <button onClick={() => handleApplyPreset('modern')} className="p-3 bg-white dark:bg-slate-800 border rounded-xl hover:ring-2 hover:ring-indigo-500 text-sm font-medium transition-all">Modern</button>
                  <button onClick={() => handleApplyPreset('classic')} className="p-3 bg-white dark:bg-slate-800 border rounded-none hover:ring-2 hover:ring-indigo-500 text-sm font-medium transition-all">Classic</button>
                  <button onClick={() => handleApplyPreset('playful')} className="p-3 bg-white dark:bg-slate-800 border rounded-full hover:ring-2 hover:ring-indigo-500 text-sm font-medium transition-all">Playful</button>
              </div>
          </div>

          <div className="border-t dark:border-slate-700"></div>

          {/* Button Style */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                <Smartphone size={14} /> Button Style
            </h3>
            <div className="grid grid-cols-3 gap-3">
                <button 
                    onClick={() => setPrefs({...prefs, buttonStyle: 'rounded'})}
                    className={`p-2 bg-indigo-500 text-white text-xs font-bold rounded-md transition-all ${prefs.buttonStyle === 'rounded' ? 'ring-2 ring-offset-2 ring-indigo-500' : 'opacity-70'}`}
                >
                    Rounded
                </button>
                <button 
                    onClick={() => setPrefs({...prefs, buttonStyle: 'pill'})}
                    className={`p-2 bg-indigo-500 text-white text-xs font-bold rounded-full transition-all ${prefs.buttonStyle === 'pill' ? 'ring-2 ring-offset-2 ring-indigo-500' : 'opacity-70'}`}
                >
                    Pill
                </button>
                <button 
                    onClick={() => setPrefs({...prefs, buttonStyle: 'sharp'})}
                    className={`p-2 bg-indigo-500 text-white text-xs font-bold rounded-none transition-all ${prefs.buttonStyle === 'sharp' ? 'ring-2 ring-offset-2 ring-indigo-500' : 'opacity-70'}`}
                >
                    Sharp
                </button>
            </div>
          </div>

          {/* Card Style */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                <CreditCard size={14} /> Card Style
            </h3>
            <div className="grid grid-cols-3 gap-3">
                <button 
                    onClick={() => setPrefs({...prefs, cardStyle: 'solid'})}
                    className={`p-4 bg-white dark:bg-slate-800 shadow-sm border border-transparent rounded-lg text-xs font-bold transition-all ${prefs.cardStyle === 'solid' ? 'ring-2 ring-indigo-500' : ''}`}
                >
                    Solid
                </button>
                <button 
                    onClick={() => setPrefs({...prefs, cardStyle: 'bordered'})}
                    className={`p-4 bg-transparent border-2 border-slate-300 dark:border-slate-600 rounded-lg text-xs font-bold transition-all ${prefs.cardStyle === 'bordered' ? 'ring-2 ring-indigo-500 border-indigo-500' : ''}`}
                >
                    Bordered
                </button>
                <button 
                    onClick={() => setPrefs({...prefs, cardStyle: 'glass'})}
                    className={`p-4 bg-white/50 backdrop-blur-md border border-white/20 rounded-lg text-xs font-bold transition-all ${prefs.cardStyle === 'glass' ? 'ring-2 ring-indigo-500 border-indigo-500' : ''}`}
                >
                    Glass
                </button>
            </div>
          </div>

        </div>

        <div className="p-4 bg-white dark:bg-slate-800 border-t dark:border-slate-700 flex gap-3 shrink-0">
            <Button onClick={onClose} variant="secondary" className="flex-1">
                Cancel
            </Button>
            <Button onClick={handleSave} className="flex-[2]">
                <Save size={16} className="mr-2" /> Save Preferences
            </Button>
        </div>
      </Card>
    </div>,
    document.body
  );
};

export default UISettingsModal;