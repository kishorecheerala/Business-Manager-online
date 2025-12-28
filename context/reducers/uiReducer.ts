import { Action, DataState } from "../../types";
import * as db from "../../utils/db";

export const uiReducer = (state: DataState, action: Action): DataState => {
    const touch = { lastLocalUpdate: Date.now() };

    switch (action.type) {
        case 'SET_SELECTION':
            return { ...state, selection: action.payload };

        case 'CLEAR_SELECTION':
            return { ...state, selection: null };

        case 'SET_ONLINE_STATUS':
            return { ...state, isOnline: action.payload };

        case 'SET_SYNC_STATUS':
            return { ...state, syncStatus: action.payload };

        case 'SET_LAST_SYNC_TIME': {
            db.upsertItem('app_metadata', { id: 'lastSyncTime', value: action.payload });
            return { ...state, lastSyncTime: action.payload };
        }

        case 'SET_LAST_BACKUP_DATE': {
            db.upsertItem('app_metadata', { id: 'lastBackup', date: action.payload });
            return { ...state, ...touch };
        }

        default:
            return state;
    }
};
