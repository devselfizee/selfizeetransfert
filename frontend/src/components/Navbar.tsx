'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { PlusIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/hooks/useAuth';
import Button from './Button';

export default function Navbar() {
  const router = useRouter();
  const { user, logout } = useAuth();

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/dashboard" className="flex-shrink-0">
            <Image
              src="/selfizee-logo.svg"
              alt="Selfizee Transfer"
              width={180}
              height={40}
              className="h-8 w-auto"
              priority
            />
          </Link>

          <div className="flex items-center gap-3">
            <Button
              size="sm"
              onClick={() => router.push('/upload')}
              className="hidden sm:inline-flex"
            >
              <PlusIcon className="h-4 w-4 mr-1.5" />
              Nouveau transfert
            </Button>
            <Button
              size="sm"
              onClick={() => router.push('/upload')}
              className="sm:hidden"
            >
              <PlusIcon className="h-4 w-4" />
            </Button>

            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-gray-200">
              <span className="text-sm text-gray-600 max-w-[160px] truncate">
                {user?.email}
              </span>
            </div>

            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors p-2 rounded-lg hover:bg-gray-100"
              title="Se déconnecter"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5" />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
