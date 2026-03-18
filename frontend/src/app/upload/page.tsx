'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import Navbar from '@/components/Navbar';
import FileDropzone from '@/components/FileDropzone';
import TransferForm from '@/components/TransferForm';
import UploadProgress from '@/components/UploadProgress';
import { useUpload } from '@/hooks/useUpload';
import { useTransferStore } from '@/store/transferStore';

export default function UploadPage() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const { progress, isUploading, error, uploadFiles, cancel } = useUpload();
  const { addTransfer } = useTransferStore();

  // Warn user before leaving page during upload
  useEffect(() => {
    if (!isUploading) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isUploading]);

  const handleSubmit = async (data: {
    recipient_email: string;
    message: string;
    expiration: string;
  }) => {
    const transfer = await uploadFiles(files, {
      recipient_email: data.recipient_email,
      message: data.message || undefined,
      expiration: data.expiration,
    });

    if (transfer) {
      addTransfer(transfer);
      router.push(`/transfer/${transfer.id}`);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Nouveau transfert</h1>
            <p className="text-sm text-gray-500 mt-1">
              Envoyez vos fichiers en toute sécurité
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {isUploading ? (
            <UploadProgress
              percent={progress.percent}
              loaded={progress.loaded}
              total={progress.total}
              estimatedSpeed={progress.estimatedSpeed}
              onCancel={cancel}
            />
          ) : (
            <div className="space-y-8">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Fichiers</h2>
                <FileDropzone files={files} onFilesChange={setFiles} />
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Détails</h2>
                <TransferForm
                  onSubmit={handleSubmit}
                  isSubmitting={isUploading}
                  hasFiles={files.length > 0}
                />
              </div>
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
