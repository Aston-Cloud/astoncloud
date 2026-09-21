import React, { useState, useEffect } from 'react';
import { ToastProvider } from './context/ToastContext';
import { AppStateProvider } from './context/AppStateContext';
import { Sidebar } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';
import { SearchModal } from './components/layout/SearchModal';
import { DashboardPage } from './pages/DashboardPage';
import { HostsPage } from './pages/HostsPage';
import { CreateHostPage } from './pages/CreateHostPage';
import { HostDetailPage } from './pages/HostDetailPage';
import { DomainsPage } from './pages/DomainsPage';
import { BackupsPage } from './pages/BackupsPage';
import { BillingPage } from './pages/BillingPage';
import { SettingsPage } from './pages/SettingsPage';
import { SupportPage } from './pages/SupportPage';

export function AppContent() {
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

  // Render active page
  const renderCurrentPage = () => {
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
      {/* Navigation Sidebar */}
      <Sidebar
        currentRoute={currentRoute}
        onNavigate={navigateTo}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

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
