import React, { useState, useEffect } from 'react';
import { Archive, RefreshCw, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { useToast } from '../../context/ToastContext';

export const AdminBackupsPage: React.FC = () => {
  const { authToken } = useAppState();
  const { showToast } = useToast();

  const [backups, setBackups] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchBackups = async () => {
    if (!authToken) return;
    try {
      setIsLoading(true);
      const res = await fetch('/api/v1/admin/backups', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.success && data.data) {
        const list = Array.isArray(data.data) ? data.data : (data.data.backups || []);
        setBackups(list);
      }
    } catch (err: any) {
      showToast({
        title: 'Lỗi',
        message: err.message || 'Không thể tải danh sách bản sao lưu',
        type: 'alert',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, [authToken]);

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
                color: '#9333ea',
                background: 'rgba(147, 51, 234, 0.1)',
                padding: '2px 8px',
                borderRadius: '4px',
              }}
            >
              STORAGE & BACKUPS
            </span>
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', margin: '6px 0 2px 0' }}>
            Quản Trị Bản Sao Lưu (Backups)
          </h1>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Giám sát kho lưu trữ backup snapshot và tính toàn vẹn dữ liệu người dùng trên Mock Node Agent.
          </p>
        </div>

        <button
          onClick={() => fetchBackups()}
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

      {/* Backups Table */}
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
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)' }}>Tên bản sao lưu</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)' }}>Máy chủ</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)' }}>Dung lượng</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)' }}>Trạng thái</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)' }}>Thời gian tạo</th>
              </tr>
            </thead>
            <tbody>
              {backups.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    {isLoading ? 'Đang tải danh sách bản sao lưu...' : 'Chưa có bản sao lưu nào trong hệ thống.'}
                  </td>
                </tr>
              ) : (
                backups.map((b) => (
                  <tr
                    key={b.id}
                    style={{
                      borderBottom: '1px solid rgba(210, 218, 230, 0.3)',
                      transition: 'background 0.2s ease',
                    }}
                  >
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Archive size={16} color="#9333ea" />
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{b.name}</div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                            ID: {b.id}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--text-main)' }}>
                      {b.hostName || b.hostId}
                    </td>

                    <td style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>
                      {b.size || b.sizeFormatted || '12.4 MB'}
                    </td>

                    <td style={{ padding: '14px 18px' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 'var(--radius-full)',
                          background: 'rgba(20, 184, 166, 0.12)',
                          color: 'var(--accent-teal)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <CheckCircle2 size={12} />
                        {b.status || 'COMPLETED'}
                      </span>
                    </td>

                    <td style={{ padding: '14px 18px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {b.createdAt ? new Date(b.createdAt).toLocaleString('vi-VN') : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
