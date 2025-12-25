import React, { useState, useRef, Suspense, useMemo } from 'react';
import {
    Menu, Search, Sparkles, WifiOff, Sun, Moon, RefreshCw, CloudOff, Cloud, Bell, HelpCircle, CalendarClock,
    Plus, X, Settings, ShoppingCart, UserPlus, PackagePlus, Receipt, Undo2, FileText, Package, BarChart2, Layout
} from 'lucide-react';
import { Page, AppMetadata } from '../types';
import { useAppContext } from '../context/AppContext';
import { useDialog } from '../context/DialogContext';
import { useOnClickOutside } from '../hooks/useOnClickOutside';
import NavItem from './NavItem';
import { ICON_MAP, LABEL_MAP } from '../utils/iconMap';
import { QUICK_ACTION_REGISTRY } from '../utils/quickActions';
import PinModal from './PinModal'; // Static import for debugging

import { lazyImport } from '../utils/lazyImport';

// Lazy loaded components for the layout
const MenuPanel = lazyImport(() => import('./MenuPanel'));
const NotificationsPanel = lazyImport(() => import('./NotificationsPanel'));
const AskAIModal = lazyImport(() => import('./AskAIModal'));
const HelpModal = lazyImport(() => import('./HelpModal'));
const UniversalSearch = lazyImport(() => import('./UniversalSearch'));
const DeveloperToolsModal = lazyImport(() => import('./DeveloperToolsModal'));
const CloudDebugModal = lazyImport(() => import('./CloudDebugModal'));

import { useHotkeys } from '../hooks/useHotkeys';
const ProfileModal = lazyImport(() => import('./ProfileModal'));
const NavCustomizerModal = lazyImport(() => import('./NavCustomizerModal'));
const ChangeLogModal = lazyImport(() => import('./ChangeLogModal'));
const SignInModal = lazyImport(() => import('./SignInModal'));
// const PinModal = lazyImport(() => import('./PinModal'));
const APIConfigModal = lazyImport(() => import('./APIConfigModal'));
const SecuritySettingsModal = lazyImport(() => import('./SecuritySettingsModal'));

interface AppLayoutProps {
    children: React.ReactNode;
    currentPage: Page;
    onNavigate: (page: Page) => void;
}

