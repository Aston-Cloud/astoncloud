import React, { useState, useEffect, useCallback } from 'react';
import {
  Globe,
  PlusCircle,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  Copy,
  Check,
  Info,
  ExternalLink,
  RefreshCw,
  Lock,
  Unlock,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { Host, HostDomain } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { useToast } from '../../context/ToastContext';

interface HostDomainsTabProps {
  host: Host;
}

export const HostDomainsTab: React.FC<HostDomainsTabProps> = ({ host }) => {
  const { showToast } = useToast();

  const [domains, setDomains] = useState<HostDomain[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Add Domain Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [targetPort, setTargetPort] = useState(host.port || 80);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // DNS Setup Instructions Modal State
  const [activeInstructionDomain, setActiveInstructionDomain] = useState<HostDomain | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Delete Confirmation Modal State
  const [deletingDomain, setDeletingDomain] = useState<HostDomain | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // SSL Operation Loading State
  const [sslLoadingDomainId, setSslLoadingDomainId] = useState<string | null>(null);

  const getAuthHeaders = (): HeadersInit => {
    const token = localStorage.getItem('aston_auth_token');
    return {
      Authorization: `Bearer ${token || ''}`,
      'Content-Type': 'application/json',
    };
  };

  /**
   * Fetch host custom domains from REST API
   */
  const fetchDomains = useCallback(async (showLoadingSpinner = false) => {
    if (showLoadingSpinner) setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/hosts/${host.id}/domains`, {
        headers: getAuthHeaders(),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Không thể tải danh sách tên miền');
      }

      setDomains(json.data || []);
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối khi tải danh sách tên miền');
      showToast({
        title: 'Lỗi nạp tên miền',
        message: err.message,
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  }, [host.id, showToast]);

  useEffect(() => {
    fetchDomains(true);
  }, [fetchDomains]);

  /**
   * Copy DNS record value to clipboard
   */
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

  /**
   * Add new domain handler
   */
  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDomain = newDomain.trim().toLowerCase();

    if (!cleanDomain) {
      setFormError('Vui lòng nhập tên miền hợp lệ');
      return;
    }

    if (cleanDomain.includes('://')) {
      setFormError('Không bao gồm http:// hoặc https:// trong tên miền');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch(`/api/v1/hosts/${host.id}/domains`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          domain: cleanDomain,
          targetPort: Number(targetPort) || 80,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Không thể thêm tên miền tùy chỉnh');
      }

      const created: HostDomain = json.data;
      showToast({
        title: 'Thêm tên miền thành công',
        message: `Tên miền "${created.domain}" đã được tạo. Vui lòng cấu hình các bản ghi DNS.`,
        type: 'success',
      });

      setNewDomain('');
      setIsAddModalOpen(false);
      await fetchDomains(false);

      // Automatically open DNS instructions modal for convenience
      setActiveInstructionDomain(created);
    } catch (err: any) {
      setFormError(err.message || 'Lỗi xử lý thêm tên miền');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Verify domain DNS records handler
   */
  const handleVerifyDomain = async (domain: HostDomain) => {
    setIsVerifying(true);
    try {
      const res = await fetch(`/api/v1/hosts/${host.id}/domains/${domain.id}/verify`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Không thể gửi yêu cầu xác thực');
      }

      const { domain: updated, verification } = json.data;
      if (verification.verified) {
        showToast({
          title: 'Xác thực thành công',
          message: verification.message || `Tên miền "${domain.domain}" đã được xác thực và định tuyến sẵn sàng.`,
          type: 'success',
        });
      } else {
        showToast({
          title: 'Chưa xác thực được',
          message: verification.message || 'Bản ghi DNS TXT chưa được tìm thấy.',
          type: 'warning',
        });
      }

      // Update local state
      setDomains((prev) => prev.map((d) => (d.id === domain.id ? updated : d)));
      if (activeInstructionDomain && activeInstructionDomain.id === domain.id) {
        setActiveInstructionDomain(updated);
      }
    } catch (err: any) {
      showToast({
        title: 'Lỗi xác thực tên miền',
        message: err.message,
        type: 'error',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  /**
   * Toggle or request SSL certificate
   */
  const handleToggleSsl = async (domain: HostDomain) => {
    setSslLoadingDomainId(domain.id);
    const isCurrentlyActive = domain.sslStatus === 'ACTIVE' || domain.sslStatus === 'active';

    try {
      if (!isCurrentlyActive) {
        // Request SSL
        const res = await fetch(`/api/v1/hosts/${host.id}/domains/${domain.id}/ssl`, {
          method: 'POST',
          headers: getAuthHeaders(),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error?.message || 'Không thể kích hoạt chứng chỉ SSL');
        }

        showToast({
          title: 'Kích hoạt SSL thành công',
          message: `Chứng chỉ SSL cho "${domain.domain}" đã được cấp phát. Giao thức HTTPS đã sẵn sàng.`,
          type: 'success',
        });

        setDomains((prev) => prev.map((d) => (d.id === domain.id ? json.data.domain : d)));
      } else {
        // Disable SSL
        const res = await fetch(`/api/v1/hosts/${host.id}/domains/${domain.id}/ssl`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error?.message || 'Không thể hủy chứng chỉ SSL');
        }

        showToast({
          title: 'Đã tắt SSL',
          message: `Chứng chỉ SSL cho "${domain.domain}" đã được hủy.`,
          type: 'info',
        });

        setDomains((prev) => prev.map((d) => (d.id === domain.id ? json.data.domain : d)));
      }
    } catch (err: any) {
      showToast({
        title: 'Lỗi thao tác SSL',
        message: err.message,
        type: 'error',
      });
    } finally {
      setSslLoadingDomainId(null);
    }
  };

  /**
   * Delete domain handler
   */
  const handleDeleteConfirm = async () => {
    if (!deletingDomain) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/v1/hosts/${host.id}/domains/${deletingDomain.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Không thể xóa tên miền');
      }

      showToast({
        title: 'Đã xóa tên miền',
        message: json.data?.message || `Tên miền "${deletingDomain.domain}" đã được xóa.`,
        type: 'success',
      });

      setDeletingDomain(null);
      await fetchDomains(false);
    } catch (err: any) {
      showToast({
        title: 'Lỗi xóa tên miền',
        message: err.message,
        type: 'error',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Status helper badges
  const renderDomainStatus = (status: string) => {
    const s = status.toUpperCase();
    switch (s) {
      case 'ACTIVE':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--color-success-bg)',
              color: 'var(--color-success)',
              fontSize: '0.75rem',
              fontWeight: 700,
            }}
          >
            ● Hoạt động
          </span>
        );
      case 'VERIFYING':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--color-info-bg)',
              color: 'var(--color-info)',
              fontSize: '0.75rem',
              fontWeight: 700,
            }}
          >
            Đang xác thực DNS...
          </span>
        );
      case 'ERROR':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--color-danger-bg)',
              color: 'var(--color-danger)',
              fontSize: '0.75rem',
              fontWeight: 700,
            }}
          >
            <AlertCircle size={13} />
            Lỗi xác thực
          </span>
        );
      default:
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--color-warning-bg)',
              color: 'var(--color-warning)',
              fontSize: '0.75rem',
              fontWeight: 700,
            }}
          >
            Chờ cấu hình DNS
          </span>
        );
    }
  };

  const renderSslStatus = (sslStatus: string) => {
    const s = sslStatus.toUpperCase();
    if (s === 'ACTIVE') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--color-success-bg)',
            color: 'var(--color-success)',
            fontSize: '0.75rem',
            fontWeight: 700,
            boxShadow: 'var(--nm-flat-sm)',
          }}
        >
          <ShieldCheck size={14} />
          SSL Hoạt động (HTTPS)
        </span>
      );
    }
    if (s === 'PENDING') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--color-warning-bg)',
            color: 'var(--color-warning)',
            fontSize: '0.75rem',
            fontWeight: 600,
          }}
        >
          <RefreshCw size={13} className="spin" />
          SSL Đang cấp phát
        </span>
      );
    }
    if (s === 'ERROR') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--color-danger-bg)',
            color: 'var(--color-danger)',
            fontSize: '0.75rem',
            fontWeight: 600,
          }}
        >
          <ShieldAlert size={14} />
          Lỗi chứng chỉ SSL
        </span>
      );
    }
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          borderRadius: 'var(--radius-full)',
          background: 'rgba(210, 218, 230, 0.4)',
          color: 'var(--text-muted)',
          fontSize: '0.75rem',
          fontWeight: 600,
        }}
      >
        <Lock size={13} />
        Chưa bật SSL
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Local Mock Environment Info Banner */}
      <div
        className="nm-card"
        style={{
          padding: '14px 18px',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--accent-pink-light)',
          border: '1px solid rgba(255, 107, 157, 0.25)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
        }}
      >
        <HelpCircle size={20} color="var(--accent-pink)" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div style={{ fontSize: '0.84rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
          <strong>Môi trường mô phỏng (Simulated DNS & Reverse Proxy):</strong> Bạn có thể thêm tên miền bất kỳ (ví dụ: <code>myapp.test</code>, <code>api.demo.com</code>), xem bản ghi DNS xác thực và bấm <strong>"Xác thực ngay"</strong> để kiểm tra định tuyến và cấp phát chứng chỉ SSL mô phỏng mà không cần VPS hay tên miền thật.
        </div>
      </div>

      {/* Header & Add Button */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>
            Tên miền tùy chỉnh & SSL
          </h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
            Gắn kết tên miền chính và tên miền phụ với chứng chỉ Let's Encrypt Wildcard SSL tự động.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fetchDomains(true)}
            icon={<RefreshCw size={14} className={isLoading ? 'spin' : ''} />}
            disabled={isLoading}
            title="Làm mới danh sách"
          >
            Làm mới
          </Button>

          <Button
            variant="primary"
            onClick={() => {
              setFormError(null);
              setNewDomain('');
              setTargetPort(host.port || 80);
              setIsAddModalOpen(true);
            }}
            icon={<PlusCircle size={16} />}
          >
            Thêm tên miền
          </Button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-danger-bg)',
            color: 'var(--color-danger)',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <AlertCircle size={18} />
          <span>{error}</span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fetchDomains(true)}
            style={{ marginLeft: 'auto' }}
          >
            Thử lại
          </Button>
        </div>
      )}

      {/* Domain List */}
      {isLoading ? (
        <Card variant="raised" padding="lg">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '30px 0' }}>
            <RefreshCw size={24} className="spin" color="var(--accent-pink)" />
            <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              Đang tải danh sách tên miền tùy chỉnh...
            </span>
          </div>
        </Card>
      ) : domains.length === 0 ? (
        <EmptyState
          icon={<Globe size={32} />}
          title="Chưa cấu hình tên miền tùy chỉnh"
          description="Kết nối tên miền riêng để định tuyến lưu lượng truy cập trực tiếp đến cổng ứng dụng máy chủ này."
          actionText="Thêm tên miền"
          onAction={() => {
            setFormError(null);
            setNewDomain('');
            setTargetPort(host.port || 80);
            setIsAddModalOpen(true);
          }}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {domains.map((dom) => {
            const isDomainActive = dom.status.toUpperCase() === 'ACTIVE';
            const isSslActive = dom.sslStatus.toUpperCase() === 'ACTIVE';
            const isSslLoading = sslLoadingDomainId === dom.id;

            return (
              <Card key={dom.id} variant="raised" padding="md">
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        background: 'var(--accent-pink-light)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--accent-pink)',
                        flexShrink: 0,
                      }}
                    >
                      <Globe size={22} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-main)' }}>
                          {dom.domain}
                        </span>
                        {isDomainActive && (
                          <a
                            href={`http://${dom.domain}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: 'var(--accent-pink)', display: 'inline-flex' }}
                            title="Mở trong trình duyệt"
                          >
                            <ExternalLink size={14} />
                          </a>
                        )}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Định tuyến tới cổng <strong>:{dom.targetPort}</strong> • Khởi tạo lúc{' '}
                        {new Date(dom.createdAt).toLocaleDateString('vi-VN')}
                        {dom.verifiedAt && (
                          <span> • Đã xác thực lúc {new Date(dom.verifiedAt).toLocaleDateString('vi-VN')}</span>
                        )}
                      </div>
                      {dom.errorMessage && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-danger)', marginTop: '3px' }}>
                          ⚠️ {dom.errorMessage}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status Badges & Action Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    {renderDomainStatus(dom.status)}
                    {renderSslStatus(dom.sslStatus)}

                    {/* Action: Cấu hình DNS */}
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setActiveInstructionDomain(dom)}
                      icon={<Info size={14} />}
                    >
                      Cấu hình DNS
                    </Button>

                    {/* Action: Xác thực ngay (nếu chưa active) */}
                    {!isDomainActive && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleVerifyDomain(dom)}
                        icon={<ShieldCheck size={14} />}
                        disabled={isVerifying}
                        style={{ color: 'var(--color-success)' }}
                      >
                        Xác thực ngay
                      </Button>
                    )}

                    {/* Action: Bật/Tắt SSL (nếu domain đã active) */}
                    {isDomainActive && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleToggleSsl(dom)}
                        disabled={isSslLoading}
                        icon={isSslActive ? <Unlock size={14} /> : <Lock size={14} />}
                        title={isSslActive ? 'Tắt chứng chỉ SSL' : 'Kích hoạt chứng chỉ SSL'}
                      >
                        {isSslLoading ? 'Đang xử lý...' : isSslActive ? 'Tắt SSL' : 'Bật SSL'}
                      </Button>
                    )}

                    {/* Action: Xóa tên miền */}
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setDeletingDomain(dom)}
                      title="Xóa tên miền"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
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
            Để kết nối tên miền <strong>{activeInstructionDomain?.domain}</strong> về mạng lưới biên Aston Cloud, vui lòng thêm các bản ghi DNS sau tại nhà cung cấp quản lý tên miền của bạn (Cloudflare, Namecheap, GoDaddy, Hostinger):
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
                {activeInstructionDomain?.dnsRecords?.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(210, 218, 230, 0.4)' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--accent-pink)' }}>{r.type}</td>
                    <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)' }}>{r.name}</td>
                    <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', color: 'var(--text-main)', wordBreak: 'break-all' }}>
                      {r.value}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <button
                        onClick={() => copyText(r.value, `${r.type}-${i}`)}
                        className="nm-btn"
                        style={{ padding: '4px 8px', borderRadius: 'var(--radius-sm)' }}
                        title="Sao chép giá trị"
                      >
                        {copiedKey === `${r.type}-${i}` ? (
                          <Check size={13} color="var(--color-success)" />
                        ) : (
                          <Copy size={13} />
                        )}
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
              lineHeight: 1.5,
            }}
          >
            🔒 <strong>Xác thực & SSL tự động:</strong> Sau khi cập nhật bản ghi DNS (ở chế độ thử nghiệm, bản ghi được mô phỏng sẵn), hãy bấm nút <strong>"Xác thực bản ghi DNS ngay"</strong> bên dưới để hoàn tất xác minh quyền sở hữu và kích hoạt định tuyến.
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <Button variant="secondary" onClick={() => setActiveInstructionDomain(null)}>
              Đóng
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (activeInstructionDomain) {
                  handleVerifyDomain(activeInstructionDomain);
                }
              }}
              disabled={isVerifying}
              icon={<ShieldCheck size={16} />}
            >
              {isVerifying ? 'Đang kiểm tra DNS...' : 'Xác thực bản ghi DNS ngay'}
            </Button>
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
          {formError && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-danger-bg)',
                color: 'var(--color-danger)',
                fontSize: '0.84rem',
              }}
            >
              {formError}
            </div>
          )}

          <Input
            label="Tên miền"
            placeholder="VD: app.congtycuaban.com hoặc myapp.test"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            helper="Không bao gồm http:// hoặc https://. Tên miền sẽ tự động chuyển thành chữ thường."
            required
            autoFocus
          />

          <Input
            label="Cổng ứng dụng đích (Port)"
            type="number"
            value={targetPort}
            onChange={(e) => setTargetPort(parseInt(e.target.value, 10) || host.port || 80)}
            helper="Lưu lượng truy cập web sẽ được chuyển tiếp tới cổng container này."
            required
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <Button type="button" variant="secondary" onClick={() => setIsAddModalOpen(false)} disabled={isSubmitting}>
              Hủy
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Đang tạo...' : 'Kết nối tên miền'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingDomain}
        onClose={() => setDeletingDomain(null)}
        title="Xác nhận xóa tên miền"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
            Bạn có chắc chắn muốn xóa tên miền <strong>"{deletingDomain?.domain}"</strong> khỏi máy chủ <strong>{host.name}</strong>?
          </p>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Lưu lượng truy cập đến tên miền này sẽ bị ngắt và cấu hình chứng chỉ SSL liên kết sẽ bị gỡ bỏ.
          </p>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <Button variant="secondary" onClick={() => setDeletingDomain(null)} disabled={isDeleting}>
              Hủy
            </Button>
            <Button variant="danger" onClick={handleDeleteConfirm} disabled={isDeleting}>
              {isDeleting ? 'Đang xóa...' : 'Xác nhận xóa'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
