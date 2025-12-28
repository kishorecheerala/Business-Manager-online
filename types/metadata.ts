import type { Page, Theme } from "./state";
import type { InvoiceTemplateConfig } from "./template";

export interface GoogleUser {
    name: string;
    email: string;
    picture: string;
    accessToken: string;
    expiresAt?: number;
}

export interface AuditLogEntry {
    id: string;
    timestamp: string;
    user: string;
    action: string;
    details: string;
}

export interface Notification {
    id: string;
    title: string;
    message: string;
    read: boolean;
    createdAt: string;
    type: 'backup' | 'info' | 'expiry' | 'stock';
    actionLink?: Page;
}

export interface ProfileData {
    id: 'userProfile';
    name: string;
    ownerName: string;
    phone: string;
    address: string;
    gstNumber: string;
    logo?: string;
    updatedAt?: string;
}

export interface AppMetadataPin {
    id: 'securityPin';
    pin?: string;
    security?: {
        pin: string;
        enabled: boolean;
        lastAttempt?: number;
    };
    protectedPages?: Page[];
    updatedAt?: string;
}

export interface AppMetadataBackup {
    id: 'lastBackup';
    date: string;
}

export interface AppMetadataRevenueGoal {
    id: 'revenueGoal';
    amount: number;
}

export interface AppMetadataLastModified {
    id: 'lastModified';
    timestamp: number;
}

export interface AppMetadataTheme {
    id: 'themeSettings';
    theme: Theme;
    color: string;
    headerColor?: string;
    gradient: string;
    font?: string;
}

export interface AppMetadataInvoiceSettings {
    id: 'invoiceSettings';
    terms: string;
    footer: string;
    showQr: boolean;
    updatedAt?: string;
    template?: InvoiceTemplateConfig;
}

export interface AppMetadataNavOrder {
    id: 'navOrder';
    order: string[];
    updatedAt?: string;
}

export interface AppMetadataQuickActions {
    id: 'quickActions';
    actions: string[];
    updatedAt?: string;
}

export interface AppMetadataUIPreferences {
    id: 'uiPreferences';
    buttonStyle: 'rounded' | 'pill' | 'sharp';
    cardStyle: 'glass' | 'solid' | 'bordered';
    toastPosition: 'top-center' | 'top-right' | 'bottom-center' | 'bottom-right';
    density: 'comfortable' | 'compact';
    navStyle?: 'docked' | 'floating';
    fontSize?: 'small' | 'normal' | 'large';
    toastOpacity?: number;
    updatedAt?: string;
}

export interface AppMetadataDashboardConfig {
    id: 'dashboardConfig';
    greetingText: string;
    showGreeting: boolean;
    showLogo: boolean;
    titleText: string;
    logoSize?: number;
    logoSizeMobile?: number;
    logoSizeDesktop?: number;
    logoFillMobile?: boolean;
    logoFillDesktop?: boolean;
    logoPositionMobile?: { x: number; y: number };
    logoPositionDesktop?: { x: number; y: number };
    logoSettingsTab?: 'mobile' | 'desktop';
    customLogo?: string;
    useCustomLogo?: boolean;
    uppercaseGreeting?: boolean;
    greetingColor?: string;
    matchThemeColor?: boolean;
    greetingFontSize?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl';
    updatedAt?: string;
}

export interface AppMetadataLastSync {
    id: 'lastSyncTime';
    value: number;
}

export interface AppMetadataAutoCleanup {
    id: 'autoCleanupSettings';
    enabled: boolean;
    logsRetentionDays: number;
    notificationsRetentionDays: number;
    trashRetentionDays: number;
    updatedAt?: string;
}

export interface AppMetadataGoogleUser extends GoogleUser {
    id: 'googleUser';
}

export type AppMetadata = AppMetadataPin | AppMetadataBackup | AppMetadataRevenueGoal | AppMetadataLastModified | AppMetadataTheme | AppMetadataInvoiceSettings | AppMetadataNavOrder | AppMetadataQuickActions | AppMetadataUIPreferences | AppMetadataDashboardConfig | AppMetadataLastSync | AppMetadataGoogleUser | AppMetadataAutoCleanup;
