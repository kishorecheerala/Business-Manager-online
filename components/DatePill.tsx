
import React, { useState, useEffect } from 'react';
import { CalendarClock } from 'lucide-react';

interface DatePillProps {
  className?: string;
}

const DatePill: React.FC<DatePillProps> = ({ className = '' }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <span className={`text-xs sm:text-sm font-bold bg-primary text-white px-3 py-1.5 rounded-full shadow-md border border-white/20 flex items-center gap-2 whitespace-nowrap ${className}`}>
      <CalendarClock className="w-3 h-3 sm:w-4 sm:h-4 text-white/80" />
      <span>{currentDate.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} {currentDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
    </span>
  );
};

export default DatePill;
