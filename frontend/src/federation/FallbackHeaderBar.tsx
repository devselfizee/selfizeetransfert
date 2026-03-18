'use client';

interface FallbackHeaderBarProps {
  currentAppName?: string;
  currentAppColor?: string;
  onLogout?: () => void;
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    username?: string;
  } | null;
}

export default function FallbackHeaderBar({
  currentAppName = 'Selfizee Transfer',
  currentAppColor = '#0693e3',
  onLogout,
  user,
}: FallbackHeaderBarProps) {
  const displayName =
    user?.firstName || user?.lastName
      ? `${user?.firstName || ''} ${user?.lastName || ''}`.trim()
      : user?.username || user?.email || '';

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 40,
          height: 48,
          background:
            'linear-gradient(to right, #ffffff, rgba(239,246,255,0.4))',
          borderBottom: '1px solid #D6DFED',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span
            style={{ fontSize: 14, fontWeight: 600, color: currentAppColor }}
          >
            {currentAppName}
          </span>
          <span
            style={{
              fontSize: 11,
              color: '#F59E0B',
              background: '#FFFBEB',
              border: '1px solid #FDE68A',
              borderRadius: 6,
              padding: '2px 8px',
              fontWeight: 500,
            }}
          >
            Hub temporairement indisponible
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {displayName && (
            <span
              style={{ fontSize: 13, fontWeight: 500, color: '#1A1D2B' }}
            >
              {displayName}
            </span>
          )}
          {onLogout && (
            <button
              onClick={onLogout}
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: '#DC2626',
                background: 'none',
                border: '1px solid #FECACA',
                borderRadius: 8,
                padding: '4px 12px',
                cursor: 'pointer',
              }}
            >
              Déconnexion
            </button>
          )}
        </div>
      </div>
      <div style={{ height: 48 }} />
    </>
  );
}
