import React, { createContext, useContext, useReducer, useEffect, useRef, ReactNode, useCallback } from 'react';
import { GoogleUser, AppMetadataPin, AppMetadata, Page } from '../types';
import { loadGoogleScript, initGoogleAuth, getUserInfo, revokeConsent, DriveService } from '../utils/googleDrive';
import { useUI } from './UIContext';
import { saveCollection, getAll, upsertItem } from '../utils/db';

// --- Types ---
interface AuthState {
    googleUser: GoogleUser | null;
    pin: string | null;
    isLocked: boolean;
    isAuthenticated: boolean;
    isStaffMode: boolean;
    protectedPages: string[];
    // NEW: Track token refresh
    tokenRefreshTimer: number | null;
}

type AuthAction =
    | { type: 'SET_GOOGLE_USER'; payload: GoogleUser | null }
    | { type: 'SET_PIN'; payload: string | null }
    | { type: 'SET_LOCK'; payload: boolean }
    | { type: 'SET_AUTHENTICATED'; payload: boolean }
    | { type: 'SET_STAFF_MODE'; payload: boolean }
    | { type: 'SET_PROTECTED_PAGES'; payload: string[] }
    // NEW: Token refresh tracking
    | { type: 'SET_TOKEN_REFRESH_TIMER'; payload: number | null };

// --- Initial State ---
const getLocalAuth = (): Partial<AuthState> => {
    if (typeof window === 'undefined') return {};
    let googleUser = null;
    try {
        const storedUser = localStorage.getItem('googleUser');
        if (storedUser) googleUser = JSON.parse(storedUser);
    } catch (e) { }

    return { googleUser };
};

const localAuth = getLocalAuth();

const initialState: AuthState = {
    googleUser: localAuth.googleUser || null,
    pin: null, // Loaded from DB async
    isLocked: false,
    isAuthenticated: false,
    isStaffMode: false,
    protectedPages: [],
    // NEW: Initialize token refresh timer
    tokenRefreshTimer: null
};

// --- Reducer ---
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
    switch (action.type) {
        case 'SET_GOOGLE_USER':
            console.log('[AUTH REDUCER] SET_GOOGLE_USER called', {
                hasPayload: !!action.payload,
                email: action.payload?.email
            });
            if (action.payload) {
                try {
                    localStorage.setItem('googleUser', JSON.stringify(action.payload));
                    console.log('[AUTH REDUCER] ✓ Saved to localStorage');
                } catch (e) {
                    console.error('[AUTH REDUCER] ✗ localStorage save failed:', e);
                }

                try {
                    upsertItem('app_metadata', { id: 'googleUser', ...action.payload, updatedAt: new Date().toISOString() });
                    console.log('[AUTH REDUCER] ✓ Initiated IndexedDB save');
                } catch (e) {
                    console.error('[AUTH REDUCER] ✗ IndexedDB save failed:', e);
                }
            } else {
                console.log('[AUTH REDUCER] Clearing user data');
                localStorage.removeItem('googleUser');
            }
            const newState = { ...state, googleUser: action.payload };
            console.log('[AUTH REDUCER] ✓ New state:', { hasUser: !!newState.googleUser });
            return newState;
        case 'SET_PIN': {
            const pinMeta: AppMetadataPin = { id: 'securityPin', pin: action.payload || '', updatedAt: new Date().toISOString() };
            upsertItem('app_metadata', pinMeta);
            return { ...state, pin: action.payload };
        }
        case 'SET_LOCK':
            return { ...state, isLocked: action.payload };
        case 'SET_AUTHENTICATED':
            return { ...state, isAuthenticated: action.payload };
        case 'SET_STAFF_MODE': {
            const staffMeta: AppMetadata = { id: 'staffMode', value: action.payload, updatedAt: new Date().toISOString() };
            upsertItem('app_metadata', staffMeta);
            return { ...state, isStaffMode: action.payload };
        }
        case 'SET_PROTECTED_PAGES': {
            // protectedPages is part of securityPin metadata in the union, but if we want it isolated, we need a type.
            // Based on types/metadata.ts, it's in AppMetadataPin.
            const pinMeta: AppMetadataPin = { id: 'securityPin', protectedPages: action.payload as Page[], updatedAt: new Date().toISOString() };
            upsertItem('app_metadata', pinMeta);
            return { ...state, protectedPages: action.payload };
        }
        case 'SET_TOKEN_REFRESH_TIMER':
            return { ...state, tokenRefreshTimer: action.payload };
        default:
            return state;
    }
};

