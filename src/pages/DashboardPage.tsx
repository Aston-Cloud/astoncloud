import React from 'react';
import {
  Server,
  Activity,
  HardDrive,
  Cpu,
  PlusCircle,
  ArrowRight,
  TrendingUp,
  ExternalLink,
  Shield,
  Zap,
} from 'lucide-react';
import { useAppState } from '../context/AppStateContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ResourceGauge, ProgressBar } from '../components/ui/ResourceGauge';

interface DashboardPageProps {
  onNavigate: (route: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { hosts, userProfile, setCurrentHostId } = useAppState();

  const totalHosts = hosts.length;
  const onlineHosts = hosts.filter((h) => h.status === 'online' || h.status === 'RUNNING').length;
  const pendingHosts = hosts.filter((h) => h.status === 'PENDING' || h.status === 'PROVISIONING').length;

  const totalStorageGB = hosts.reduce((acc, h) => acc + h.diskTotal, 0);
  const usedStorageGB = hosts.reduce((acc, h) => acc + (h.status === 'PENDING' ? 0 : h.diskUsage), 0);
  const storagePercentage = totalStorageGB > 0 ? (usedStorageGB / totalStorageGB) * 100 : 0;

  // Average CPU & RAM for online hosts
  const onlineList = hosts.filter((h) => h.status === 'online' || h.status === 'RUNNING');
  const avgCpu = onlineList.length > 0 ? Math.round(onlineList.reduce((acc, h) => acc + h.cpuUsage, 0) / onlineList.length) : 0;
  const totalRamMB = hosts.reduce((acc, h) => acc + h.ramTotal, 0);
  const usedRamMB = hosts.reduce((acc, h) => acc + (h.status === 'PENDING' ? 0 : h.ramUsage), 0);
  const ramPercentage = totalRamMB > 0 ? Math.round((usedRamMB / totalRamMB) * 100) : 0;

  const handleManageHost = (hostId: string) => {
    setCurrentHostId(hostId);
    onNavigate(`host-${hostId}`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* 1. Welcome section */}
      <Card
        variant="raised"
        padding="lg"
        style={{
          background: 'linear-gradient(135deg, #ffffff 0%, var(--bg-card) 60%, var(--accent-pink-light) 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--accent-pink)', fontWeight: 700, fontSize: '0.85rem' }}>
              <Zap size={16} /> Nền tảng Đám mây Aston Cloud PaaS
            </div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px' }}>
              Chào mừng trở lại, {userProfile.name}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '6px', maxWidth: '600px' }}>
              Các ứng dụng Node.js, Bun và Python của bạn đang vận hành ổn định trên các cụm máy chủ đám mây tốc độ cao. Toàn bộ hệ thống hoạt động bình thường.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <Button variant="secondary" onClick={() => onNavigate('hosts')} icon={<Server size={17} />}>
              Xem tất cả máy chủ
            </Button>
            <Button variant="primary" onClick={() => onNavigate('create-host')} icon={<PlusCircle size={17} />}>
              Khởi tạo máy chủ
            </Button>
          </div>
        </div>
      </Card>

