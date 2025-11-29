
import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const Toast: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const { show, message, type } = state.toast;
  const position = state.uiPreferences?.toastPosition || 'top-center';

  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        dispatch({ type: 'HIDE_TOAST' });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [show, dispatch]);

  if (!show) return null;

  const bgColors = {
    success: 'bg-emerald-600',
    error: 'bg-red-600',
    info: 'bg-blue-600',
  };

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-white" />,
    error: <AlertCircle className="w-5 h-5 text-white" />,
    info: <Info className="w-5 h-5 text-white" />,
  };

  let positionClasses = 'top-6 left-1/2 -translate-x-1/2'; // Default top-center
  if (position === 'top-right') positionClasses = 'top-6 right-6';
  if (position === 'bottom-center') positionClasses = 'bottom-6 left-1/2 -translate-x-1/2';
  if (position === 'bottom-right') positionClasses = 'bottom-6 right-6';

  return (
    <div className={`fixed ${positionClasses} z-[9999] flex items-center justify-center pointer-events-none`}>
      <div className={`${bgColors[type]} pointer-events-auto rounded-full shadow-xl py-2 px-4 min-w-[200px] max-w-sm flex items-center gap-3 animate-scale-in border border-white/20 backdrop-blur-md relative`}>
        {/* Content */}
        <div className="flex items-center gap-3">
          <div className="shrink-0">
            {icons[type]}
          </div>
          <p className="text-white font-medium text-sm leading-tight drop-shadow-sm pr-6">{message}</p>
        </div>
        
        {/* Close Button */}
        <button 
          onClick={() => dispatch({ type: 'HIDE_TOAST' })}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

export default Toast;
