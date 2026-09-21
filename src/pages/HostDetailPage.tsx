import React, { useState } from 'react';
import {
  Server,
  Play,
  Square,
  RotateCw,
  Terminal,
  Folder,
  Key,
  Globe,
  Archive,
  FileText,
  Activity,
  ArrowLeft,
  Calendar,
  Layers,
  MapPin,
} from 'lucide-react';
import { useAppState } from '../context/AppStateContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Tabs, TabItem } from '../components/ui/Tabs';
import { StatusBadge } from '../components/ui/StatusBadge';
import { HostOverviewTab } from './host/HostOverviewTab';
import { HostConsoleTab } from './host/HostConsoleTab';
import { HostFilesTab } from './host/HostFilesTab';
import { HostVariablesTab } from './host/HostVariablesTab';
import { HostDomainsTab } from './host/HostDomainsTab';
import { HostBackupsTab } from './host/HostBackupsTab';
import { HostLogsTab } from './host/HostLogsTab';

interface HostDetailPageProps {
  hostId: string;
  onNavigate: (route: string) => void;
  initialTab?: string;
}

export const HostDetailPage: React.FC<HostDetailPageProps> = ({
  hostId,
  onNavigate,
  initialTab = 'overview',
}) => {
  const { getHost, startHost, stopHost, restartHost } = useAppState();

  const host = getHost(hostId);
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  if (!host) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Không tìm thấy máy chủ</h2>
        <Button variant="primary" onClick={() => onNavigate('hosts')} style={{ marginTop: '16px' }}>
          Quay lại Danh sách máy chủ
        </Button>
      </div>
    );
  }

  const tabs: TabItem[] = [
    { id: 'overview', label: 'Tổng quan', icon: <Activity size={16} /> },
    { id: 'console', label: 'Dòng lệnh', icon: <Terminal size={16} /> },
    { id: 'files', label: 'Tệp tin', icon: <Folder size={16} /> },
    { id: 'variables', label: 'Biến môi trường', icon: <Key size={16} /> },
    { id: 'domains', label: 'Tên miền', icon: <Globe size={16} /> },
    { id: 'backups', label: 'Sao lưu', icon: <Archive size={16} /> },
    { id: 'logs', label: 'Nhật ký', icon: <FileText size={16} /> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Back button & Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onNavigate('hosts')}
          icon={<ArrowLeft size={16} />}
        >
          Danh sách máy chủ
        </Button>
        <span style={{ color: 'var(--text-muted)' }}>/</span>
        <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.9rem' }}>
          {host.name}
        </span>
      </div>

      {/* Host Master Header Card */}
      <Card variant="raised" padding="lg">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
          {/* Host identity & status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                background:
                  host.runtime === 'python'
                    ? '#eff6ff'
                    : host.runtime === 'bun'
                    ? '#fdf2f8'
                    : '#ecfdf5',
                boxShadow: 'var(--nm-flat)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.1rem',
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.3px' }}>
                  {host.name}
                </h1>
                <StatusBadge status={host.status} />
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span>{host.version}</span>
                <span>•</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={13} /> {host.region}
                </span>
                <span>•</span>
                <span>Khởi tạo ngày {new Date(host.createdAt).toLocaleDateString('vi-VN')}</span>
              </div>
            </div>
          </div>

          {/* Master Control Buttons: Start, Stop, Restart */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {host.status === 'online' || host.status === 'RUNNING' ? (
              <Button
                variant="danger"
                size="md"
                onClick={() => stopHost(host.id)}
                icon={<Square size={16} />}
              >
                Dừng máy chủ
              </Button>
            ) : (
              <Button
                variant="primary"
                size="md"
                onClick={() => startHost(host.id)}
                icon={<Play size={16} />}
              >
                Bật máy chủ
              </Button>
            )}

            <Button
              variant="secondary"
              size="md"
              onClick={() => restartHost(host.id)}
              icon={<RotateCw size={16} />}
              disabled={host.status === 'restarting'}
            >
              {host.status === 'restarting' ? 'Đang khởi động...' : 'Khởi động lại'}
            </Button>
          </div>
        </div>

        {/* Quick specs strip */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '12px',
            marginTop: '20px',
            paddingTop: '18px',
            borderTop: '1px solid rgba(210, 218, 230, 0.4)',
          }}
        >
          <div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>TẢI CPU</div>
            <div style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-main)' }}>
              {host.status === 'PENDING' ? 'Chờ cấp phát' : `${host.cpuUsage}%`}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>BỘ NHỚ RAM</div>
            <div style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-main)' }}>
              {host.status === 'PENDING' ? `Định mức ${host.ramTotal} MB` : `${host.ramUsage} MB`}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>Ổ CỨNG NVME</div>
            <div style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-main)' }}>
              {host.status === 'PENDING' ? `Định mức ${host.diskTotal} GB` : `${host.diskUsage} GB`}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>THỜI GIAN CHẠY</div>
            <div style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-main)' }}>{host.uptime}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>GÓI DỊCH VỤ</div>
            <div style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--accent-pink)' }}>{host.plan.name}</div>
          </div>
        </div>
      </Card>

      {/* Host Sub-navigation Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab Content Panes */}
      <div>
        {activeTab === 'overview' && <HostOverviewTab host={host} onNavigateTab={setActiveTab} />}
        {activeTab === 'console' && <HostConsoleTab host={host} />}
        {activeTab === 'files' && <HostFilesTab host={host} />}
        {activeTab === 'variables' && <HostVariablesTab host={host} />}
        {activeTab === 'domains' && <HostDomainsTab host={host} />}
        {activeTab === 'backups' && <HostBackupsTab host={host} />}
        {activeTab === 'logs' && <HostLogsTab host={host} />}
      </div>
    </div>
  );
};
