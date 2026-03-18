import { format, formatDistanceToNow, isPast, differenceInSeconds } from 'date-fns';
import { fr } from 'date-fns/locale';

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 o';
  const units = ['o', 'Ko', 'Mo', 'Go', 'To'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = parseFloat((bytes / Math.pow(k, i)).toFixed(2));
  return `${size} ${units[i]}`;
}

export function formatDate(date: string): string {
  return format(new Date(date), 'dd MMM yyyy à HH:mm', { locale: fr });
}

export function formatTimeRemaining(expiresAt: string): string {
  const expiryDate = new Date(expiresAt);
  if (isPast(expiryDate)) {
    return 'Expiré';
  }
  return formatDistanceToNow(expiryDate, { addSuffix: true, locale: fr });
}

export function isExpired(expiresAt: string): boolean {
  return isPast(new Date(expiresAt));
}

export function getExpirySeconds(expiresAt: string): number {
  return Math.max(0, differenceInSeconds(new Date(expiresAt), new Date()));
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(textarea);
    }
  }
}

export function getDownloadUrl(token: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  return `${baseUrl}/download/${token}`;
}
