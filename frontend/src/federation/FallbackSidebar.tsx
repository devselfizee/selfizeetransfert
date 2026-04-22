'use client';

import { useEffect, useState } from 'react';

interface SidebarItem {
  icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  path: string;
  badge?: number | string;
}

interface SidebarSection {
  label: string;
  items: SidebarItem[];
}

interface FallbackSidebarProps {
  sections?: SidebarSection[];
  activePath?: string;
  onNavigate?: (path: string) => void;
  collapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
}

export default function FallbackSidebar({
  sections = [],
  activePath = '/',
  onNavigate,
  collapsed: controlledCollapsed,
  onCollapse,
}: FallbackSidebarProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);

  // Auto-collapse on narrow screens; stays in sync with resize
  useEffect(() => {
    if (controlledCollapsed !== undefined) return;
    const mq = window.matchMedia('(max-width: 767px)');
    const apply = () => setInternalCollapsed(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [controlledCollapsed]);

  const collapsed =
    controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;

  const handleToggle = () => {
    const next = !collapsed;
    if (onCollapse) onCollapse(next);
    else setInternalCollapsed(next);
  };

  const width = collapsed ? 56 : 210;

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 48,
          left: 0,
          bottom: 0,
          zIndex: 30,
          width,
          transition: 'width 0.2s',
          background: '#1E2A40',
          borderRight: '1px solid #2F4264',
          display: 'flex',
          flexDirection: 'column',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        <div
          style={{
            padding: collapsed ? '12px 0' : '12px 16px',
            display: 'flex',
            justifyContent: collapsed ? 'center' : 'flex-end',
          }}
        >
          <button
            onClick={handleToggle}
            style={{
              background: 'none',
              border: 'none',
              color: '#6B85A8',
              cursor: 'pointer',
              fontSize: 16,
              padding: 4,
            }}
            title={collapsed ? 'Déplier' : 'Replier'}
          >
            {collapsed ? '\u25B6' : '\u25C0'}
          </button>
        </div>

        {!collapsed &&
          sections.map((section, si) => (
            <div key={si} style={{ marginBottom: 8 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: '#6B85A8',
                  letterSpacing: '0.05em',
                  padding: '8px 16px 4px',
                }}
              >
                {section.label}
              </div>
              {(section.items || []).map((item, ii) => {
                const isActive = activePath === item.path;
                const Icon = item.icon;
                return (
                  <button
                    key={ii}
                    onClick={() => onNavigate && onNavigate(item.path)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      width: '100%',
                      padding: '8px 16px',
                      background: isActive
                        ? 'rgba(255,255,255,0.08)'
                        : 'transparent',
                      border: 'none',
                      borderLeft: isActive
                        ? '3px solid #fe0154'
                        : '3px solid transparent',
                      color: isActive ? '#F1F5F9' : '#94A3B8',
                      fontSize: 13,
                      fontWeight: isActive ? 600 : 400,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    {Icon && (
                      <Icon style={{ width: 18, height: 18, flexShrink: 0 }} />
                    )}
                    {item.label}
                  </button>
                );
              })}
            </div>
          ))}

        {collapsed &&
          sections
            .flatMap((s) => s.items || [])
            .map((item, i) => {
              const isActive = activePath === item.path;
              const Icon = item.icon;
              return (
                <button
                  key={i}
                  onClick={() => onNavigate && onNavigate(item.path)}
                  title={item.label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    height: 44,
                    background: isActive
                      ? 'rgba(254,1,84,0.15)'
                      : 'transparent',
                    border: 'none',
                    borderLeft: isActive
                      ? '3px solid #fe0154'
                      : '3px solid transparent',
                    color: isActive ? '#ffffff' : '#94A3B8',
                    cursor: 'pointer',
                  }}
                >
                  {Icon ? (
                    <Icon style={{ width: 20, height: 20 }} />
                  ) : (
                    <span style={{ fontSize: 16 }}>&bull;</span>
                  )}
                </button>
              );
            })}
      </div>
      <div style={{ width, flexShrink: 0, transition: 'width 0.2s' }} />
    </>
  );
}
