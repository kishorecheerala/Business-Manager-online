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
    const handleLoginResponseRef = useRef<(response: any) => Promise<void>>(async () => { });

    const { googleUser } = authState;

    // Token refresh timer cleanup on unmount
    useEffect(() => {
        return () => {
            if (tokenRefreshTimerRef.current) {
                clearTimeout(tokenRefreshTimerRef.current);
                authDispatch({ type: 'SET_TOKEN_REFRESH_TIMER', payload: null });
            }
        };
    }, [authDispatch]);

    const scheduleTokenRefresh = useCallback((user: GoogleUser | null) => {
        if (tokenRefreshTimerRef.current) {
            clearTimeout(tokenRefreshTimerRef.current);
            tokenRefreshTimerRef.current = null;
            authDispatch({ type: 'SET_TOKEN_REFRESH_TIMER', payload: null });
        }

        if (user && user.expiresAt) {
            const isMobile = DriveService.isMobile();
            const refreshTime = user.expiresAt - Date.now() - (5 * 60 * 1000);

            if (refreshTime > 0) {
                const timerId = window.setTimeout(() => {
                    console.log('[AUTH] Token expired. Session cleared.');
                    // Passive logout: Clear state but don't show a disruptive popup
                    authDispatch({ type: 'SET_GOOGLE_USER', payload: null });
                    // Optional: We can show a toast here, but if the user is inactive it might be annoying.
                    // Instead, we'll let the next manual action (like sync) show the error.
                }, refreshTime + (1000)); // Buffer to actually let it expire

                tokenRefreshTimerRef.current = timerId;
                authDispatch({ type: 'SET_TOKEN_REFRESH_TIMER', payload: timerId });
                console.log(`[AUTH] Session timeout scheduled in ${Math.round(refreshTime / 60000)} minutes.`);
            } else {
                console.log('[AUTH] Session already expired. Clearing...');
                authDispatch({ type: 'SET_GOOGLE_USER', payload: null });
            }
        }
    }, [authDispatch]);

    useEffect(() => {
        scheduleTokenRefresh(authState.googleUser);
    }, [authState.googleUser, scheduleTokenRefresh]);

    // Restore auth state from IndexedDB if localStorage is empty
    useEffect(() => {
        const restoreAuthFromDB = async () => {
            try {
                const storedUser = localStorage.getItem('googleUser');
                if (storedUser) return;

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
                    if (user.expiresAt && user.expiresAt > Date.now()) {
                        localStorage.setItem('googleUser', JSON.stringify(user));
                        authDispatch({ type: 'SET_GOOGLE_USER', payload: user });
                    }
                }
            } catch (e) {
                console.error('[Auth] Failed to restore from IndexedDB:', e);
            }
        };

        if (typeof window !== 'undefined' && window.localStorage) {
            restoreAuthFromDB();
        }
    }, [authDispatch]);

    // Handle Login Response implementation
    const handleGoogleLoginResponse = async (response: any) => {
        console.log("[AUTH] handleGoogleLoginResponse triggered", {
            hasError: !!response.error,
            hasAccessToken: !!response.access_token
        });

        if (response.error) {
            console.error("[AUTH] Google Login Error:", response.error);
            showToast(`Sign-in failed: ${response.error}`, 'error');
            return;
        }

        if (response.access_token) {
            try {
                const userInfo = await getUserInfo(response.access_token);
                const expiresIn = parseInt(response.expires_in || '3600', 10);
                const expiresAt = Date.now() + (expiresIn * 1000);

                const user: GoogleUser = {
                    name: userInfo.name,
                    email: userInfo.email,
                    picture: userInfo.picture,
                    accessToken: response.access_token,
                    expiresAt: expiresAt
                };

                localStorage.setItem('googleUser', JSON.stringify(user));
                authDispatch({ type: 'SET_GOOGLE_USER', payload: user });
                showToast(`Welcome, ${user.name}!`, 'success');
            } catch (err) {
                console.error("[AUTH] Failed to get user info:", err);
                showToast("Failed to get user info. Please try again.", 'error');
            }
        } else {
            console.warn("[AUTH] No access_token in response:", response);
            showToast("Sign-in incomplete. Please try again.", 'error');
        }
    };

    // Update the ref for the response handler
    useEffect(() => {
        handleLoginResponseRef.current = handleGoogleLoginResponse;
    }, [handleGoogleLoginResponse]);

    // Initialize Google Auth
    useEffect(() => {
        loadGoogleScript()
            .then(() => {
                const proxyCallback = (resp: any) => handleLoginResponseRef.current(resp);
                tokenClientRef.current = initGoogleAuth(proxyCallback, (err: any) => {
                    console.error("Google Auth Init Error:", err);
                });
            })
            .catch(console.error);

        // checkRedirect fallback
        const checkRedirect = async () => {
            const hash = window.location.hash;
            const search = window.location.search;
            const fullQuery = (search + hash).replace(/^#/, '&').replace(/^\?/, '&');
            const urlParams = new URLSearchParams(fullQuery);

            const accessToken = urlParams.get('access_token');
            const expiresIn = urlParams.get('expires_in');

            if (accessToken) {
                console.log('[AUTH] Found access_token in URL...');
                await handleGoogleLoginResponse({
                    access_token: accessToken,
                    expires_in: parseInt(expiresIn || '3600', 10)
                });

                const cleanURL = window.location.href
                    .replace(/[#&]access_token=[^&]*/, '')
                    .replace(/[#&]expires_in=[^&]*/, '')
                    .replace(/[#&]token_type=[^&]*/, '')
                    .replace(/[#&]scope=[^&]*/, '');
                window.history.replaceState(null, '', cleanURL);
            }
        };
        checkRedirect();
    }, []);

    const googleSignIn = (options?: { forceConsent?: boolean }) => {
        if (!navigator.onLine) {
            showToast("Internet connection required to sign in.", 'error');
            return;
        }

        if (options?.forceConsent) {
            tokenClientRef.current = null;
        }

        if (!tokenClientRef.current) {
            showToast("Initializing login...", 'info');
            loadGoogleScript().then(() => {
                const proxyCallback = (resp: any) => handleLoginResponseRef.current(resp);
                tokenClientRef.current = initGoogleAuth(proxyCallback, console.error);
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
        localStorage.removeItem('googleUser');
        authDispatch({ type: 'SET_GOOGLE_USER', payload: null });
        showToast("Signed out successfully.");
    };

    const refreshGoogleToken = () => {
        if (tokenClientRef.current) {
            tokenClientRef.current.requestAccessToken({ prompt: '' });
        } else {
            loadGoogleScript().then(() => {
                const proxyCallback = (resp: any) => handleLoginResponseRef.current(resp);
                tokenClientRef.current = initGoogleAuth(proxyCallback, (err: any) => {
                    console.error("Refresh Init Error:", err);
                    showToast("Session expired. Please sign in again.", 'info');
                });
                tokenClientRef.current.requestAccessToken({ prompt: '' });
            }).catch(console.error);
        }
    };

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
