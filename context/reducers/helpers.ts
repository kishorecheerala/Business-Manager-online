import { DataState, AuditLogEntry } from '../../types';

export const logAction = (state: DataState, actionType: string, details: string): AuditLogEntry => {
    return {
        id: `LOG-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: state.profile?.ownerName || 'User',
        action: actionType,
        details: details
    };
};
