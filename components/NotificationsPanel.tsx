
import React, { useState } from 'react';
import { Bell, ShieldAlert, Clock, Archive, Trash2, Crown, Wrench, AlertTriangle } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import Button from './Button';
import { Page, Notification } from '../types';
import { useSwipe } from '../hooks/useSwipe';
import RemoteSupportModal from './RemoteSupportModal';

interface NotificationsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (page: Page) => void;
}

const timeSince = (date: string): string => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return "Just now";
};

const NotificationIcon: React.FC<{ type: Notification['type']; isDeveloperMessage?: boolean; priority?: string }> = ({ type, isDeveloperMessage, priority }) => {
    // Developer messages get special icons
    if (isDeveloperMessage) {
        if (type === 'support') {
            return <Wrench className="w-5 h-5 text-purple-500 flex-shrink-0" />;
        }
        return <Crown className="w-5 h-5 text-purple-600 flex-shrink-0" />;
    }

    switch (type) {
        case 'backup':
            return <ShieldAlert className="w-5 h-5 text-red-500 flex-shrink-0" />;
        case 'expiry':
            return <Clock className="w-5 h-5 text-orange-500 flex-shrink-0" />;
        case 'stock':
            return <Archive className="w-5 h-5 text-yellow-500 flex-shrink-0" />;
        default:
            return <Bell className="w-5 h-5 text-primary flex-shrink-0" />;
    }
};

