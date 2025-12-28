export interface DriveFile {
    id: string;
    name: string;
    createdTime?: string;
    modifiedTime?: string;
    size?: string;
    parents?: string[];
    mimeType?: string;
    capabilities?: {
        canEdit: boolean;
        canDelete: boolean;
    };
    metadata?: {
        secure?: string; // encrypted API key
        [key: string]: any;
    };
}

export interface DriveUser {
    name: string;
    email: string;
    picture: string;
}

export interface DriveDebugInfo {
    logs: string[];
    details: any[];
}

export interface DriveFileListResponse {
    files: DriveFile[];
    nextPageToken?: string;
}

export interface DailyFilenames {
    core: string;
    assets: string;
    legacy: string;
}
