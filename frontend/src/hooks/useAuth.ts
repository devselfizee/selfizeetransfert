'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import keycloak from '@/lib/keycloak';
import * as api from '@/lib/api';

export function useAuth() {
  const { user, token, isInitialized, setAuth, setToken, clearAuth, setInitialized } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const initRef = useRef(false);

  const isAuthenticated = !!token && !!user;

  const initialize = useCallback(async () => {
    if (initRef.current) return;
    initRef.current = true;

    try {
      const authenticated = await keycloak.init({
        onLoad: 'login-required',
        checkLoginIframe: false,
        pkceMethod: 'S256',
      });

      if (authenticated && keycloak.token) {
        setToken(keycloak.token);

        // Fetch user profile from backend
        const me = await api.getMe(keycloak.token);
        setAuth(me, keycloak.token);

        // Set up token refresh
        setInterval(async () => {
          try {
            const refreshed = await keycloak.updateToken(30);
            if (refreshed && keycloak.token) {
              setToken(keycloak.token);
            }
          } catch {
            clearAuth();
            keycloak.login();
          }
        }, 30000);
      }
    } catch (error) {
      console.error('Keycloak init failed:', error);
    } finally {
      setInitialized();
      setIsLoading(false);
    }
  }, [setAuth, setToken, clearAuth, setInitialized]);

  const logout = useCallback(() => {
    clearAuth();
    keycloak.logout({
      redirectUri: window.location.origin,
    });
  }, [clearAuth]);

  return {
    user,
    isAuthenticated,
    isLoading,
    isInitialized,
    initialize,
    logout,
  };
}
