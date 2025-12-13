import React, { useState, useRef, Suspense, useMemo } from 'react';
import {
    Menu, Search, Sparkles, WifiOff, Sun, Moon, RefreshCw, CloudOff, Cloud, Bell, HelpCircle, CalendarClock
} from 'lucide-react';
import { Page, AppMetadata } from '../types';
import { useAppContext } from '../context/AppContext';
import { useOnClickOutside } from '../hooks/useOnClickOutside';
import NavItem from './NavItem';
import { ICON_MAP, LABEL_MAP } from '../utils/iconMap';

// Lazy loaded components for the layout
const MenuPanel = React.lazy(() => import('./MenuPanel'));
const NotificationsPanel = React.lazy(() => import('./NotificationsPanel'));
const AskAIModal = React.lazy(() => import('./AskAIModal'));
const HelpModal = React.lazy(() => import('./HelpModal'));
const UniversalSearch = React.lazy(() => import('./UniversalSearch'));
const DeveloperToolsModal = React.lazy(() => import('./DeveloperToolsModal'));
const CloudDebugModal = React.lazy(() => import('./CloudDebugModal'));
const ProfileModal = React.lazy(() => import('./ProfileModal'));
const NavCustomizerModal = React.lazy(() => import('./NavCustomizerModal'));
const ChangeLogModal = React.lazy(() => import('./ChangeLogModal'));
const SignInModal = React.lazy(() => import('./SignInModal'));
const PinModal = React.lazy(() => import('./PinModal'));
const APIConfigModal = React.lazy(() => import('./APIConfigModal'));

interface AppLayoutProps {
    children: React.ReactNode;
    currentPage: Page;
    onNavigate: (page: Page) => void;
    isLocked: boolean;
    setIsLocked: (locked: boolean) => void;
}