// --- Context ---
interface AuthContextType {
    authState: AuthState;
    authDispatch: React.Dispatch<AuthAction>;
    googleSignIn: (options?: { forceConsent?: boolean }) => void;
    googleSignOut: () => void;
    unlockApp: () => void;
    lockApp: () => void;
    refreshGoogleToken: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [authState, authDispatch] = useReducer(authReducer, initialState);
    const { showToast } = useUI();
    const tokenClientRef = useRef<any>(null);
    const tokenRefreshTimerRef = useRef<number | null>(null);
    const refreshGoogleTokenRef = useRef<() => void>(() => { });

    const { googleUser } = authState;

    // NEW: Token refresh timer cleanup on unmount
    useEffect(() => {
        return () => {
            if (tokenRefreshTimerRef.current) {
                clearTimeout(tokenRefreshTimerRef.current);
                authDispatch({ type: 'SET_TOKEN_REFRESH_TIMER', payload: null });
            }
        };
    }, []);

    // NEW: Auto-refresh token before expiration
    const scheduleTokenRefresh = useCallback((user: GoogleUser | null) => {
        // Clear any existing timer
        if (tokenRefreshTimerRef.current) {
            clearTimeout(tokenRefreshTimerRef.current);
            tokenRefreshTimerRef.current = null;
            authDispatch({ type: 'SET_TOKEN_REFRESH_TIMER', payload: null });
        }

        if (user && user.expiresAt) {
            const isMobile = DriveService.isMobile();

            // Refresh 5 minutes before expiration to be safe
            const refreshTime = user.expiresAt - Date.now() - (5 * 60 * 1000); // 5 minutes before expiry

            if (refreshTime > 0) {
                const timerId = window.setTimeout(() => {
                    console.log('[AUTH] Token about to expire, checking refresh strategy...');

                    if (isMobile) {
                        // On mobile, auto-redirect refresh can be VERY disruptive.
                        // We will NOT auto-refresh via redirect. Instead, we'll let the next 
                        // manual sync or action trigger the sign-in modal if needed.
                        console.log('[AUTH] Mobile detected: Skipping auto-refresh to avoid disruptive redirect.');
                    } else {
                        refreshGoogleTokenRef.current();
                    }
                }, refreshTime);

                // Store timer ID in both ref and state
                tokenRefreshTimerRef.current = timerId;
                authDispatch({ type: 'SET_TOKEN_REFRESH_TIMER', payload: timerId });
                console.log(`[AUTH] Scheduled token check in ${Math.round(refreshTime / 60000)} minutes (isMobile: ${isMobile})`);
            } else {
                // Token already expired or will expire soon
                if (!isMobile) {
                    console.log('[AUTH] Token already expired or expiring soon, refreshing immediately');
                    refreshGoogleTokenRef.current();
                } else {
                    console.log('[AUTH] Mobile detected: Token expired but skipping auto-refresh to avoid redirect.');
                }
            }
        }
    }, [authDispatch]); // Include only non-circular dependencies

    // NEW: Update token refresh when user changes
    useEffect(() => {
        scheduleTokenRefresh(authState.googleUser);
    }, [authState.googleUser]); // Don't include scheduleTokenRefresh to avoid infinite loop

