
// NOTE: You must replace this with your own Client ID from Google Cloud Console
// Go to https://console.cloud.google.com/apis/credentials
// Create an OAuth 2.0 Client ID -> Web Application
// Add your Vercel URL (https://kishore-business-manager.vercel.app) to "Authorized JavaScript origins"
// ENSURE NO TRAILING SLASH at the end of the URL in Google Console (e.g., use .app NOT .app/).
const DEFAULT_CLIENT_ID = '647430742620-e9ev2ravu25cj170o42gvvbpqqq4cmhc.apps.googleusercontent.com'.trim();

import { DriveFile, DriveDebugInfo, DriveUser, DailyFilenames } from '../types';

export const getClientId = () => {
    return localStorage.getItem('google_client_id') || DEFAULT_CLIENT_ID;
};

// Updated Scopes: Includes Drive File access, User Profile, Calendar, and Spreadsheets
const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/spreadsheets';

// Folder name in Google Drive
const APP_FOLDER_NAME = 'BusinessManager_AppData';

// Helper to generate daily filenames
const getDailyFilenames = (): DailyFilenames => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return {
        core: `BusinessManager_Core_${year}-${month}-${day}.json`,
        assets: `BusinessManager_Assets_${year}-${month}-${day}.json`,
        legacy: `BusinessManager_Backup_${year}-${month}-${day}.json`
    };
};

export const loadGoogleScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        console.log('[GOOGLE] Loading Google Identity Services script...');
        
        if ((window as any).google) {
            console.log('[GOOGLE] ✓ Google script already loaded');
            resolve();
            return;
        }
        
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        
        script.onload = () => {
            console.log('[GOOGLE] ✓ Google script loaded successfully');
            // Give it a moment to initialize
            setTimeout(() => {
                if ((window as any).google?.accounts?.oauth2) {
                    console.log('[GOOGLE] ✓ OAuth2 API available');
                    resolve();
                } else {
                    console.error('[GOOGLE] ✗ OAuth2 API not available after script load');
                    reject(new Error('Google OAuth2 API not available'));
                }
            }, 100);
        };
        
        script.onerror = (error) => {
            console.error('[GOOGLE] ✗ Failed to load Google script:', error);
            reject(error);
        };
        
        document.body.appendChild(script);
        console.log('[GOOGLE] Script tag appended to body');
    });
};

export const initGoogleAuth = (
    callback: (response: any) => void,
    errorCallback?: (error: any) => void,
    modeOverride?: 'popup' | 'redirect'
) => {
    console.log('[GOOGLE] initGoogleAuth called');
    
    // Detect mobile for UX mode selection
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const uxMode = modeOverride || (isMobile ? 'redirect' : 'popup');

    console.log(`[GOOGLE] Initializing Auth with mode: ${uxMode}, isMobile: ${isMobile}`);
    console.log(`[GOOGLE] Current URL: ${window.location.href}`);
    console.log(`[GOOGLE] Origin: ${window.location.origin}`);

    const config: any = {
        client_id: getClientId(),
        scope: SCOPES,
        ux_mode: uxMode,
        redirect_uri: window.location.origin + window.location.pathname,
        error_callback: (err: any) => {
            console.error('[GOOGLE] OAuth error_callback triggered:', err);
            if (errorCallback) errorCallback(err);
            console.error("Google Auth Error:", err);
            const currentOrigin = window.location.origin;
            let msg = `Google Sign-In Error: ${err.type || 'Unknown Error'}\n\n`;
            if (err.message) msg += `Details: ${err.message}\n\n`;

            if (err.type === 'popup_closed') {
                if ((window as any).devMode) console.warn("Google Sign-In popup closed by user.");
                return;
            } else if (err.type === 'popup_failed_to_open') {
                msg = "Popup Blocked\n\n";
                msg += "Your browser blocked the Google Sign-In popup.\n";
                msg += "Please allow popups for this site in your browser settings and try again.";
            } else if (err.type === 'access_denied' || (err.error && err.error === 'access_denied')) {
                msg += "ACCESS DENIED: TEST USER RESTRICTION\n\n";
                msg += "Your app is in 'Testing' mode. Only emails listed as 'Test Users' can sign in.\n\n";
                msg += "1. Go to Google Cloud Console > OAuth Consent Screen.\n";
                msg += "2. Scroll down to the 'Test users' section.\n";
                msg += "3. Click 'Add Users', enter your email address, and Save.\n";
                msg += "4. OR click 'Publish App' to allow anyone.";
            } else {
                msg += "CONFIGURATION ERROR\n\n";
                msg += "If you see 'Error 400: invalid_request':\n";
                msg += "1. Ensure the URL below is in Google Cloud Console > Authorized JavaScript origins:\n";
                msg += `${currentOrigin}\n\n`;
                msg += "2. Ensure there is NO trailing slash (/) at the end of the URL in the console.\n";
                msg += "3. Wait 10 minutes if you recently changed settings.";
            }
            alert(msg);
        }
    };

    if (uxMode === 'popup') {
        config.callback = (resp: any) => {
            console.log("[GOOGLE] Popup callback fired", { 
                hasError: !!resp.error, 
                hasToken: !!resp.access_token 
            });
            callback(resp);
        };
    }

    console.log('[GOOGLE] Creating token client with config:', { 
        client_id: config.client_id.substring(0, 20) + '...', 
        ux_mode: config.ux_mode,
        redirect_uri: config.redirect_uri,
        hasCallback: !!config.callback,
        scope: config.scope
    });
    
    const tokenClient = (window as any).google.accounts.oauth2.initTokenClient(config);
    console.log('[GOOGLE] ✓ Token client created successfully');
    
    return tokenClient;
};

