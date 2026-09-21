import React from 'react';
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
} from 'lucide-react';
import { Host } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ResourceGauge, ProgressBar } from '../../components/ui/ResourceGauge';
import { useToast } from '../../context/ToastContext';

interface HostOverviewTabProps {
  host: Host;
  onNavigateTab: (tabId: string) => void;
}

export const HostOverviewTab: React.FC<HostOverviewTabProps> = ({ host, onNavigateTab }) => {
  const { showToast } = useToast();
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);

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

  const isPending = host.status === 'PENDING' || host.status === 'PROVISIONING';
  const ramPercentage = isPending ? 0 : Math.round((host.ramUsage / host.ramTotal) * 100);
  const diskPercentage = isPending ? 0 : Math.round((host.diskUsage / host.diskTotal) * 100);

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

      {/* Resource Gauges Trio */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        {/* CPU */}
        <Card variant="raised" padding="md">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Cấu hình Phân bổ CPU
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-pink)', background: 'var(--accent-pink-light)', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
              {host.cpuLimit ? `${host.cpuLimit} vCPU` : host.plan.cpu}
            </span>
          </div>
          <div className="nm-inset" style={{ borderRadius: 'var(--radius-md)', padding: '4px' }}>
            <ResourceGauge
              label="Tải Điện toán Thực tế"
              value={isPending ? 0 : host.cpuUsage}
              displayValue={isPending ? 'Chưa khả dụng' : `${host.cpuUsage}%`}
              subText={isPending ? 'Chờ cấp phát container' : 'Đa luồng thời gian thực'}
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
              {host.plan.ram}
            </span>
          </div>
          <div className="nm-inset" style={{ borderRadius: 'var(--radius-md)', padding: '4px' }}>
            <ResourceGauge
              label="RAM Đang sử dụng"
              value={ramPercentage}
              displayValue={isPending ? 'Chưa khả dụng' : `${host.ramUsage} MB`}
              subText={isPending ? `Định mức: ${host.ramTotal} MB` : `trên tổng ${host.ramTotal} MB`}
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
              {host.plan.disk}
            </span>
          </div>
          <div className="nm-inset" style={{ borderRadius: 'var(--radius-md)', padding: '4px' }}>
            <ResourceGauge
              label="Dung lượng Đã dùng"
              value={diskPercentage}
              displayValue={isPending ? 'Chưa khả dụng' : `${host.diskUsage} GB`}
              subText={isPending ? `Định mức: ${host.diskTotal} GB NVMe` : `còn trống ${(host.diskTotal - host.diskUsage).toFixed(1)} GB`}
              color="#10b981"
              size="md"
            />
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