    // Restore auth state from IndexedDB if localStorage is empty (recovery scenario)
    useEffect(() => {
        const restoreAuthFromDB = async () => {
            try {
                // Check if localStorage has googleUser first
                const storedUser = localStorage.getItem('googleUser');
                if (storedUser) {
                    // User data is already in localStorage, no need to restore from DB
                    return;
                }

                // Only try to restore from DB if localStorage is truly missing the user data
                const metadata = await getAll('app_metadata');
                const googleUserMeta = metadata.find((m: any) => m.id === 'googleUser');
                if (googleUserMeta) {
                    const user: GoogleUser = {
                        name: googleUserMeta.name,
                        email: googleUserMeta.email,
                        picture: googleUserMeta.picture,
                        accessToken: googleUserMeta.accessToken,
                        expiresAt: googleUserMeta.expiresAt
                    };
                    // Check if token is still valid (not expired)
                    if (user.expiresAt && user.expiresAt > Date.now()) {
                        localStorage.setItem('googleUser', JSON.stringify(user));
                        authDispatch({ type: 'SET_GOOGLE_USER', payload: user });
                        console.log('[Auth] Restored user from IndexedDB');
                    } else {
                        console.log('[Auth] Stored token expired, user needs to re-authenticate');
                    }
                }
            } catch (e) {
                console.error('[Auth] Failed to restore from IndexedDB:', e);
                // Don't crash the app if IndexedDB fails, just continue without auth
            }
        };

        // Only attempt to restore if we're in a browser environment and have access to storage
        if (typeof window !== 'undefined' && window.localStorage) {
            restoreAuthFromDB();
        }
    }, []);

