import React, { createContext, useContext, useReducer, useEffect, useRef, ReactNode, useCallback } from 'react';
import { GoogleUser, AppMetadataPin, AppMetadata, Page } from '../types';
import { loadGoogleScript, initGoogleAuth, getUserInfo, revokeConsent } from '../utils/googleDrive';
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
}

type AuthAction =
    | { type: 'SET_GOOGLE_USER'; payload: GoogleUser | null }
    | { type: 'SET_PIN'; payload: string | null }
    | { type: 'SET_LOCK'; payload: boolean }
    | { type: 'SET_AUTHENTICATED'; payload: boolean }
    | { type: 'SET_STAFF_MODE'; payload: boolean }
    | { type: 'SET_PROTECTED_PAGES'; payload: string[] };

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
    protectedPages: []
};

// --- Reducer ---
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
    switch (action.type) {
        case 'SET_GOOGLE_USER':
            if (action.payload) {
                localStorage.setItem('googleUser', JSON.stringify(action.payload));
            } else {
                localStorage.removeItem('googleUser');
            }
            return { ...state, googleUser: action.payload };
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

    // Initialize Google Auth
    useEffect(() => {
        loadGoogleScript()
            .then(() => {
                tokenClientRef.current = initGoogleAuth(handleGoogleLoginResponse, (err: any) => {
                    console.error("Google Auth Init Error:", err);
                });
            })
            .catch(console.error);
    }, []);

    // Handle Login Response
    const handleGoogleLoginResponse = async (response: any) => {
        if (response.access_token) {
            try {
                const userInfo = await getUserInfo(response.access_token);
                const expiresAt = Date.now() + (response.expires_in * 1000);

                const user: GoogleUser = {
                    name: userInfo.name,
                    email: userInfo.email,
                    picture: userInfo.picture,
                    accessToken: response.access_token,
                    expiresAt: expiresAt
                };

                // Save to local storage and state
                // Note: We also save to DB 'app_metadata' generally, but that might belong in DataContext?
                // Actually, saving user metadata is Auth concern.
                // We need to fetch current metadata to append? Or just save isolated?
                // 'saveCollection' overwrites? No, 'saveCollection' (from db.ts) usually saves the whole array.
                // We'll need to handle DB persistence carefully. For now, rely on LocalStorage + State.
                // Revisit DB persistence when connecting DataContext.

                authDispatch({ type: 'SET_GOOGLE_USER', payload: user });
                showToast(`Welcome, ${user.name}!`, 'success');

            } catch (err) {
                console.error("Login Error:", err);
                showToast("Failed to get user info.", 'error');
            }
        }
    };

    const googleSignIn = (options?: { forceConsent?: boolean }) => {
        if (!navigator.onLine) {
            showToast("Internet connection required to sign in.", 'error');
            return;
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
            tokenClientRef.current.requestAccessToken({ prompt: '' });
        }
    };

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
