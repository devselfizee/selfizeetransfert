'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { CloudArrowUpIcon, XMarkIcon, DocumentIcon } from '@heroicons/react/24/outline';
import { formatFileSize } from '@/lib/utils';
import clsx from 'clsx';

const MAX_TOTAL_SIZE = 10 * 1024 * 1024 * 1024; // 10 GB

interface FileDropzoneProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
}

export default function FileDropzone({ files, onFilesChange }: FileDropzoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newFiles = [...files, ...acceptedFiles];
      onFilesChange(newFiles);
    },
    [files, onFilesChange]
  );

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    onFilesChange(newFiles);
  };

  const totalSize = files.reduce((acc, f) => acc + f.size, 0);
  const isOverLimit = totalSize > MAX_TOTAL_SIZE;

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={clsx(
          'relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200',
          isDragActive
            ? 'border-primary bg-primary-50 scale-[1.02]'
            : 'border-gray-300 hover:border-primary/50 hover:bg-gray-50'
        )}
      >
        <input {...getInputProps()} />
        <CloudArrowUpIcon
          className={clsx(
            'mx-auto h-12 w-12 mb-4 transition-colors',
            isDragActive ? 'text-primary' : 'text-gray-400'
          )}
        />
        {isDragActive ? (
          <p className="text-primary font-medium">Déposez vos fichiers ici...</p>
        ) : (
          <div>
            <p className="text-gray-700 font-medium">
              Glissez-déposez vos fichiers ici
            </p>
            <p className="text-sm text-gray-500 mt-1">
              ou <span className="text-primary font-medium">parcourez</span> votre ordinateur
            </p>
          </div>
        )}
        <p className="text-xs text-gray-400 mt-3">
          Taille maximale : {formatFileSize(MAX_TOTAL_SIZE)}
        </p>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-sm font-medium text-gray-700">
              {files.length} fichier{files.length > 1 ? 's' : ''} sélectionné{files.length > 1 ? 's' : ''}
            </h4>
            <span
              className={clsx(
                'text-sm font-medium',
                isOverLimit ? 'text-red-600' : 'text-gray-500'
              )}
            >
              {formatFileSize(totalSize)}
              {isOverLimit && ' (limite dépassée)'}
            </span>
          </div>

          <div className="bg-gray-50 rounded-lg divide-y divide-gray-200 max-h-60 overflow-y-auto">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <DocumentIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-gray-700 truncate">{file.name}</p>
                    <p className="text-xs text-gray-400">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                  className="ml-2 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                  title="Retirer"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