const AppLayout: React.FC<AppLayoutProps> = ({
    children,
    currentPage,
    onNavigate,
    isLocked,
    setIsLocked
}) => {
    const { state, dispatch, syncData, showToast } = useAppContext();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [isAskAIOpen, setIsAskAIOpen] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [isDevToolsOpen, setIsDevToolsOpen] = useState(false);
    const [isCloudDebugOpen, setIsCloudDebugOpen] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isNavCustomizerOpen, setIsNavCustomizerOpen] = useState(false);
    const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
    const [isMobileQuickAddOpen, setIsMobileQuickAddOpen] = useState(false);
    const [isChangeLogOpen, setIsChangeLogOpen] = useState(false);

    const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
    const [isAPIConfigOpen, setIsAPIConfigOpen] = useState(false);

    const notificationsRef = useRef<HTMLDivElement>(null);
    useOnClickOutside(notificationsRef, () => setIsNotificationsOpen(false));

    // Time state
    const [currentDateTime, setCurrentDateTime] = React.useState(new Date());
    React.useEffect(() => {
        const timer = setInterval(() => setCurrentDateTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const getTimeBasedGreeting = () => {
        const hour = currentDateTime.getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    const getGreetingIcon = () => {
        const hour = currentDateTime.getHours();
        if (hour >= 6 && hour < 18) {
            return <Sun className="w-4 h-4 text-yellow-300 animate-[spin_10s_linear_infinite]" />;
        }
        return <Moon className="w-4 h-4 text-blue-200 animate-pulse" />;
    };

    const toggleTheme = () => {
        const newTheme = state.theme === 'light' ? 'dark' : 'light';
        dispatch({ type: 'SET_THEME', payload: newTheme });
    };

    const handleLockApp = () => {
        setIsLocked(true);
        setIsMenuOpen(false);
    };

    // Prepare Nav Items
    const { mainNavItems, pinnedItems, mobileMoreItems } = useMemo(() => {
        const order = state.navOrder || [];

        const allDesktopItems = order
            .filter(id => id !== 'SYSTEM_OPTIMIZER')
            .map(id => ({
                page: id, label: LABEL_MAP[id] || id, icon: ICON_MAP[id]
            }));

        const pinnedIds = order.slice(0, 4);
        const menuIds = order.slice(4);

        const pinnedItems = pinnedIds.map(id => ({ page: id, label: LABEL_MAP[id] || id, icon: ICON_MAP[id] }));
        const mobileMoreItems = menuIds.map(id => ({ page: id, label: LABEL_MAP[id] || id, icon: ICON_MAP[id] }));

        return { mainNavItems: allDesktopItems, pinnedItems, mobileMoreItems };
    }, [state.navOrder]);

    const mainClass = currentPage === 'INVOICE_DESIGNER'
        ? 'h-[100dvh] overflow-hidden'
        : `min-h-screen pt-[7rem]`;

    let navContainerClass = 'bg-theme';
    if (state.uiPreferences?.navStyle === 'floating') {
        navContainerClass += ' bottom-4 left-4 right-4 rounded-2xl shadow-xl';
    } else {
        navContainerClass += ' bottom-0 left-0 right-0 border-t border-white/20';
    }

    return (
        <div className={`min-h-screen flex flex-col bg-background dark:bg-slate-950 text-text dark:text-slate-200 font-sans transition-colors duration-300 ${state.theme}`}>
            {/* Modals & Overlays */}
            <Suspense fallback={null}>
                {isLocked && (
                    <div className="fixed inset-0 z-[90] bg-background dark:bg-slate-950 flex items-center justify-center">
                        <PinModal
                            mode="enter"
                            correctPin={state.pin}
                            onCorrectPin={() => setIsLocked(false)}
                        />
                    </div>
                )}

                <ChangeLogModal isOpen={isChangeLogOpen} onClose={() => setIsChangeLogOpen(false)} />
                <SignInModal isOpen={isSignInModalOpen} onClose={() => setIsSignInModalOpen(false)} />
                <MenuPanel
                    isOpen={isMenuOpen}
                    onClose={() => setIsMenuOpen(false)}
                    onProfileClick={() => setIsProfileModalOpen(true)}
                    onNavigate={onNavigate}
                    onOpenDevTools={() => setIsDevToolsOpen(true)}
                    onOpenChangeLog={() => setIsChangeLogOpen(true)}
                    onOpenSignIn={() => setIsSignInModalOpen(true)}

                    onLockApp={handleLockApp}
                    onOpenAPIConfig={() => setIsAPIConfigOpen(true)}
                />
                <UniversalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} onNavigate={onNavigate} />
                <AskAIModal isOpen={isAskAIOpen} onClose={() => setIsAskAIOpen(false)} onNavigate={onNavigate} />
                <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
                <DeveloperToolsModal isOpen={isDevToolsOpen} onClose={() => setIsDevToolsOpen(false)} onOpenCloudDebug={() => setIsCloudDebugOpen(true)} onOpenAPIConfig={() => setIsAPIConfigOpen(true)} />
                <CloudDebugModal isOpen={isCloudDebugOpen} onClose={() => setIsCloudDebugOpen(false)} onOpenAPIConfig={() => setIsAPIConfigOpen(true)} />
                <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
                <NavCustomizerModal isOpen={isNavCustomizerOpen} onClose={() => setIsNavCustomizerOpen(false)} />
                <APIConfigModal isOpen={isAPIConfigOpen} onClose={() => setIsAPIConfigOpen(false)} />
            </Suspense>

            {/* Header */}
            {currentPage !== 'INVOICE_DESIGNER' && (
                <header className="fixed top-0 left-0 right-0 z-40 bg-theme shadow-lg transition-all duration-300">
                    <div className="h-16 px-3 sm:px-4 flex items-center justify-between text-white relative">
                        <div className="flex items-center gap-1 sm:gap-2 z-20">
                            <button onClick={() => setIsMenuOpen(true)} className="p-2 hover:bg-white/20 rounded-full transition-colors" title="Menu (Ctrl+M)">
                                <Menu size={24} />
                            </button>
                            <button onClick={() => setIsSearchOpen(true)} className="p-2 hover:bg-white/20 rounded-full transition-colors" title="Search (Ctrl+K)">
                                <Search size={20} />
                            </button>
                            <button onClick={() => setIsAskAIOpen(true)} className="p-2 hover:bg-white/20 rounded-full transition-colors" title="AI Assistant">
                                <Sparkles size={20} />
                            </button>
                        </div>

                        <div className="absolute left-0 right-0 top-0 bottom-0 flex flex-col justify-center items-center pointer-events-none z-10 px-16">
                            <button
                                onClick={() => onNavigate('DASHBOARD')}
                                className="pointer-events-auto flex flex-col items-center justify-center hover:opacity-90 transition-opacity"
                            >
                                <h1 className="text-lg sm:text-xl font-bold tracking-tight truncate max-w-[200px] sm:max-w-[300px] leading-tight drop-shadow-sm">
                                    {state.profile?.name || 'Saree Business Manager'}
                                </h1>
                                <div className="flex items-center gap-1.5 mt-0.5 animate-fade-in-fast">
                                    {state.googleUser ? (
                                        <>
                                            <span className="text-[10px] sm:text-xs font-medium text-white/95 truncate max-w-[150px] drop-shadow-sm">
                                                {state.googleUser.name}
                                            </span>
                                            <div className="relative flex h-2 w-2 shrink-0">
                                                {state.syncStatus === 'syncing' && (
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                )}
                                                <span className={`relative inline-flex rounded-full h-2 w-2 ${state.syncStatus === 'error' ? 'bg-red-500' : 'bg-green-400'} shadow-sm`}></span>
                                            </div>
                                        </>
                                    ) : (
                                        <span className="text-[10px] sm:text-xs text-white/80">Local Mode</span>
                                    )}
                                </div>
                            </button>
                        </div>

                        <div className="flex items-center gap-1 sm:gap-2 z-20">
                            {!state.isOnline && (
                                <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-red-500/20 rounded-full border border-red-400/50 mr-1 animate-pulse">
                                    <WifiOff size={14} className="text-white" />
                                    <span className="text-[10px] font-bold text-white">Offline</span>
                                </div>
                            )}

                            <button
                                onClick={toggleTheme}
                                className="p-2 hover:bg-white/20 rounded-full transition-colors hidden sm:block"
                                title="Toggle Theme"
                            >
                                {state.theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                            </button>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (!state.googleUser) {
                                        setIsSignInModalOpen(true);
                                    } else {
                                        syncData();
                                    }
                                }}
                                onContextMenu={(e) => {
                                    e.preventDefault();
                                    setIsCloudDebugOpen(true);
                                }}
                                className="relative p-2 hover:bg-white/20 rounded-full transition-colors"
                            >
                                {state.syncStatus === 'syncing' ? (
                                    <RefreshCw size={20} className="animate-spin" />
                                ) : state.syncStatus === 'error' ? (
                                    <CloudOff size={20} className="text-red-300" />
                                ) : (
                                    <Cloud size={20} className={!state.googleUser ? "opacity-70" : ""} />
                                )}
                            </button>

                            <div className="relative" ref={notificationsRef}>
                                <button onClick={() => setIsNotificationsOpen(!isNotificationsOpen)} className="p-2 hover:bg-white/20 rounded-full transition-colors relative">
                                    <Bell size={20} />
                                    {state.notifications.some(n => !n.read) && (
                                        <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-800"></span>
                                    )}
                                </button>
                                <Suspense fallback={null}>
                                    <NotificationsPanel isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} onNavigate={onNavigate} />
                                </Suspense>
                            </div>

                            <button onClick={() => setIsHelpOpen(true)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                                <HelpCircle size={20} />
                            </button>
                        </div>
                    </div>

                    <div className="h-10 bg-white/10 backdrop-blur-md border-t border-white/10 flex items-center justify-between px-4 text-white text-xs sm:text-sm font-medium">
                        <div className="flex-1 text-left opacity-90 truncate pr-2 flex items-center gap-2">
                            {getGreetingIcon()}
                            <span>{getTimeBasedGreeting()}, <span className="font-bold">{state.profile?.ownerName || 'Owner'}</span></span>
                        </div>
                        <div className="flex-1 text-right opacity-90 truncate pl-2 flex items-center justify-end gap-2">
                            {!state.isOnline && <span className="text-[10px] font-bold bg-red-500 text-white px-2 py-0.5 rounded sm:hidden">OFFLINE</span>}
                            <CalendarClock className="w-4 h-4 text-white/80" />
                            {currentDateTime.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} {currentDateTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                </header>
            )}

            {/* Main Content Area */}
            <main className={`flex-grow w-full ${mainClass}`}>
                {children}
            </main>

            {/* Bottom Navigation for Desktop & Mobile */}
            {currentPage !== 'INVOICE_DESIGNER' && (
                <nav className={`fixed pb-[env(safe-area-inset-bottom)] z-50 transition-all duration-300 ${navContainerClass}`}>
                    <div className="hidden md:flex w-full overflow-x-auto custom-scrollbar">
                        <div className="flex flex-nowrap mx-auto items-center gap-2 lg:gap-6 p-2 px-6 min-w-max">
                            {mainNavItems.map(item => (
                                <div key={item.page} className="w-16 lg:w-20 flex-shrink-0">
                                    <NavItem
                                        page={item.page}
                                        label={item.label}
                                        icon={item.icon}
                                        onClick={() => onNavigate(item.page as Page)}
                                        isActive={currentPage === item.page}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Mobile Navigation View */}
                    <div className="md:hidden flex w-full justify-around items-center p-2 px-4 shadow-lg-up">
                        {pinnedItems.map(item => (
                            <div key={item.page} className="flex-1 max-w-[4rem]">
                                <NavItem
                                    page={item.page}
                                    label={item.label}
                                    icon={item.icon}
                                    onClick={() => onNavigate(item.page as Page)}
                                    isActive={currentPage === item.page}
                                />
                            </div>
                        ))}
                        <div className="flex-1 max-w-[4rem]">
                            <button
                                onClick={() => setIsMenuOpen(true)}
                                className={`flex flex-col items-center justify-center w-full pt-3 pb-2 px-0.5 rounded-2xl transition-all duration-300 group text-white/70 hover:text-white hover:bg-white/10`}
                            >
                                <div className={`p-1 rounded-full text-white/70`}>
                                    <Menu size={24} strokeWidth={2} />
                                </div>
                                <span className={`text-[9px] sm:text-[10px] font-semibold mt-1 leading-tight`}>More</span>
                            </button>
                        </div>
                    </div>
                </nav>
            )}
        </div >
    );
};

export default AppLayout;
