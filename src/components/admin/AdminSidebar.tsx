import React from 'react';
import {
  LayoutDashboard,
  Users,
  Server,
  Cpu,
  Layers,
  CreditCard,
  FileText,
  Globe,
  Archive,
  Activity,
  Settings,
  ArrowLeft,
  ShieldCheck,
  X,
} from 'lucide-react';

interface AdminSidebarProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  currentRoute,
  onNavigate,
  isOpenMobile,
  onCloseMobile,
}) => {
  const sections = [
    {
      title: 'Tổng quan hệ thống',
      items: [
        { id: 'admin-dashboard', label: 'Dashboard Quản trị', icon: <LayoutDashboard size={18} /> },
        { id: 'admin-users', label: 'Quản lý Người dùng', icon: <Users size={18} /> },
        { id: 'admin-activity', label: 'Nhật ký Kiểm toán (Audit)', icon: <Activity size={18} /> },
      ],
    },
    {
      title: 'Hạ tầng & Dịch vụ',
      items: [
        { id: 'admin-hosts', label: 'Quản trị Máy chủ (Hosts)', icon: <Server size={18} /> },
        { id: 'admin-nodes', label: 'Hạ tầng Nodes (Mock)', icon: <Cpu size={18} /> },
        { id: 'admin-domains', label: 'Quản trị Tên miền', icon: <Globe size={18} /> },
        { id: 'admin-backups', label: 'Quản trị Bản sao lưu', icon: <Archive size={18} /> },
      ],
    },
    {
      title: 'Kinh doanh & Cấu hình',
      items: [
        { id: 'admin-plans', label: 'Gói Hosting (Plans)', icon: <Layers size={18} /> },
        { id: 'admin-subscriptions', label: 'Thuê bao dịch vụ', icon: <CreditCard size={18} /> },
        { id: 'admin-invoices', label: 'Quản lý Hóa đơn', icon: <FileText size={18} /> },
        { id: 'admin-settings', label: 'Cấu hình Hệ thống', icon: <Settings size={18} /> },
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
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 90,
          }}
        />
      )}

      <aside
        className={isOpenMobile ? 'open-mobile' : ''}
        style={{
          width: '270px',
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
        id="admin-sidebar"
      >
        {/* Brand Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '20px',
            marginBottom: '16px',
            borderBottom: '1px solid rgba(210, 218, 230, 0.4)',
          }}
        >
          <div
            onClick={() => handleNav('admin-dashboard')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)',
                boxShadow: '0 4px 14px rgba(225, 29, 72, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
              }}
            >
              <ShieldCheck size={24} strokeWidth={2.4} />
            </div>
            <div>
              <div
                style={{
                  fontSize: '1.1rem',
                  fontWeight: 800,
                  letterSpacing: '-0.3px',
                  color: 'var(--text-main)',
                  lineHeight: 1.1,
                }}
              >
                Aston<span style={{ color: '#e11d48' }}>Admin</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginTop: '3px',
                }}
              >
                <span
                  style={{
                    fontSize: '0.62rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.8px',
                    color: '#e11d48',
                    background: 'rgba(225, 29, 72, 0.12)',
                    padding: '1px 6px',
                    borderRadius: '4px',
                  }}
                >
                  Root Control
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onCloseMobile}
            className="nm-btn"
            style={{
              display: 'none',
              padding: '6px',
              borderRadius: '50%',
            }}
            id="mobile-close-admin-sidebar"
            aria-label="Đóng menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Back to Customer Dashboard Button */}
        <div style={{ marginBottom: '18px' }}>
          <button
            onClick={() => handleNav('dashboard')}
            className="nm-btn"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: 'var(--bg-sunken)',
              boxShadow: 'var(--nm-inset-sm)',
              color: 'var(--text-secondary)',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
            }}
            title="Quay lại giao diện người dùng thường"
          >
            <ArrowLeft size={16} />
            <span>Về Bảng Điều Khiển Khách</span>
          </button>
        </div>

        {/* Navigation Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
          {sections.map((sec) => (
            <div key={sec.title}>
              <div
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.8px',
                  color: 'var(--text-muted)',
                  marginBottom: '8px',
                  paddingLeft: '10px',
                }}
              >
                {sec.title}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {sec.items.map((item) => {
                  const isActive = currentRoute === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNav(item.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-md)',
                        border: 'none',
                        background: isActive ? 'var(--bg-card)' : 'transparent',
                        boxShadow: isActive ? 'var(--nm-flat-sm)' : 'none',
                        color: isActive ? '#e11d48' : 'var(--text-secondary)',
                        fontWeight: isActive ? 700 : 500,
                        fontSize: '0.86rem',
                        cursor: 'pointer',
                        transition: 'all var(--transition-fast)',
                        outline: 'none',
                        textAlign: 'left',
                        position: 'relative',
                      }}
                      className={isActive ? 'nm-card' : 'nm-btn'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ color: isActive ? '#e11d48' : 'var(--text-muted)' }}>
                          {item.icon}
                        </span>
                        <span>{item.label}</span>
                      </div>

                      {isActive && (
                        <span
                          style={{
                            position: 'absolute',
                            left: '2px',
                            top: '25%',
                            bottom: '25%',
                            width: '4px',
                            borderRadius: 'var(--radius-full)',
                            background: '#e11d48',
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

        {/* Infrastructure Status Banner */}
        <div
          className="nm-card"
          style={{
            padding: '12px',
            marginTop: 'auto',
            background: 'var(--bg-sunken)',
            boxShadow: 'var(--nm-inset-sm)',
            borderRadius: 'var(--radius-md)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 800,
              color: 'var(--accent-teal)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: 'var(--accent-teal)',
                boxShadow: '0 0 8px var(--accent-teal)',
              }}
            />
            MOCK CLOUD INFRA
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Hạ tầng Node Agent cục bộ an toàn
          </div>
        </div>
      </aside>
    </>
  );
};
