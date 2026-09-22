import React, { useState, useEffect } from 'react';
import { ToastProvider } from './context/ToastContext';
import { AppStateProvider, useAppState } from './context/AppStateContext';
import { Sidebar } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';
import { SearchModal } from './components/layout/SearchModal';
import { AuthModal } from './components/layout/AuthModal';
import { DashboardPage } from './pages/DashboardPage';
import { HostsPage } from './pages/HostsPage';
import { CreateHostPage } from './pages/CreateHostPage';
import { HostDetailPage } from './pages/HostDetailPage';
import { DomainsPage } from './pages/DomainsPage';
import { BackupsPage } from './pages/BackupsPage';
import { BillingPage } from './pages/BillingPage';
import { SettingsPage } from './pages/SettingsPage';
import { SupportPage } from './pages/SupportPage';

// Milestone 14: Admin Portal Components
import { AdminSidebar } from './components/admin/AdminSidebar';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminHostsPage } from './pages/admin/AdminHostsPage';
import { AdminNodesPage } from './pages/admin/AdminNodesPage';
import { AdminNodeDetailPage } from './pages/admin/AdminNodeDetailPage';
import { AdminPlansPage } from './pages/admin/AdminPlansPage';
import { AdminSubscriptionsPage } from './pages/admin/AdminSubscriptionsPage';
import { AdminInvoicesPage } from './pages/admin/AdminInvoicesPage';
import { AdminDomainsPage } from './pages/admin/AdminDomainsPage';
import { AdminBackupsPage } from './pages/admin/AdminBackupsPage';
import { AdminActivityPage } from './pages/admin/AdminActivityPage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';
import { ShieldAlert, ArrowLeft, LogIn } from 'lucide-react';

