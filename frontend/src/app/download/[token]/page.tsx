'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { getDownloadInfo } from '@/lib/api';
import { DownloadInfo } from '@/lib/types';
import DownloadPageComponent from '@/components/DownloadPage';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function DownloadTokenPage() {
  const params = useParams();
  const token = params.token as string;
  const [downloadInfo, setDownloadInfo] = useState<DownloadInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await getDownloadInfo(token);
        setDownloadInfo(data);
      } catch {
        setError('Ce lien de téléchargement est invalide ou a expiré.');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [token]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-white border-b border-gray-200 py-4">
          <div className="max-w-2xl mx-auto px-4 flex justify-center">
            <Image
              src="/selfizee-logo.svg"
              alt="Selfizee Transfer"
              width={180}
              height={40}
              className="h-8 w-auto"
              priority
            />
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-gray-500">Chargement du transfert...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !downloadInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-white border-b border-gray-200 py-4">
          <div className="max-w-2xl mx-auto px-4 flex justify-center">
            <Image
              src="/selfizee-logo.svg"
              alt="Selfizee Transfer"
              width={180}
              height={40}
              className="h-8 w-auto"
              priority
            />
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 max-w-md w-full text-center">
            <ExclamationTriangleIcon className="mx-auto h-16 w-16 text-gray-300 mb-4" />
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Lien invalide
            </h1>
            <p className="text-sm text-gray-500">
              {error || 'Ce lien de téléchargement est invalide ou a expiré.'}
            </p>
          </div>
        </main>
      </div>
    );
  }

  return <DownloadPageComponent downloadInfo={downloadInfo} token={token} />;
}
