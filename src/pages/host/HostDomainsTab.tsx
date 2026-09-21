import React, { useState } from 'react';
import { Globe, PlusCircle, ShieldCheck, Trash2, Copy, Check, Info, ExternalLink } from 'lucide-react';
import { Host, DomainRecord } from '../../types';
import { useAppState } from '../../context/AppStateContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { useToast } from '../../context/ToastContext';

interface HostDomainsTabProps {
  host: Host;
}

export const HostDomainsTab: React.FC<HostDomainsTabProps> = ({ host }) => {
  const { domains, addDomain, deleteDomain } = useAppState();
  const { showToast } = useToast();

  const hostDomains = domains.filter((d) => d.hostId === host.id);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [targetPort, setTargetPort] = useState(host.port);
  const [activeInstructionDomain, setActiveInstructionDomain] = useState<DomainRecord | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleAddDomain = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain.trim()) return;
    addDomain(host.id, newDomain.trim(), targetPort);
    setNewDomain('');
    setIsAddModalOpen(false);
  };

  const copyText = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    showToast({
      title: 'Đã sao chép',
      message: text,
      type: 'info',
    });
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header & Add Button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>
            Tên miền tùy chỉnh & SSL
          </h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
            Gắn kết tên miền chính và tên miền phụ với chứng chỉ Let's Encrypt Wildcard SSL tự động.
          </p>
        </div>

        <Button variant="primary" onClick={() => setIsAddModalOpen(true)} icon={<PlusCircle size={16} />}>
          Thêm tên miền
        </Button>
      </div>

      {/* Domain List */}
      {hostDomains.length === 0 ? (
        <EmptyState
          icon={<Globe size={32} />}
          title="Chưa cấu hình tên miền tùy chỉnh"
          description="Kết nối tên miền riêng để định tuyến lưu lượng truy cập trực tiếp đến cổng ứng dụng máy chủ này."
          actionText="Thêm tên miền"
          onAction={() => setIsAddModalOpen(true)}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {hostDomains.map((dom) => (
            <Card key={dom.id} variant="raised" padding="md">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '12px',
                      background: 'var(--accent-pink-light)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--accent-pink)',
                    }}
                  >
                    <Globe size={20} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-main)' }}>
                        {dom.domain}
                      </span>
                      <a
                        href={`https://${dom.domain}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: 'var(--accent-pink)', display: 'inline-flex' }}
                        title="Mở trong trình duyệt"
                      >
                        <ExternalLink size={14} />
                      </a>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Định tuyến tới cổng <strong>:{dom.targetPort}</strong> • Khởi tạo lúc {new Date(dom.createdAt).toLocaleDateString('vi-VN')}
                    </div>
                  </div>
                </div>

                {/* Status Badges */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <StatusBadge status={dom.status} size="sm" />

                  {/* SSL badge */}
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-full)',
                      background: dom.sslStatus === 'active' ? 'var(--color-success-bg)' : 'var(--color-warning-bg)',
                      color: dom.sslStatus === 'active' ? 'var(--color-success)' : 'var(--color-warning)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      boxShadow: 'var(--nm-flat-sm)',
                    }}
                  >
                    <ShieldCheck size={14} />
                    SSL {dom.sslStatus === 'active' ? 'Hoạt động (Tự gia hạn)' : 'Đang cấp phát'}
                  </span>

                  {/* DNS Instructions trigger */}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setActiveInstructionDomain(dom)}
                    icon={<Info size={14} />}
                  >
                    Cấu hình DNS
                  </Button>

                  {/* Delete domain */}
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => deleteDomain(dom.id)}
                    title="Xóa tên miền"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* DNS Setup Instructions Modal */}
      <Modal
        isOpen={!!activeInstructionDomain}
        onClose={() => setActiveInstructionDomain(null)}
        title={`Cấu hình DNS: ${activeInstructionDomain?.domain || ''}`}
        maxWidth="680px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            Để trỏ tên miền <strong>{activeInstructionDomain?.domain}</strong> về mạng lưới biên Aston Cloud, vui lòng thêm các bản ghi DNS sau tại nhà quản lý tên miền của bạn (Cloudflare, Namecheap, GoDaddy):
          </p>

          <Card variant="sunken" padding="none" style={{ overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-sunken-dark)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '10px 14px' }}>Loại</th>
                  <th style={{ padding: '10px 14px' }}>Tên / Host</th>
                  <th style={{ padding: '10px 14px' }}>Giá trị đích</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Sao chép</th>
                </tr>
              </thead>
              <tbody>
                {activeInstructionDomain?.dnsRecords.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(210, 218, 230, 0.4)' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--accent-pink)' }}>{r.type}</td>
                    <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)' }}>{r.name}</td>
                    <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>{r.value}</td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <button
                        onClick={() => copyText(r.value, `${r.type}-${i}`)}
                        className="nm-btn"
                        style={{ padding: '4px 8px', borderRadius: 'var(--radius-sm)' }}
                      >
                        {copiedKey === `${r.type}-${i}` ? <Check size={13} color="var(--color-success)" /> : <Copy size={13} />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <div
            className="nm-card"
            style={{
              padding: '12px 16px',
              background: 'var(--accent-pink-light)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.82rem',
              color: 'var(--text-main)',
            }}
          >
            🔒 <strong>SSL tự động:</strong> Khi các bản ghi DNS lan truyền thành công (thường từ 5-15 phút), proxy toàn cầu của chúng tôi sẽ tự động cấp phát và kích hoạt chứng chỉ SSL.
          </div>
        </div>
      </Modal>

      {/* Add Domain Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Thêm tên miền tùy chỉnh"
      >
        <form onSubmit={handleAddDomain} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input
            label="Tên miền"
            placeholder="VD: app.congtycuaban.com hoặc domaincuaban.com"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            helper="Không bao gồm http:// hoặc https://"
            required
            autoFocus
          />

          <Input
            label="Cổng ứng dụng đích (Port)"
            type="number"
            value={targetPort}
            onChange={(e) => setTargetPort(parseInt(e.target.value) || host.port)}
            helper="Lưu lượng truy cập web sẽ được chuyển tiếp tới cổng container này."
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
