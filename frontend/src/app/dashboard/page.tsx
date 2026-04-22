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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Mes transferts</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gérez vos fichiers envoyés
          </p>
        </div>
        <Link
          href="/upload"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark transition-colors w-full sm:w-auto"
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
