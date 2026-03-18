'use client';

import { Transfer } from '@/lib/types';
import TransferCard from './TransferCard';
import { InboxIcon } from '@heroicons/react/24/outline';

interface TransferListProps {
  transfers: Transfer[];
  isLoading: boolean;
  onDelete: (id: string) => Promise<boolean>;
}

export default function TransferList({ transfers, isLoading, onDelete }: TransferListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-48 mb-3" />
                <div className="h-3 bg-gray-100 rounded w-72" />
              </div>
              <div className="flex gap-2">
                <div className="h-8 w-8 bg-gray-100 rounded-lg" />
                <div className="h-8 w-8 bg-gray-100 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (transfers.length === 0) {
    return (
      <div className="text-center py-16">
        <InboxIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-600 mb-1">Aucun transfert</h3>
        <p className="text-sm text-gray-400">
          Vos transferts envoyés apparaîtront ici.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {transfers.map((transfer) => (
        <TransferCard
          key={transfer.id}
          transfer={transfer}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
