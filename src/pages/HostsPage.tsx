import React, { useState } from 'react';
import {
  Server,
  Search,
  PlusCircle,
  ExternalLink,
  Cpu,
  Layers,
  HardDrive,
  Clock,
  Play,
  Square,
  RotateCw,
  SlidersHorizontal,
} from 'lucide-react';
import { useAppState } from '../context/AppStateContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ProgressBar } from '../components/ui/ResourceGauge';
import { EmptyState } from '../components/ui/EmptyState';

interface HostsPageProps {
  onNavigate: (route: string) => void;
}

export const HostsPage: React.FC<HostsPageProps> = ({ onNavigate }) => {
  const { hosts, setCurrentHostId, startHost, stopHost, restartHost } = useAppState();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'pending' | 'offline'>('all');
  const [runtimeFilter, setRuntimeFilter] = useState<'all' | 'nodejs' | 'bun' | 'python'>('all');

  const filteredHosts = hosts.filter((host) => {
    const matchesSearch =
      host.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      host.ipAddress.includes(searchQuery) ||
      host.version.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'online' && (host.status === 'online' || host.status === 'RUNNING')) ||
      (statusFilter === 'pending' && (host.status === 'PENDING' || host.status === 'PROVISIONING')) ||
      (statusFilter === 'offline' && (host.status === 'offline' || host.status === 'STOPPED' || host.status === 'SUSPENDED' || host.status === 'error'));

    const matchesRuntime = runtimeFilter === 'all' || host.runtime === runtimeFilter;

    return matchesSearch && matchesStatus && matchesRuntime;
  });

  const handleManage = (id: string) => {
    setCurrentHostId(id);
    onNavigate(`host-${id}`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px' }}>
            Máy chủ Đám mây
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Quản lý phiên bản máy chủ, theo dõi tài nguyên thời gian thực và vận hành môi trường runtime.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => onNavigate('create-host')}
          icon={<PlusCircle size={18} />}
        >
          Khởi tạo máy chủ
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <Card variant="raised" padding="md">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          {/* Search Input */}
          <div style={{ flex: 1, minWidth: '240px' }}>
            <Input
              placeholder="Tìm kiếm máy chủ theo tên, IP, phiên bản..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search size={18} />}
            />
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* Status Filter */}
            <div className="nm-inset" style={{ display: 'inline-flex', padding: '4px', borderRadius: 'var(--radius-md)', gap: '4px' }}>
              {(['all', 'online', 'pending', 'offline'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    background: statusFilter === st ? 'var(--bg-card)' : 'transparent',
                    boxShadow: statusFilter === st ? 'var(--nm-flat-sm)' : 'none',
                    color: statusFilter === st ? 'var(--accent-pink)' : 'var(--text-secondary)',
                    fontWeight: statusFilter === st ? 700 : 500,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  {st === 'all'
                    ? 'Tất cả'
                    : st === 'online'
                    ? 'Trực tuyến'
                    : st === 'pending'
                    ? 'Chờ cấp phát'
                    : 'Ngoại tuyến'}
                </button>
              ))}
            </div>

            {/* Runtime Filter */}
            <div className="nm-inset" style={{ display: 'inline-flex', padding: '4px', borderRadius: 'var(--radius-md)', gap: '4px' }}>
              {(['all', 'nodejs', 'bun', 'python'] as const).map((rt) => (
                <button
                  key={rt}
                  onClick={() => setRuntimeFilter(rt)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    background: runtimeFilter === rt ? 'var(--bg-card)' : 'transparent',
                    boxShadow: runtimeFilter === rt ? 'var(--nm-flat-sm)' : 'none',
                    color: runtimeFilter === rt ? 'var(--accent-pink)' : 'var(--text-secondary)',
                    fontWeight: runtimeFilter === rt ? 700 : 500,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  {rt === 'nodejs' ? 'Node.js' : rt === 'bun' ? 'Bun' : rt === 'python' ? 'Python' : 'Tất cả môi trường'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Host Cards Grid */}
      {filteredHosts.length === 0 ? (
        <EmptyState
          icon={<Server size={32} />}
          title="Không tìm thấy máy chủ"
          description="Không có máy chủ nào khớp với tiêu chí tìm kiếm hoặc bộ lọc hiện tại. Hãy thử điều chỉnh từ khóa hoặc tạo mới một máy chủ."
          actionText="Tạo máy chủ mới"
          onAction={() => onNavigate('create-host')}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '22px' }}>
          {filteredHosts.map((host) => (
            <Card
              key={host.id}
              variant="raised"
              padding="lg"
              hoverEffect
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '18px',
                position: 'relative',
              }}
            >
              {/* Card Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '14px',
                      background:
                        host.runtime === 'python'
                          ? '#eff6ff'
                          : host.runtime === 'bun'
                          ? '#fdf2f8'
                          : '#ecfdf5',
                      boxShadow: 'var(--nm-flat-sm)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.9rem',
                      fontWeight: 800,
                      color:
                        host.runtime === 'python'
                          ? '#2563eb'
                          : host.runtime === 'bun'
                          ? 'var(--accent-pink)'
                          : '#16a34a',
                    }}
                  >
                    {host.runtime === 'python' ? 'PY' : host.runtime === 'bun' ? 'BUN' : 'NODE'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-main)' }}>
                      {host.name}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {host.version} • {host.region}
                    </div>
                  </div>
                </div>

                <StatusBadge status={host.status} />
              </div>

              {/* Specs & IP info */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: 'var(--bg-sunken)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.78rem',
                  color: 'var(--text-secondary)',
                }}
              >
                <span>IP: <strong>{host.ipAddress}:{host.port}</strong></span>
                <span>Gói: <strong>{host.plan.name}</strong></span>
              </div>

              {/* Resource Metrics */}
              {host.status === 'PENDING' || host.status === 'PROVISIONING' ? (
                <div
                  className="nm-inset"
                  style={{
                    padding: '14px',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    background: 'var(--bg-sunken)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Trạng thái tài nguyên:</span>
                    <span style={{ fontWeight: 700, color: '#f59e0b', fontSize: '0.75rem' }}>Chưa khởi chạy container</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                    Định mức đăng ký: <strong>{host.cpuLimit ? `${host.cpuLimit} vCPU` : host.plan.cpu}</strong> • <strong>{host.ramTotal} MB RAM</strong> • <strong>{host.diskTotal} GB NVMe</strong>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#f59e0b', fontStyle: 'italic' }}>
                    * Hạ tầng đang chờ Node Agent điều phối container thực tế.
                  </div>
                </div>
              ) : (
                <div
                  className="nm-inset"
                  style={{
                    padding: '14px',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  {/* CPU */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', marginBottom: '4px', fontWeight: 600 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                        <Cpu size={14} color="var(--accent-pink)" /> CPU
                      </span>
                      <span style={{ color: 'var(--text-main)' }}>{host.cpuUsage}%</span>
                    </div>
                    <ProgressBar value={host.cpuUsage} height={6} color="var(--accent-pink)" />
                  </div>

                  {/* RAM */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', marginBottom: '4px', fontWeight: 600 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                        <Layers size={14} color="#06b6d4" /> RAM
                      </span>
                      <span style={{ color: 'var(--text-main)' }}>
                        {host.ramUsage} MB / {host.ramTotal} MB
                      </span>
                    </div>
                    <ProgressBar value={host.ramUsage} max={host.ramTotal} height={6} color="#06b6d4" />
                  </div>

                  {/* Disk */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', marginBottom: '4px', fontWeight: 600 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                        <HardDrive size={14} color="#10b981" /> Ổ cứng
                      </span>
                      <span style={{ color: 'var(--text-main)' }}>
                        {host.diskUsage} GB / {host.diskTotal} GB
                      </span>
                    </div>
                    <ProgressBar value={host.diskUsage} max={host.diskTotal} height={6} color="#10b981" />
                  </div>
                </div>
              )}

              {/* Uptime & Quick Controls */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                  <Clock size={14} /> Hoạt động: <strong style={{ color: 'var(--text-main)' }}>{host.uptime}</strong>
                </span>

                {/* Inline power controls */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  {host.status === 'online' || host.status === 'RUNNING' ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => stopHost(host.id)}
                      title="Dừng máy chủ"
                      style={{ padding: '6px 8px' }}
                    >
                      <Square size={13} color="var(--color-error)" />
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => startHost(host.id)}
                      title="Bật máy chủ"
                      style={{ padding: '6px 8px' }}
                    >
                      <Play size={13} color="var(--color-success)" />
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => restartHost(host.id)}
                    title="Khởi động lại"
                    style={{ padding: '6px 8px' }}
                  >
                    <RotateCw size={13} />
                  </Button>
                </div>
              </div>

              {/* Manage Action */}
              <Button
                variant="primary"
                onClick={() => handleManage(host.id)}
                icon={<ExternalLink size={16} />}
                style={{ width: '100%' }}
              >
                Quản lý máy chủ
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
