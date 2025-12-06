
import React from 'react';
import { Bell, ShieldAlert, Clock, Archive, Trash2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import Button from './Button';
import { Page, Notification } from '../types';
import { useSwipe } from '../hooks/useSwipe';

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

const NotificationIcon: React.FC<{ type: Notification['type'] }> = ({ type }) => {
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
}> = ({ notification, onDismiss, onClick }) => {
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
                className={`relative bg-white dark:bg-slate-800 p-3 flex items-start gap-3 transition-transform duration-200 ${notification.actionLink ? 'cursor-pointer' : ''} ${!notification.read ? 'bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/50 dark:hover:bg-purple-900/80' : 'hover:bg-gray-50 dark:hover:bg-slate-700/50'}`}
                style={{ transform: `translateX(${offset}px)` }}
            >
                <NotificationIcon type={notification.type} />
                <div className="flex-grow min-w-0">
                    <p className="font-semibold text-sm truncate">{notification.title}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 break-words line-clamp-2">{notification.message}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{timeSince(notification.createdAt)}</p>
                </div>
            </div>
        </div>
    );
};

const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ isOpen, onClose, onNavigate }) => {
    const { state, dispatch } = useAppContext();
    const { notifications } = state;

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

    if (!isOpen) return null;

    return (
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
    );
};

export default NotificationsPanel;
