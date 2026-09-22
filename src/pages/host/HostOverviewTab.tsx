import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Layers,
  HardDrive,
  Clock,
  Globe,
  Server,
  Shield,
  Key,
  Copy,
  Check,
  Calendar,
  ExternalLink,
  Activity,
  ArrowDown,
  ArrowUp,
  Wifi,
  AlertCircle,
} from 'lucide-react';
import { Host, HostLiveStats } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ResourceGauge, ProgressBar } from '../../components/ui/ResourceGauge';
import { useToast } from '../../context/ToastContext';

interface HostOverviewTabProps {
  host: Host;
  onNavigateTab: (tabId: string) => void;
}

const formatBytes = (bytes: number): string => {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export const HostOverviewTab: React.FC<HostOverviewTabProps> = ({ host, onNavigateTab }) => {
  const { showToast } = useToast();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [liveStats, setLiveStats] = useState<HostLiveStats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);

  const copyToClipboard = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    showToast({
      title: 'Đã sao chép vào bộ nhớ tạm',
      message: text,
      type: 'info',
    });
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Periodic polling for host live metrics (every 6 seconds)
  useEffect(() => {
    let isMounted = true;
    let timerId: any = null;

    const fetchStats = async () => {
      if (host.status === 'DELETING') return;

      try {
        const rawId = host.numericId ? String(host.numericId) : host.id.replace(/^host-/, '');
        const token = localStorage.getItem('aston_auth_token');
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`/api/v1/hosts/${rawId}/stats`, { headers });
        if (!res.ok) {
          if (isMounted) setStatsError('Không thể tải số liệu thời gian thực');
          return;
        }

        const json = await res.json();
        if (isMounted && json.success && json.data) {
          const data = json.data;
          setLiveStats({
            status: data.status,
            available: data.available !== false,
            cpu: data.cpu || { usage: data.cpuPercent || 0, limit: host.cpuLimit || 1 },
            memory: data.memory || { usage: data.memoryUsageMb || 0, limit: host.ramTotal || 512 },
            disk: data.disk || { usage: Math.round(host.diskUsage * 1024), limit: host.diskTotal * 1024 },
            network: data.network || { rx: 0, tx: 0 },
            uptime: data.uptime || 0,
            uptimeFormatted: data.uptimeFormatted,
            timestamp: data.timestamp || new Date().toISOString(),
          });
          setStatsError(null);
        }
      } catch (_err) {
        if (isMounted) setStatsError('Lỗi kết nối tới Node Agent');
      }
    };

    fetchStats();

    const startPolling = () => {
      if (!timerId) {
        timerId = setInterval(() => {
          if (document.visibilityState === 'visible') {
            fetchStats();
          }
        }, 6000);
      }
    };

    const stopPolling = () => {
      if (timerId) {
        clearInterval(timerId);
        timerId = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchStats();
        startPolling();
      } else {
        stopPolling();
      }
    };

    startPolling();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [host.id, host.numericId, host.status]);

  const isPending = host.status === 'PENDING' || host.status === 'PROVISIONING';
  const isStopped = host.status === 'STOPPED' || host.status === 'offline';
  const isRunning = host.status === 'RUNNING' || host.status === 'online';

  // Extract real numbers from liveStats or host defaults
  const cpuUsage = isStopped || isPending ? 0 : (liveStats?.cpu?.usage ?? host.cpuUsage);
  const cpuLimit = liveStats?.cpu?.limit ?? (host.cpuLimit || (host.planId === 'developer' ? 2 : host.planId === 'pro' ? 4 : 1));

  const ramTotalMb = liveStats?.memory?.limit ?? (host.ramTotal || 512);
  const ramUsageMb = isStopped || isPending ? 0 : (liveStats?.memory?.usage ?? host.ramUsage);
  const ramPercentage = isStopped || isPending ? 0 : Math.min(100, Math.round((ramUsageMb / ramTotalMb) * 100));

  const diskLimitGb = liveStats?.disk?.limit ? Math.round(liveStats.disk.limit / 1024) : host.diskTotal;
  const diskUsageGb = liveStats?.disk?.usage ? Number((liveStats.disk.usage / 1024).toFixed(1)) : host.diskUsage;
  const diskPercentage = isPending ? 0 : Math.min(100, Math.round((diskUsageGb / diskLimitGb) * 100));

  const networkRx = isStopped || isPending ? 0 : (liveStats?.network?.rx || 0);
  const networkTx = isStopped || isPending ? 0 : (liveStats?.network?.tx || 0);
  const displayUptime = isStopped ? '0m (Đã dừng)' : isPending ? 'Chưa khả dụng' : (liveStats?.uptimeFormatted || host.uptime || '0m');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Pending Infrastructure Alert Banner */}
      {isPending && (
        <Card
          variant="raised"
          padding="md"
          style={{
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, var(--bg-card) 100%)',
            borderLeft: '4px solid #f59e0b',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(245, 158, 11, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#f59e0b',
                flexShrink: 0,
              }}
            >
              <Clock size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)', marginBottom: '4px' }}>
                Trạng thái Hạ tầng: Chờ cấp phát (Pending)
              </div>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                Máy chủ đã được khởi tạo và lưu trữ thành công trong cơ sở dữ liệu. Môi trường container chưa được triển khai trên node vì hệ thống đang hoàn thiện kết nối Node Agent. Các chức năng điều khiển (Start/Stop/Restart) và số liệu thời gian thực sẽ khả dụng khi container được phân bổ.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Stopped Host Alert Banner */}
      {isStopped && (
        <Card
          variant="raised"
          padding="md"
          style={{
            background: 'linear-gradient(135deg, rgba(100, 116, 139, 0.08) 0%, var(--bg-card) 100%)',
            borderLeft: '4px solid #64748b',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(100, 116, 139, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
                flexShrink: 0,
              }}
            >
              <AlertCircle size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)', marginBottom: '2px' }}>
                Máy chủ hiện đang tạm dừng (Stopped)
              </div>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: 0 }}>
                Tiến trình container không hoạt động. Mức sử dụng CPU và RAM đang ở mức 0. Dữ liệu trên ổ cứng NVMe vẫn được bảo toàn nguyên vẹn.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Live Polling Indicator & Warning */}
      {statsError && (
        <div style={{ fontSize: '0.8rem', color: '#e11d48', display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px', background: '#ffe4e6', borderRadius: '6px' }}>
          <AlertCircle size={14} /> {statsError}
        </div>
      )}

      {/* Resource Gauges Grid (CPU, RAM, Disk, Network & Uptime) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
        {/* CPU */}
        <Card variant="raised" padding="md">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Cấu hình Phân bổ CPU
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-pink)', background: 'var(--accent-pink-light)', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
              {cpuLimit} vCPU
            </span>
          </div>
          <div className="nm-inset" style={{ borderRadius: 'var(--radius-md)', padding: '4px' }}>
            <ResourceGauge
              label="Tải Điện toán Thực tế"
              value={cpuUsage}
              displayValue={isPending ? 'Chưa khả dụng' : `${cpuUsage}%`}
              subText={isPending ? 'Chờ cấp phát container' : isStopped ? 'Máy chủ đang dừng' : 'Đa luồng thời gian thực'}
              color="var(--accent-pink)"
              size="md"
            />
          </div>
        </Card>

        {/* RAM */}
        <Card variant="raised" padding="md">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Hiệu suất Sử dụng RAM
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#06b6d4', background: '#ecfeff', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
              {ramTotalMb >= 1024 ? `${(ramTotalMb / 1024).toFixed(0)} GB` : `${ramTotalMb} MB`}
            </span>
          </div>
          <div className="nm-inset" style={{ borderRadius: 'var(--radius-md)', padding: '4px' }}>
            <ResourceGauge
              label="RAM Đang sử dụng"
              value={ramPercentage}
              displayValue={isPending ? 'Chưa khả dụng' : `${ramUsageMb} MB`}
              subText={isPending ? `Định mức: ${ramTotalMb} MB` : `trên tổng ${ramTotalMb} MB`}
              color="#06b6d4"
              size="md"
            />
          </div>
        </Card>

        {/* Disk */}
        <Card variant="raised" padding="md">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Dung lượng Ổ cứng NVMe
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981', background: '#ecfdf5', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
              {diskLimitGb} GB NVMe
            </span>
          </div>
          <div className="nm-inset" style={{ borderRadius: 'var(--radius-md)', padding: '4px' }}>
            <ResourceGauge
              label="Dung lượng Đã dùng"
              value={diskPercentage}
              displayValue={isPending ? 'Chưa khả dụng' : `${diskUsageGb} GB`}
              subText={isPending ? `Định mức: ${diskLimitGb} GB NVMe` : `còn trống ${(diskLimitGb - diskUsageGb).toFixed(1)} GB`}
              color="#10b981"
              size="md"
            />
          </div>
        </Card>

        {/* Network & Uptime */}
        <Card variant="raised" padding="md">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Lưu lượng Mạng & Uptime
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#8b5cf6', background: '#f5f3ff', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
              {displayUptime}
            </span>
          </div>
          <div className="nm-inset" style={{ borderRadius: 'var(--radius-md)', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                <ArrowDown size={14} color="#10b981" /> Nhận (RX):
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)' }}>
                {formatBytes(networkRx)}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                <ArrowUp size={14} color="#3b82f6" /> Gửi (TX):
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)' }}>
                {formatBytes(networkTx)}
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', borderTop: '1px solid rgba(226, 232, 240, 0.6)', paddingTop: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Thời gian trực tuyến:</span>
              <span style={{ fontWeight: 600, color: isRunning ? '#10b981' : 'var(--text-secondary)' }}>
                ● {displayUptime}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Instance Details & Connection Endpoints */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Specifications & Host Information */}
        <Card variant="raised" padding="lg">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '16px' }}>
            Cấu hình Phiên bản Máy chủ
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(210, 218, 230, 0.4)' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Gói Dịch vụ Đám mây</span>
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>{host.plan.name} (${host.plan.price}/tháng)</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(210, 218, 230, 0.4)' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Môi trường Runtime</span>
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--accent-pink)' }}>{host.version}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(210, 218, 230, 0.4)' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Khu vực & Trung tâm Dữ liệu</span>
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>{host.regionFlag} {host.region}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(210, 218, 230, 0.4)' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Ngày Khởi tạo</span>
              <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)' }}>
                {new Date(host.createdAt).toLocaleDateString('vi-VN')}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(210, 218, 230, 0.4)' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Tự động Khởi động lại khi Gặp lỗi</span>
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: host.autoRestart ? 'var(--color-success)' : 'var(--text-muted)' }}>
                {host.autoRestart ? 'Đã kích hoạt' : 'Chưa kích hoạt'}
              </span>
            </div>

            {host.repoUrl && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Kho mã nguồn (Git)</span>
                <a
                  href={host.repoUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-pink)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  Kho GitHub <ExternalLink size={13} />
                </a>
              </div>
            )}
          </div>
        </Card>

        {/* Quick Connection Details */}
        <Card variant="raised" padding="lg">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '16px' }}>
            Mạng & Cổng Kết nối Trực tiếp
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Primary IP & Port */}
            <div className="nm-inset" style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                Địa chỉ IPv4 Trực tiếp & Cổng dịch vụ
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <code style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                  {host.ipAddress}:{host.port}
                </code>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => copyToClipboard(`${host.ipAddress}:${host.port}`, 'ip')}
                  icon={copiedKey === 'ip' ? <Check size={14} color="var(--color-success)" /> : <Copy size={14} />}
                >
                  {copiedKey === 'ip' ? 'Đã chép' : 'Sao chép'}
                </Button>
              </div>
            </div>

            {/* SFTP / SSH access */}
            <div className="nm-inset" style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                Máy chủ Truy cập SFTP / SSH
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <code style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-main)' }}>
                  sftp.astoncloud.app:2022
                </code>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => copyToClipboard('sftp.astoncloud.app:2022', 'sftp')}
                  icon={copiedKey === 'sftp' ? <Check size={14} color="var(--color-success)" /> : <Copy size={14} />}
                >
                  {copiedKey === 'sftp' ? 'Đã chép' : 'Sao chép'}
                </Button>
              </div>
            </div>

            {/* Quick Actions Shortcuts */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              <Button
                variant="secondary"
                style={{ flex: 1 }}
                onClick={() => onNavigateTab('console')}
              >
                Mở Cửa sổ Dòng lệnh
              </Button>
              <Button
                variant="secondary"
                style={{ flex: 1 }}
                onClick={() => onNavigateTab('files')}
              >
                Quản lý Tệp tin
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
