import React, { useState, useEffect } from 'react';
import { Search, Server, Globe, Shield, CreditCard, LifeBuoy, ArrowRight, X } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (route: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, onNavigate }) => {
  const [query, setQuery] = useState('');
  const { hosts, domains } = useAppState();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        // Toggle handled by caller
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredHosts = hosts.filter(
    (h) =>
      h.name.toLowerCase().includes(query.toLowerCase()) ||
      h.runtime.toLowerCase().includes(query.toLowerCase()) ||
      h.ipAddress.includes(query)
  );

  const filteredDomains = domains.filter((d) =>
    d.domain.toLowerCase().includes(query.toLowerCase())
  );

  const quickPages = [
    { title: 'Bảng điều khiển', route: 'dashboard', icon: <Server size={16} /> },
    { title: 'Tất cả máy chủ', route: 'hosts', icon: <Server size={16} /> },
    { title: 'Khởi tạo máy chủ mới', route: 'create-host', icon: <Server size={16} /> },
    { title: 'Tên miền & DNS', route: 'domains', icon: <Globe size={16} /> },
    { title: 'Bản sao lưu & Khôi phục', route: 'backups', icon: <Shield size={16} /> },
    { title: 'Thanh toán & Hóa đơn', route: 'billing', icon: <CreditCard size={16} /> },
    { title: 'Yêu cầu hỗ trợ', route: 'support', icon: <LifeBuoy size={16} /> },
  ].filter((p) => p.title.toLowerCase().includes(query.toLowerCase()));

  const handleSelect = (route: string) => {
    onNavigate(route);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '80px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="animate-fade-in nm-card"
        style={{
          width: '100%',
          maxWidth: '600px',
          background: 'var(--bg-card)',
          boxShadow: 'var(--nm-flat-lg)',
          borderRadius: 'var(--radius-xl)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Search input header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '18px 24px',
            borderBottom: '1px solid rgba(210, 218, 230, 0.5)',
          }}
        >
          <Search size={22} color="var(--accent-pink)" />
          <input
            autoFocus
            type="text"
            placeholder="Tìm kiếm máy chủ, tên miền, nhật ký, trang (vd: bun, python)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: '1.05rem',
              color: 'var(--text-main)',
              fontFamily: 'inherit',
            }}
          />
          <button
            onClick={onClose}
            style={{
              background: 'var(--bg-sunken)',
              border: 'none',
              borderRadius: 'var(--radius-full)',
              padding: '6px',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              display: 'flex',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Search results */}
        <div style={{ maxHeight: '420px', overflowY: 'auto', padding: '16px' }}>
          {/* Matching Hosts */}
          {filteredHosts.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  marginBottom: '8px',
                  paddingLeft: '8px',
                }}
              >
                Máy chủ ({filteredHosts.length})
              </div>
              {filteredHosts.map((host) => (
                <div
                  key={host.id}
                  onClick={() => handleSelect(`host-${host.id}`)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                    marginBottom: '4px',
                  }}
                  className="nm-btn"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Server size={18} color="var(--accent-pink)" />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                        {host.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {host.version} • {host.ipAddress}
                      </div>
                    </div>
                  </div>
                  <ArrowRight size={16} color="var(--text-muted)" />
                </div>
              ))}
            </div>
          )}

          {/* Matching Domains */}
          {filteredDomains.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  marginBottom: '8px',
                  paddingLeft: '8px',
                }}
              >
                Tên miền ({filteredDomains.length})
              </div>
              {filteredDomains.map((dom) => (
                <div
                  key={dom.id}
                  onClick={() => handleSelect('domains')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    marginBottom: '4px',
                  }}
                  className="nm-btn"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Globe size={18} color="var(--accent-pink)" />
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{dom.domain}</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{dom.hostName}</span>
                </div>
              ))}
            </div>
          )}

          {/* Navigation Pages */}
          <div>
            <div
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                marginBottom: '8px',
                paddingLeft: '8px',
              }}
            >
              Điều hướng nhanh
            </div>
            {quickPages.map((page) => (
              <div
                key={page.route}
                onClick={() => handleSelect(page.route)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  marginBottom: '4px',
                }}
                className="nm-btn"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: 'var(--accent-pink)' }}>{page.icon}</span>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{page.title}</span>
                </div>
                <ArrowRight size={16} color="var(--text-muted)" />
              </div>
            ))}
          </div>
        </div>

        {/* Footer shortcuts */}
        <div
          style={{
            padding: '12px 20px',
            background: 'var(--bg-sunken)',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
          }}
        >
          <span>Nhấn <strong>ESC</strong> để đóng</span>
          <span>Mẹo: Nhấn <strong>Ctrl+K</strong> ở bất kỳ trang nào</span>
        </div>
      </div>
    </div>
  );
};
