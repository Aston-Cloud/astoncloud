import React, { useState, useEffect, useCallback } from 'react';
import {
  Archive,
  PlusCircle,
  RotateCcw,
  Trash2,
  Shield,
  RefreshCw,
  Clock,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
} from 'lucide-react';
import { Host, HostBackup } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { useToast } from '../../context/ToastContext';

interface HostBackupsTabProps {
  host: Host;
}

export const HostBackupsTab: React.FC<HostBackupsTabProps> = ({ host }) => {
  const { showToast } = useToast();

  const [backups, setBackups] = useState<HostBackup[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Create Backup Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [backupName, setBackupName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Restore Confirmation Modal State
  const [restoreCandidate, setRestoreCandidate] = useState<HostBackup | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  // Delete Confirmation Modal State
  const [deleteCandidate, setDeleteCandidate] = useState<HostBackup | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const getAuthHeaders = (): HeadersInit => {
    const token = localStorage.getItem('aston_auth_token');
    return {
      Authorization: `Bearer ${token || ''}`,
      'Content-Type': 'application/json',
    };
  };

  /**
   * Fetch backups from REST API
   */
  const fetchBackups = useCallback(
    async (showLoadingSpinner = false) => {
      if (showLoadingSpinner) setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/v1/hosts/${host.id}/backups`, {
          headers: getAuthHeaders(),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error?.message || 'Không thể tải danh sách bản sao lưu');
        }

        setBackups(json.data || []);
      } catch (err: any) {
        setError(err.message || 'Lỗi kết nối khi nạp danh sách bản sao lưu');
        showToast({
          title: 'Lỗi tải bản sao lưu',
          message: err.message,
          type: 'error',
        });
      } finally {
        setIsLoading(false);
      }
    },
    [host.id, showToast]
  );

  useEffect(() => {
    fetchBackups(true);
  }, [fetchBackups]);

  /**
   * Handle creating a new backup
   */
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const res = await fetch(`/api/v1/hosts/${host.id}/backups`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: backupName.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Tạo bản sao lưu thất bại');
      }

      showToast({
        title: 'Tạo bản sao lưu thành công',
        message: `Bản sao lưu "${json.data?.name || backupName}" đã hoàn tất.`,
        type: 'success',
      });

      setBackupName('');
      setIsCreateModalOpen(false);
      await fetchBackups(false);
    } catch (err: any) {
      showToast({
        title: 'Tạo bản sao lưu thất bại',
        message: err.message,
        type: 'error',
      });
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * Handle restoring a backup
   */
  const handleConfirmRestore = async () => {
    if (!restoreCandidate) return;
    setIsRestoring(true);

    try {
      const res = await fetch(
        `/api/v1/hosts/${host.id}/backups/${restoreCandidate.id}/restore`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
        }
      );

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Khôi phục bản sao lưu thất bại');
      }

      showToast({
        title: 'Khôi phục thành công',
        message: json.data?.message || 'Máy chủ đã được khôi phục về trạng thái bản sao lưu.',
        type: 'success',
      });

      setRestoreCandidate(null);
      await fetchBackups(false);
    } catch (err: any) {
      showToast({
        title: 'Khôi phục thất bại',
        message: err.message,
        type: 'error',
      });
    } finally {
      setIsRestoring(false);
    }
  };

  /**
   * Handle deleting a backup
   */
  const handleConfirmDelete = async () => {
    if (!deleteCandidate) return;
    setIsDeleting(true);

    try {
      const res = await fetch(
        `/api/v1/hosts/${host.id}/backups/${deleteCandidate.id}`,
        {
          method: 'DELETE',
          headers: getAuthHeaders(),
        }
      );

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Xóa bản sao lưu thất bại');
      }

      showToast({
        title: 'Đã xóa bản sao lưu',
        message: json.data?.message || 'Bản sao lưu đã được gỡ bỏ khỏi hệ thống.',
        type: 'success',
      });

      setDeleteCandidate(null);
      await fetchBackups(false);
    } catch (err: any) {
      showToast({
        title: 'Xóa bản sao lưu thất bại',
        message: err.message,
        type: 'error',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Render backup status badge
   */
  const renderStatusBadge = (status: string) => {
    const s = status?.toUpperCase();
    if (s === 'COMPLETED' || s === 'READY') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.75rem',
            fontWeight: 700,
            padding: '4px 10px',
            borderRadius: 'var(--radius-full)',
            background: 'rgba(34, 197, 94, 0.12)',
            color: '#16a34a',
            border: '1px solid rgba(34, 197, 94, 0.25)',
          }}
        >
          <CheckCircle2 size={13} />
          Sẵn sàng
        </span>
      );
    }

    if (s === 'RESTORED') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.75rem',
            fontWeight: 700,
            padding: '4px 10px',
            borderRadius: 'var(--radius-full)',
            background: 'rgba(59, 130, 246, 0.12)',
            color: '#2563eb',
            border: '1px solid rgba(59, 130, 246, 0.25)',
          }}
        >
          <RotateCcw size={13} />
          Đã khôi phục
        </span>
      );
    }

    if (s === 'CREATING' || s === 'PENDING') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.75rem',
            fontWeight: 700,
            padding: '4px 10px',
            borderRadius: 'var(--radius-full)',
            background: 'rgba(245, 158, 11, 0.12)',
            color: '#d97706',
            border: '1px solid rgba(245, 158, 11, 0.25)',
          }}
        >
          <Loader2 size={13} className="animate-spin" />
          Đang tạo...
        </span>
      );
    }

    if (s === 'RESTORING') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.75rem',
            fontWeight: 700,
            padding: '4px 10px',
            borderRadius: 'var(--radius-full)',
            background: 'rgba(168, 85, 247, 0.12)',
            color: '#9333ea',
            border: '1px solid rgba(168, 85, 247, 0.25)',
          }}
        >
          <Loader2 size={13} className="animate-spin" />
          Đang khôi phục...
        </span>
      );
    }

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '0.75rem',
          fontWeight: 700,
          padding: '4px 10px',
          borderRadius: 'var(--radius-full)',
          background: 'rgba(239, 68, 68, 0.12)',
          color: '#dc2626',
          border: '1px solid rgba(239, 68, 68, 0.25)',
        }}
      >
        <AlertCircle size={13} />
        Thất bại
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header & Actions */}
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
            Bản sao lưu & Ảnh chụp máy chủ
          </h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
            Lưu giữ trạng thái tệp tin và mã nguồn theo thời gian thực dưới định dạng nén cô lập an toàn.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Button
            variant="secondary"
            onClick={() => fetchBackups(true)}
            icon={<RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />}
            disabled={isLoading}
          >
            Làm mới
          </Button>

          <Button
            variant="primary"
            onClick={() => setIsCreateModalOpen(true)}
            icon={<PlusCircle size={16} />}
          >
            Tạo bản sao lưu
          </Button>
        </div>
      </div>

      {/* Snapshot Retention Notice */}
      <div
        className="nm-card"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 18px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-sunken)',
        }}
      >
        <Shield size={20} color="var(--accent-pink)" />
        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
          Hệ thống lưu trữ tối đa 5 bản sao lưu cho mỗi máy chủ. Mỗi bản sao lưu được lưu trữ 14 ngày trước khi tự động hết hạn.
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-error-bg)',
            color: 'var(--color-error)',
            fontSize: '0.85rem',
            border: '1px solid rgba(239, 68, 68, 0.2)',
          }}
        >
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Backup List */}
      {isLoading ? (
        <Card variant="raised" padding="lg">
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px',
              gap: '12px',
              color: 'var(--text-muted)',
            }}
          >
            <Loader2 size={28} className="animate-spin" color="var(--accent-pink)" />
            <span style={{ fontSize: '0.9rem' }}>Đang nạp danh sách bản sao lưu...</span>
          </div>
        </Card>
      ) : backups.length === 0 ? (
        <EmptyState
          icon={<Archive size={32} />}
          title="Chưa có bản sao lưu nào"
          description="Tạo bản sao lưu thủ công trước khi thực hiện các thay đổi lớn đối với mã nguồn hoặc cấu hình máy chủ."
          actionText="Tạo bản sao lưu ngay"
          onAction={() => setIsCreateModalOpen(true)}
        />
      ) : (
        <Card variant="raised" padding="none" style={{ overflow: 'hidden' }}>
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: '0.88rem',
              }}
            >
              <thead>
                <tr
                  style={{
                    background: 'var(--bg-sunken)',
                    color: 'var(--text-muted)',
                    fontSize: '0.78rem',
                    textTransform: 'uppercase',
                  }}
                >
                  <th style={{ padding: '12px 18px', fontWeight: 600 }}>Tên bản sao lưu</th>
                  <th style={{ padding: '12px 18px', fontWeight: 600 }}>Phân loại</th>
                  <th style={{ padding: '12px 18px', fontWeight: 600 }}>Dung lượng</th>
                  <th style={{ padding: '12px 18px', fontWeight: 600 }}>Thời gian tạo</th>
                  <th style={{ padding: '12px 18px', fontWeight: 600 }}>Hết hạn</th>
                  <th style={{ padding: '12px 18px', fontWeight: 600 }}>Trạng thái</th>
                  <th style={{ padding: '12px 18px', fontWeight: 600, textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {backups.map((bk) => (
                  <tr
                    key={bk.id}
                    style={{
                      borderBottom: '1px solid rgba(210, 218, 230, 0.4)',
                      transition: 'background var(--transition-fast)',
                    }}
                  >
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Archive size={18} color="var(--accent-pink)" />
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{bk.name}</div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                            ID: {bk.id.slice(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 'var(--radius-full)',
                          background:
                            bk.backupType === 'automatic' || bk.isAutomatic
                              ? 'var(--bg-sunken)'
                              : 'var(--accent-pink-light)',
                          color:
                            bk.backupType === 'automatic' || bk.isAutomatic
                              ? 'var(--text-secondary)'
                              : 'var(--accent-pink)',
                        }}
                      >
                        {bk.backupType === 'automatic' || bk.isAutomatic ? 'Tự động' : 'Thủ công'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 18px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      {bk.sizeFormatted || bk.size || '0 B'}
                    </td>
                    <td style={{ padding: '14px 18px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      {new Date(bk.createdAt).toLocaleString('vi-VN')}
                    </td>
                    <td style={{ padding: '14px 18px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      {bk.expiresAt ? new Date(bk.expiresAt).toLocaleDateString('vi-VN') : '14 ngày'}
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      {renderStatusBadge(bk.status)}
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setRestoreCandidate(bk)}
                          icon={<RotateCcw size={14} />}
                          disabled={
                            bk.status !== 'COMPLETED' &&
                            bk.status !== 'RESTORED' &&
                            bk.status !== 'ready'
                          }
                          title="Khôi phục trạng thái máy chủ"
                        >
                          Khôi phục
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setDeleteCandidate(bk)}
                          title="Xóa bản sao lưu"
                        >
                          <Trash2 size={14} />
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

      {/* Create Backup Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => !isCreating && setIsCreateModalOpen(false)}
        title="Tạo bản sao lưu máy chủ mới"
      >
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input
            label="Tên bản sao lưu"
            placeholder="VD: truoc-khi-nang-cap, hotfix-v2"
            value={backupName}
            onChange={(e) => setBackupName(e.target.value)}
            helper="Để trống để hệ thống tự động sinh tên theo mốc thời gian."
            autoFocus
            disabled={isCreating}
          />

          <div
            className="nm-inset"
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.82rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.5,
            }}
          >
            ℹ️ Bản sao lưu ghi lại trạng thái đóng băng mã nguồn và toàn bộ tệp tin ứng dụng trong container.
            Máy chủ vẫn tiếp tục chạy bình thường trong quá trình tạo bản sao lưu.
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsCreateModalOpen(false)}
              disabled={isCreating}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isCreating}
              icon={isCreating ? <Loader2 size={16} className="animate-spin" /> : undefined}
            >
              {isCreating ? 'Đang tạo bản sao lưu...' : 'Tiến hành tạo'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Restore Confirmation Dialog */}
      <Modal
        isOpen={!!restoreCandidate}
        onClose={() => !isRestoring && setRestoreCandidate(null)}
        title="Xác nhận khôi phục bản sao lưu"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
            Restore this backup? Current application files will be replaced.
          </p>

          <div
            style={{
              padding: '12px',
              background: 'var(--color-error-bg)',
              color: 'var(--color-error)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.82rem',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              lineHeight: 1.5,
            }}
          >
            ⚠️ Khôi phục sẽ thay thế toàn bộ tệp tin ứng dụng hiện tại bằng bản sao lưu "{restoreCandidate?.name}" và tự động khởi động lại container nếu đang chạy.
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setRestoreCandidate(null)}
              disabled={isRestoring}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleConfirmRestore}
              disabled={isRestoring}
              icon={isRestoring ? <Loader2 size={16} className="animate-spin" /> : undefined}
            >
              {isRestoring ? 'Đang khôi phục...' : 'Xác nhận khôi phục'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <Modal
        isOpen={!!deleteCandidate}
        onClose={() => !isDeleting && setDeleteCandidate(null)}
        title="Xác nhận xóa bản sao lưu"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
            Bạn có chắc chắn muốn xóa vĩnh viễn bản sao lưu <strong>"{deleteCandidate?.name}"</strong>?
          </p>
          <div
            style={{
              padding: '12px',
              background: 'var(--bg-sunken)',
              color: 'var(--text-muted)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.82rem',
            }}
          >
            Tệp nén lưu trữ tương ứng sẽ bị xóa vĩnh viễn khỏi kho lưu trữ và không thể phục hồi lại.
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDeleteCandidate(null)}
              disabled={isDeleting}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              icon={isDeleting ? <Loader2 size={16} className="animate-spin" /> : undefined}
            >
              {isDeleting ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
