import axios, { AxiosProgressEvent } from 'axios';
import { LoginResponse, Transfer, TransferListResponse, DownloadInfo, User } from './types';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
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
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/download')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>('/auth/login', { email, password });
  return response.data;
}

export async function getMe(): Promise<User> {
  const response = await api.get<User>('/auth/me');
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