export const revokeConsent = (accessToken: string) => {
    if ((window as any).google) {
        (window as any).google.accounts.oauth2.revoke(accessToken, () => {
            console.log('Consent revoked');
        });
    }
};

// --- Drive API Helpers ---

const getHeaders = (accessToken: string) => ({
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
});

const safeJsonParse = async (response: Response) => {
    try {
        const text = await response.text();
        if (!text || text.trim() === '') return null;
        return JSON.parse(text);
    } catch (e) {
        if ((window as any).devMode) console.warn("JSON Parse Error:", e);
        return null;
    }
};

const filesList = async (accessToken: string, params: Record<string, string>): Promise<DriveFile[]> => {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`https://www.googleapis.com/drive/v3/files?${query}`, {
        headers: getHeaders(accessToken),
        cache: 'no-store'
    });
    if (!response.ok) await handleApiError(response, "List Files Failed");
    const data = await safeJsonParse(response);
    return data && data.files ? (data.files as DriveFile[]) : [];
};

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
}

// --- Data Splitting Optimization Logic ---

const splitStateData = (data: any) => {
    const core = JSON.parse(JSON.stringify(data)); // Deep clone
    const assets: Record<string, any> = { products: {}, expenses: {}, profile: {} };
    let hasAssets = false;

    // Split Product Images
    if (core.products) {
        core.products = core.products.map((p: any) => {
            if (p.image || (p.additionalImages && p.additionalImages.length)) {
                hasAssets = true;
                assets.products[p.id] = {
                    image: p.image,
                    additionalImages: p.additionalImages
                };
                const { image, additionalImages, ...rest } = p;
                return rest;
            }
            return p;
        });
    }

    // Split Expense Receipts
    if (core.expenses) {
        core.expenses = core.expenses.map((e: any) => {
            if (e.receiptImage) {
                hasAssets = true;
                assets.expenses[e.id] = e.receiptImage;
                const { receiptImage, ...rest } = e;
                return rest;
            }
            return e;
        });
    }

    // Split Profile Logo
    if (core.profile && !Array.isArray(core.profile)) {
        const p = core.profile;
        if (p.logo) {
            hasAssets = true;
            if (!assets.profile) assets.profile = {};
            assets.profile[p.id || 'userProfile'] = p.logo;
            delete core.profile.logo;
        }
    } else if (core.profile && Array.isArray(core.profile)) {
        // Legacy array support
        core.profile = core.profile.map((p: any) => {
            if (p.logo) {
                hasAssets = true;
                if (!assets.profile) assets.profile = {};
                assets.profile[p.id] = p.logo;
                const { logo, ...rest } = p;
                return rest;
            }
            return p;
        });
    }

    return { core, assets, hasAssets };
};

