import React, { useState, useEffect } from 'react';
import { Send, History, Trash2, AlertCircle, CheckCircle, Clock, MessageSquare } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useUI } from '../context/UIContext';
import { useAuth } from '../context/AuthContext';
import {
    sendBroadcastNotification,
    getSentMessages,
    deleteBroadcastMessage
} from '../utils/adminNotifications';
import Button from './Button';

interface SentMessage {
    id: string;
    title: string;
    message: string;
    createdAt: string;
    type: 'developer' | 'support';
    priority: 'low' | 'normal' | 'high' | 'urgent';
}

const DeveloperBroadcastPanel: React.FC = () => {
    const { state } = useData();
    const { showToast } = useUI();
    const { authState } = useAuth();
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
    const [messageType, setMessageType] = useState<'developer' | 'support'>('developer');
    const [isSending, setIsSending] = useState(false);
    const [sentMessages, setSentMessages] = useState<SentMessage[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    // Security check - only show for developer
    if (authState.googleUser?.email !== 'cheeralakishore@gmail.com') {
        return null;
    }

    const loadSentMessages = async () => {
        if (!authState.googleUser?.accessToken) return;

        setIsLoadingHistory(true);
        try {
            const messages = await getSentMessages(authState.googleUser.accessToken);
            setSentMessages(messages);
        } catch (error) {
            console.error('Failed to load sent messages:', error);
            showToast('Failed to load message history', 'error');
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const handleSendBroadcast = async () => {
        if (!title.trim() || !message.trim()) {
            showToast('Please enter both title and message', 'error');
            return;
        }

        if (!authState.googleUser?.accessToken) {
            showToast('Please sign in with Google first', 'error');
            return;
        }

        setIsSending(true);
        try {
            await sendBroadcastNotification(
                authState.googleUser.accessToken,
                title,
                message,
                priority,
                { type: messageType }
            );

            showToast('Broadcast sent successfully!', 'success');
            setTitle('');
            setMessage('');
            setPriority('normal');
            setMessageType('developer');

            // Reload history
            if (showHistory) {
                loadSentMessages();
            }
        } catch (error) {
            console.error('Failed to send broadcast:', error);
            showToast('Failed to send broadcast', 'error');
        } finally {
            setIsSending(false);
        }
    };

    const handleDeleteMessage = async (messageId: string) => {
        if (!authState.googleUser?.accessToken) return;

        if (!confirm('Are you sure you want to delete this message?')) return;

        try {
            const success = await deleteBroadcastMessage(authState.googleUser.accessToken, messageId);
            if (success) {
                showToast('Message deleted', 'success');
                setSentMessages(prev => prev.filter(m => m.id !== messageId));
            } else {
                showToast('Failed to delete message', 'error');
            }
        } catch (error) {
            console.error('Failed to delete message:', error);
            showToast('Failed to delete message', 'error');
        }
    };

    const getPriorityColor = (p: string) => {
        switch (p) {
            case 'urgent': return 'text-red-600 bg-red-100 dark:bg-red-900/30';
            case 'high': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30';
            case 'normal': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30';
            case 'low': return 'text-gray-600 bg-gray-100 dark:bg-gray-700/30';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                        <MessageSquare size={20} />
                        Developer Broadcast
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Send notifications to all app users
                    </p>
                </div>
                <Button
                    onClick={() => {
                        setShowHistory(!showHistory);
                        if (!showHistory) loadSentMessages();
                    }}
                    variant="secondary"
                    className="text-xs"
                >
                    <History size={14} className="mr-1" />
                    {showHistory ? 'Hide' : 'Show'} History
                </Button>
            </div>

            {/* Broadcast Form */}
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700 space-y-4">
                <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-2">
                        Message Title
                    </label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g., Important Update Available"
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                        maxLength={100}
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-2">
                        Message Content
                    </label>
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Enter your message to all users..."
                        rows={4}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white resize-none"
                        maxLength={500}
                    />
                    <p className="text-xs text-gray-400 mt-1 text-right">
                        {message.length}/500
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-2">
                            Priority
                        </label>
                        <select
                            value={priority}
                            onChange={(e) => setPriority(e.target.value as any)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                        >
                            <option value="low">Low</option>
                            <option value="normal">Normal</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-2">
                            Type
                        </label>
                        <select
                            value={messageType}
                            onChange={(e) => setMessageType(e.target.value as any)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                        >
                            <option value="developer">Developer Announcement</option>
                            <option value="support">Support Request</option>
                        </select>
                    </div>
                </div>

                <Button
                    onClick={handleSendBroadcast}
                    disabled={isSending || !title.trim() || !message.trim()}
                    className="w-full"
                >
                    {isSending ? (
                        <>
                            <Clock size={16} className="mr-2 animate-spin" />
                            Sending...
                        </>
                    ) : (
                        <>
                            <Send size={16} className="mr-2" />
                            Send Broadcast to All Users
                        </>
                    )}
                </Button>
            </div>

            {/* Message History */}
            {showHistory && (
                <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
                    <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                        Sent Messages
                    </h4>

                    {isLoadingHistory ? (
                        <div className="text-center py-8 text-gray-500">
                            <Clock size={24} className="mx-auto mb-2 animate-spin" />
                            <p className="text-sm">Loading history...</p>
                        </div>
                    ) : sentMessages.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <AlertCircle size={24} className="mx-auto mb-2" />
                            <p className="text-sm">No messages sent yet</p>
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {sentMessages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className="p-3 rounded-md bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600"
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex-1">
                                            <h5 className="text-sm font-bold text-gray-900 dark:text-white">
                                                {msg.title}
                                            </h5>
                                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                                {msg.message}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteMessage(msg.id)}
                                            className="text-red-500 hover:text-red-600 ml-2"
                                            title="Delete message"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                        <span className={`px-2 py-0.5 rounded-full font-medium ${getPriorityColor(msg.priority)}`}>
                                            {msg.priority}
                                        </span>
                                        <span className="text-gray-500">
                                            {msg.type === 'developer' ? '📢' : '🛠️'} {msg.type}
                                        </span>
                                        <span className="text-gray-400 ml-auto">
                                            {new Date(msg.createdAt).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Info Panel */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-3">
                    <AlertCircle size={20} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-blue-800 dark:text-blue-300 space-y-1">
                        <p className="font-bold">How it works:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                            <li>Messages are stored in your Google Drive folder</li>
                            <li>User apps poll for new messages every 10 minutes</li>
                            <li>Notifications appear in users' notification panel</li>
                            <li>Messages persist until users manually dismiss them</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeveloperBroadcastPanel;
