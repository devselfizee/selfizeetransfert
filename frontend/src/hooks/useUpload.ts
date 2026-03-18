'use client';

import { useState, useCallback, useRef } from 'react';
import { AxiosProgressEvent } from 'axios';
import { Transfer } from '@/lib/types';
import * as api from '@/lib/api';

interface UploadProgress {
  percent: number;
  loaded: number;
  total: number;
  estimatedSpeed: number;
}

export function useUpload() {
  const [progress, setProgress] = useState<UploadProgress>({
    percent: 0,
    loaded: 0,
    total: 0,
    estimatedSpeed: 0,
  });
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const startTimeRef = useRef<number>(0);

  const uploadFiles = useCallback(
    async (
      files: File[],
      metadata: { recipient_email: string; message?: string; expiration: string }
    ): Promise<Transfer | null> => {
      setIsUploading(true);
      setError(null);
      setProgress({ percent: 0, loaded: 0, total: 0, estimatedSpeed: 0 });
      startTimeRef.current = Date.now();

      const expirationMap: Record<string, number> = {
        '24h': 24, '3d': 72, '7d': 168, '14d': 336,
      };
      const formData = new FormData();
      formData.append('metadata', JSON.stringify({
        recipient_email: metadata.recipient_email,
        message: metadata.message || undefined,
        expiry_hours: expirationMap[metadata.expiration] || 72,
      }));
      files.forEach((file) => {
        formData.append('files', file);
      });

      abortControllerRef.current = new AbortController();

      try {
        const transfer = await api.createTransfer(formData, (event: AxiosProgressEvent) => {
          const total = event.total || 0;
          const loaded = event.loaded || 0;
          const percent = total > 0 ? Math.round((loaded / total) * 100) : 0;
          const elapsed = (Date.now() - startTimeRef.current) / 1000;
          const speed = elapsed > 0 ? loaded / elapsed : 0;

          setProgress({ percent, loaded, total, estimatedSpeed: speed });
        });

        setIsUploading(false);
        return transfer;
      } catch (err: unknown) {
        if ((err as { code?: string })?.code === 'ERR_CANCELED') {
          setError('Envoi annulé.');
        } else {
          const message =
            (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            "Erreur lors de l'envoi des fichiers.";
          setError(message);
        }
        setIsUploading(false);
        return null;
      }
    },
    []
  );

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsUploading(false);
  }, []);

  return {
    progress,
    isUploading,
    error,
    uploadFiles,
    cancel,
  };
}
