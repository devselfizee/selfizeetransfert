'use client';

import { useState } from 'react';
import {
  ClipboardDocumentIcon,
  TrashIcon,
  CheckIcon,
  ClockIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import { Transfer } from '@/lib/types';
import { formatDate, formatTimeRemaining, formatFileSize, isExpired, copyToClipboard, getDownloadUrl } from '@/lib/utils';
import Button from './Button';
import Modal from './Modal';
import clsx from 'clsx';

interface TransferCardProps {
  transfer: Transfer;
  onDelete: (id: string) => Promise<boolean>;
}

export default function TransferCard({ transfer, onDelete }: TransferCardProps) {
  const [copied, setCopied] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const expired = isExpired(transfer.expires_at);

  const handleCopyLink = async () => {
    const url = getDownloadUrl(transfer.token);
    const success = await copyToClipboard(url);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    const success = await onDelete(transfer.id);
    if (success) {
      setShowDeleteModal(false);
    }
    setIsDeleting(false);
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium text-gray-900 truncate">
                {transfer.recipient_email}
              </p>
              <span
                className={clsx(
                  'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0',
                  expired
                    ? 'bg-gray-100 text-gray-500'
                    : 'bg-green-100 text-green-700'
                )}
              >
                {expired ? 'Expiré' : 'Actif'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 mt-2">
              <span>Envoyé le {formatDate(transfer.created_at)}</span>
              <span className="flex items-center gap-1">
                <ClockIcon className="h-3.5 w-3.5" />
                {formatTimeRemaining(transfer.expires_at)}
              </span>
              <span className="flex items-center gap-1">
                <ArrowDownTrayIcon className="h-3.5 w-3.5" />
                {transfer.download_count} téléchargement{transfer.download_count !== 1 ? 's' : ''}
              </span>
              <span>{formatFileSize(transfer.total_size)}</span>
            </div>

            {transfer.files && transfer.files.length > 0 && (
              <p className="text-xs text-gray-400 mt-1">
                {transfer.files.length} fichier{transfer.files.length > 1 ? 's' : ''}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {!expired && (
              <button
                onClick={handleCopyLink}
                className={clsx(
                  'p-2 rounded-lg transition-all',
                  copied
                    ? 'bg-green-50 text-green-600'
                    : 'text-gray-400 hover:text-primary hover:bg-primary-50'
                )}
                title={copied ? 'Copié !' : 'Copier le lien'}
              >
                {copied ? (
                  <CheckIcon className="h-4 w-4" />
                ) : (
                  <ClipboardDocumentIcon className="h-4 w-4" />
                )}
              </button>
            )}
            <button
              onClick={() => setShowDeleteModal(true)}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
              title="Supprimer"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Supprimer le transfert"
      >
        <p className="text-sm text-gray-600 mb-6">
          Êtes-vous sûr de vouloir supprimer ce transfert vers{' '}
          <strong>{transfer.recipient_email}</strong> ? Cette action est irréversible.
        </p>
        <div className="flex justify-end gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDeleteModal(false)}
          >
            Annuler
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleDelete}
            isLoading={isDeleting}
          >
            Supprimer
          </Button>
        </div>
      </Modal>
    </>
  );
}
