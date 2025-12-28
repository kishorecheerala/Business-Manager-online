import { AppState, AuditLogEntry } from '../../types';

export const logAction = (state: AppState, actionType: string, details: string): AuditLogEntry => {
    return {
        id: `LOG - ${Date.now()} `,
        timestamp: new Date().toISOString(),
        user: state.googleUser?.email || state.profile?.ownerName || 'User',
        action: actionType,
        details: details
    };
};
