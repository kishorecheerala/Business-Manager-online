
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

  const toastConfig = {
    success: { bg: 'bg-primary', iconClass: 'text-white', icon: <CheckCircle className="w-5 h-5 text-white" /> },
    error: { bg: 'bg-rose-600 dark:bg-rose-500', iconClass: 'text-white', icon: <AlertCircle className="w-5 h-5 text-white" /> },
    info: { bg: 'bg-primary', iconClass: 'text-white', icon: <Info className="w-5 h-5 text-white" /> },
  };

  const currentConfig = toastConfig[type];

  // Adjusted top position to top-28 (7rem/112px) to clear the header + greeting banner (approx 104px)
  let positionClasses = 'top-28 left-1/2 -translate-x-1/2';
  if (position === 'top-right') positionClasses = 'top-28 right-4 sm:right-6';
  // Adjusted bottom position to clear bottom navigation bar
  if (position === 'bottom-center') positionClasses = 'bottom-20 left-1/2 -translate-x-1/2';
  if (position === 'bottom-right') positionClasses = 'bottom-20 right-4 sm:right-6';

  return (
    <div className={`fixed ${positionClasses} z-[200] flex items-center justify-center pointer-events-none transition-all duration-300`}>
      <div
        className="relative overflow-hidden rounded-xl shadow-2xl py-3 px-4 min-w-[280px] max-w-sm animate-scale-in border border-white/10 pointer-events-auto backdrop-blur-md"
      >
        {/* Background Layer with Opacity Control */}
        <div
          className={`absolute inset-0 ${currentConfig.bg} transition-opacity duration-300`}
          style={{ opacity: state.uiPreferences?.toastOpacity ?? 0.95 }}
        ></div>

        {/* Content Layer (Always Opaque) */}
        <div className="relative z-10 flex items-start gap-3 w-full text-white">
          <div className="shrink-0 mt-0.5">
            {currentConfig.icon}
          </div>
          <p className="font-medium text-sm leading-snug drop-shadow-sm pr-6 flex-grow">{message}</p>

          {/* Close Button */}
          <button
            onClick={() => dispatch({ type: 'HIDE_TOAST' })}
            className="absolute -right-2 -top-1 text-white/70 hover:text-white transition-colors p-1 rounded-full hover:bg-white/20"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Toast;