const mergeStateData = (core: any, assets: any) => {
    if (!assets) return core;

    if (core.products && assets.products) {
        core.products = core.products.map((p: any) => {
            const asset = assets.products[p.id];
            if (asset) {
                return { ...p, ...asset };
            }
            return p;
        });
    }

    if (core.expenses && assets.expenses) {
        core.expenses = core.expenses.map((e: any) => {
            const img = assets.expenses[e.id];
            if (img) return { ...e, receiptImage: img };
            return e;
        });
    }

    if (core.profile && assets.profile) {
        if (!Array.isArray(core.profile)) {
            const logo = assets.profile[core.profile.id || 'userProfile'];
            if (logo) core.profile.logo = logo;
        } else {
            // Legacy array support
            core.profile = core.profile.map((p: any) => {
                const logo = assets.profile[p.id];
                if (logo) return { ...p, logo };
                return p;
            });
        }
    }

    return core;
};

// --- Low Level Operations ---

export const getCandidateFolders = async (accessToken: string): Promise<DriveFile[]> => {
    const q = `mimeType='application/vnd.google-apps.folder' and name='${APP_FOLDER_NAME}' and trashed=false`;
    const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&orderBy=createdTime desc&fields=files(id,name,createdTime,modifiedTime)`, {
        headers: getHeaders(accessToken),
        cache: 'no-store'
    });
    if (!response.ok) await handleApiError(response, "Search Folders Failed");
    const data = await safeJsonParse(response);
    return data && data.files ? (data.files as DriveFile[]) : [];
};

export const getFolderById = async (accessToken: string, folderId: string) => {
    try {
        const response = await fetch(`https://www.googleapis.com/drive/v3/files/${folderId}?fields=id,name,createdTime,modifiedTime,capabilities`, {
            headers: getHeaders(accessToken),
            cache: 'no-store'
        });
        if (!response.ok) return null; // Likely 404 or 403
        return await safeJsonParse(response);
    } catch (e) {
        return null;
    }
};

export const createFolder = async (accessToken: string) => {
    if ((window as any).devMode) console.log("Creating new app folder...");
    const metadata = {
        name: APP_FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
    };
    const response = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: getHeaders(accessToken),
        body: JSON.stringify(metadata),
        cache: 'no-store'
    });
    if (!response.ok) await handleApiError(response, "Create Folder Failed");
    const file = await safeJsonParse(response);
    return file ? file.id : null;
};

export const findFileByName = async (accessToken: string, folderId: string, filename: string) => {
    // Fetch ALL files with this name, sorted by newest first
    const q = `name='${filename}' and '${folderId}' in parents and trashed=false`;
    const params = new URLSearchParams({
        q: q,
        orderBy: 'modifiedTime desc',
        fields: 'files(id,name,modifiedTime)'
    });

    if ((window as any).devMode) console.log(`[Drive] Searching for ${filename}...`);

    const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
        headers: getHeaders(accessToken),
        cache: 'no-store'
    });

    if (!response.ok) await handleApiError(response, "Search File Failed");
    const data = await safeJsonParse(response);

    if (data && data.files && data.files.length > 0) {
        // The first file is the newest one (Live Sync File)
        const newestFile = data.files[0];

        // If duplicates exist, DELETE the older ones to fix "Split Brain"
        if (data.files.length > 1) {
            if ((window as any).devMode) console.warn(`[Sync Fix] Found ${data.files.length} duplicates for ${filename}. Keeping newest (${newestFile.id}), deleting others...`);

            // Delete older files in background
            const duplicates = data.files.slice(1);
            Promise.all(duplicates.map((file: any) => {
                if ((window as any).devMode) console.log(`[Sync Fix] Deleting duplicate: ${file.id}`);
                return fetch(`https://www.googleapis.com/drive/v3/files/${file.id}`, {
                    method: 'DELETE',
                    headers: getHeaders(accessToken)
                }).catch(e => console.error("Failed to delete duplicate", e));
            }));
        }

        return newestFile;
    }

    return null;
};