// Internal Swipeable Item Component
const SwipeableNotificationItem: React.FC<{
    notification: Notification;
    onDismiss: (id: string) => void;
    onClick: (id: string, type: Notification['type'], actionLink?: Page) => void;
    onOpenSupport: (notification: Notification) => void;
}> = ({ notification, onDismiss, onClick, onOpenSupport }) => {
    const itemRef = React.useRef<HTMLDivElement>(null);
    const [offset, setOffset] = React.useState(0);
    const startX = React.useRef(0);
    const isDragging = React.useRef(false);

    const handleTouchStart = (e: React.TouchEvent) => {
        startX.current = e.touches[0].clientX;
        isDragging.current = true;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging.current) return;
        const currentX = e.touches[0].clientX;
        const diff = currentX - startX.current;
        // Only allow left swipe (negative offset)
        if (diff < 0) {
            setOffset(diff);
        }
    };

    const handleTouchEnd = () => {
        isDragging.current = false;
        if (offset < -100) {
            // Dismiss threshold
            onDismiss(notification.id);
        } else {
            // Snap back
            setOffset(0);
        }
    };

    // Determine background color based on priority
    const getPriorityBg = () => {
        if (!notification.isDeveloperMessage) {
            return !notification.read
                ? 'bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/50 dark:hover:bg-purple-900/80'
                : 'hover:bg-gray-50 dark:hover:bg-slate-700/50';
        }

        switch (notification.priority) {
            case 'urgent':
                return 'bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-900/60 border-l-4 border-red-600';
            case 'high':
                return 'bg-orange-100 dark:bg-orange-900/40 hover:bg-orange-200 dark:hover:bg-orange-900/60 border-l-4 border-orange-600';
            case 'normal':
                return 'bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60 border-l-4 border-blue-600';
            case 'low':
                return 'bg-gray-100 dark:bg-gray-700/40 hover:bg-gray-200 dark:hover:bg-gray-700/60';
            default:
                return 'bg-purple-100 dark:bg-purple-900/40 hover:bg-purple-200 dark:hover:bg-purple-900/60';
        }
    };

    return (
        <div className="relative overflow-hidden">
            {/* Background Action (Delete) */}
            <div className="absolute inset-0 bg-red-500 flex items-center justify-end px-4">
                <Trash2 className="text-white w-5 h-5" />
            </div>

            {/* Foreground Content */}
            <div
                ref={itemRef}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onClick={() => onClick(notification.id, notification.type, notification.actionLink)}
                className={`relative bg-white dark:bg-slate-800 p-3 flex items-start gap-3 transition-transform duration-200 ${notification.actionLink ? 'cursor-pointer' : ''} ${getPriorityBg()}`}
                style={{ transform: `translateX(${offset}px)` }}
            >
                <NotificationIcon
                    type={notification.type}
                    isDeveloperMessage={notification.isDeveloperMessage}
                    priority={notification.priority}
                />
                <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-sm truncate flex-1">{notification.title}</p>
                        {notification.isDeveloperMessage && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-600 text-white uppercase">Dev</span>
                        )}
                        {notification.priority === 'urgent' && (
                            <AlertTriangle className="w-3 h-3 text-red-600" />
                        )}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 break-words line-clamp-2">{notification.message}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{timeSince(notification.createdAt)}</p>

                    {/* Support Button */}
                    {notification.type === 'support' && notification.metadata?.supportCode && (
                        <Button
                            onClick={(e) => {
                                e.stopPropagation();
                                onOpenSupport(notification);
                            }}
                            variant="secondary"
                            className="mt-2 text-xs h-6 px-3 bg-purple-600 text-white hover:bg-purple-700"
                        >
                            <Wrench size={12} className="mr-1" />
                            Get Help
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};

const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ isOpen, onClose, onNavigate }) => {
    const { state, dispatch } = useAppContext();
    const { notifications } = state;
    const [supportModalOpen, setSupportModalOpen] = useState(false);
    const [activeSupportNotification, setActiveSupportNotification] = useState<Notification | null>(null);

    const handleMarkAllAsRead = () => {
        notifications.forEach(n => {
            if (n.type !== 'backup' && !n.read) {
                dispatch({ type: 'MARK_NOTIFICATION_AS_READ', payload: n.id });
            }
        });
    };

    const handleNotificationClick = (id: string, type: Notification['type'], actionLink?: Page) => {
        if (type !== 'backup') {
            dispatch({ type: 'MARK_NOTIFICATION_AS_READ', payload: id });
        }
        if (actionLink) {
            onNavigate(actionLink);
            onClose();
        }
    };

    const handleDismiss = (id: string) => {
        // Since we don't have a 'DELETE_NOTIFICATION' action in reducer yet, 
        // we'll just mark it read for now or filter it out visually.
        // For a full delete, we'd need to add that action.
        // Assuming MARK_READ for now as "dismiss" behavior if delete isn't critical.
        dispatch({ type: 'MARK_NOTIFICATION_AS_READ', payload: id });
    };

    const handleOpenSupport = (notification: Notification) => {
        setActiveSupportNotification(notification);
        setSupportModalOpen(true);
    };

    if (!isOpen) return null;

    return (
        <>
            <div
                className="absolute top-full right-0 mt-2 w-80 max-h-[70vh] flex flex-col bg-white dark:bg-slate-800 rounded-lg shadow-2xl border border-gray-200 dark:border-slate-700 text-text dark:text-slate-200 animate-scale-in origin-top-right z-40 overflow-hidden"
                role="dialog"
                aria-label="Notifications Panel"
            >
                <div className="flex justify-between items-center p-3 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
                    <h3 className="font-bold text-lg text-primary">Notifications</h3>
                    <Button onClick={handleMarkAllAsRead} variant="secondary" className="px-2 py-1 text-xs h-7">
                        Mark all read
                    </Button>
                </div>
                <div className="flex-grow overflow-y-auto custom-scrollbar">
                    {notifications.length === 0 ? (
                        <p className="text-center text-gray-500 dark:text-gray-400 p-6 text-sm">No new notifications.</p>
                    ) : (
                        <div className="divide-y dark:divide-slate-700">
                            {notifications.map(notification => (
                                <SwipeableNotificationItem
                                    key={notification.id}
                                    notification={notification}
                                    onDismiss={handleDismiss}
                                    onClick={handleNotificationClick}
                                    onOpenSupport={handleOpenSupport}
                                />
                            ))}
                        </div>
                    )}
                </div>
                {notifications.length > 0 && (
                    <div className="p-2 bg-gray-50 dark:bg-slate-900/50 border-t dark:border-slate-700 text-center">
                        <p className="text-[10px] text-gray-400">Swipe left to dismiss</p>
                    </div>
                )}
            </div>

            {/* Remote Support Modal */}
            {activeSupportNotification && (
                <RemoteSupportModal
                    isOpen={supportModalOpen}
                    onClose={() => {
                        setSupportModalOpen(false);
                        setActiveSupportNotification(null);
                    }}
                    supportCode={activeSupportNotification.metadata?.supportCode}
                    troubleshootingSteps={activeSupportNotification.metadata?.troubleshootingSteps}
                />
            )}
        </>
    );
};

export default NotificationsPanel;
