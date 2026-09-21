import React from 'react';
import {
  LayoutDashboard,
  Server,
  PlusCircle,
  Globe,
  Archive,
  CreditCard,
  Settings,
  HelpCircle,
  Cloud,
  X,
} from 'lucide-react';

interface SidebarProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentRoute,
  onNavigate,
  isOpenMobile,
  onCloseMobile,
}) => {
  const sections = [
    {
      title: 'Kênh chính',
      items: [
        { id: 'dashboard', label: 'Bảng điều khiển', icon: <LayoutDashboard size={19} /> },
        { id: 'hosts', label: 'Danh sách máy chủ', icon: <Server size={19} /> },
        { id: 'create-host', label: 'Khởi tạo máy chủ', icon: <PlusCircle size={19} />, badge: 'Mới' },
      ],
    },
    {
      title: 'Quản trị tài nguyên',
      items: [
        { id: 'domains', label: 'Tên miền', icon: <Globe size={19} /> },
        { id: 'backups', label: 'Bản sao lưu', icon: <Archive size={19} /> },
      ],
    },
    {
      title: 'Tài khoản & Dịch vụ',
      items: [
        { id: 'billing', label: 'Thanh toán & Gói', icon: <CreditCard size={19} /> },
        { id: 'settings', label: 'Cài đặt hệ thống', icon: <Settings size={19} /> },
        { id: 'support', label: 'Hỗ trợ kỹ thuật', icon: <HelpCircle size={19} /> },
      ],
    },
  ];

  const handleNav = (route: string) => {
    onNavigate(route);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 90,
          }}
        />
      )}

      <aside
        className={isOpenMobile ? 'open-mobile' : ''}
        style={{
          width: '260px',
          background: 'var(--bg-main)',
          borderRight: 'var(--subtle-border)',
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          position: 'sticky',
          top: 0,
          zIndex: 95,
          transition: 'transform 0.3s ease',
          padding: '24px 18px',
          overflowY: 'auto',
          ...(isOpenMobile
            ? { position: 'fixed', left: 0, top: 0, transform: 'translateX(0)' }
            : {}),
        }}
        id="app-sidebar"
      >
        {/* Brand Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '24px',
            marginBottom: '16px',
            borderBottom: '1px solid rgba(210, 218, 230, 0.4)',
          }}
        >
          <div
            onClick={() => handleNav('dashboard')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'var(--accent-pink-gradient)',
                boxShadow: 'var(--accent-pink-glow)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
              }}
            >
              <Cloud size={24} strokeWidth={2.4} />
            </div>
            <div>
              <div
                style={{
                  fontSize: '1.15rem',
                  fontWeight: 800,
                  letterSpacing: '-0.3px',
                  color: 'var(--text-main)',
                  lineHeight: 1.1,
                }}
              >
                Aston<span style={{ color: 'var(--accent-pink)' }}>Cloud</span>
              </div>
              <div
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  color: 'var(--text-muted)',
                }}
              >
                Nền tảng Cloud Runtime
              </div>
            </div>
          </div>

          {/* Close for mobile */}
          <button
            onClick={onCloseMobile}
            className="nm-btn"
            style={{
              display: 'none',
              padding: '6px',
              borderRadius: '50%',
            }}
            id="mobile-close-sidebar"
            aria-label="Đóng menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', flex: 1 }}>
          {sections.map((sec) => (
            <div key={sec.title}>
              <div
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.8px',
                  color: 'var(--text-muted)',
                  marginBottom: '8px',
                  paddingLeft: '12px',
                }}
              >
                {sec.title}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {sec.items.map((item) => {
                  const isActive =
                    currentRoute === item.id ||
                    (item.id === 'hosts' && currentRoute.startsWith('host-'));

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNav(item.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '11px 14px',
                        borderRadius: 'var(--radius-md)',
                        border: 'none',
                        background: isActive ? 'var(--bg-card)' : 'transparent',
                        boxShadow: isActive ? 'var(--nm-flat-sm)' : 'none',
                        color: isActive ? 'var(--accent-pink)' : 'var(--text-secondary)',
                        fontWeight: isActive ? 700 : 500,
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        transition: 'all var(--transition-fast)',
                        outline: 'none',
                        textAlign: 'left',
                        position: 'relative',
                      }}
                      className={isActive ? 'nm-card' : 'nm-btn'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ color: isActive ? 'var(--accent-pink)' : 'var(--text-muted)' }}>
                          {item.icon}
                        </span>
                        <span>{item.label}</span>
                      </div>

                      {item.badge && (
                        <span
                          style={{
                            background: 'var(--accent-pink-gradient)',
                            color: '#ffffff',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            padding: '2px 7px',
                            borderRadius: 'var(--radius-full)',
                            boxShadow: 'var(--accent-pink-glow)',
                          }}
                        >
                          {item.badge}
                        </span>
                      )}

                      {/* Active indicator bar */}
                      {isActive && (
                        <span
                          style={{
                            position: 'absolute',
                            left: '2px',
                            top: '25%',
                            bottom: '25%',
                            width: '4px',
                            borderRadius: 'var(--radius-full)',
                            background: 'var(--accent-pink)',
                          }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Platform Card: Quick Support */}
        <div
          className="nm-card"
          style={{
            padding: '14px',
            marginTop: 'auto',
            background: 'var(--bg-sunken)',
            boxShadow: 'var(--nm-inset-sm)',
            borderRadius: 'var(--radius-md)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>
            Node.js • Bun • Python
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Hạ tầng Đám mây Thế hệ mới
          </div>
        </div>
      </aside>
    </>
  );
};
