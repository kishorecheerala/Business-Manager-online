
import React, { forwardRef, useContext } from 'react';
import { AppContext } from '../context/AppContext';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'info';
  className?: string;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ children, variant = 'primary', className = '', type = 'button', ...props }, ref) => {
  // Use useContext directly to avoid throwing if provider is missing (e.g. inside ErrorBoundary)
  const context = useContext(AppContext);
  const state = context?.state;
  const style = state?.uiPreferences?.buttonStyle || 'rounded';

  let roundedClass = 'rounded-md'; // Default
  if (style === 'pill') roundedClass = 'rounded-full';
  if (style === 'sharp') roundedClass = 'rounded-none';

  const baseClasses = `px-4 py-2 ${roundedClass} font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 shadow-sm flex items-center justify-center gap-2 transform hover:shadow-md hover:-translate-y-px active:shadow-sm active:translate-y-0`;

  const variantClasses = {
    primary: 'bg-primary text-white hover:brightness-90 active:brightness-75 focus:ring-primary',
    secondary: 'bg-primary/10 text-primary hover:bg-primary/20 active:bg-primary/30 focus:ring-primary',
    danger: 'bg-red-500 text-white hover:bg-red-600 active:bg-red-700 focus:ring-red-500',
    info: 'bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700 focus:ring-blue-500',
  };

  return (
    <button ref={ref} type={type} className={`${baseClasses} ${variantClasses[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;
