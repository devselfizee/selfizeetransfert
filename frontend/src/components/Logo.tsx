'use client';

import Image from 'next/image';
import clsx from 'clsx';

interface LogoProps {
  height?: number;
  showSuffix?: boolean;
  suffixClassName?: string;
  className?: string;
}

export default function Logo({
  height = 32,
  showSuffix = true,
  suffixClassName,
  className,
}: LogoProps) {
  const width = Math.round((height / 38) * 200);
  return (
    <div className={clsx('inline-flex items-center gap-3', className)}>
      <Image
        src="/selfizee-logo.png"
        alt="Selfizee"
        width={width}
        height={height}
        priority
        style={{ height, width: 'auto' }}
      />
      {showSuffix && (
        <span
          className={clsx(
            'font-semibold text-gray-900 tracking-tight',
            suffixClassName,
          )}
          style={{ fontSize: Math.round(height * 0.6) }}
        >
          Transfert
        </span>
      )}
    </div>
  );
}
