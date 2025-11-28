
import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const Toast: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const { show, message, type } = state.toast;

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
    success: 'bg-emerald-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
  };

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-white" />,
    error: <AlertCircle className="w-5 h-5 text-white" />,
    info: <Info className="w-5 h-5 text-white" />,
  };

  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[200] animate-slide-down-fade w-[90%] max-w-sm">
      <div className={`${bgColors[type]} rounded-lg shadow-lg p-4 flex items-center justify-between pointer-events-auto`}>
        <div className="flex items-center gap-3">
          {icons[type]}
          <p className="text-white font-medium text-sm">{message}</p>
        </div>
        <button 
          onClick={() => dispatch({ type: 'HIDE_TOAST' })}
          className="text-white/80 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
};

export default Toast;