    // Initialize Google Auth
    useEffect(() => {
        loadGoogleScript()
            .then(() => {
                tokenClientRef.current = initGoogleAuth(handleGoogleLoginResponse, (err: any) => {
                    console.error("Google Auth Init Error:", err);
                });
            })
            .catch(console.error);

        // Check for redirect response on mount (Mobile fallback)
        const checkRedirect = async () => {
            const hash = window.location.hash;
            const search = window.location.search;

            console.log('[AUTH] Checking for OAuth redirect...', {
                hash: hash.substring(0, 100),
                search: search.substring(0, 100),
                fullURL: window.location.href
            });

            // NEW: Support for combined hash/search parameters (some browsers/redirects vary)
            const fullQuery = (search + hash).replace(/^#/, '&').replace(/^\?/, '&');
            const urlParams = new URLSearchParams(fullQuery);

            const accessToken = urlParams.get('access_token');
            const expiresIn = urlParams.get('expires_in');
            const error = urlParams.get('error');
            const errorDesc = urlParams.get('error_description');

            if (accessToken) {
                console.log('[AUTH] Found access_token in URL, processing login...');
                await handleGoogleLoginResponse({
                    access_token: accessToken,
                    expires_in: parseInt(expiresIn || '3600', 10)
                });
                // Remove auth params from URL but keep the rest
                const cleanURL = window.location.href
                    .replace(/[#&]access_token=[^&]*/, '')
                    .replace(/[#&]expires_in=[^&]*/, '')
                    .replace(/[#&]token_type=[^&]*/, '')
                    .replace(/[#&]scope=[^&]*/, '')
                    .replace(/[#&]authuser=[^&]*/, '')
                    .replace(/[#&]prompt=[^&]*/, '');

                window.history.replaceState(null, '', cleanURL);
            } else if (error) {
                console.error("[AUTH] OAuth Redirect Error:", error, errorDesc);
                showToast(`Sign-in could not be completed: ${errorDesc || error}`, 'error');
            }
        };
        checkRedirect();
    }, []);

    // Handle Login Response
    const handleGoogleLoginResponse = async (response: any) => {
        console.log("[AUTH] handleGoogleLoginResponse triggered", {
            hasError: !!response.error,
            hasAccessToken: !!response.access_token,
            scope: response.scope,
            expiresIn: response.expires_in,
            fullResponse: response
        });

        if (response.error) {
            console.error("[AUTH] Google Login Error:", response.error);
            showToast(`Sign-in failed: ${response.error}`, 'error');
            return;
        }

        if (response.access_token) {
            console.log("[AUTH] Access token received, fetching user info...");
            try {
                const userInfo = await getUserInfo(response.access_token);
                console.log("[AUTH] User info fetched:", { name: userInfo.name, email: userInfo.email });

                const expiresAt = Date.now() + (response.expires_in * 1000);

                const user: GoogleUser = {
                    name: userInfo.name,
                    email: userInfo.email,
                    picture: userInfo.picture,
                    accessToken: response.access_token,
                    expiresAt: expiresAt
                };

                console.log("[AUTH] Saving user to state and localStorage...");

                // Save to localStorage first (synchronous)
                try {
                    localStorage.setItem('googleUser', JSON.stringify(user));
                    console.log("[AUTH] ✓ Saved to localStorage");
                } catch (e) {
                    console.error("[AUTH] ✗ Failed to save to localStorage:", e);
                }

                // Save to IndexedDB (async, fire-and-forget in reducer)
                authDispatch({ type: 'SET_GOOGLE_USER', payload: user });
                console.log("[AUTH] ✓ Dispatched SET_GOOGLE_USER action");

                showToast(`Welcome, ${user.name}!`, 'success');
                console.log("[AUTH] ✓ Sign-in complete!");

            } catch (err) {
                console.error("[AUTH] Failed to get user info:", err);
                showToast("Failed to get user info. Please try again.", 'error');
            }
        } else {
            console.warn("[AUTH] No access_token in response:", response);
            showToast("Sign-in incomplete. Please try again.", 'error');
        }
    };

    const googleSignIn = (options?: { forceConsent?: boolean }) => {
        if (!navigator.onLine) {
            showToast("Internet connection required to sign in.", 'error');
            return;
        }

        console.log('[Auth] Sign-in initiated', {
            hasTokenClient: !!tokenClientRef.current,
            forceConsent: options?.forceConsent
        });

        // Force fresh init if consent is requested (retrying)
        if (options?.forceConsent) {
            tokenClientRef.current = null;
        }

        if (!tokenClientRef.current) {
            showToast("Initializing login...", 'info');
            loadGoogleScript().then(() => {
                tokenClientRef.current = initGoogleAuth(handleGoogleLoginResponse, console.error);
                tokenClientRef.current.requestAccessToken({ prompt: options?.forceConsent ? 'consent' : '' });
            });
            return;
        }

        const prompt = options?.forceConsent ? 'consent' : '';
        tokenClientRef.current.requestAccessToken({ prompt });
    };

    const googleSignOut = () => {
        if (authState.googleUser?.accessToken) {
            revokeConsent(authState.googleUser.accessToken);
        }
        authDispatch({ type: 'SET_GOOGLE_USER', payload: null });
        showToast("Signed out successfully.");
    };

    const refreshGoogleToken = () => {
        if (tokenClientRef.current) {
            console.log('[AUTH] Attempting to refresh token via token client...');
            tokenClientRef.current.requestAccessToken({ prompt: '' });
        } else {
            console.log('[AUTH] No token client available, initializing...');
            loadGoogleScript().then(() => {
                tokenClientRef.current = initGoogleAuth(handleGoogleLoginResponse, (err: any) => {
                    console.error("Refresh Init Error:", err);
                    // If refresh fails, user needs to sign in again
                    showToast("Session expired. Please sign in again.", 'info');
                });
                tokenClientRef.current.requestAccessToken({ prompt: '' });
            }).catch(console.error);
        }
    };

    // Update the ref when the function is defined
    useEffect(() => {
        refreshGoogleTokenRef.current = refreshGoogleToken;
    }, [refreshGoogleToken]);

    const unlockApp = () => authDispatch({ type: 'SET_LOCK', payload: false });
    const lockApp = () => authDispatch({ type: 'SET_LOCK', payload: true });

    return (
        <AuthContext.Provider value={{
            authState,
            authDispatch,
            googleSignIn,
            googleSignOut,
            unlockApp,
            lockApp,
            refreshGoogleToken
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};
