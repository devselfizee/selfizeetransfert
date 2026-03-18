import { create } from 'zustand';
import { Transfer } from '@/lib/types';

interface TransferState {
  transfers: Transfer[];
  setTransfers: (transfers: Transfer[]) => void;
  addTransfer: (transfer: Transfer) => void;
  removeTransfer: (id: string) => void;
}

export const useTransferStore = create<TransferState>((set) => ({
  transfers: [],

  setTransfers: (transfers: Transfer[]) => set({ transfers }),

  addTransfer: (transfer: Transfer) =>
    set((state) => ({ transfers: [transfer, ...state.transfers] })),

  removeTransfer: (id: string) =>
    set((state) => ({
      transfers: state.transfers.filter((t) => t.id !== id),
    })),
}));
