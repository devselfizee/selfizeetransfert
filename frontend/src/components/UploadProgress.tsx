'use client';

import { formatFileSize } from '@/lib/utils';
import Button from './Button';

interface UploadProgressProps {
  percent: number;
  loaded: number;
  total: number;
  estimatedSpeed: number;
  onCancel: () => void;
}

export default function UploadProgress({
  percent,
  loaded,
  total,
  estimatedSpeed,
  onCancel,
}: UploadProgressProps) {
  const remaining = total > 0 && estimatedSpeed > 0
    ? Math.ceil((total - loaded) / estimatedSpeed)
    : 0;

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}min ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}min`;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-700">Envoi en cours...</h3>
        <span className="text-sm font-semibold text-primary">{percent}%</span>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-3 mb-3 overflow-hidden">
        <div
          className="bg-gradient-to-r from-primary to-primary-light h-3 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
        <span>
          {formatFileSize(loaded)} / {formatFileSize(total)}
        </span>
        <div className="flex items-center gap-3">
          {estimatedSpeed > 0 && (
            <span>{formatFileSize(estimatedSpeed)}/s</span>
          )}
          {remaining > 0 && (
            <span>~{formatTime(remaining)} restant</span>
          )}
        </div>
      </div>

      <Button variant="secondary" size="sm" onClick={onCancel}>
        Annuler
      </Button>
    </div>
  );
}
