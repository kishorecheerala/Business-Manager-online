
import React, { useState, useEffect } from 'react';
import { X, Save, Layout, Smartphone, CreditCard, Bell, Activity, Database, CheckCircle } from 'lucide-react';
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
  const [storageUsage, setStorageUsage] = useState<{usage: number, quota: number} | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPrefs(state.uiPreferences);
      
      // Get Storage Estimate
      if (navigator.storage && navigator.storage.estimate) {
          navigator.storage.estimate().then(estimate => {
              if (estimate.usage !== undefined && estimate.quota !== undefined) {
                  setStorageUsage({ usage: estimate.usage, quota: estimate.quota });
              }
          });
      }
    }
  }, [isOpen, state.uiPreferences]);

  const handleSave = () => {
    dispatch({ type: 'UPDATE_UI_PREFERENCES', payload: prefs });
    showToast("UI settings updated. Preferences will sync with your account.", 'success');
    onClose();
  };

  const handleApplyPreset = (preset: 'modern' | 'classic' | 'playful') => {
      let newPrefs: Partial<AppMetadataUIPreferences> = {};
      if (preset === 'modern') {
          newPrefs = { buttonStyle: 'rounded', cardStyle: 'solid', toastPosition: 'top-center' };
      } else if (preset === 'classic') {
          newPrefs = { buttonStyle: 'sharp', cardStyle: 'bordered', toastPosition: 'bottom-right' };
      } else if (preset === 'playful') {
          newPrefs = { buttonStyle: 'pill', cardStyle: 'glass', toastPosition: 'top-center' };
      }
      setPrefs(prev => ({ ...prev, ...newPrefs }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[150] p-4 animate-fade-in-fast backdrop-blur-sm">
      <Card className="w-full max-w-lg h-[85vh] flex flex-col p-0 overflow-hidden animate-scale-in border-none shadow-2xl">
        <div className="bg-slate-800 text-white p-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <Layout className="text-teal-400" />
            <h2 className="font-bold text-lg">UI Customizer & System</h2>
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
                  <button onClick={() => handleApplyPreset('modern')} className="p-3 bg-white dark:bg-slate-800 border rounded-xl hover:ring-2 hover:ring-indigo-500 text-sm font-medium">Modern</button>
                  <button onClick={() => handleApplyPreset('classic')} className="p-3 bg-white dark:bg-slate-800 border rounded-none hover:ring-2 hover:ring-indigo-500 text-sm font-medium">Classic</button>
                  <button onClick={() => handleApplyPreset('playful')} className="p-3 bg-white dark:bg-slate-800 border rounded-full hover:ring-2 hover:ring-indigo-500 text-sm font-medium">Playful</button>
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
                    className={`p-2 bg-indigo-500 text-white text-xs font-bold rounded-md ${prefs.buttonStyle === 'rounded' ? 'ring-2 ring-offset-2 ring-indigo-500' : 'opacity-70'}`}
                >
                    Rounded
                </button>
                <button 
                    onClick={() => setPrefs({...prefs, buttonStyle: 'pill'})}
                    className={`p-2 bg-indigo-500 text-white text-xs font-bold rounded-full ${prefs.buttonStyle === 'pill' ? 'ring-2 ring-offset-2 ring-indigo-500' : 'opacity-70'}`}
                >
                    Pill
                </button>
                <button 
                    onClick={() => setPrefs({...prefs, buttonStyle: 'sharp'})}
                    className={`p-2 bg-indigo-500 text-white text-xs font-bold rounded-none ${prefs.buttonStyle === 'sharp' ? 'ring-2 ring-offset-2 ring-indigo-500' : 'opacity-70'}`}
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
                    className={`p-4 bg-white dark:bg-slate-800 shadow-sm border border-transparent rounded-lg text-xs font-bold ${prefs.cardStyle === 'solid' ? 'ring-2 ring-indigo-500' : ''}`}
                >
                    Solid
                </button>
                <button 
                    onClick={() => setPrefs({...prefs, cardStyle: 'bordered'})}
                    className={`p-4 bg-transparent border-2 border-slate-300 dark:border-slate-600 rounded-lg text-xs font-bold ${prefs.cardStyle === 'bordered' ? 'ring-2 ring-indigo-500 border-indigo-500' : ''}`}
                >
                    Bordered
                </button>
                <button 
                    onClick={() => setPrefs({...prefs, cardStyle: 'glass'})}
                    className={`p-4 bg-white/50 backdrop-blur-md border border-white/20 rounded-lg text-xs font-bold ${prefs.cardStyle === 'glass' ? 'ring-2 ring-indigo-500' : ''}`}
                >
                    Glass
                </button>
            </div>
          </div>

          {/* Toast Position */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                <Bell size={14} /> Notification Position
            </h3>
            <select 
                value={prefs.toastPosition} 
                onChange={(e) => setPrefs({...prefs, toastPosition: e.target.value as any})}
                className="w-full p-2 rounded-lg border dark:bg-slate-800 dark:border-slate-700 dark:text-white"
            >
                <option value="top-center">Top Center</option>
                <option value="top-right">Top Right</option>
                <option value="bottom-center">Bottom Center</option>
                <option value="bottom-right">Bottom Right</option>
            </select>
          </div>

          <div className="border-t dark:border-slate-700"></div>

          {/* System Health Section */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
              <h3 className="text-sm font-bold text-blue-800 dark:text-blue-300 flex items-center gap-2 mb-3">
                  <Activity size={16} /> System Health Monitor
              </h3>
              
              <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-center">
                      <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1"><Database size={12}/> Storage Usage</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {storageUsage ? `${(storageUsage.usage / 1024 / 1024).toFixed(2)} MB used` : 'Calculating...'}
                      </span>
                  </div>
                  {storageUsage && (
                      <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-1.5">
                          <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${Math.min(100, (storageUsage.usage / storageUsage.quota) * 100)}%` }}></div>
                      </div>
                  )}
                  
                  <div className="flex justify-between items-center">
                      <span className="text-slate-600 dark:text-slate-400">IndexedDB Status</span>
                      <span className="text-green-600 dark:text-green-400 font-bold flex items-center gap-1"><CheckCircle size={10}/> Active</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                      <span className="text-slate-600 dark:text-slate-400">Sync Status</span>
                      <span className={`font-bold ${state.syncStatus === 'error' ? 'text-red-500' : 'text-green-600'}`}>
                          {state.syncStatus.toUpperCase()}
                      </span>
                  </div>
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
    </div>
  );
};

export default UISettingsModal;
