import React, { useState, useEffect } from 'react';
import { Globe, Trash2, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { useToast } from '../../context/ToastContext';

export const AdminDomainsPage: React.FC = () => {
  const { authToken } = useAppState();
  const { showToast } = useToast();

  const [domains, setDomains] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  const [domainToDelete, setDomainToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const fetchDomains = async () => {
    if (!authToken) return;
    try {
      setIsLoading(true);
      const res = await fetch('/api/v1/admin/domains', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.success && data.data) {
        const list = Array.isArray(data.data) ? data.data : (data.data.domains || []);
        setDomains(list);
      }
    } catch (err: any) {
      showToast({
        title: 'Lỗi',
        message: err.message || 'Không thể tải danh sách tên miền',
        type: 'alert',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDomains();
  }, [authToken]);

  const handleDeleteDomain = async () => {
    if (!domainToDelete || !authToken) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/v1/admin/domains/${domainToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.success) {
        showToast({
          title: 'Đã xóa tên miền',
          message: `Tên miền ${domainToDelete.domain} đã được gỡ khỏi hệ thống`,
          type: 'success',
        });
        setDeleteModalOpen(false);
        fetchDomains();
      } else {
        showToast({
          title: 'Xóa thất bại',
          message: data.message || 'Không thể xóa tên miền',
          type: 'alert',
        });
      }
    } catch (err: any) {
      showToast({
        title: 'Lỗi',
        message: err.message || 'Có lỗi xảy ra',
        type: 'alert',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                color: 'var(--accent-teal)',
                background: 'rgba(20, 184, 166, 0.1)',
                padding: '2px 8px',
                borderRadius: '4px',
              }}
            >
              DOMAIN ROUTING
            </span>
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', margin: '6px 0 2px 0' }}>
            Quản Trị Tên Miền Hệ Thống
          </h1>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Theo dõi ánh xạ Reverse Proxy, trạng thái xác thực DNS và chứng chỉ SSL toàn hệ thống.
          </p>
        </div>

        <button
          onClick={() => fetchDomains()}
          className="nm-btn"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            fontWeight: 600,
            fontSize: '0.86rem',
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          <span>Tải lại</span>
        </button>
      </div>

      {/* Domains Table */}
      <div
        className="nm-card"
        style={{
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          padding: '4px',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-sunken)', borderBottom: '1px solid rgba(210, 218, 230, 0.5)' }}>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)' }}>Tên miền</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)' }}>Máy chủ liên kết</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)' }}>Cổng đích</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)' }}>Trạng thái</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)' }}>SSL Certificate</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {domains.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    {isLoading ? 'Đang tải danh sách tên miền...' : 'Chưa có tên miền nào được liên kết.'}
                  </td>
                </tr>
              ) : (
                domains.map((dom) => (
                  <tr
                    key={dom.id}
                    style={{
                      borderBottom: '1px solid rgba(210, 218, 230, 0.3)',
                      transition: 'background 0.2s ease',
                    }}
                  >
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Globe size={16} color="var(--accent-teal)" />
                        <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{dom.domain}</span>
                      </div>
                    </td>

                    <td style={{ padding: '14px 18px', color: 'var(--text-main)', fontWeight: 600 }}>
                      {dom.hostName || dom.hostId}
                    </td>

                    <td style={{ padding: '14px 18px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                      Port {dom.targetPort || 3000}
                    </td>

                    <td style={{ padding: '14px 18px' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 'var(--radius-full)',
                          background: dom.status === 'ACTIVE' ? 'rgba(20, 184, 166, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                          color: dom.status === 'ACTIVE' ? 'var(--accent-teal)' : '#f59e0b',
                        }}
                      >
                        {dom.status}
                      </span>
                    </td>

                    <td style={{ padding: '14px 18px' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 'var(--radius-full)',
                          background: dom.sslStatus === 'ACTIVE' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(100, 116, 139, 0.12)',
                          color: dom.sslStatus === 'ACTIVE' ? '#10b981' : 'var(--text-muted)',
                        }}
                      >
                        {dom.sslStatus}
                      </span>
                    </td>

                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <button
                        onClick={() => {
                          setDomainToDelete(dom);
                          setDeleteModalOpen(true);
                        }}
                        className="nm-btn"
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#ef4444',
                        }}
                        title="Xóa tên miền"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Modal */}
      {deleteModalOpen && domainToDelete && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
          }}
        >
          <div
            className="nm-card"
            style={{
              width: '100%',
              maxWidth: '460px',
              padding: '28px',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  Xác Nhận Xóa Tên Miền
                </h3>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{domainToDelete.domain}</div>
              </div>
            </div>

            <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Bạn có chắc chắn muốn gỡ bỏ tên miền này khỏi hệ thống định tuyến proxy của máy chủ {domainToDelete.hostName}?
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="nm-btn"
                style={{ padding: '10px 18px', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer' }}
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleDeleteDomain}
                disabled={isDeleting}
                className="nm-btn"
                style={{
                  padding: '10px 20px',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: '#ef4444',
                  color: '#ffffff',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {isDeleting ? 'Đang xóa...' : 'Xác nhận gỡ bỏ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
