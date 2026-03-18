'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  ArrowDownTrayIcon,
  DocumentIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { DownloadInfo } from '@/lib/types';
import { formatFileSize, formatTimeRemaining, getExpirySeconds } from '@/lib/utils';
import { getFileDownloadUrl, getZipDownloadUrl } from '@/lib/api';
import Button from './Button';

interface DownloadPageProps {
  downloadInfo: DownloadInfo;
  token: string;
}

export default function DownloadPageComponent({ downloadInfo, token }: DownloadPageProps) {
  const [timeRemaining, setTimeRemaining] = useState(
    formatTimeRemaining(downloadInfo.expires_at)
  );
  const [secondsLeft, setSecondsLeft] = useState(
    getExpirySeconds(downloadInfo.expires_at)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(formatTimeRemaining(downloadInfo.expires_at));
      setSecondsLeft(getExpirySeconds(downloadInfo.expires_at));
    }, 1000);
    return () => clearInterval(interval);
  }, [downloadInfo.expires_at]);

  const isExpired = !downloadInfo.is_active || secondsLeft <= 0;

  if (isExpired) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-white border-b border-gray-200 py-4">
          <div className="max-w-2xl mx-auto px-4">
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
              Transfert expiré
            </h1>
            <p className="text-sm text-gray-500">
              Ce lien de téléchargement a expiré et les fichiers ne sont plus disponibles.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 py-4">
        <div className="max-w-2xl mx-auto px-4">
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

      <main className="flex-1 flex items-start justify-center p-4 pt-8 sm:pt-16">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm max-w-lg w-full overflow-hidden">
          <div className="bg-brand-gradient p-6 text-white">
            <h1 className="text-xl font-semibold mb-1">
              Vous avez reçu des fichiers
            </h1>
            <p className="text-sm text-white/80">
              De la part de <strong>{downloadInfo.sender_name || downloadInfo.sender_email}</strong>
            </p>
          </div>

          <div className="p-6">
            {downloadInfo.message && (
              <div className="bg-gray-50 rounded-lg p-4 mb-5">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {downloadInfo.message}
                </p>
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
              <ClockIcon className="h-4 w-4" />
              <span>Expire {timeRemaining}</span>
              <span className="text-gray-300">|</span>
              <span>Taille totale : {formatFileSize(downloadInfo.total_size)}</span>
            </div>

            <div className="mb-5">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Fichiers ({downloadInfo.files.length})
              </h3>
              <div className="bg-gray-50 rounded-lg divide-y divide-gray-200 max-h-60 overflow-y-auto">
                {downloadInfo.files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <DocumentIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm text-gray-700 truncate">{file.filename}</p>
                        <p className="text-xs text-gray-400">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <a
                      href={getFileDownloadUrl(token, file.id)}
                      className="ml-2 p-1.5 text-primary hover:bg-primary-50 rounded-lg transition-colors flex-shrink-0"
                      title="Télécharger"
                      download
                    >
                      <ArrowDownTrayIcon className="h-4 w-4" />
                    </a>
                  </div>
                ))}
              </div>
            </div>

            <a href={getZipDownloadUrl(token)} download>
              <Button size="lg" className="w-full">
                <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                Télécharger tout (ZIP)
              </Button>
            </a>
          </div>
        </div>
      </main>

      <footer className="py-6 text-center">
        <p className="text-xs text-gray-400">
          Propulsé par <strong>Selfizee Transfer</strong>
        </p>
      </footer>
    </div>
  );
}
