import { Action, DataState, TrashItem } from "../../types";
import * as db from "../../utils/db";

export const trashReducer = (state: DataState, action: Action): DataState => {
    const touch = { lastLocalUpdate: Date.now() };

    switch (action.type) {
        case 'MOVE_TO_TRASH': {
            const trashItem: TrashItem = {
                ...action.payload,
                deletedAt: new Date().toISOString()
            };
            db.addToTrash(trashItem);
            return { ...state, trash: [trashItem, ...state.trash], ...touch };
        }

        case 'RESTORE_FROM_TRASH': {
            const itemToRestore = state.trash.find(t => t.id === action.payload.id);
            if (!itemToRestore) return state;

            db.deleteFromTrash(action.payload.id);
            return { ...state, trash: state.trash.filter(t => t.id !== action.payload.id), ...touch };
        }

        case 'EMPTY_TRASH': {
            db.saveCollection('trash', []);
            return { ...state, trash: [], ...touch };
        }

        case 'PERMANENTLY_DELETE_FROM_TRASH': {
            db.deleteFromTrash(action.payload);
            return { ...state, trash: state.trash.filter(t => t.id !== action.payload), ...touch };
        }

        case 'RESTORE_SNAPSHOT': {
            return { ...state, ...action.payload, ...touch };
        }

        case 'SET_STATE':
            return { ...state, ...action.payload };

        case 'REPLACE_COLLECTION': {
            const { storeName, data } = action.payload;
            db.saveCollection(storeName as any, data);
            return { ...state, [storeName]: data, ...touch };
        }

        default:
            return state;
    }
};
