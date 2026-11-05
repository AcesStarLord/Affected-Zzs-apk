import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { EncryptedBackupEnvelope } from '../types/health';

export const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
for (const scope of SCOPES) {
  provider.addScope(scope);
}

// Flag to indicate if we are in the middle of a sign-in flow.
let isSigningIn = false;
// Cache the access token strictly in memory (never in localStorage/sessionStorage).
let cachedAccessToken: string | null = null;

export interface GoogleDriveBackupFile {
  id: string;
  name: string;
  createdTime?: string;
  modifiedTime?: string;
  size?: string;
}

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get Google Drive access token from Firebase Auth.');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Google Sign-In error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logoutGoogleDrive = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

/**
 * List encrypted vault backup files stored in the user's Google Drive created by this app.
 */
export async function listGoogleDriveBackups(): Promise<GoogleDriveBackupFile[]> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error('Authentication required. Please sign in with Google.');
  }

  const query = encodeURIComponent(
    "trashed = false and mimeType = 'application/json' and name contains 'affected-zzs-backup'"
  );
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,createdTime,modifiedTime,size)&orderBy=modifiedTime desc&pageSize=15`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Google Drive list failed (${response.status}): ${errBody}`);
  }

  const data = (await response.json()) as { files?: GoogleDriveBackupFile[] };
  return data.files || [];
}

/**
 * Upload an AES-GCM-256 encrypted backup envelope to Google Drive as a JSON file.
 */
export async function uploadEncryptedBackupToGoogleDrive(
  envelope: EncryptedBackupEnvelope,
  existingFileId?: string
): Promise<GoogleDriveBackupFile> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error('Authentication required. Please sign in with Google.');
  }

  const dateStamp = envelope.createdAt.slice(0, 19).replace(/[:T]/g, '-');
  const fileName = `affected-zzs-backup-${dateStamp}.somavault.json`;

  const metadata = {
    name: fileName,
    mimeType: 'application/json',
    description: `Affected Zzs AES-GCM-256 Encrypted Substance & Sleep Biometrics Backup (${envelope.recordCount} records)`,
  };

  const boundary = '-------AffectedZzsDriveMultipartBoundary2026';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    JSON.stringify(envelope, null, 2) +
    closeDelimiter;

  const endpoint = existingFileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart&fields=id,name,createdTime,modifiedTime,size`
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,createdTime,modifiedTime,size';

  const response = await fetch(endpoint, {
    method: existingFileId ? 'PATCH' : 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartRequestBody,
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Google Drive upload failed (${response.status}): ${errBody}`);
  }

  return (await response.json()) as GoogleDriveBackupFile;
}

/**
 * Download an encrypted backup envelope from Google Drive by file ID.
 */
export async function downloadEncryptedBackupFromGoogleDrive(
  fileId: string
): Promise<EncryptedBackupEnvelope> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error('Authentication required. Please sign in with Google.');
  }

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Google Drive download failed (${response.status}): ${errBody}`);
  }

  return (await response.json()) as EncryptedBackupEnvelope;
}

/**
 * Permanently delete a backup file created by this app from Google Drive.
 */
export async function deleteBackupFromGoogleDrive(fileId: string): Promise<void> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error('Authentication required. Please sign in with Google.');
  }

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Google Drive delete failed (${response.status}): ${errBody}`);
  }
}
