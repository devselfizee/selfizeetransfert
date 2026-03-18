'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const { initialize, isAuthenticated } = useAuth();

  useEffect(() => {
    // Keycloak init with login-required will redirect to Keycloak login
    initialize();
  }, [initialize]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md text-center">
        <Image
          src="/selfizee-logo.svg"
          alt="Selfizee Transfer"
          width={220}
          height={50}
          className="mx-auto h-10 w-auto mb-6"
          priority
        />
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-gray-500">Redirection vers l'authentification...</p>
        </div>
      </div>
    </div>
  );
}