export function AppContent() {
  const { isAuthModalOpen, closeAuthModal, authModalTab, userProfile, isAuthenticated, openAuthModal } = useAppState();

  // Sync state with URL hash
  const getInitialRoute = () => {
    const hash = window.location.hash.replace(/^#\/?/, '');
    return hash || 'dashboard';
  };

  const [currentRoute, setCurrentRoute] = useState<string>(getInitialRoute);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '');
      if (hash) setCurrentRoute(hash);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (route: string) => {
    setCurrentRoute(route);
    window.location.hash = `#/${route}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Keyboard shortcut Ctrl+K / Cmd+K for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Normalize route (e.g. admin/users -> admin-users)
  const normalizedRoute = currentRoute.replace(/^admin\//, 'admin-');
  const isAdminRoute = normalizedRoute === 'admin' || normalizedRoute.startsWith('admin-');
  const hasAdminAccess = isAuthenticated && userProfile?.role === 'ADMIN';

  // Render active page
  const renderCurrentPage = () => {
    // 403 Forbidden Gate for Admin routes
    if (isAdminRoute && !hasAdminAccess) {
      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            padding: '20px',
          }}
        >
          <div
            className="nm-card"
            style={{
              width: '100%',
              maxWidth: '560px',
              padding: '36px',
              borderRadius: 'var(--radius-lg)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '18px',
              borderTop: '4px solid #ef4444',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.12)',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShieldAlert size={36} />
            </div>

            <div>
              <span
                style={{
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  color: '#ef4444',
                  background: 'rgba(239, 68, 68, 0.1)',
                  padding: '3px 10px',
                  borderRadius: 'var(--radius-full)',
                }}
              >
                403 Forbidden — Quyền truy cập bị từ chối
              </span>
              <h2
                style={{
                  fontSize: '1.4rem',
                  fontWeight: 800,
                  color: 'var(--text-main)',
                  margin: '12px 0 6px 0',
                }}
              >
                Khu Vực Quản Trị Viên Giới Hạn
              </h2>
              <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Bạn cần đăng nhập bằng tài khoản có vai trò <strong>ADMIN</strong> để truy cập cổng điều hành này. Vui lòng xác thực tài khoản quản trị viên hoặc quay lại trang người dùng thông thường.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
              <button
                onClick={() => navigateTo('dashboard')}
                className="nm-btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  fontSize: '0.86rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <ArrowLeft size={16} /> Về Trang Chủ
              </button>

              <button
                onClick={() => openAuthModal('login')}
                className="nm-btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: '#e11d48',
                  color: '#ffffff',
                  fontSize: '0.86rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(225, 29, 72, 0.35)',
                }}
              >
                <LogIn size={16} /> Đăng Nhập Admin
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Admin Pages
    if (normalizedRoute === 'admin' || normalizedRoute === 'admin-dashboard') {
      return <AdminDashboardPage onNavigate={navigateTo} />;
    }
    if (normalizedRoute === 'admin-users') {
      return <AdminUsersPage />;
    }
    if (normalizedRoute === 'admin-hosts') {
      return <AdminHostsPage />;
    }
    if (normalizedRoute === 'admin-nodes') {
      return <AdminNodesPage onNavigate={navigateTo} />;
    }
    if (normalizedRoute.startsWith('admin-node-')) {
      const nodeId = normalizedRoute.replace(/^admin-node-/, '');
      return <AdminNodeDetailPage nodeId={nodeId} onNavigate={navigateTo} />;
    }
    if (normalizedRoute === 'admin-plans') {
      return <AdminPlansPage />;
    }
    if (normalizedRoute === 'admin-subscriptions') {
      return <AdminSubscriptionsPage />;
    }
    if (normalizedRoute === 'admin-invoices') {
      return <AdminInvoicesPage />;
    }
    if (normalizedRoute === 'admin-domains') {
      return <AdminDomainsPage />;
    }
    if (normalizedRoute === 'admin-backups') {
      return <AdminBackupsPage />;
    }
    if (normalizedRoute === 'admin-activity') {
      return <AdminActivityPage />;
    }
    if (normalizedRoute === 'admin-settings') {
      return <AdminSettingsPage />;
    }

    // Customer Pages
    if (currentRoute === 'dashboard') {
      return <DashboardPage onNavigate={navigateTo} />;
    }
    if (currentRoute === 'hosts') {
      return <HostsPage onNavigate={navigateTo} />;
    }
    if (currentRoute === 'create-host') {
      return <CreateHostPage onNavigate={navigateTo} />;
    }
    if (currentRoute.startsWith('host-')) {
      const hostId = currentRoute.replace(/^host-/, '');
      return <HostDetailPage hostId={hostId} onNavigate={navigateTo} />;
    }
    if (currentRoute === 'domains') {
      return <DomainsPage onNavigate={navigateTo} />;
    }
    if (currentRoute === 'backups') {
      return <BackupsPage onNavigate={navigateTo} />;
    }
    if (currentRoute === 'billing') {
      return <BillingPage onNavigate={navigateTo} />;
    }
    if (currentRoute === 'settings') {
      return <SettingsPage onNavigate={navigateTo} />;
    }
    if (currentRoute === 'support') {
      return <SupportPage onNavigate={navigateTo} />;
    }

    // Default fallback
    return <DashboardPage onNavigate={navigateTo} />;
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-main)' }}>
      {/* Navigation Sidebar: Switches dynamically between Customer Sidebar and Admin Sidebar */}
      {isAdminRoute && hasAdminAccess ? (
        <AdminSidebar
          currentRoute={normalizedRoute}
          onNavigate={navigateTo}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />
      ) : (
        <Sidebar
          currentRoute={currentRoute}
          onNavigate={navigateTo}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Main Workspace */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Topbar */}
        <Topbar
          onOpenSearch={() => setIsSearchOpen(true)}
          onToggleSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          onNavigate={navigateTo}
        />

        {/* Page Body */}
        <main style={{ flex: 1, padding: '28px 32px 64px 32px', maxWidth: '1440px', width: '100%', margin: '0 auto' }}>
          {renderCurrentPage()}
        </main>
      </div>

      {/* Global Spotlight Search */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={navigateTo}
      />

      {/* Neuromorphic Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={closeAuthModal}
        defaultTab={authModalTab}
      />
    </div>
  );
}

export function App() {
  return (
    <ToastProvider>
      <AppStateProvider>
        <AppContent />
      </AppStateProvider>
    </ToastProvider>
  );
}

export default App;
