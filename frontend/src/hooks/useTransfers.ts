'use client';

import { useState, useCallback } from 'react';
import { useTransferStore } from '@/store/transferStore';
import * as api from '@/lib/api';

export function useTransfers() {
  const { transfers, setTransfers, removeTransfer: removeFromStore } = useTransferStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTransfers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getTransfers();
      setTransfers(data);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Erreur lors du chargement des transferts.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [setTransfers]);

  const deleteTransfer = useCallback(async (id: string) => {
    try {
      await api.deleteTransfer(id);
      removeFromStore(id);
      return true;
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Erreur lors de la suppression du transfert.';
      setError(message);
      return false;
    }
  }, [removeFromStore]);

  return {
    transfers,
    isLoading,
    error,
    fetchTransfers,
    deleteTransfer,
  };
}
