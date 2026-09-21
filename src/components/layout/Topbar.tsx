import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, Menu, ExternalLink, ShieldCheck, Check, Sparkles, LogIn, LogOut } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';

interface TopbarProps {
  onOpenSearch: () => void;
  onToggleSidebar: () => void;
  onNavigate: (route: string) => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onOpenSearch, onToggleSidebar, onNavigate }) => {
  const {
    userProfile,
    notifications,
    markNotificationAsRead,
    clearNotifications,
    isAuthenticated,
    logout,
    openAuthModal,
  } = useAppState();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header
      style={{
        height: '74px',
        background: 'var(--bg-main)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 28px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        borderBottom: 'var(--subtle-border)',
      }}
    >
      {/* Left: Mobile hamburger & search button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          onClick={onToggleSidebar}
          className="nm-btn"
          style={{
            display: 'flex',
            padding: '10px',
            borderRadius: 'var(--radius-md)',
          }}
          title="Bật/Tắt Menu"
          aria-label="Bật/Tắt menu"
        >
          <Menu size={20} />
        </button>

        {/* Quick Search Bar */}
        <button
          onClick={onOpenSearch}
          className="nm-inset"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 18px',
            borderRadius: 'var(--radius-full)',
            border: 'none',
            cursor: 'pointer',
            minWidth: '260px',
            maxWidth: '380px',
            color: 'var(--text-muted)',
            fontSize: '0.88rem',
            textAlign: 'left',
          }}
        >
          <Search size={16} color="var(--accent-pink)" />
          <span style={{ flex: 1 }}>Tìm kiếm máy chủ, tài nguyên, tài liệu...</span>
          <kbd
            style={{
              background: 'var(--bg-card)',
              boxShadow: 'var(--nm-flat-sm)',
              padding: '2px 6px',
              borderRadius: '6px',
              fontSize: '0.72rem',
              fontWeight: 700,
              color: 'var(--text-secondary)',
            }}
          >
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: Cloud Status, Notifications & Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Cloud Platform Status Pill */}
        <div
          className="nm-card"
          style={{
            display: 'none',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.8rem',
            fontWeight: 600,
            color: 'var(--text-secondary)',
          }}
          id="cloud-status-pill"
        >
          <span
            className="pulse-online"
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-success)',
            }}
          />
          <span>Cụm Edge Toàn cầu Hoạt động</span>
        </div>

        {/* Notifications Popover */}
        <div style={{ position: 'relative' }} ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="nm-btn"
            style={{
              position: 'relative',
              padding: '10px',
              borderRadius: 'var(--radius-full)',
              width: '42px',
              height: '42px',
            }}
            title="Thông báo"
            aria-label="Xem thông báo"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent-pink)',
                  boxShadow: 'var(--accent-pink-glow)',
                }}
              />
            )}
          </button>

          {showNotifications && (
            <div
              className="animate-fade-in nm-card"
              style={{
                position: 'absolute',
                top: '52px',
                right: 0,
                width: '340px',
                padding: '16px',
                boxShadow: 'var(--nm-flat-lg)',
                borderRadius: 'var(--radius-lg)',
                zIndex: 100,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: '12px',
                  borderBottom: '1px solid rgba(210, 218, 230, 0.4)',
                  marginBottom: '10px',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                  Thông báo ({unreadCount} chưa đọc)
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={clearNotifications}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent-pink)',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Xóa tất cả
                  </button>
                )}
              </div>

              <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Chưa có thông báo nào.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => markNotificationAsRead(n.id)}
                      style={{
                        padding: '10px',
                        borderRadius: 'var(--radius-md)',
                        background: n.read ? 'transparent' : 'var(--bg-sunken)',
                        marginBottom: '6px',
                        cursor: 'pointer',
                        transition: 'all var(--transition-fast)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.86rem', color: 'var(--text-main)' }}>
                          {n.title}
                        </span>
                        {!n.read && (
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--accent-pink)' }} />
                        )}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {n.message}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        {n.timestamp}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile dropdown / Login button */}
        {!isAuthenticated ? (
          <button
            onClick={() => openAuthModal('login')}
            className="nm-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 18px',
              borderRadius: 'var(--radius-full)',
              color: 'var(--accent-pink)',
              fontWeight: 700,
              fontSize: '0.86rem',
            }}
          >
            <LogIn size={16} />
            <span>Đăng nhập</span>
          </button>
        ) : (
          <div style={{ position: 'relative' }} ref={userRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="nm-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '6px 14px 6px 6px',
                borderRadius: 'var(--radius-full)',
              }}
              aria-label="Menu tài khoản người dùng"
            >
              <img
                src={userProfile.avatar}
                alt={userProfile.name}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid var(--accent-pink-soft)',
                }}
              />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.2 }}>
                  {userProfile.name}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--accent-pink)', fontWeight: 600 }}>
                  ${userProfile.balance.toFixed(2)} USD
                </div>
              </div>
            </button>

            {showUserMenu && (
              <div
                className="animate-fade-in nm-card"
                style={{
                  position: 'absolute',
                  top: '52px',
                  right: 0,
                  width: '240px',
                  padding: '12px',
                  boxShadow: 'var(--nm-flat-lg)',
                  borderRadius: 'var(--radius-lg)',
                  zIndex: 100,
                }}
              >
                <div style={{ padding: '8px 10px', borderBottom: '1px solid rgba(210, 218, 230, 0.4)', marginBottom: '8px' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{userProfile.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{userProfile.email}</div>
                  {userProfile.role && (
                    <div style={{ marginTop: '4px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          backgroundColor: userProfile.role === 'ADMIN' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(255, 107, 149, 0.12)',
                          color: userProfile.role === 'ADMIN' ? '#ef4444' : 'var(--accent-pink)',
                        }}
                      >
                        {userProfile.role === 'ADMIN' ? 'Quản trị viên (ADMIN)' : 'Khách hàng (USER)'}
                      </span>
                    </div>
                  )}
                </div>

                <div
                  onClick={() => {
                    onNavigate('billing');
                    setShowUserMenu(false);
                  }}
                  className="nm-btn"
                  style={{ width: '100%', justifyContent: 'flex-start', padding: '8px 12px', marginBottom: '4px' }}
                >
                  <Sparkles size={16} color="var(--accent-pink)" />
                  <span>Nạp số dư (${userProfile.balance.toFixed(2)})</span>
                </div>

                <div
                  onClick={() => {
                    onNavigate('settings');
                    setShowUserMenu(false);
                  }}
                  className="nm-btn"
                  style={{ width: '100%', justifyContent: 'flex-start', padding: '8px 12px', marginBottom: '4px' }}
                >
                  <ShieldCheck size={16} color="var(--text-muted)" />
                  <span>Cài đặt tài khoản</span>
                </div>

                <div
                  onClick={() => {
                    onNavigate('support');
                    setShowUserMenu(false);
                  }}
                  className="nm-btn"
                  style={{ width: '100%', justifyContent: 'flex-start', padding: '8px 12px', marginBottom: '4px' }}
                >
                  <ExternalLink size={16} color="var(--text-muted)" />
                  <span>Hỗ trợ kỹ thuật</span>
                </div>

                <div
                  onClick={() => {
                    logout();
                    setShowUserMenu(false);
                  }}
                  className="nm-btn"
                  style={{
                    width: '100%',
                    justifyContent: 'flex-start',
                    padding: '8px 12px',
                    marginTop: '4px',
                    borderTop: '1px solid rgba(210, 218, 230, 0.4)',
                    color: '#ef4444',
                  }}
                >
                  <LogOut size={16} color="#ef4444" />
                  <span>Đăng xuất</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