const AppLayout: React.FC<AppLayoutProps> = ({
    children,
    currentPage,
    onNavigate
}) => {
    const { state, dispatch, syncData, showToast, lockApp } = useAppContext();
    const { showConfirm } = useDialog();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
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
    const [isSecuritySettingsOpen, setIsSecuritySettingsOpen] = useState(false);



    const [isAPIConfigOpen, setIsAPIConfigOpen] = useState(false);

    const notificationsRef = useRef<HTMLDivElement>(null);
    useOnClickOutside(notificationsRef, () => setIsNotificationsOpen(false));

    // Time state
    const [currentDateTime, setCurrentDateTime] = React.useState(new Date());
    React.useEffect(() => {
        const timer = setInterval(() => setCurrentDateTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Global Search Shortcut (Cmd+K)
    useHotkeys('k', () => {
        setIsSearchOpen(true);
    }, { ctrl: true });

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
        lockApp();
        setIsMenuOpen(false);
        showToast("App Locked", 'info');
    };

    const handleOpenDevTools = () => {
        setIsDevToolsOpen(true);
        setIsMenuOpen(false);
    };

    // Prepare Nav Items
    const { mainNavItems, pinnedItems, mobilePinnedItems, mobileMoreItems } = useMemo(() => {
        const order = state.navOrder || [];

        const mainNavItems = order
            .filter(id => id !== 'SYSTEM_OPTIMIZER')
            .map(id => ({
                page: id, label: LABEL_MAP[id] || id, icon: ICON_MAP[id]
            }));

        const pinnedIds = order.slice(0, 4);
        const menuIds = order.slice(4);

        // For Desktop: Show 4 pinned
        const pinnedItems = pinnedIds.map(id => ({ page: id, label: LABEL_MAP[id] || id, icon: ICON_MAP[id] }));

        // For Mobile: Show 4 pinned in bar (Index 0, 1, 2, 3)
        // The 5th pinned item (Index 4) moves to "More" for mobile
        const mobilePinnedItems = pinnedIds.slice(0, 4).map(id => ({ page: id, label: LABEL_MAP[id] || id, icon: ICON_MAP[id] }));

        // Mobile More includes the 5th pinned item + rest
        const mobileRestIds = [pinnedIds.slice(4), ...menuIds].flat().filter(Boolean);
        const mobileMoreItems = mobileRestIds.map(id => ({ page: id, label: LABEL_MAP[id] || id, icon: ICON_MAP[id] }));

        return { mainNavItems, pinnedItems, mobilePinnedItems, mobileMoreItems };
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

    // --- Security Logic ---
    const isPageProtected = useMemo(() => {
        return state.protectedPages.includes(currentPage);
    }, [state.protectedPages, currentPage]);

    const requiresAuth = isPageProtected && !state.isAuthenticated;
    const showLockScreen = state.isLocked || requiresAuth;

    const handleUnlock = () => {
        if (state.isLocked) {
            dispatch({ type: 'UNLOCK_APP' });
        } else {
            dispatch({ type: 'SET_AUTHENTICATED', payload: true });
        }
    };

    if (showLockScreen && state.pin) {
        return (
            <Suspense fallback={null}>
                <PinModal
                    mode="unlock"
                    storedPin={state.pin}
                    onCorrectPin={handleUnlock}
                    onResetRequest={() => {
                        showConfirm("Resetting passcode will remove all security locks.", { variant: 'danger' }).then(confirmed => {
                            if (confirmed) {
                                dispatch({ type: 'SET_PIN', payload: null });
                                dispatch({ type: 'UNLOCK_APP' });
                                dispatch({ type: 'SET_AUTHENTICATED', payload: true });
                            }
                        });
                    }}
                />
            </Suspense>
        );
    }

    return (
        <div className={`min-h-screen flex flex-col bg-background dark:bg-slate-950 text-text dark:text-slate-200 transition-colors duration-300`}>
            {/* Modals & Overlays */}
            <Suspense fallback={null}>



                <ChangeLogModal isOpen={isChangeLogOpen} onClose={() => setIsChangeLogOpen(false)} />
                <SignInModal isOpen={isSignInModalOpen} onClose={() => setIsSignInModalOpen(false)} />
                <MenuPanel
                    isOpen={isMenuOpen}
                    onClose={() => setIsMenuOpen(false)}
                    onProfileClick={() => setIsProfileModalOpen(true)}
                    onNavigate={onNavigate}
                    onOpenDevTools={handleOpenDevTools} // Secured Handler
                    onOpenChangeLog={() => setIsChangeLogOpen(true)}
                    onOpenSignIn={() => setIsSignInModalOpen(true)}

                    onLockApp={handleLockApp}
                    onOpenAPIConfig={() => setIsAPIConfigOpen(true)}
                    onHelpClick={() => setIsHelpOpen(true)}
                    onOpenNavCustomizer={() => setIsNavCustomizerOpen(true)}
                    onOpenSecuritySettings={() => setIsSecuritySettingsOpen(true)}
                />
                <UniversalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} onNavigate={onNavigate} />
                <AskAIModal isOpen={isAskAIOpen} onClose={() => setIsAskAIOpen(false)} onNavigate={onNavigate} />
                <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
                <SecuritySettingsModal isOpen={isSecuritySettingsOpen} onClose={() => setIsSecuritySettingsOpen(false)} />
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

                        <div className="absolute left-0 right-0 top-0 bottom-0 flex flex-col justify-center items-center pointer-events-none z-10 px-28 sm:px-16">
                            <button
                                onClick={() => onNavigate('DASHBOARD')}
                                className="pointer-events-auto flex flex-col items-center justify-center hover:opacity-90 transition-opacity"
                            >
                                <h1 className="text-lg sm:text-xl font-bold tracking-tight truncate max-w-[200px] sm:max-w-[300px] leading-tight drop-shadow-sm">
                                    {state.profile?.name || (state.profile?.ownerName || 'Saree Business Manager')}
                                </h1>
                                <div className="flex items-center gap-1.5 mt-0.5 animate-fade-in-fast">
                                    {state.googleUser ? (
                                        <>
                                            <span className="text-[10px] sm:text-xs font-medium text-white/95 truncate max-w-[150px] drop-shadow-sm">
                                                {state.googleUser.name}
                                            </span>
                                            <div className="relative flex h-2 w-2 shrink-0">
                                                {state.isOnline && state.syncStatus !== 'error' && (
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                )}
                                                <span className={`relative inline-flex rounded-full h-2 w-2 ${!state.isOnline || state.syncStatus === 'error' ? 'bg-red-500' : 'bg-green-400'} shadow-sm`}></span>
                                            </div>

                                            {/* Last Synced Time - Aligned Single Line */}
                                            <div className="flex items-center gap-1.5">
                                                <span className="hidden sm:inline text-xs font-medium text-white/90">
                                                    {state.syncStatus === 'syncing' ? 'Status:' :
                                                        state.syncStatus === 'error' ? 'Status:' :
                                                            'Last Synced:'}
                                                </span>
                                                <span className="text-[10px] sm:text-xs font-bold text-white drop-shadow-md flex items-center">
                                                    {state.syncStatus === 'syncing' ? (
                                                        <>
                                                            Syncing
                                                            <span className="animate-bounce-dot mx-[1px]" style={{ animationDelay: '0s' }}>.</span>
                                                            <span className="animate-bounce-dot mx-[1px]" style={{ animationDelay: '0.2s' }}>.</span>
                                                            <span className="animate-bounce-dot mx-[1px]" style={{ animationDelay: '0.4s' }}>.</span>
                                                        </>
                                                    ) :
                                                        state.syncStatus === 'error' ? 'Failed' :
                                                            state.lastSyncTime ? new Date(state.lastSyncTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) :
                                                                'Not synced'}
                                                </span>
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

                            <div className="flex items-center gap-2">
                                {/* Old Last Synced Block Removed */}
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
                                    title={state.lastSyncTime ? `Last Synced: ${new Date(state.lastSyncTime).toLocaleString()}` : "Sync Data"}
                                >
                                    {state.syncStatus === 'syncing' ? (
                                        <RefreshCw size={20} className="animate-spin" />
                                    ) : state.syncStatus === 'error' ? (
                                        <CloudOff size={20} className="text-red-300" />
                                    ) : (
                                        <Cloud size={20} className={!state.googleUser ? "opacity-70" : ""} />
                                    )}
                                </button>
                            </div>

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
                            {currentDateTime.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} {currentDateTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }).toUpperCase()}
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
                        <div className="flex flex-nowrap mx-auto items-center justify-center gap-1 lg:gap-4 p-2 px-4 w-full">
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
                    {/* Mobile Navigation Bar - Now Themed */}
                    <nav
                        className={`md:hidden fixed z-[40] transition-all duration-500 pb-safe animate-slide-up-fade ${state.uiPreferences?.navStyle === 'floating' ? 'bottom-4 left-4 right-4 rounded-2xl shadow-xl' : 'bottom-0 left-0 right-0 rounded-t-[30px] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] border-t border-white/10'}`}
                        style={{
                            background: state.themeGradient || state.themeColor || (state.theme === 'dark' ? '#0f172a' : '#ffffff'),
                            backdropFilter: 'blur(12px)',
                        }}
                    >
                        <div className="flex justify-between items-center h-16 px-2">
                            {/* Slots 1-3: Pinned Items */}
                            {mobilePinnedItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = currentPage === item.page;
                                const isThemed = !!(state.themeGradient || state.themeColor);
                                return (
                                    <div key={item.page} className="flex-1 max-w-[4.5rem]">
                                        <button
                                            onClick={() => onNavigate(item.page as Page)}
                                            className={`flex flex-col items-center justify-center w-full pt-2 pb-1 px-1 rounded-xl transition-all duration-300 group ${isActive ? 'scale-105 font-bold' : 'opacity-80 hover:opacity-100'}`}
                                            style={{ color: isThemed ? 'white' : undefined }}
                                        >
                                            <div className={`p-1 rounded-full mb-0.5 transition-colors ${isActive ? (isThemed ? 'bg-white/20' : 'bg-theme/10') : ''}`}
                                            >
                                                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                                            </div>
                                            <span className={`text-[10px] leading-tight truncate w-full text-center ${isActive ? '' : 'font-medium'}`}>{item.label}</span>
                                        </button>
                                    </div>
                                );
                            })}

                            {/* Slot 4: More */}
                            <div className="flex-1 max-w-[4.5rem]">
                                <button
                                    onClick={() => setIsMoreMenuOpen(true)}
                                    className={`flex flex-col items-center justify-center w-full pt-2 pb-1 px-1 rounded-xl transition-all duration-300 group ${isMoreMenuOpen ? 'scale-105 font-bold' : 'opacity-80 hover:opacity-100'}`}
                                    style={{ color: (state.themeGradient || state.themeColor) ? 'white' : undefined }}
                                >
                                    <div className={`p-1 rounded-full mb-0.5 transition-colors ${isMoreMenuOpen ? 'bg-white/20' : ''}`}
                                    >
                                        <Menu size={20} strokeWidth={2} />
                                    </div>
                                    <span className="text-[10px] leading-tight font-medium">More</span>
                                </button>
                            </div>

                            {/* Slot 5: Add (New Style - Tab-like) */}
                            <div className="flex-1 max-w-[4.5rem]">
                                <button
                                    onClick={() => setIsMobileQuickAddOpen(true)}
                                    className={`flex flex-col items-center justify-center w-full pt-2 pb-1 px-1 rounded-xl transition-all duration-300 group ${isMobileQuickAddOpen ? 'scale-105 font-bold' : 'opacity-80 hover:opacity-100'}`}
                                    style={{ color: (state.themeGradient || state.themeColor) ? 'white' : undefined }}
                                >
                                    <div className={`p-1 rounded-full mb-0.5 transition-colors ${isMobileQuickAddOpen ? 'bg-white/20' : ''}`}
                                    >
                                        <Plus size={20} strokeWidth={3} className="animate-pulse" />
                                    </div>
                                    <span className="text-[10px] leading-tight font-medium">Add</span>
                                </button>
                            </div>
                        </div>
                    </nav>

                    {/* Mobile Quick Add VIBRANT FAB Menu (Replaces Sheet) */}
                    {isMobileQuickAddOpen && (
                        <>
                            <div className="fixed inset-0 z-[59] bg-black/40 backdrop-blur-[4px] transition-opacity" onClick={() => setIsMobileQuickAddOpen(false)} />

                            {/* Customizable Quick Actions - Curved Layout */}
                            {/* Combined List for Curve Calculation */}
                            {[
                                // Customize Item (Last in stack, First physically?) - Order matters for Index 
                                // Let's stack from bottom up.
                                ...Object.entries(QUICK_ACTION_REGISTRY as any).slice(0, 5).reverse().map(([key, action]: [string, any]) => ({
                                    label: action.label,
                                    icon: action.icon,
                                    onClick: () => {
                                        setIsMobileQuickAddOpen(false);
                                        if (action.action) {
                                            dispatch({ type: 'SET_SELECTION', payload: { page: action.page, id: action.action as any } });
                                        }
                                        onNavigate(action.page);
                                    }
                                })),
                                {
                                    label: 'Customize',
                                    icon: Settings,
                                    onClick: () => { setIsMobileQuickAddOpen(false); setIsNavCustomizerOpen(true); }
                                }
                            ].map((item, index) => {
                                // Straight Line with Slight Curve
                                const bottomPos = 90 + (index * 55);
                                const rightPos = 24 + (Math.pow(index, 1.2) * 10);
                                const delay = index * 40;

                                return (
                                    <div
                                        key={index}
                                        className="fixed z-[60] flex items-center justify-end animate-scale-in origin-bottom-right"
                                        style={{
                                            bottom: `${bottomPos}px`,
                                            right: `${rightPos}px`,
                                            animationDelay: `${delay}ms`
                                        }}
                                    >
                                        <span
                                            className="absolute right-16 px-3 py-1 bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200 text-xs font-bold rounded-lg shadow-md whitespace-nowrap opacity-0 animate-fade-in-right origin-right"
                                            style={{
                                                animationDelay: `${delay + 100}ms`,
                                                animationFillMode: 'forwards'
                                            }}
                                        >
                                            {item.label}
                                        </span>
                                        <button
                                            onClick={item.onClick}
                                            className="w-12 h-12 rounded-full shadow-lg shadow-black/20 flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-all text-white border-2 border-white/20"
                                            style={{
                                                background: state.themeGradient || state.themeColor || '#0f172a'
                                            }}
                                        >
                                            <item.icon size={20} strokeWidth={2.5} />
                                        </button>
                                    </div>
                                );
                            })}
                        </>
                    )}

                    {/* Mobile More Menu Sheet */}
                    {/* Mobile More VIBRANT FAB Menu */}
                    {isMoreMenuOpen && (
                        <>
                            <div className="fixed inset-0 z-[59] bg-black/40 backdrop-blur-[4px] transition-opacity" onClick={() => setIsMoreMenuOpen(false)} />

                            {/* More Menu - Curved Layout */}
                            {[
                                ...mobileMoreItems.map((item) => ({
                                    label: item.label,
                                    icon: item.icon,
                                    onClick: () => {
                                        setIsMoreMenuOpen(false);
                                        onNavigate(item.page as Page);
                                    }
                                })),
                                {
                                    label: 'AI Center',
                                    icon: Sparkles,
                                    onClick: () => { setIsMoreMenuOpen(false); setIsAskAIOpen(true); }
                                },
                                {
                                    label: 'Customize Nav',
                                    icon: Layout,
                                    onClick: () => { setIsMoreMenuOpen(false); setIsNavCustomizerOpen(true); }
                                },
                                {
                                    label: 'Settings',
                                    icon: Settings,
                                    onClick: () => { setIsMoreMenuOpen(false); setIsMenuOpen(true); }
                                }
                            ].map((item, index) => {
                                // Straight Line with Slight Curve
                                const bottomPos = 90 + (index * 55);
                                const rightPos = 24 + (Math.pow(index, 1.2) * 10);
                                const delay = index * 40;

                                return (
                                    <div
                                        key={index}
                                        className="fixed z-[60] flex items-center justify-end animate-scale-in origin-bottom-right"
                                        style={{
                                            bottom: `${bottomPos}px`,
                                            right: `${rightPos}px`,
                                            animationDelay: `${delay}ms`
                                        }}
                                    >
                                        <span
                                            className="absolute right-16 px-3 py-1 bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200 text-xs font-bold rounded-lg shadow-md whitespace-nowrap opacity-0 animate-fade-in-right origin-right"
                                            style={{
                                                animationDelay: `${delay + 100}ms`,
                                                animationFillMode: 'forwards'
                                            }}
                                        >
                                            {item.label}
                                        </span>
                                        <button
                                            onClick={item.onClick}
                                            className="w-12 h-12 rounded-full shadow-lg shadow-black/20 flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-all text-white border-2 border-white/20"
                                            style={{
                                                background: state.themeGradient || state.themeColor || '#0f172a'
                                            }}
                                        >
                                            <item.icon size={20} strokeWidth={2.5} />
                                        </button>
                                    </div>
                                );
                            })}
                        </>
                    )}
                </nav >
            )}
        </div >
    );
};

export default AppLayout;
