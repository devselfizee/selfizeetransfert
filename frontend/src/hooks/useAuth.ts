'use client';

import { useState, useCallback, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import * as api from '@/lib/api';
import { setTokenGetter } from '@/lib/api';

let keycloakInstance: import('keycloak-js').default | null = null;

async function getKeycloak() {
  if (!keycloakInstance) {
    const { default: Keycloak } = await import('keycloak-js');
    keycloakInstance = new Keycloak({
      url: process.env.NEXT_PUBLIC_KEYCLOAK_URL || 'https://plateform-auth.konitys.fr',
      realm: process.env.NEXT_PUBLIC_KEYCLOAK_REALM || 'konitys',
      clientId: process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || 'plateform-frontend',
    });
  }
  return keycloakInstance;
}

export function useAuth() {
  const { user, token, isInitialized, setAuth, setToken, clearAuth, setInitialized } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const initRef = useRef(false);

  const isAuthenticated = !!token && !!user;

  const initialize = useCallback(async () => {
    if (typeof window === 'undefined') return;
    if (initRef.current) return;
    initRef.current = true;

    try {
      const kc = await getKeycloak();

      const authenticated = await kc.init({
        onLoad: 'login-required',
        checkLoginIframe: false,
        pkceMethod: 'S256',
      });

      if (authenticated && kc.token) {
        setToken(kc.token);
        setTokenGetter(() => kc.token);

        // Fetch user profile from backend
        const me = await api.getMe(kc.token);
        setAuth(me, kc.token);

        // Set up token refresh - refresh every 10s, update token getter
        setInterval(async () => {
          try {
            const refreshed = await kc.updateToken(60);
            if (refreshed && kc.token) {
              setToken(kc.token);
              setTokenGetter(() => kc.token);
            }
          } catch {
            // Only redirect to login if no upload is in progress
            const uploading = document.querySelector('[data-uploading="true"]');
            if (!uploading) {
              clearAuth();
              kc.login();
            }
          }
        }, 10000);

        // Also refresh on token expiry event
        kc.onTokenExpired = async () => {
          try {
            await kc.updateToken(60);
            if (kc.token) {
              setToken(kc.token);
              setTokenGetter(() => kc.token);
            }
          } catch {
            // Silent fail during upload
          }
        };
      }
    } catch (error) {
      console.error('Keycloak init failed:', error);
    } finally {
      setInitialized();
      setIsLoading(false);
    }
  }, [setAuth, setToken, clearAuth, setInitialized]);

  const logout = useCallback(async () => {
    clearAuth();
    const kc = await getKeycloak();
    kc.logout({
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
