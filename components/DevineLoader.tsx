import React from 'react';

const DevineLoader: React.FC = () => {
    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center cursor-wait bg-white dark:bg-slate-900">
            <style>{`
                @keyframes devine-pulse {
                    0% {
                        transform: scale(0.9);
                        opacity: 0.8;
                        filter: drop-shadow(0 0 20px rgb(var(--primary-color) / 0.5));
                    }
                    50% {
                        transform: scale(1.1);
                        opacity: 1;
                        filter: drop-shadow(0 0 30px rgb(var(--primary-color) / 0.8)) drop-shadow(0 0 60px rgb(var(--primary-color) / 0.4));
                    }
                    100% {
                        transform: scale(0.9);
                        opacity: 0.8;
                        filter: drop-shadow(0 0 20px rgb(var(--primary-color) / 0.5));
                    }
                }

                @keyframes progress-indeterminate {
                    0% { transform: translateX(-100%); }
                    50% { transform: translateX(0%); }
                    100% { transform: translateX(100%); }
                }

                .animate-devine-pulse {
                    animation: devine-pulse 4s ease-in-out infinite;
                }

                .animate-progress-indeterminate {
                    animation: progress-indeterminate 1.5s infinite ease-in-out;
                }

                .animate-bounce-dot {
                    animation: bounce 1.4s infinite both;
                }

                @keyframes bounce {
                    0%, 100% { opacity: 0.2; transform: translateY(0); }
                    50% { opacity: 1; transform: translateY(-4px); }
                }
            `}</style>

            {/* Ambiance */}
            <div className="absolute inset-0 blur-[100px] rounded-full animate-pulse"
                style={{ backgroundColor: 'rgb(var(--primary-color) / 0.05)', zIndex: 0 }}></div>

            {/* Symbol */}
            <div className="relative z-10 flex items-center justify-center mb-8">
                <div className="animate-devine-pulse"
                    style={{ width: '200px', height: '200px', color: 'rgb(var(--primary-color))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '100%', height: '100%' }}>
                        <path d="M15,2L13.5,3.5L15,5L16.5,3.5L15,2M11,3C10,9 17,10 20,6L18,4.5C17,6 13,8 11,3M9,7C7,7 4.5,8.5 4.5,8.5L6,11C7,10 9,9.5 10,10C12,11 9,13 7,12V15.5C10,14 12,16 11,17.5C8,22 3,16 3,13C1,19 6,22 9,22C12,22 14,20 12.5,15H14C12.5,19.5 18,24 21,18C22,16 22,9.5 17,9.5C13,9.5 14,15 10.5,13.5C14,10 12,7 9,7M19,12C22,15 15,21 15,15C15,13 17,10.5 19,12Z" />
                    </svg>
                </div>
            </div>

            {/* Loading Indicators */}
            <div className="flex flex-col items-center gap-4 z-10 w-64">
                <div className="text-lg font-bold tracking-widest uppercase flex items-end leading-none h-6"
                    style={{ color: 'rgb(var(--primary-color) / 0.8)' }}>
                    LOADING
                    <div className="flex ml-1 mb-1">
                        <span className="animate-bounce-dot mx-[1px]" style={{ animationDelay: '0s' }}>.</span>
                        <span className="animate-bounce-dot mx-[1px]" style={{ animationDelay: '0.2s' }}>.</span>
                        <span className="animate-bounce-dot mx-[1px]" style={{ animationDelay: '0.4s' }}>.</span>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-1.5 rounded-full overflow-hidden"
                    style={{ backgroundColor: 'rgb(var(--primary-color) / 0.1)' }}>
                    <div className="h-full w-full origin-left animate-progress-indeterminate"
                        style={{ background: 'linear-gradient(to right, rgb(var(--primary-color) / 0.4), rgb(var(--primary-color)))' }}>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DevineLoader;