      {/* 2. Key Stats Cards: Total Hosts, Online Hosts, Storage, Resource Usage */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '20px' }}>
        {/* Total Hosts */}
        <Card variant="raised" padding="md" hoverEffect>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Tổng số máy chủ</span>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: 'var(--bg-sunken)',
                boxShadow: 'var(--nm-flat-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-pink)',
              }}
            >
              <Server size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)' }}>{totalHosts}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Phiên bản Node.js, Bun & Python
          </div>
        </Card>

        {/* Online Hosts */}
        <Card variant="raised" padding="md" hoverEffect>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Máy chủ trực tuyến</span>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: 'var(--color-success-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-success)',
              }}
            >
              <Activity size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-success)' }}>
            {onlineHosts} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/ {totalHosts}</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-success)', marginTop: '4px', fontWeight: 600 }}>
            ● {totalHosts > 0 ? Math.round((onlineHosts / totalHosts) * 100) : 0}% hoạt động ổn định
          </div>
        </Card>

        {/* Storage */}
        <Card variant="raised" padding="md" hoverEffect>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Dung lượng ổ cứng (NVMe)</span>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: 'var(--bg-sunken)',
                boxShadow: 'var(--nm-flat-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-pink)',
              }}
            >
              <HardDrive size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {usedStorageGB.toFixed(1)} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>GB / {totalStorageGB} GB</span>
          </div>
          <div style={{ marginTop: '8px' }}>
            <ProgressBar value={storagePercentage} height={6} color="var(--accent-pink)" />
          </div>
        </Card>

        {/* Credit Balance / Resource Usage */}
        <Card variant="raised" padding="md" hoverEffect>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Số dư tài khoản</span>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: 'var(--accent-pink-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-pink)',
              }}
            >
              <TrendingUp size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)' }}>
            ${userProfile.balance.toFixed(2)}
          </div>
          <div
            onClick={() => onNavigate('billing')}
            style={{ fontSize: '0.78rem', color: 'var(--accent-pink)', marginTop: '4px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            Quản lý thanh toán & nạp tiền <ArrowRight size={14} />
          </div>
        </Card>
      </div>

      {/* 3. Resource Usage Section: CPU, RAM, Disk Gauges */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        <Card variant="raised" padding="lg">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>Tài nguyên Cụm máy chủ Toàn cầu</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Chỉ số hiệu năng thời gian thực tổng hợp từ các máy chủ</p>
            </div>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-success)', background: 'var(--color-success-bg)', padding: '3px 8px', borderRadius: 'var(--radius-full)' }}>
              Trực tiếp 1s
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
            <div className="nm-inset" style={{ borderRadius: 'var(--radius-md)' }}>
              <ResourceGauge
                label="CPU Trung bình"
                value={avgCpu}
                displayValue={`${avgCpu}%`}
                subText="Đa lõi phân tán"
                color="var(--accent-pink)"
                size="md"
              />
            </div>
            <div className="nm-inset" style={{ borderRadius: 'var(--radius-md)' }}>
              <ResourceGauge
                label="Bộ nhớ RAM đã cấp"
                value={ramPercentage}
                displayValue={`${(usedRamMB / 1024).toFixed(1)} GB`}
                subText={`trên ${(totalRamMB / 1024).toFixed(0)} GB tổng`}
                color="#06b6d4"
                size="md"
              />
            </div>
            <div className="nm-inset" style={{ borderRadius: 'var(--radius-md)' }}>
              <ResourceGauge
                label="Ổ cứng NVMe"
                value={Math.round(storagePercentage)}
                displayValue={`${usedStorageGB.toFixed(1)} GB`}
                subText={`còn trống ${(totalStorageGB - usedStorageGB).toFixed(1)} GB`}
                color="#10b981"
                size="md"
              />
            </div>
          </div>
        </Card>

        {/* Quick Runtime Highlights */}
        <Card variant="raised" padding="lg">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '14px' }}>
            Nền tảng Môi trường Hỗ trợ
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div
              className="nm-card"
              style={{
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: '#eaf5ea', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#16a34a', fontSize: '0.85rem' }}>
                  JS
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Node.js</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Phiên bản 18 LTS, 20 LTS, 22 Hiện hành</div>
                </div>
              </div>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-pink)', background: 'var(--accent-pink-light)', padding: '3px 10px', borderRadius: 'var(--radius-full)' }}>
                {hosts.filter((h) => h.runtime === 'nodejs').length} đang chạy
              </span>
            </div>

            <div
              className="nm-card"
              style={{
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: '#fdf2f8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--accent-pink)', fontSize: '0.85rem' }}>
                  BUN
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Bun</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Phiên bản 1.1, 1.2+ Hiệu năng siêu tốc</div>
                </div>
              </div>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-pink)', background: 'var(--accent-pink-light)', padding: '3px 10px', borderRadius: 'var(--radius-full)' }}>
                {hosts.filter((h) => h.runtime === 'bun').length} đang chạy
              </span>
            </div>

            <div
              className="nm-card"
              style={{
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#2563eb', fontSize: '0.85rem' }}>
                  PY
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Python</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Phiên bản 3.10, 3.11, 3.12, 3.13 FastAPI/Flask</div>
                </div>
              </div>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-pink)', background: 'var(--accent-pink-light)', padding: '3px 10px', borderRadius: 'var(--radius-full)' }}>
                {hosts.filter((h) => h.runtime === 'python').length} đang chạy
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* 4. Recent Hosts Section */}
      <Card variant="raised" padding="lg">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>Máy chủ gần đây</h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Quản lý và giám sát các phiên bản ứng dụng đang chạy</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => onNavigate('hosts')} icon={<ArrowRight size={16} />}>
            Xem tất cả ({hosts.length})
          </Button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
          {hosts.slice(0, 4).map((host) => (
            <Card
              key={host.id}
              variant="raised"
              padding="md"
              hoverEffect
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                cursor: 'pointer',
              }}
              onClick={() => handleManageHost(host.id)}
            >
              {/* Host Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.2rem' }}>{host.regionFlag}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.98rem', color: 'var(--text-main)' }}>
                      {host.name}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                      {host.version} • {host.region.split(' ')[0]}
                    </div>
                  </div>
                </div>
                <StatusBadge status={host.status} size="sm" />
              </div>

              {/* Mini Resource Bars */}
              {host.status === 'PENDING' || host.status === 'PROVISIONING' ? (
                <div
                  className="nm-inset"
                  style={{
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    background: 'var(--bg-sunken)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', fontWeight: 600 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Cấu hình định mức</span>
                    <span style={{ color: '#f59e0b' }}>Chờ cấp phát</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {host.cpuLimit ? `${host.cpuLimit} vCPU` : host.plan.cpu} • {host.ramTotal} MB RAM • {host.diskTotal} GB
                  </div>
                </div>
              ) : (
                <div
                  className="nm-inset"
                  style={{
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', marginBottom: '2px', fontWeight: 600 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Sử dụng CPU</span>
                      <span style={{ color: 'var(--text-main)' }}>{host.cpuUsage}%</span>
                    </div>
                    <ProgressBar value={host.cpuUsage} height={5} color="var(--accent-pink)" />
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', marginBottom: '2px', fontWeight: 600 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Bộ nhớ RAM</span>
                      <span style={{ color: 'var(--text-main)' }}>
                        {host.ramUsage} MB / {host.ramTotal} MB
                      </span>
                    </div>
                    <ProgressBar value={host.ramUsage} max={host.ramTotal} height={5} color="#06b6d4" />
                  </div>
                </div>
              )}

              {/* Host Footer */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Thời gian chạy: <strong>{host.uptime}</strong>
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleManageHost(host.id);
                  }}
                  icon={<ExternalLink size={14} />}
                >
                  Quản lý
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </Card>
    </div>
  );
};
