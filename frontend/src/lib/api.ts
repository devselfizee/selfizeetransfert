import axios, { AxiosProgressEvent } from 'axios';
import { Transfer, TransferListResponse, DownloadInfo, User } from './types';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token getter - will be set by useAuth hook after Keycloak init
let getToken: (() => string | undefined) | null = null;

export function setTokenGetter(fn: () => string | undefined) {
  getToken = fn;
}

api.interceptors.request.use(async (config) => {
  if (typeof window !== 'undefined' && getToken) {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      if (!window.location.pathname.startsWith('/download')) {
        // Will be handled by Keycloak token refresh in useAuth
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
