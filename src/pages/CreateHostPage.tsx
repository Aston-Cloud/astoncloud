import React, { useState } from 'react';
import {
  Server,
  Zap,
  Globe,
  Cpu,
  Layers,
  HardDrive,
  Check,
  ArrowRight,
  HelpCircle,
  GitBranch,
} from 'lucide-react';
import { useAppState } from '../context/AppStateContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { INITIAL_PLANS } from '../data/mockData';
import { RuntimeType, HostingPlan } from '../types';

interface CreateHostPageProps {
  onNavigate: (route: string) => void;
}

export const CreateHostPage: React.FC<CreateHostPageProps> = ({ onNavigate }) => {
  const { createHost, setCurrentHostId } = useAppState();

  const [runtime, setRuntime] = useState<RuntimeType>('nodejs');
  const [version, setVersion] = useState<string>('Node.js 20 LTS');
  const [selectedPlan, setSelectedPlan] = useState<HostingPlan>(INITIAL_PLANS[1]);
  const [hostName, setHostName] = useState<string>('');
  const [region, setRegion] = useState<string>('Singapore (ap-southeast-1)');
  const [regionFlag, setRegionFlag] = useState<string>('🇸🇬');
  const [repoUrl, setRepoUrl] = useState<string>('');
  const [autoRestart, setAutoRestart] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const runtimeOptions: { id: RuntimeType; name: string; tag: string; description: string; versions: string[] }[] = [
    {
      id: 'nodejs',
      name: 'Node.js',
      tag: 'Tiêu chuẩn Doanh nghiệp',
      description: 'Môi trường JavaScript hướng sự kiện bất đồng bộ được thiết kế tối ưu cho các ứng dụng mạng có khả năng mở rộng cao.',
      versions: ['Node.js 22 Hiện hành', 'Node.js 20 LTS (Khuyên dùng)', 'Node.js 18 LTS'],
    },
    {
      id: 'bun',
      name: 'Bun',
      tag: 'Tốc độ Siêu tốc',
      description: 'Môi trường runtime và bộ công cụ JavaScript tích hợp all-in-one tối ưu tốc độ vượt trội, hỗ trợ gốc TypeScript và JSX.',
      versions: ['Bun 1.2.2 (Ổn định Mới nhất)', 'Bun 1.1.38', 'Bun 1.0.35'],
    },
    {
      id: 'python',
      name: 'Python',
      tag: 'AI & Khoa học Dữ liệu',
      description: 'Môi trường Python hiệu năng cao được tinh chỉnh chuyên biệt cho FastAPI, Flask, Django và các dịch vụ vi mô Machine Learning.',
      versions: ['Python 3.12 (Khuyên dùng)', 'Python 3.13 Hiện hành', 'Python 3.11', 'Python 3.10 LTS'],
    },
  ];

  const regionOptions = [
    { value: 'Singapore (ap-southeast-1)', label: '🇸🇬 Singapore (ap-southeast-1) - Độ trễ thấp', flag: '🇸🇬' },
    { value: 'Tokyo (ap-northeast-1)', label: '🇯🇵 Tokyo (ap-northeast-1) - Edge Tốc độ cao', flag: '🇯🇵' },
    { value: 'Frankfurt (eu-central-1)', label: '🇩🇪 Frankfurt (eu-central-1) - Chuẩn GDPR Châu Âu', flag: '🇩🇪' },
    { value: 'San Jose (us-west-1)', label: '🇺🇸 San Jose (us-west-1) - Trung tâm Tây Hoa Kỳ', flag: '🇺🇸' },
  ];

  const handleRuntimeSelect = (r: RuntimeType) => {
    setRuntime(r);
    const chosen = runtimeOptions.find((ro) => ro.id === r);
    if (chosen) {
      setVersion(chosen.versions[0]);
    }
  };

  const handleRegionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setRegion(val);
    const found = regionOptions.find((ro) => ro.value === val);
    if (found) setRegionFlag(found.flag);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!hostName.trim()) {
      setError('Vui lòng nhập tên định danh máy chủ hợp lệ.');
      return;
    }
    if (!/^[a-z0-9-]+$/.test(hostName.trim().toLowerCase())) {
      setError('Tên máy chủ chỉ được chứa chữ cái thường không dấu, chữ số và dấu gạch nối (-).');
      return;
    }

    setError('');
    setIsSubmitting(true);

    setTimeout(() => {
      const generatedIp = `128.${Math.floor(Math.random() * 100 + 100)}.${Math.floor(Math.random() * 200 + 10)}.${Math.floor(Math.random() * 200 + 10)}`;
      const generatedPort = runtime === 'python' ? 8000 : runtime === 'bun' ? 8080 : 3000;

      const newHost = createHost({
        name: hostName.trim().toLowerCase(),
        slug: hostName.trim().toLowerCase(),
        runtime,
        version,
        status: 'online',
        plan: selectedPlan,
        region,
        regionFlag,
        ipAddress: generatedIp,
        port: generatedPort,
        ramTotal: parseInt(selectedPlan.ram) * 1024,
        diskTotal: parseInt(selectedPlan.disk),
        autoRestart,
        repoUrl: repoUrl.trim() || undefined,
      });

      setIsSubmitting(false);
      setCurrentHostId(newHost.id);
      onNavigate(`host-${newHost.id}`);
    }, 1200);
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Title */}
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px' }}>
          Khởi tạo Máy chủ Đám mây Mới
        </h1>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Triển khai các dịch vụ web hiện đại, API và quy trình nền chỉ trong vài giây với công nghệ điều phối container tức thì.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
        {/* Step 1: Select Runtime */}
        <Card variant="raised" padding="lg">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: 'var(--accent-pink-gradient)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              1
            </span>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Chọn Môi trường Runtime
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            {runtimeOptions.map((opt) => {
              const isSelected = runtime === opt.id;
              return (
                <div
                  key={opt.id}
                  onClick={() => handleRuntimeSelect(opt.id)}
                  className={`nm-card ${isSelected ? 'active' : ''}`}
                  style={{
                    padding: '20px',
                    borderRadius: 'var(--radius-lg)',
                    cursor: 'pointer',
                    position: 'relative',
                    boxShadow: isSelected ? 'var(--nm-inset)' : 'var(--nm-flat-sm)',
                    border: isSelected ? '2px solid var(--accent-pink)' : 'var(--subtle-border)',
                    background: isSelected ? 'var(--bg-sunken)' : 'var(--bg-card)',
                    transition: 'all var(--transition-normal)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: isSelected ? 'var(--accent-pink)' : 'var(--text-main)' }}>
                      {opt.name}
                    </span>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: 'var(--radius-full)',
                        background: isSelected ? 'var(--accent-pink-light)' : 'var(--bg-sunken)',
                        color: isSelected ? 'var(--accent-pink)' : 'var(--text-muted)',
                      }}
                    >
                      {opt.tag}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {opt.description}
                  </p>

                  {isSelected && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '12px',
                        right: '12px',
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        background: 'var(--accent-pink)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                      }}
                    >
                      <Check size={14} strokeWidth={3} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Step 2: Select Version */}
        <Card variant="raised" padding="lg">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: 'var(--accent-pink-gradient)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              2
            </span>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Chọn Phiên bản Runtime
            </h3>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {runtimeOptions
              .find((r) => r.id === runtime)
              ?.versions.map((ver) => {
                const isSelected = version === ver;
                return (
                  <button
                    key={ver}
                    type="button"
                    onClick={() => setVersion(ver)}
                    style={{
                      padding: '10px 18px',
                      borderRadius: 'var(--radius-md)',
                      border: isSelected ? '1px solid var(--accent-pink)' : 'var(--subtle-border)',
                      background: isSelected ? 'var(--bg-sunken)' : 'var(--bg-card)',
                      boxShadow: isSelected ? 'var(--nm-inset-sm)' : 'var(--nm-flat-sm)',
                      color: isSelected ? 'var(--accent-pink)' : 'var(--text-main)',
                      fontWeight: isSelected ? 700 : 500,
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    {ver}
                  </button>
                );
              })}
          </div>
        </Card>

        {/* Step 3: Select Hosting Plan */}
        <Card variant="raised" padding="lg">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: 'var(--accent-pink-gradient)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              3
            </span>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Chọn Gói Cấu hình Máy chủ
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            {INITIAL_PLANS.map((plan) => {
              const isSelected = selectedPlan.id === plan.id;
              return (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan)}
                  className="nm-card"
                  style={{
                    padding: '20px 16px',
                    borderRadius: 'var(--radius-lg)',
                    cursor: 'pointer',
                    boxShadow: isSelected ? 'var(--nm-inset)' : 'var(--nm-flat-sm)',
                    border: isSelected ? '2px solid var(--accent-pink)' : 'var(--subtle-border)',
                    background: isSelected ? 'var(--bg-sunken)' : 'var(--bg-card)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative',
                  }}
                >
                  {plan.recommended && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '-10px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'var(--accent-pink-gradient)',
                        color: '#ffffff',
                        fontSize: '0.65rem',
                        fontWeight: 800,
                        padding: '2px 10px',
                        borderRadius: 'var(--radius-full)',
                        boxShadow: 'var(--accent-pink-glow)',
                        letterSpacing: '0.5px',
                        textTransform: 'uppercase',
                      }}
                    >
                      Phổ biến
                    </span>
                  )}

                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)', marginBottom: '6px' }}>
                      {plan.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '14px' }}>
                      <span style={{ fontSize: '1.6rem', fontWeight: 800, color: isSelected ? 'var(--accent-pink)' : 'var(--text-main)' }}>
                        ${plan.price}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>/ tháng</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Cpu size={14} color="var(--accent-pink)" /> {plan.cpu}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Layers size={14} color="var(--accent-pink)" /> {plan.ram}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <HardDrive size={14} color="var(--accent-pink)" /> {plan.disk}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Globe size={14} color="var(--accent-pink)" /> {plan.bandwidth}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Step 4: Host Details & Region */}
        <Card variant="raised" padding="lg">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: 'var(--accent-pink-gradient)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              4
            </span>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Thông tin Máy chủ & Khu vực Cụm
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            <Input
              label="Tên định danh máy chủ"
              placeholder="vd: api-backend-prod"
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
              helper="Chỉ gồm chữ thường không dấu, số và gạch ngang (-)."
              error={error}
              required
            />

            <Select
              label="Khu vực Triển khai (Region)"
              options={regionOptions}
              value={region}
              onChange={handleRegionChange}
            />

            <Input
              label="Đường dẫn Kho lưu trữ Git (Tùy chọn)"
              placeholder="https://github.com/user/my-app.git"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              icon={<GitBranch size={16} />}
              helper="Tự động đồng bộ và biên dịch từ nhánh main."
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '24px' }}>
              <input
                type="checkbox"
                id="auto-restart"
                checked={autoRestart}
                onChange={(e) => setAutoRestart(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--accent-pink)', cursor: 'pointer' }}
              />
              <label htmlFor="auto-restart" style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)', cursor: 'pointer' }}>
                Bật tính năng Tự động Phục hồi khi Container gặp sự cố (Auto-Restart)
              </label>
            </div>
          </div>
        </Card>

        {/* Step 5: Submit Action */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '16px' }}>
          <Button type="button" variant="secondary" onClick={() => onNavigate('hosts')}>
            Hủy bỏ
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={isSubmitting}
            icon={isSubmitting ? <span className="pulse-online">●</span> : <ArrowRight size={18} />}
          >
            {isSubmitting ? 'Đang cấp phát máy chủ...' : 'Khởi tạo máy chủ'}
          </Button>
        </div>
      </form>
    </div>
  );
};
