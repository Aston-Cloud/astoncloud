import React, { useState, useEffect } from 'react';
import { Activity, RefreshCw, Search, Filter, ShieldCheck, X } from 'lucide-react';
import { AdminAuditLog } from '../../types';
import { useAppState } from '../../context/AppStateContext';
import { useToast } from '../../context/ToastContext';

export const AdminActivityPage: React.FC = () => {
  const { authToken } = useAppState();
  const { showToast } = useToast();

  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [actionFilter, setActionFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedLog, setSelectedLog] = useState<AdminAuditLog | null>(null);

  const fetchLogs = async () => {
    if (!authToken) return;
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '15');
      if (actionFilter) params.append('action', actionFilter);

      const res = await fetch(`/api/v1/admin/activity?${params.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.success && data.data) {
        const list = Array.isArray(data.data) ? data.data : (data.data.logs || []);
        setLogs(list);
        setTotal(data.meta?.pagination?.total || data.data.total || list.length);
      }
    } catch (err: any) {
      showToast({
        title: 'Lỗi',
        message: err.message || 'Không thể tải nhật ký hoạt động',
        type: 'alert',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter, authToken]);

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
                color: '#e11d48',
                background: 'rgba(225, 29, 72, 0.1)',
                padding: '2px 8px',
                borderRadius: '4px',
              }}
            >
              SECURITY & AUDIT LOGS
            </span>
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', margin: '6px 0 2px 0' }}>
            Nhật Ký Kiểm Toán Hệ Thống (Audit Trail)
          </h1>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Ghi lại mọi tác vụ nhạy cảm của Quản trị viên phục vụ việc truy vết và tuân thủ an toàn bảo mật.
          </p>
        </div>

        <button
          onClick={() => fetchLogs()}
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

      {/* Filter Bar */}
      <div
        className="nm-card"
        style={{
          padding: '16px 20px',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Filter size={16} color="var(--text-muted)" />
          <span style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-main)' }}>Lọc hành vi:</span>
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="nm-inset"
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              fontSize: '0.84rem',
              color: 'var(--text-main)',
              background: 'var(--bg-sunken)',
              outline: 'none',
            }}
          >
            <option value="">Tất cả hành động</option>
            <option value="USER_STATUS_CHANGE">Đổi trạng thái tài khoản (Khóa/Mở)</option>
            <option value="USER_ROLE_CHANGE">Thay đổi vai trò (ADMIN/USER)</option>
            <option value="HOST_ACTION">Thao tác máy chủ (Start/Stop/Restart)</option>
            <option value="HOST_DELETE">Xóa máy chủ</option>
            <option value="NODE_STATUS_CHANGE">Đổi trạng thái Node</option>
            <option value="PLAN_CREATE">Tạo gói hosting</option>
            <option value="PLAN_UPDATE">Chỉnh sửa gói hosting</option>
            <option value="SETTINGS_UPDATE">Cập nhật cấu hình hệ thống</option>
          </select>
        </div>
      </div>

      {/* Audit Logs Table */}
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
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)' }}>Hành động</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)' }}>Quản trị viên thực hiện</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)' }}>Đối tượng tác động</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)' }}>Địa chỉ IP</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)' }}>Thời gian</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'right' }}>Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    {isLoading ? 'Đang tải nhật ký kiểm toán...' : 'Chưa có nhật ký hoạt động nào.'}
                  </td>
                </tr>
              ) : (
                logs.map((l) => (
                  <tr
                    key={l.id}
                    style={{
                      borderBottom: '1px solid rgba(210, 218, 230, 0.3)',
                      transition: 'background 0.2s ease',
                    }}
                  >
                    <td style={{ padding: '14px 18px' }}>
                      <span
                        style={{
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '4px',
                          background:
                            l.action.includes('SUSPEND') || l.action.includes('DELETE')
                              ? 'rgba(239, 68, 68, 0.12)'
                              : l.action.includes('ROLE')
                              ? 'rgba(147, 51, 234, 0.12)'
                              : 'rgba(37, 99, 235, 0.12)',
                          color:
                            l.action.includes('SUSPEND') || l.action.includes('DELETE')
                              ? '#ef4444'
                              : l.action.includes('ROLE')
                              ? '#9333ea'
                              : '#2563eb',
                        }}
                      >
                        {l.action}
                      </span>
                    </td>

                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{l.actorEmail}</div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>ID: {l.actorId}</div>
                    </td>

                    <td style={{ padding: '14px 18px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{l.targetType}</span>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        {l.targetId}
                      </div>
                    </td>

                    <td style={{ padding: '14px 18px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                      {l.ipAddress || '127.0.0.1'}
                    </td>

                    <td style={{ padding: '14px 18px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {new Date(l.createdAt).toLocaleString('vi-VN')}
                    </td>

                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <button
                        onClick={() => setSelectedLog(l)}
                        className="nm-btn"
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '0.78rem',
                          color: 'var(--text-main)',
                        }}
                      >
                        Xem JSON
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 15 && (
          <div
            style={{
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: '1px solid rgba(210, 218, 230, 0.4)',
              fontSize: '0.84rem',
              color: 'var(--text-secondary)',
            }}
          >
            <div>Tổng số: {total} bản ghi kiểm toán</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="nm-btn"
                style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
              >
                Trước
              </button>
              <span style={{ display: 'flex', alignItems: 'center', padding: '0 8px', fontWeight: 600 }}>
                Trang {page}
              </span>
              <button
                disabled={page * 15 >= total}
                onClick={() => setPage(page + 1)}
                className="nm-btn"
                style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
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
              maxWidth: '560px',
              padding: '28px',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Chi Tiết Bản Ghi Kiểm Toán
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="nm-btn"
                style={{ padding: '6px', borderRadius: '50%', border: 'none', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              Hành động: <strong>{selectedLog.action}</strong> • Thời gian:{' '}
              {new Date(selectedLog.createdAt).toLocaleString('vi-VN')}
            </div>

            <pre
              className="nm-inset"
              style={{
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-sunken)',
                color: 'var(--text-main)',
                fontSize: '0.8rem',
                fontFamily: 'monospace',
                overflowX: 'auto',
                maxHeight: '300px',
                margin: 0,
              }}
            >
              {JSON.stringify(selectedLog.details, null, 2)}
            </pre>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button
                onClick={() => setSelectedLog(null)}
                className="nm-btn"
                style={{ padding: '10px 20px', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer' }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
