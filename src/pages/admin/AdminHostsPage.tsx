import React, { useState, useEffect } from 'react';
import {
  Server,
  Play,
  Square,
  RotateCw,
  Trash2,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  Cpu,
  Layers,
} from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { useToast } from '../../context/ToastContext';

export const AdminHostsPage: React.FC = () => {
  const { authToken } = useAppState();
  const { showToast } = useToast();

  const [hosts, setHosts] = useState<any[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [runtimeFilter, setRuntimeFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Delete modal
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  const [hostToDelete, setHostToDelete] = useState<any | null>(null);

  const fetchHosts = async () => {
    if (!authToken) return;
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '10');
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (runtimeFilter) params.append('runtime', runtimeFilter);

      const res = await fetch(`/api/v1/admin/hosts?${params.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.success && data.data) {
        const list = Array.isArray(data.data) ? data.data : (data.data.hosts || []);
        setHosts(list);
        setTotal(data.meta?.pagination?.total || data.data.total || list.length);
      }
    } catch (err: any) {
      showToast({
        title: 'Lỗi',
        message: err.message || 'Không thể tải danh sách máy chủ',
        type: 'alert',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHosts();
  }, [page, statusFilter, runtimeFilter, authToken]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchHosts();
  };

  const handleHostAction = async (hostId: string, action: 'start' | 'stop' | 'restart') => {
    if (!authToken) return;
    try {
      setActionInProgress(`${hostId}-${action}`);
      const res = await fetch(`/api/v1/admin/hosts/${hostId}/actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success) {
        showToast({
          title: 'Thành công',
          message: `Đã gửi lệnh ${action.toUpperCase()} tới máy chủ`,
          type: 'success',
        });
        fetchHosts();
      } else {
        showToast({
          title: 'Thao tác thất bại',
          message: data.message || 'Không thể thực hiện hành động',
          type: 'alert',
        });
      }
    } catch (err: any) {
      showToast({
        title: 'Lỗi máy chủ',
        message: err.message || 'Có lỗi xảy ra',
        type: 'alert',
      });
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDeleteHost = async () => {
    if (!hostToDelete || !authToken) return;
    try {
      setActionInProgress(`delete-${hostToDelete.id}`);
      const res = await fetch(`/api/v1/admin/hosts/${hostToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.success) {
        showToast({
          title: 'Đã xóa máy chủ',
          message: `Máy chủ ${hostToDelete.name} đã được dọn dẹp và xóa hoàn toàn khỏi hệ thống.`,
          type: 'success',
        });
        setDeleteModalOpen(false);
        fetchHosts();
      } else {
        showToast({
          title: 'Xóa thất bại',
          message: data.message || 'Không thể xóa máy chủ',
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
      setActionInProgress(null);
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
                color: '#e11d48',
                background: 'rgba(225, 29, 72, 0.1)',
                padding: '2px 8px',
                borderRadius: '4px',
              }}
            >
              HOST INFRASTRUCTURE
            </span>
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', margin: '6px 0 2px 0' }}>
            Quản Trị Toàn Bộ Máy Chủ (Hosts)
          </h1>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Giám sát trạng thái container, khởi động, dừng, khởi động lại và xóa máy chủ an toàn.
          </p>
        </div>

        <button
          onClick={() => fetchHosts()}
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

      {/* Filter and Search Bar */}
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
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '240px' }}>
          <div
            className="nm-inset"
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '8px 14px',
              borderRadius: 'var(--radius-md)',
              width: '100%',
              maxWidth: '380px',
              gap: '10px',
            }}
          >
            <Search size={16} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Tìm theo tên máy chủ hoặc chủ sở hữu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '0.86rem',
                color: 'var(--text-main)',
                width: '100%',
              }}
            />
          </div>
          <button
            type="submit"
            className="nm-btn"
            style={{
              padding: '9px 16px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.84rem',
              cursor: 'pointer',
            }}
          >
            Tìm
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
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
            <option value="">Tất cả trạng thái</option>
            <option value="RUNNING">Đang chạy (RUNNING)</option>
            <option value="STOPPED">Đã tắt (STOPPED)</option>
            <option value="PENDING">Chờ xử lý (PENDING)</option>
            <option value="ERROR">Lỗi (ERROR)</option>
          </select>

          {/* Runtime filter */}
          <select
            value={runtimeFilter}
            onChange={(e) => {
              setRuntimeFilter(e.target.value);
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
            <option value="">Tất cả Runtime</option>
            <option value="nodejs">Node.js</option>
            <option value="bun">Bun</option>
            <option value="python">Python</option>
          </select>
        </div>
      </div>

      {/* Hosts Table */}
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
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)' }}>Máy chủ</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)' }}>Chủ sở hữu</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)' }}>Runtime</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)' }}>Node / Vị trí</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)' }}>Trạng thái</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'right' }}>Thao tác Admin</th>
              </tr>
            </thead>
            <tbody>
              {hosts.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    {isLoading ? 'Đang tải danh sách máy chủ...' : 'Không tìm thấy máy chủ nào.'}
                  </td>
                </tr>
              ) : (
                hosts.map((h) => {
                  const isRunning = h.status === 'RUNNING';
                  const isStopped = h.status === 'STOPPED';

                  return (
                    <tr
                      key={h.id}
                      style={{
                        borderBottom: '1px solid rgba(210, 218, 230, 0.3)',
                        transition: 'background 0.2s ease',
                      }}
                    >
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '8px',
                              background: 'rgba(225, 29, 72, 0.1)',
                              color: '#e11d48',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Server size={18} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{h.name}</div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>ID: {h.id}</div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{h.userName || 'Chưa rõ'}</div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{h.userEmail || h.userId}</div>
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <span
                          style={{
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: 'var(--bg-sunken)',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          {h.runtimeId || 'nodejs'} {h.runtimeVersion || ''}
                        </span>
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)' }}>
                          {h.nodeName || 'Singapore Cluster'}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--accent-teal)' }}>Mock Node Agent</div>
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: 'var(--radius-full)',
                            background: isRunning
                              ? 'rgba(20, 184, 166, 0.12)'
                              : isStopped
                              ? 'rgba(100, 116, 139, 0.12)'
                              : 'rgba(239, 68, 68, 0.12)',
                            color: isRunning ? 'var(--accent-teal)' : isStopped ? 'var(--text-muted)' : '#ef4444',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: isRunning ? 'var(--accent-teal)' : isStopped ? 'var(--text-muted)' : '#ef4444',
                            }}
                          />
                          {h.status}
                        </span>
                      </td>

                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          {/* Start button */}
                          {isStopped && (
                            <button
                              onClick={() => handleHostAction(h.id, 'start')}
                              disabled={actionInProgress === `${h.id}-start`}
                              className="nm-btn"
                              style={{
                                padding: '6px 10px',
                                borderRadius: '6px',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--accent-teal)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.78rem',
                              }}
                              title="Khởi động máy chủ"
                            >
                              <Play size={13} /> Chạy
                            </button>
                          )}

                          {/* Stop button */}
                          {isRunning && (
                            <button
                              onClick={() => handleHostAction(h.id, 'stop')}
                              disabled={actionInProgress === `${h.id}-stop`}
                              className="nm-btn"
                              style={{
                                padding: '6px 10px',
                                borderRadius: '6px',
                                border: 'none',
                                cursor: 'pointer',
                                color: '#f59e0b',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.78rem',
                              }}
                              title="Dừng máy chủ"
                            >
                              <Square size={13} /> Dừng
                            </button>
                          )}

                          {/* Restart button */}
                          <button
                            onClick={() => handleHostAction(h.id, 'restart')}
                            disabled={actionInProgress === `${h.id}-restart`}
                            className="nm-btn"
                            style={{
                              padding: '6px 10px',
                              borderRadius: '6px',
                              border: 'none',
                              cursor: 'pointer',
                              color: 'var(--text-main)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.78rem',
                            }}
                            title="Khởi động lại máy chủ"
                          >
                            <RotateCw size={13} className={actionInProgress === `${h.id}-restart` ? 'animate-spin' : ''} />
                          </button>

                          {/* Delete button */}
                          <button
                            onClick={() => {
                              setHostToDelete(h);
                              setDeleteModalOpen(true);
                            }}
                            className="nm-btn"
                            style={{
                              padding: '6px 10px',
                              borderRadius: '6px',
                              border: 'none',
                              cursor: 'pointer',
                              color: '#ef4444',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.78rem',
                            }}
                            title="Xóa máy chủ"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        {total > 10 && (
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
            <div>Tổng số: {total} máy chủ</div>
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
                disabled={page * 10 >= total}
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

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && hostToDelete && (
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
              maxWidth: '480px',
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
                  Xác Nhận Xóa Máy Chủ
                </h3>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{hostToDelete.name}</div>
              </div>
            </div>

            <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Bạn có chắc chắn muốn xóa máy chủ này? Toàn bộ container, tệp tin dữ liệu và cấu hình của người dùng sẽ bị xóa hoàn toàn khỏi Node.
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
                onClick={handleDeleteHost}
                disabled={actionInProgress === `delete-${hostToDelete.id}`}
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
                {actionInProgress === `delete-${hostToDelete.id}` ? 'Đang xóa...' : 'Xác nhận xóa vĩnh viễn'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
