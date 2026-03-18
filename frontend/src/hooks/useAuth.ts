'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import * as api from '@/lib/api';

export function useAuth() {
  const router = useRouter();
  const { user, token, isInitialized, setAuth, clearAuth, initialize } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = !!token && !!user;

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.login(email, password);
      setAuth(response.user, response.token);
      router.push('/dashboard');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Identifiants incorrects. Veuillez réessayer.';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [setAuth, router]);

  const logout = useCallback(() => {
    clearAuth();
    router.push('/login');
  }, [clearAuth, router]);

  const checkAuth = useCallback(async () => {
    if (!token) return false;
    try {
      const me = await api.getMe();
      setAuth(me, token);
      return true;
    } catch {
      clearAuth();
      return false;
    }
  }, [token, setAuth, clearAuth]);

  return {
    user,
    isAuthenticated,
    isLoading,
    isInitialized,
    error,
    login,
    logout,
    checkAuth,
    initialize,
  };
}
