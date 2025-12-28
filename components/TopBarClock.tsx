import React, { useState, useEffect } from 'react';
import { CalendarClock, WifiOff } from 'lucide-react';
import { useData } from '../context/DataContext';

const TopBarClock: React.FC = () => {
    const { state } = useData();
    const [currentDateTime, setCurrentDateTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentDateTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="flex-1 text-right opacity-90 truncate pl-2 flex items-center justify-end gap-2 text-xs sm:text-sm font-medium">
            {!state.isOnline && <span className="text-[10px] font-bold bg-red-500 text-white px-2 py-0.5 rounded sm:hidden">OFFLINE</span>}
            <CalendarClock className="w-4 h-4 text-white/80" />
            {currentDateTime.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} {currentDateTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }).toUpperCase()}
        </div>
    );
};

export default TopBarClock;
