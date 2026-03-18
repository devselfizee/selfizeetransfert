export interface User {
  id: string;
  email: string;
  name?: string;
  created_at: string;
}

export interface TransferFile {
  id: string;
  filename: string;
  size: number;
}

export interface Transfer {
  id: string;
  recipient_email: string;
  message?: string;
  files: TransferFile[];
  download_count: number;
  token: string;
  download_url: string;
  expires_at: string;
  created_at: string;
  total_size: number;
  is_active: boolean;
}

export interface TransferListResponse {
  transfers: Transfer[];
  total: number;
}

export interface TransferCreateRequest {
  recipient_email: string;
  message?: string;
  expiration: string;
  files: File[];
}

export interface DownloadInfo {
  id: string;
  recipient_email: string;
  sender_name: string;
  sender_email: string;
  message?: string;
  files: TransferFile[];
  total_size: number;
  expires_at: string;
  download_count: number;
  is_active: boolean;
  token: string;
  download_url: string;
  created_at: string;
}

export interface ApiError {
  message: string;
  status: number;
}
