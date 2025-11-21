
// NOTE: You must replace this with your own Client ID from Google Cloud Console
const CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com'; 
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

// Folder name in Google Drive
const APP_FOLDER_NAME = 'BusinessManager_AppData';
const BACKUP_FILE_NAME = 'backup.json';

export const loadGoogleScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if ((window as any).google) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = reject;
    document.body.appendChild(script);
  });
};

export const initGoogleAuth = (callback: (response: any) => void) => {
  return (window as any).google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: callback,
  });
};

// --- Drive API Helpers ---

const getHeaders = (accessToken: string) => ({
  'Authorization': `Bearer ${accessToken}`,
  'Content-Type': 'application/json',
});

export const searchFolder = async (accessToken: string) => {
  const q = `mimeType='application/vnd.google-apps.folder' and name='${APP_FOLDER_NAME}' and trashed=false`;
  const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}`, {
    headers: getHeaders(accessToken),
  });
  const data = await response.json();
  return data.files && data.files.length > 0 ? data.files[0].id : null;
};

export const createFolder = async (accessToken: string) => {
  const metadata = {
    name: APP_FOLDER_NAME,
    mimeType: 'application/vnd.google-apps.folder',
  };
  const response = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: getHeaders(accessToken),
    body: JSON.stringify(metadata),
  });
  const file = await response.json();
  return file.id;
};

export const searchFile = async (accessToken: string, folderId: string) => {
  const q = `name='${BACKUP_FILE_NAME}' and '${folderId}' in parents and trashed=false`;
  const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}`, {
    headers: getHeaders(accessToken),
  });
  const data = await response.json();
  return data.files && data.files.length > 0 ? data.files[0] : null;
};

export const uploadFile = async (accessToken: string, folderId: string, content: any, existingFileId?: string) => {
  const fileContent = JSON.stringify(content);
  const metadata = {
    name: BACKUP_FILE_NAME,
    mimeType: 'application/json',
    parents: existingFileId ? undefined : [folderId],
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', new Blob([fileContent], { type: 'application/json' }));

  let url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
  let method = 'POST';

  if (existingFileId) {
    url = `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`;
    method = 'PATCH';
  }

  const response = await fetch(url, {
    method: method,
    headers: { 'Authorization': `Bearer ${accessToken}` },
    body: form,
  });
  return await response.json();
};

export const downloadFile = async (accessToken: string, fileId: string) => {
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  return await response.json();
};

export const getUserInfo = async (accessToken: string) => {
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  return await response.json();
};
