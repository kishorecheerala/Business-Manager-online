/**
 * Admin Notification Service
 * Allows developer (cheeralakishore@gmail.com) to broadcast messages to all users
 * Uses Google Drive as the backend storage
 */

import type { Notification } from '../types/metadata';

const DEV_MESSAGES_FOLDER = 'BusinessManager_DevMessages';
const SUPPORT_SESSIONS_FOLDER = 'BusinessManager_SupportSessions';

interface BroadcastMessage {
    id: string;
    title: string;
    message: string;
    createdAt: string;
    type: 'developer' | 'support';
    priority: 'low' | 'normal' | 'high' | 'urgent';
    metadata?: {
        requiresAction?: boolean;
        supportCode?: string;
        troubleshootingSteps?: string[];
        minVersion?: string;
        maxVersion?: string;
    };
}

// Helper to get headers for Google Drive API
const getHeaders = (accessToken: string) => ({
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
});

// Helper to handle API errors
const handleApiError = async (response: Response, context: string) => {
    let details = response.statusText;
    try {
        const body = await response.json();
        if (body.error) {
            details = body.error.message || JSON.stringify(body.error);
        }
    } catch (e) {
        try {
            const text = await response.text();
            if (text) details = text;
        } catch (e2) { }
    }
    const msg = `${context}: ${response.status} (${details})`;
    console.error(msg);
    throw new Error(msg);
};

/**
 * Find or create the developer messages folder in Google Drive
 */
