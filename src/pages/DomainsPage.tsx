import React, { useState } from 'react';
import { Globe, PlusCircle, ShieldCheck, Trash2, ExternalLink, Server, Check, Copy } from 'lucide-react';
import { useAppState } from '../context/AppStateContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { StatusBadge } from '../components/ui/StatusBadge';
import { EmptyState } from '../components/ui/EmptyState';
import { useToast } from '../context/ToastContext';

interface DomainsPageProps {
  onNavigate: (route: string) => void;
}

export const DomainsPage: React.FC<DomainsPageProps> = ({ onNavigate }) => {
  const { domains, hosts, addDomain, deleteDomain, setCurrentHostId } = useAppState();
  const { showToast } = useToast();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [selectedHostId, setSelectedHostId] = useState(hosts[0]?.id || '');
  const [targetPort, setTargetPort] = useState(3000);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain.trim() || !selectedHostId) return;
    addDomain(selectedHostId, newDomain.trim(), targetPort);
    setNewDomain('');
    setIsAddModalOpen(false);
  };

  const hostOptions = hosts.map((h) => ({
    value: h.id,
    label: `${h.name} (${h.runtime} - :${h.port})`,
  }));

  const handleJumpToHost = (hostId: string) => {
    setCurrentHostId(hostId);
    onNavigate(`host-${hostId}`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px' }}>
            Quản lý tên miền
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Định tuyến tập trung và cấp phát chứng chỉ SSL tự động cho toàn bộ các máy chủ đám mây.
          </p>
        </div>

        <Button variant="primary" onClick={() => setIsAddModalOpen(true)} icon={<PlusCircle size={18} />}>
          Thêm tên miền tùy chỉnh
        </Button>
      </div>

      {/* Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
        <Card variant="raised" padding="md">
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Tên miền đã cấu hình</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>{domains.length}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Đã kết nối qua proxy biên</div>
        </Card>

        <Card variant="raised" padding="md">
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Chứng chỉ SSL đang hoạt động</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-success)', marginTop: '4px' }}>
            {domains.filter((d) => d.sslStatus === 'active').length}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-success)', fontWeight: 600 }}>Let's Encrypt Wildcard Tự động gia hạn</div>
        </Card>

        <Card variant="raised" padding="md">
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Mạng biên CDN toàn cầu</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-pink)', marginTop: '4px' }}>Đang kích hoạt</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Bảo vệ DDoS & Anycast DNS</div>
        </Card>
      </div>

      {/* Domain List */}
      {domains.length === 0 ? (
        <EmptyState
          icon={<Globe size={32} />}
          title="Chưa kết nối tên miền nào"
          description="Kết nối tên miền chính hoặc tên miền phụ tùy chỉnh để định tuyến lưu lượng truy cập tới container máy chủ."
          actionText="Thêm tên miền tùy chỉnh"
          onAction={() => setIsAddModalOpen(true)}
        />
      ) : (
        <Card variant="raised" padding="none" style={{ overflow: 'hidden' }}>
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-sunken)', color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '14px 18px', fontWeight: 600 }}>Tên miền</th>
                  <th style={{ padding: '14px 18px', fontWeight: 600 }}>Máy chủ gán kèm</th>
                  <th style={{ padding: '14px 18px', fontWeight: 600 }}>Cổng đích</th>
                  <th style={{ padding: '14px 18px', fontWeight: 600 }}>Trạng thái tên miền</th>
                  <th style={{ padding: '14px 18px', fontWeight: 600 }}>Trạng thái SSL</th>
                  <th style={{ padding: '14px 18px', fontWeight: 600, textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {domains.map((dom) => (
                  <tr
                    key={dom.id}
                    style={{
                      borderBottom: '1px solid rgba(210, 218, 230, 0.4)',
                      transition: 'background var(--transition-fast)',
                    }}
                  >
                    <td style={{ padding: '16px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Globe size={18} color="var(--accent-pink)" />
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem' }}>
                            {dom.domain}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                            ID: {dom.id}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '16px 18px' }}>
                      <button
                        onClick={() => handleJumpToHost(dom.hostId)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          color: 'var(--accent-pink)',
                          fontWeight: 600,
                          fontSize: '0.88rem',
                        }}
                      >
                        <Server size={14} /> {dom.hostName}
                      </button>
                    </td>

                    <td style={{ padding: '16px 18px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      :{dom.targetPort}
                    </td>

                    <td style={{ padding: '16px 18px' }}>
                      <StatusBadge status={dom.status} size="sm" />
                    </td>

                    <td style={{ padding: '16px 18px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '3px 10px',
                          borderRadius: 'var(--radius-full)',
                          background: dom.sslStatus === 'active' ? 'var(--color-success-bg)' : 'var(--color-warning-bg)',
                          color: dom.sslStatus === 'active' ? 'var(--color-success)' : 'var(--color-warning)',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                        }}
                      >
                        <ShieldCheck size={13} />
                        {dom.sslStatus === 'active' ? 'Hoạt động' : 'Đang cấp phát'}
                      </span>
                    </td>

                    <td style={{ padding: '16px 18px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleJumpToHost(dom.hostId)}
                          icon={<ExternalLink size={13} />}
                        >
                          Cấu hình
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => deleteDomain(dom.id)}
                          title="Xóa tên miền"
                        >
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add Domain Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Thêm tên miền tùy chỉnh mới"
      >
        <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input
            label="Tên miền"
            placeholder="VD: store.tenmiencuaban.com"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            helper="Tên miền chính hoặc tên miền phụ"
            required
            autoFocus
          />

          <Select
            label="Gán cho máy chủ"
            options={hostOptions}
            value={selectedHostId}
            onChange={(e) => {
              const hId = e.target.value;
              setSelectedHostId(hId);
              const matched = hosts.find((h) => h.id === hId);
              if (matched) setTargetPort(matched.port);
            }}
          />

          <Input
            label="Cổng ứng dụng đích (Port)"
            type="number"
            value={targetPort}
            onChange={(e) => setTargetPort(parseInt(e.target.value) || 3000)}
            helper="Yêu cầu web từ ngoài vào sẽ được chuyển tiếp tới cổng nội bộ này."
            required
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <Button type="button" variant="secondary" onClick={() => setIsAddModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" variant="primary">
              Kết nối tên miền
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
