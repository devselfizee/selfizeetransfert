'use client';

import React, { useState, useEffect, useCallback, lazy } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  loadRemoteComponent,
  setReconnectCallback,
  FederatedWrapper,
  FallbackHeaderBar,
  FallbackSidebar,
} from '@/federation';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';

// Lazy-load federated components with automatic fallback
const RemoteHeader = lazy(() =>
  loadRemoteComponent('./HeaderBar', FallbackHeaderBar as React.ComponentType<Record<string, unknown>>)
);
const RemoteSidebar = lazy(() =>
  loadRemoteComponent('./Sidebar', FallbackSidebar as React.ComponentType<Record<string, unknown>>)
);

// Sidebar navigation sections for Selfizee Transfert
const SIDEBAR_SECTIONS = [
  {
    label: 'TRANSFERTS',
    items: [
      { label: 'Tableau de bord', path: '/dashboard' },
      { label: 'Nouveau transfert', path: '/upload' },
    ],
  },
];

interface FederatedLayoutProps {
  children: React.ReactNode;
}

export default function FederatedLayout({ children }: FederatedLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { token } = useAuthStore();
  const [, forceRender] = useState(0);

  // Expose Keycloak token for the federated header (auto-detected via window.__KONITYS_AUTH)
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__KONITYS_AUTH = token
      ? { token }
      : null;
  }, [token]);

  // Auto-reconnection: when Hub comes back, force re-render to load real components
  useEffect(() => {
    setReconnectCallback(() => {
      console.info(
        '[Selfizee Transfert] Hub reconnected, reloading federated components...'
      );
      forceRender((n) => n + 1);
    });
    return () => setReconnectCallback(null);
  }, []);

  // Navigation handler for sidebar and header
  const navigate = useCallback(
    (path: string) => {
      router.push(path);
    },
    [router]
  );

  // Map user to the format expected by the federated header
  const headerUser = user
    ? {
        firstName: user.name?.split(' ')[0] || '',
        lastName: user.name?.split(' ').slice(1).join(' ') || '',
        email: user.email || '',
        username: user.email || '',
      }
    : null;

  const platformUrl =
    process.env.NEXT_PUBLIC_PLATFORM_URL || 'https://plateform.konitys.fr';

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Federated Header (full width, fixed 48px) */}
      <FederatedWrapper
        fallback={
          <FallbackHeaderBar
            currentAppName="Selfizee Transfert"
            currentAppColor="#fe0154"
            user={headerUser}
            onLogout={logout}
          />
        }
      >
        <RemoteHeader
          user={headerUser}
          onLogout={logout}
          currentAppName="Selfizee Transfert"
          currentAppIcon="file-output"
          currentAppColor="#fe0154"
          onNavigate={navigate}
          platformUrl={platformUrl}
        />
      </FederatedWrapper>

      {/* Sidebar + Content */}
      <div style={{ display: 'flex' }}>
        <FederatedWrapper
          fallback={
            <FallbackSidebar
              sections={SIDEBAR_SECTIONS}
              activePath={pathname}
              onNavigate={navigate}
            />
          }
        >
          <RemoteSidebar
            sections={SIDEBAR_SECTIONS}
            activePath={pathname}
            onNavigate={navigate}
            platformUrl={platformUrl}
          />
        </FederatedWrapper>

        <main style={{ flex: 1, paddingTop: 0 }}>{children}</main>
      </div>
    </div>
  );
}