export async function getDevMessagesFolderId(accessToken: string): Promise<string> {
    // Search for existing folder
    const q = `mimeType='application/vnd.google-apps.folder' and name='${DEV_MESSAGES_FOLDER}' and trashed=false`;
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)`;

    const searchResponse = await fetch(searchUrl, {
        headers: getHeaders(accessToken),
        cache: 'no-store'
    });

    if (!searchResponse.ok) {
        await handleApiError(searchResponse, 'Search Dev Folder Failed');
    }

    const searchData = await searchResponse.json();

    if (searchData.files && searchData.files.length > 0) {
        return searchData.files[0].id;
    }

    // Create folder if it doesn't exist
    const metadata = {
        name: DEV_MESSAGES_FOLDER,
        mimeType: 'application/vnd.google-apps.folder',
    };

    const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: getHeaders(accessToken),
        body: JSON.stringify(metadata),
        cache: 'no-store'
    });

    if (!createResponse.ok) {
        await handleApiError(createResponse, 'Create Dev Folder Failed');
    }

    const folder = await createResponse.json();
    return folder.id;
}

/**
 * Send a broadcast notification to all users
 * Only accessible to cheeralakishore@gmail.com
 */
export async function sendBroadcastNotification(
    accessToken: string,
    title: string,
    message: string,
    priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal',
    options: {
        type?: 'developer' | 'support';
        requiresAction?: boolean;
        supportCode?: string;
        troubleshootingSteps?: string[];
        minVersion?: string;
        maxVersion?: string;
    } = {}
): Promise<string> {
    const folderId = await getDevMessagesFolderId(accessToken);

    const broadcastMessage: BroadcastMessage = {
        id: `broadcast_${Date.now()}`,
        title,
        message,
        createdAt: new Date().toISOString(),
        type: options.type || 'developer',
        priority,
        metadata: {
            requiresAction: options.requiresAction,
            supportCode: options.supportCode,
            troubleshootingSteps: options.troubleshootingSteps,
            minVersion: options.minVersion || '0.0.0',
            maxVersion: options.maxVersion || '99.99.99',
        }
    };

    const filename = `${broadcastMessage.id}.json`;
    const fileContent = JSON.stringify(broadcastMessage, null, 2);

    // Upload to Google Drive
    const metadata = {
        name: filename,
        mimeType: 'application/json',
        parents: [folderId]
    };

    const initResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
        method: 'POST',
        headers: getHeaders(accessToken),
        body: JSON.stringify(metadata)
    });

    if (!initResponse.ok) {
        await handleApiError(initResponse, 'Init Upload Failed');
    }

    const sessionUri = initResponse.headers.get('Location');
    if (!sessionUri) throw new Error('Failed to get upload session URI');

    const uploadResponse = await fetch(sessionUri, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: fileContent
    });

    if (!uploadResponse.ok) {
        await handleApiError(uploadResponse, 'Upload Failed');
    }

    const result = await uploadResponse.json();
    console.log('Broadcast message sent:', result.id);
    return result.id;
}

/**
 * Fetch developer messages for the current user
 * Returns messages that haven't been read yet
 */
export async function fetchDeveloperMessages(accessToken: string): Promise<Notification[]> {
    try {
        const folderId = await getDevMessagesFolderId(accessToken);

        // List all message files, newest first
        const q = `'${folderId}' in parents and trashed=false`;
        const listUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&orderBy=createdTime desc&fields=files(id,name)&pageSize=50`;

        const listResponse = await fetch(listUrl, {
            headers: getHeaders(accessToken),
            cache: 'no-store'
        });

        if (!listResponse.ok) {
            await handleApiError(listResponse, 'List Messages Failed');
        }

        const listData = await listResponse.json();

        if (!listData.files || listData.files.length === 0) {
            return [];
        }

        // Get stored message IDs that user has already seen
        const seenMessagesKey = 'dev_messages_seen';
        const seenMessages = new Set<string>(
            JSON.parse(localStorage.getItem(seenMessagesKey) || '[]')
        );

        // Download and parse each message file
        const notifications: Notification[] = [];

        for (const file of listData.files) {
            // Skip if already seen
            const messageId = file.name.replace('.json', '');
            if (seenMessages.has(messageId)) continue;

            try {
                const downloadUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`;
                const downloadResponse = await fetch(downloadUrl, {
                    headers: { 'Authorization': `Bearer ${accessToken}` },
                    cache: 'no-store'
                });

                if (downloadResponse.ok) {
                    const broadcastMessage: BroadcastMessage = await downloadResponse.json();

                    // Convert to Notification format
                    notifications.push({
                        id: broadcastMessage.id,
                        title: broadcastMessage.title,
                        message: broadcastMessage.message,
                        read: false,
                        createdAt: broadcastMessage.createdAt,
                        type: broadcastMessage.type,
                        isDeveloperMessage: true,
                        priority: broadcastMessage.priority,
                        metadata: broadcastMessage.metadata,
                    });
                }
            } catch (err) {
                console.warn('Failed to download message:', file.name, err);
            }
        }

        return notifications;
    } catch (error) {
        console.error('Failed to fetch developer messages:', error);
        return [];
    }
}

/**
 * Mark a developer message as read/seen
 */
export function markDeveloperMessageAsRead(messageId: string): void {
    const seenMessagesKey = 'dev_messages_seen';
    const seenMessages = new Set<string>(
        JSON.parse(localStorage.getItem(seenMessagesKey) || '[]')
    );
    seenMessages.add(messageId);
    localStorage.setItem(seenMessagesKey, JSON.stringify([...seenMessages]));
}

/**
 * Get list of sent broadcast messages (for admin panel)
 */
export async function getSentMessages(accessToken: string): Promise<BroadcastMessage[]> {
    try {
        const folderId = await getDevMessagesFolderId(accessToken);

        const q = `'${folderId}' in parents and trashed=false`;
        const listUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&orderBy=createdTime desc&fields=files(id,name,createdTime)&pageSize=20`;

        const listResponse = await fetch(listUrl, {
            headers: getHeaders(accessToken),
            cache: 'no-store'
        });

        if (!listResponse.ok) return [];

        const listData = await listResponse.json();

        if (!listData.files || listData.files.length === 0) {
            return [];
        }

        const messages: BroadcastMessage[] = [];

        for (const file of listData.files) {
            try {
                const downloadUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`;
                const downloadResponse = await fetch(downloadUrl, {
                    headers: { 'Authorization': `Bearer ${accessToken}` },
                    cache: 'no-store'
                });

                if (downloadResponse.ok) {
                    const message: BroadcastMessage = await downloadResponse.json();
                    messages.push(message);
                }
            } catch (err) {
                console.warn('Failed to download message:', file.name, err);
            }
        }

        return messages;
    } catch (error) {
        console.error('Failed to get sent messages:', error);
        return [];
    }
}

/**
 * Delete a broadcast message
 */
export async function deleteBroadcastMessage(accessToken: string, messageId: string): Promise<boolean> {
    try {
        const folderId = await getDevMessagesFolderId(accessToken);
        const filename = `${messageId}.json`;

        // Find the file
        const q = `name='${filename}' and '${folderId}' in parents and trashed=false`;
        const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)`;

        const searchResponse = await fetch(searchUrl, {
            headers: getHeaders(accessToken),
            cache: 'no-store'
        });

        if (!searchResponse.ok) return false;

        const searchData = await searchResponse.json();

        if (!searchData.files || searchData.files.length === 0) {
            return false;
        }

        const fileId = searchData.files[0].id;

        // Delete the file
        const deleteResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        return deleteResponse.ok;
    } catch (error) {
        console.error('Failed to delete message:', error);
        return false;
    }
}

/**
 * Generate system diagnostics for remote support
 */
export function generateDiagnostics(supportCode: string): any {
    const diagnostics = {
        supportCode,
        timestamp: new Date().toISOString(),
        system: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            online: navigator.onLine,
            cookiesEnabled: navigator.cookieEnabled,
            screenResolution: `${window.screen.width}x${window.screen.height}`,
            viewport: `${window.innerWidth}x${window.innerHeight}`,
        },
        storage: {
            localStorageSize: 0,
            indexedDBSize: 0,
        },
        app: {
            version: '1.0.0', // Get from package.json or metadata
            url: window.location.href,
            isStandalone: window.matchMedia('(display-mode: standalone)').matches,
        },
        errors: [] as string[],
    };

    // Estimate localStorage size
    try {
        let totalSize = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                totalSize += localStorage[key].length + key.length;
            }
        }
        diagnostics.storage.localStorageSize = Math.round(totalSize / 1024); // KB
    } catch (e) {
        diagnostics.errors.push('Failed to calculate localStorage size');
    }

    // Get recent errors from console (if stored)
    try {
        const recentErrors = localStorage.getItem('recent_errors');
        if (recentErrors) {
            diagnostics.errors = JSON.parse(recentErrors);
        }
    } catch (e) {
        // Ignore
    }

    return diagnostics;
}