// Find latest file starting with a prefix
export const findLatestFileByPrefix = async (accessToken: string, folderId: string, prefix: string) => {
    const q = `name contains '${prefix}' and '${folderId}' in parents and trashed=false`;
    const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&orderBy=modifiedTime desc&pageSize=1`, {
        headers: getHeaders(accessToken),
        cache: 'no-store'
    });
    if (!response.ok) await handleApiError(response, "Search File Prefix Failed");
    const data = await safeJsonParse(response);
    return data && data.files && data.files.length > 0 ? data.files[0] : null;
};

export const uploadFile = async (accessToken: string, folderId: string, content: any, filename: string, existingFileId?: string) => {
    const fileContent = JSON.stringify(content);
    const contentType = 'application/json';

    const metadata: any = {
        name: filename,
        mimeType: contentType
    };

    if (!existingFileId) {
        metadata.parents = [folderId];
    }

    let initUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable';
    let method = 'POST';

    if (existingFileId) {
        initUrl = `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=resumable`;
        method = 'PATCH';
    }

    const initResponse = await fetch(initUrl, {
        method: method,
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(metadata)
    });

    if (!initResponse.ok) await handleApiError(initResponse, "Init Upload Failed");

    const sessionUri = initResponse.headers.get('Location');
    if (!sessionUri) throw new Error("Resumable upload initiation failed: No Location header");

    const uploadResponse = await fetch(sessionUri, {
        method: 'PUT',
        headers: {
            'Content-Type': contentType,
        },
        body: fileContent
    });

    if (!uploadResponse.ok) await handleApiError(uploadResponse, "File Data Upload Failed");

    return await safeJsonParse(uploadResponse);
};

export const downloadFile = async (accessToken: string, fileId: string) => {
    if ((window as any).devMode) console.log(`Downloading file content for ID: ${fileId}`);
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
        cache: 'no-store'
    });

    if (!response.ok) {
        if (response.status === 404) throw new Error(`Download Failed: 404 Not Found (File ID: ${fileId})`);
        await handleApiError(response, "Download Failed");
    }

    const data = await safeJsonParse(response);
    return data;
};

export const deleteFile = async (accessToken: string, fileId: string) => {
    if ((window as any).devMode) console.log(`Deleting file: ${fileId}`);
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!response.ok) {
        await handleApiError(response, "Delete Failed");
    }
    return true;
};

export const getUserInfo = async (accessToken: string): Promise<DriveUser> => {
    try {
        const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { 'Authorization': `Bearer ${accessToken}` },
            cache: 'no-store'
        });
        if (!response.ok) throw new Error(`Failed to fetch user info: ${response.status}`);
        const data = await safeJsonParse(response);
        return data || { name: 'Google User', email: 'User', picture: '' };
    } catch (e) {
        console.error("Error fetching user info:", e);
        return { name: 'Google User', email: 'User', picture: '' };
    }
};

// --- High Level Drive Service ---

// --- High Level Drive Service ---

async function locateDriveConfig(accessToken: string) {
    if ((window as any).devMode) console.log("Locating app folder in Drive...");

    // Use the unified constant APP_FOLDER_NAME
    const folders = await filesList(accessToken, {
        q: `mimeType = 'application/vnd.google-apps.folder' and name = '${APP_FOLDER_NAME}' and trashed = false`,
        fields: 'files(id, name, createdTime)'
    });

    let activeFolderId = null;

    if (folders && folders.length > 0) {
        // PERMANENT FIX: Handle Duplicate Folders
        // Sort by creation time (Oldest is Truth)
        folders.sort((a: any, b: any) => new Date(a.createdTime).getTime() - new Date(b.createdTime).getTime());

        const primaryFolder = folders[0];
        activeFolderId = primaryFolder.id;
        if ((window as any).devMode) console.log(`Selected Master Folder: ${primaryFolder.name} (ID: ${activeFolderId})`);

        // If there are duplicate folders, we just ignore them for now to avoid complex migration risks.
        // We strict-lock to the OLDEST folder to ensure consistency across devices.
        if (folders.length > 1) {
            if ((window as any).devMode) console.warn(`[Sync Warning] Found ${folders.length} app folders. Locked to oldest: ${primaryFolder.id}`);
            // Future enhancement: Move files from other folders to this one and delete them.
        }
    } else {
        console.log("No app folder found. Creating new one.");
        activeFolderId = await createFolder(accessToken);
    }
    return { folderId: activeFolderId };
}

export const debugDriveState = async (accessToken: string): Promise<DriveDebugInfo> => {
    const logs: string[] = [];
    const details: any[] = [];

    logs.push("🔍 Starting Drive Diagnostic Scan...");
    logs.push(`📂 Target App Folder Name: '${APP_FOLDER_NAME}'`);

    const localFolderId = localStorage.getItem('gdrive_folder_id');
    const localFileId = localStorage.getItem('gdrive_sync_file_id');

    logs.push(`💾 Local Cache Folder ID: ${localFolderId || 'None'}`);
    logs.push(`💾 Local Cache File ID:   ${localFileId || 'None'}`);

    // 1. Find Folders
    const folders = await filesList(accessToken, {
        q: `mimeType = 'application/vnd.google-apps.folder' and name = '${APP_FOLDER_NAME}' and trashed = false`,
        fields: 'files(id, name, createdTime)'
    });

    if (!folders || folders.length === 0) {
        logs.push("❌ CRITICAL: No App Folder Found in Drive.");
        return { logs, details };
    }

    // Sort to find Master
    folders.sort((a: any, b: any) => new Date(a.createdTime).getTime() - new Date(b.createdTime).getTime());
    const masterFolder = folders[0];

    logs.push(`✅ Found ${folders.length} app folder(s).`);
    logs.push(`👑 MASTER FOLDER: ${masterFolder.id} (Created: ${masterFolder.createdTime})`);

    if (localFolderId && localFolderId !== masterFolder.id) {
        logs.push(`⚠️ WARNING: Local device is linked to a DIFFERENT folder than Master!`);
        logs.push(`👉 Expected: ${masterFolder.id}`);
        logs.push(`👉 Actual:   ${localFolderId}`);
        logs.push(`🔧 Auto-Fix Recommended: Run a Sync or Re-Auth.`);
    } else if (localFolderId) {
        logs.push(`✅ Device is correctly linked to Master Folder.`);
    }

    if (folders.length > 1) {
        logs.push(`⚠️ WARNING: ${folders.length - 1} Duplicate Folders found! (Split Brain Risk)`);
        folders.slice(1).forEach((f: any) => logs.push(`   - Duplicate: ${f.id} (Created: ${f.createdTime})`));
    }

    // 2. Scan Master Folder Content
    const files = await filesList(accessToken, {
        q: `'${masterFolder.id}' in parents and trashed = false`,
        fields: 'files(id, name, createdTime, modifiedTime, size)'
    });

    if (files) {
        logs.push(`📄 Found ${files.length} files in Master Folder.`);
        details.push({ folder: masterFolder, files: files });

        const syncFile = files.find((f: any) => f.name === STABLE_SYNC_FILENAME);
        if (syncFile) {
            logs.push(`✅ Live Sync File Found: ${syncFile.id}`);
            if (localFileId && localFileId !== syncFile.id) {
                logs.push(`⚠️ WARNING: Local File ID mismatch!`);
                logs.push(`👉 Server: ${syncFile.id}`);
                logs.push(`👉 Local:  ${localFileId}`);
            } else {
                logs.push(`✅ File Link Verified.`);
            }
        } else {
            logs.push(`⚠️ No Live Sync File ('${STABLE_SYNC_FILENAME}') found yet.`);
        }
    }

    return { logs, details };
};

// Fixed filename for stable sync
const STABLE_SYNC_FILENAME = 'BusinessManager_LiveSync.json';
const STABLE_ASSETS_FILENAME = 'BusinessManager_Assets.json';

import { encryptData, decryptData } from './encryption';

export const DriveService = {
    /**
     * Reads data from Drive.
     */
    /**
     * Reads data from Drive using Manifest-based incremental strategy.
     */
    async read(accessToken: string): Promise<any | null> {
        try {
            const { folderId } = await locateDriveConfig(accessToken);
            if (!folderId) return null;
            localStorage.setItem('gdrive_folder_id', folderId);

            // Fetch both Manifest and Legacy Sync file options
            const [manifestFile, stableFile] = await Promise.all([
                findFileByName(accessToken, folderId, 'Manifest.json'),
                findFileByName(accessToken, folderId, STABLE_SYNC_FILENAME)
            ]);

            let useManifest = false;

            // Determine which source is newer
            if (manifestFile && stableFile) {
                const manifestTime = new Date(manifestFile.modifiedTime).getTime();
                const stableTime = new Date(stableFile.modifiedTime).getTime();

                // If Manifest is newer or roughly same time, use it. 
                // Buffer of 1 minute to prefer Manifest (as it takes time to write)
                if (manifestTime >= (stableTime - 60000)) {
                    useManifest = true;
                } else {
                    console.warn(`[Sync] Legacy Sync file is significantly newer than Manifest. Using Legacy file. (Stable: ${stableFile.modifiedTime} vs Manifest: ${manifestFile.modifiedTime})`);
                    useManifest = false;
                }
            } else if (manifestFile) {
                useManifest = true;
            }

            // A. Load from Manifest (Incremental)
            if (useManifest && manifestFile) {
                const manifest = await downloadFile(accessToken, manifestFile.id);
                if (!manifest || !manifest.collections) {
                    console.warn("Manifest empty or invalid. Falling back check...");
                } else {
                    console.log("Read: Loading collections from Manifest...");
                    const collections: Record<string, any[]> = {};
                    const downloadPromises = Object.entries(manifest.collections).map(async ([name, info]: [string, any]) => {
                        try {
                            const data = await downloadFile(accessToken, info.fileId);
                            if (data) collections[name] = data;
                        } catch (err) {
                            console.warn(`Failed to download collection ${name}:`, err);
                        }
                    });

                    await Promise.all(downloadPromises);
                    const combinedData = { ...collections };

                    // Handle API Key
                    if (manifest.metadata?.secure) {
                        try {
                            const decryptedKey = await decryptData(manifest.metadata.secure);
                            if (decryptedKey) localStorage.setItem('gemini_api_key', decryptedKey);
                        } catch (err) {
                            console.warn("Failed to decrypt API Key from Manifest:", err);
                        }
                    }

                    // Load assets if present
                    const assetsFile = await findFileByName(accessToken, folderId, STABLE_ASSETS_FILENAME);
                    if (assetsFile) {
                        const assets = await downloadFile(accessToken, assetsFile.id);
                        return mergeStateData(combinedData, assets);
                    }
                    return combinedData;
                }
            }

            // B. Fallback to Legacy/Stable File
            if (stableFile) {
                console.log("Read: Loading from monolithic LiveSync file...");
                const data = await downloadFile(accessToken, stableFile.id);
                if (data) {
                    localStorage.setItem('gdrive_sync_file_id', stableFile.id);
                    const assetsFile = await findFileByName(accessToken, folderId, STABLE_ASSETS_FILENAME);
                    if (assetsFile) {
                        const assets = await downloadFile(accessToken, assetsFile.id);
                        return mergeStateData(data, assets);
                    }
                }
                return data;
            }

            return null;

        } catch (e: any) {
            console.error("DriveService.read failed", e);
            throw e;
        }
    },

    async writeIncremental(accessToken: string, changedCollections: Record<string, any[]>, fullMetadata?: any): Promise<void> {
        const { folderId } = await locateDriveConfig(accessToken);
        if (!folderId) throw new Error("Could not locate or create Drive folder.");

        try {
            // 1. Load or Create Manifest
            let manifestFile = await findFileByName(accessToken, folderId, 'Manifest.json');
            let manifest: any = { collections: {}, metadata: {} };
            if (manifestFile) {
                manifest = await downloadFile(accessToken, manifestFile.id) || manifest;
            }

            // 2. Upload Changed Collections
            const uploadPromises = Object.entries(changedCollections).map(async ([name, data]) => {
                const filename = `Collection_${name}.json`;
                const existingFileId = manifest.collections[name]?.fileId;
                const result = await uploadFile(accessToken, folderId, data, filename, existingFileId);
                manifest.collections[name] = {
                    fileId: result.id,
                    updatedAt: new Date().toISOString()
                };
            });

            await Promise.all(uploadPromises);

            // 3. Update Manifest Metadata
            if (fullMetadata) manifest.metadata = { ...manifest.metadata, ...fullMetadata };

            const apiKey = localStorage.getItem('gemini_api_key');
            if (apiKey) {
                try {
                    manifest.metadata.secure = await encryptData(apiKey);
                } catch (err) {
                    console.error("Failed to encrypt API key for manifest:", err);
                }
            }

            // 4. Save Manifest
            await uploadFile(accessToken, folderId, manifest, 'Manifest.json', manifestFile?.id);
            console.log("Incremental sync successful.");
        } catch (e: any) {
            console.error("Incremental write failed", e);
            throw e;
        }
    },

    async write(accessToken: string, data: any): Promise<any> {
        // CRITICAL FIX: Do NOT trust local cache for Folder ID.
        // Always resolve the "Master Folder" (Oldest) from server to prevent split-brain.
        // The previous optimization (checking localStorage first) caused devices to get stuck 
        // writing to different duplicate folders.
        const config = await locateDriveConfig(accessToken);
        const folderId = config.folderId; // config is checking for "Oldest"

        if (folderId) localStorage.setItem('gdrive_folder_id', folderId);
        if (!folderId) throw new Error("Could not locate or create Drive folder.");

        try {
            console.log(`Preparing sync upload...`);

            // Encrypt API Key if present
            const apiKey = localStorage.getItem('gemini_api_key');
            if (apiKey) {
                try {
                    const encrypted = await encryptData(apiKey);
                    // Ensure metadata object exists
                    if (!data.metadata) data.metadata = {};
                    data.metadata.secure = encrypted;
                } catch (err) {
                    console.error("Failed to encrypt API key:", err);
                }
            }

            const { core, assets, hasAssets } = splitStateData(data);

            // 1. Resolve Target ID (Prioritize Server Truth)
            // Always search by name to ensure we write to the one everyone else is reading.
            let stableFile = await findFileByName(accessToken, folderId, STABLE_SYNC_FILENAME);
            let targetFileId = stableFile ? stableFile.id : localStorage.getItem('gdrive_sync_file_id');

            if (stableFile) {
                console.log("Write: Updating existing Server File:", stableFile.id);
                localStorage.setItem('gdrive_sync_file_id', stableFile.id);
                targetFileId = stableFile.id;
            } else if (targetFileId) {
                console.log("Write: File not found by name, trying Cached ID:", targetFileId);
            }

            let finalId = '';

            if (targetFileId) {
                try {
                    const result = await uploadFile(accessToken, folderId, core, STABLE_SYNC_FILENAME, targetFileId);
                    finalId = result.id;
                } catch (e) {
                    console.warn("Write to Target ID failed (deleted?). Creating new...");
                    const result = await uploadFile(accessToken, folderId, core, STABLE_SYNC_FILENAME);
                    finalId = result.id;
                }
            } else {
                console.log("Write: Creating NEW Sync file...");
                const result = await uploadFile(accessToken, folderId, core, STABLE_SYNC_FILENAME);
                finalId = result.id;
            }

            // 1a. DAILY BACKUP CHECK (Restore History)
            // Check if we have already created a backup for TODAY. If not, create one.
            const dailyFiles = getDailyFilenames();
            const todayBackupName = dailyFiles.core;

            // We do this check asynchronously/independently so it doesn't block the main sync too much,
            // but we await it to ensure safety.
            const existingDaily = await findFileByName(accessToken, folderId, todayBackupName);
            if (!existingDaily) {
                console.log(`[Backup] No backup found for today (${todayBackupName}). Creating daily snapshot...`);
                try {
                    await uploadFile(accessToken, folderId, core, todayBackupName);
                    console.log("[Backup] Daily snapshot created successfully.");
                } catch (err) {
                    console.error("[Backup] Failed to create daily snapshot:", err);
                    // We continue with Live Sync even if daily backup fails
                }
            } else {
                console.log(`[Backup] Daily backup already exists (${todayBackupName}). Skipping.`);
            }

            // 1b. DAILY ASSET BACKUP (Images)
            if (hasAssets) {
                const todayAssetsName = dailyFiles.assets;
                const existingDailyAssets = await findFileByName(accessToken, folderId, todayAssetsName);
                if (!existingDailyAssets) {
                    console.log(`[Backup] No asset backup found for today (${todayAssetsName}). Creating daily snapshot...`);
                    try {
                        await uploadFile(accessToken, folderId, assets, todayAssetsName);
                        console.log("[Backup] Daily asset snapshot created successfully.");
                    } catch (err) {
                        console.error("[Backup] Failed to create daily asset snapshot:", err);
                    }
                } else {
                    console.log(`[Backup] Daily asset backup already exists (${todayAssetsName}). Skipping.`);
                }
            }

            if (finalId) localStorage.setItem('gdrive_sync_file_id', finalId);

            // 2. Upload Assets
            if (hasAssets) {
                const existingAssets = await findFileByName(accessToken, folderId, STABLE_ASSETS_FILENAME);
                const assetId = existingAssets ? existingAssets.id : undefined;
                await uploadFile(accessToken, folderId, assets, STABLE_ASSETS_FILENAME, assetId);
            }

            console.log("Sync successful. ID:", finalId);
            return finalId;
        } catch (e: any) {
            if (e.message && e.message.includes('404')) {
                console.warn("Folder 404, retrying...", e);
                localStorage.removeItem('gdrive_folder_id');
                return DriveService.write(accessToken, data);
            }
            throw e;
        }
    }
};
