
import React from 'react';

interface DateInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  containerClassName?: string;
}

const DateInput: React.FC<DateInputProps> = ({ label, className = '', containerClassName = '', ...props }) => {
  return (
    <div className={`w-full ${containerClassName}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
      )}
      <input
        type="date"
        className={`w-full p-2.5 border bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 rounded-lg text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
        {...props}
      />
    </div>
  );
};

export default DateInput;
