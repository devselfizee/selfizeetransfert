'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { PlusIcon } from '@heroicons/react/24/outline';
import { useTransfers } from '@/hooks/useTransfers';
import TransferList from '@/components/TransferList';

export default function DashboardPage() {
  const { transfers, isLoading, error, fetchTransfers, deleteTransfer } = useTransfers();

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mes transferts</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gérez vos fichiers envoyés
          </p>
        </div>
        <Link
          href="/upload"
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#0693e3] to-[#9b51e0] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90"
        >
          <PlusIcon className="h-5 w-5" />
          Nouveau transfert
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <TransferList
        transfers={transfers}
        isLoading={isLoading}
        onDelete={deleteTransfer}
      />
    </div>
  );
}
