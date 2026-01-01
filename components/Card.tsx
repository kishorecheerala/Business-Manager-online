import React from 'react';
import { DataContext } from '../context/DataContext';
import { UIContext } from '../context/UIContext';

// Extend from HTMLAttributes to accept props like onClick
interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  children: React.ReactNode;
  className?: string;
  title?: React.ReactNode;
  action?: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ children, className = '', title, ...props }) => {
  const dataContext = React.useContext(DataContext);
  const uiContext = React.useContext(UIContext);

  // Handle case where contexts might not be available (e.g. inside ErrorBoundary)
  const style = uiContext?.uiState?.uiPreferences?.cardStyle || 'solid';
  const performanceMode = dataContext?.state?.performanceMode || false;

  let styleClasses = 'bg-white dark:bg-slate-800 shadow-md border-t-4 border-primary'; // Default Solid

  if (style === 'bordered') {
    styleClasses = 'bg-transparent border-2 border-slate-200 dark:border-slate-700 shadow-sm';
  } else if (style === 'glass') {
    styleClasses = performanceMode ? 'glass-card-simple' : 'glass-card';
  }

  return (
    <div className={`rounded-lg p-4 sm:p-6 transition-all duration-300 hover:shadow-xl hover:scale-[1.01] hover:z-10 ${styleClasses} ${className}`} {...props}>
      {title && <div className="mb-4 border-b dark:border-slate-700 pb-2"><h2 className="text-lg font-bold text-primary">{title}</h2></div>}
      {children}
    </div>
  );
};

export default Card;
