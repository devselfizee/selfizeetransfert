'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircleIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import AuthGuard from '@/components/AuthGuard';
import FederatedLayout from '@/components/FederatedLayout';
import Button from '@/components/Button';
import { Transfer } from '@/lib/types';
import { getTransfer } from '@/lib/api';
import { formatDate, formatTimeRemaining, formatFileSize, copyToClipboard, getDownloadUrl } from '@/lib/utils';

export default function TransferDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await getTransfer(id);
        setTransfer(data);
      } catch {
        setError('Transfert introuvable.');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [id]);

  const handleCopy = async () => {
    if (!transfer) return;
    const url = getDownloadUrl(transfer.token);
    const success = await copyToClipboard(url);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <AuthGuard>
      <FederatedLayout>
        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <p className="text-gray-500">{error}</p>
              <Link href="/dashboard" className="text-primary hover:underline text-sm mt-4 inline-block">
                Retour au tableau de bord
              </Link>
            </div>
          ) : transfer ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-b border-green-100 p-8 text-center">
                <CheckCircleIcon className="mx-auto h-16 w-16 text-green-500 mb-4" />
                <h1 className="text-2xl font-bold text-gray-900 mb-1">
                  Transfert envoyé !
                </h1>
                <p className="text-sm text-gray-600">
                  Vos fichiers ont été envoyés avec succès à{' '}
                  <strong>{transfer.recipient_email}</strong>
                </p>
              </div>

              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lien de téléchargement
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={getDownloadUrl(transfer.token)}
                      className="flex-1 rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm text-gray-700 select-all"
                    />
                    <Button
                      variant={copied ? 'secondary' : 'primary'}
                      size="md"
                      onClick={handleCopy}
                    >
                      {copied ? (
                        <>
                          <CheckIcon className="h-4 w-4 mr-1.5" />
                          Copié !
                        </>
                      ) : (
                        <>
                          <ClipboardDocumentIcon className="h-4 w-4 mr-1.5" />
                          Copier le lien
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4">
                  <div>
                    <p className="text-xs text-gray-500">Date d&apos;envoi</p>
                    <p className="text-sm font-medium text-gray-700 mt-0.5">
                      {formatDate(transfer.created_at)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Expiration</p>
                    <p className="text-sm font-medium text-gray-700 mt-0.5">
                      {formatTimeRemaining(transfer.expires_at)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Fichiers</p>
                    <p className="text-sm font-medium text-gray-700 mt-0.5">
                      {transfer.files.length} fichier{transfer.files.length > 1 ? 's' : ''}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Taille totale</p>
                    <p className="text-sm font-medium text-gray-700 mt-0.5">
                      {formatFileSize(transfer.total_size)}
                    </p>
                  </div>
                </div>

                {transfer.message && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Message</p>
                    <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">
                      {transfer.message}
                    </p>
                  </div>
                )}

                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary-dark transition-colors"
                >
                  <ArrowLeftIcon className="h-4 w-4" />
                  Retour au tableau de bord
                </Link>
              </div>
            </div>
          ) : null}
        </main>
      </FederatedLayout>
    </AuthGuard>
  );
}
