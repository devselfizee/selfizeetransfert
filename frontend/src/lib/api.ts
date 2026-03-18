import axios, { AxiosProgressEvent } from 'axios';
import { Transfer, TransferListResponse, DownloadInfo, User } from './types';
import keycloak from './keycloak';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  if (typeof window !== 'undefined' && keycloak.token) {
    // Refresh token if it expires within 30 seconds
    try {
      await keycloak.updateToken(30);
    } catch {
      // Token refresh failed, will be handled by response interceptor
    }
    config.headers.Authorization = `Bearer ${keycloak.token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      // Token invalid, redirect to Keycloak login
      if (!window.location.pathname.startsWith('/download')) {
        keycloak.login();
      }
    }
    return Promise.reject(error);
  }
);

export async function getMe(token?: string): Promise<User> {
  const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
  const response = await api.get<User>('/auth/me', config);
  return response.data;
}

export async function createTransfer(
  formData: FormData,
  onUploadProgress?: (event: AxiosProgressEvent) => void
): Promise<Transfer> {
  const response = await api.post<Transfer>('/transfers/create', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress,
  });
  return response.data;
}

export async function getTransfers(): Promise<Transfer[]> {
  const response = await api.get<TransferListResponse>('/transfers');
  return response.data.transfers;
}

export async function getTransfer(id: string): Promise<Transfer> {
  const response = await api.get<Transfer>(`/transfers/${id}`);
  return response.data;
}

export async function deleteTransfer(id: string): Promise<void> {
  await api.delete(`/transfers/${id}`);
}

export async function getDownloadInfo(token: string): Promise<DownloadInfo> {
  const response = await api.get<DownloadInfo>(`/download/${token}`);
  return response.data;
}

export function getFileDownloadUrl(token: string, fileId: string): string {
  const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
  return `${baseURL}/download/${token}/file/${fileId}`;
}

export function getZipDownloadUrl(token: string): string {
  const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
  return `${baseURL}/download/${token}/zip`;
}

export default api;