/**
 * Upload diagnostics to support sessions folder
 */
export async function uploadDiagnostics(
    accessToken: string,
    supportCode: string,
    diagnostics: any
): Promise<string | null> {
    try {
        // Get or create support sessions folder
        const q = `mimeType='application/vnd.google-apps.folder' and name='${SUPPORT_SESSIONS_FOLDER}' and trashed=false`;
        const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)`;

        const searchResponse = await fetch(searchUrl, {
            headers: getHeaders(accessToken),
            cache: 'no-store'
        });

        let folderId: string;

        if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            if (searchData.files && searchData.files.length > 0) {
                folderId = searchData.files[0].id;
            } else {
                // Create folder
                const metadata = {
                    name: SUPPORT_SESSIONS_FOLDER,
                    mimeType: 'application/vnd.google-apps.folder',
                };
                const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
                    method: 'POST',
                    headers: getHeaders(accessToken),
                    body: JSON.stringify(metadata),
                });
                const folder = await createResponse.json();
                folderId = folder.id;
            }
        } else {
            return null;
        }

        // Upload diagnostics file
        const filename = `diagnostics_${supportCode}.json`;
        const fileContent = JSON.stringify(diagnostics, null, 2);

        const metadata = {
            name: filename,
            mimeType: 'application/json',
            parents: [folderId]
        };

        const initResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
            method: 'POST',
            headers: getHeaders(accessToken),
            body: JSON.stringify(metadata)
        });

        const sessionUri = initResponse.headers.get('Location');
        if (!sessionUri) return null;

        const uploadResponse = await fetch(sessionUri, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: fileContent
        });

        if (uploadResponse.ok) {
            const result = await uploadResponse.json();
            return result.id;
        }

        return null;
    } catch (error) {
        console.error('Failed to upload diagnostics:', error);
        return null;
    }
}
