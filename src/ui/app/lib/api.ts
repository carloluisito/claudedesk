import { useAppStore } from '../store/appStore';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function api<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown
): Promise<T> {
  const token = useAppStore.getState().token;

  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`/api${path}`, options);
  const data = await response.json();

  if (!response.ok) {
    // Auto-logout on 401/403 - token is invalid or expired
    if (response.status === 401 || response.status === 403) {
      useAppStore.getState().logout();
    }
    throw new ApiError(data.error || 'Request failed', response.status, data);
  }

  return data.data as T;
}

export async function uploadFile<T>(
  path: string,
  file: Blob,
  fieldName: string = 'file'
): Promise<T> {
  const token = useAppStore.getState().token;

  const formData = new FormData();
  formData.append(fieldName, file);

  const response = await fetch(`/api${path}`, {
    method: 'POST',
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    // Auto-logout on 401/403 - token is invalid or expired
    if (response.status === 401 || response.status === 403) {
      useAppStore.getState().logout();
    }
    throw new ApiError(data.error || 'Upload failed', response.status, data);
  }

  return data.data as T;
}

// Terminal attachment types
export interface UploadedAttachment {
  id: string;
  originalName: string;
  path: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
}

export async function uploadTerminalAttachments(
  sessionId: string,
  files: File[]
): Promise<UploadedAttachment[]> {
  const token = useAppStore.getState().token;

  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });

  const response = await fetch(`/api/terminal/sessions/${sessionId}/attachments`, {
    method: 'POST',
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      useAppStore.getState().logout();
    }
    throw new ApiError(data.error || 'Upload failed', response.status, data);
  }

  return data.data.attachments;
}
