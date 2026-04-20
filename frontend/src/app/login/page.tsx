'use client';

import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Logo from '@/components/Logo';

export default function LoginPage() {
  const { initialize, isAuthenticated } = useAuth();

  useEffect(() => {
    // Keycloak init with login-required will redirect to Keycloak login
    initialize();
  }, [initialize]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <Logo height={40} />
        </div>
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-gray-500">Redirection vers l'authentification...</p>
        </div>
      </div>
    </div>
  );
}
