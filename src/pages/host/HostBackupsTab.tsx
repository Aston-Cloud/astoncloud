import React, { useState } from 'react';
import { Archive, PlusCircle, RotateCcw, Trash2, Shield, HardDrive, CheckCircle2, Clock } from 'lucide-react';
import { Host, BackupItem } from '../../types';
import { useAppState } from '../../context/AppStateContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';

interface HostBackupsTabProps {
  host: Host;
}

export const HostBackupsTab: React.FC<HostBackupsTabProps> = ({ host }) => {
  const { backups, createBackup, restoreBackup, deleteBackup } = useAppState();

  const hostBackups = backups.filter((b) => b.hostId === host.id);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [backupName, setBackupName] = useState('');
  const [restoreCandidate, setRestoreCandidate] = useState<BackupItem | null>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createBackup(host.id, backupName);
    setBackupName('');
    setIsModalOpen(false);
  };

  const handleConfirmRestore = () => {
    if (restoreCandidate) {
      restoreBackup(restoreCandidate.id);
      setRestoreCandidate(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>
            Bản sao lưu & Ảnh chụp máy chủ
          </h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
            Bản chụp trạng thái tệp tin và biến môi trường theo thời gian thực được lưu trữ trên kho đám mây mã hóa dự phòng.
          </p>
        </div>

        <Button variant="primary" onClick={() => setIsModalOpen(true)} icon={<PlusCircle size={16} />}>
          Tạo bản sao lưu
        </Button>
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
          Bản sao lưu tự động chạy định kỳ hàng ngày lúc 02:00 UTC và được lưu trữ trong 14 ngày theo gói dịch vụ hiện tại.
        </div>
      </div>

      {/* Backup List */}
      {hostBackups.length === 0 ? (
        <EmptyState
          icon={<Archive size={32} />}
          title="Chưa có bản sao lưu nào"
          description="Tạo bản sao lưu thủ công trước khi thực hiện các thay đổi lớn đối với mã nguồn hoặc cấu hình máy chủ."
          actionText="Tạo bản sao lưu"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <Card variant="raised" padding="none" style={{ overflow: 'hidden' }}>
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-sunken)', color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 18px', fontWeight: 600 }}>Tên bản sao lưu</th>
                  <th style={{ padding: '12px 18px', fontWeight: 600 }}>Phân loại</th>
                  <th style={{ padding: '12px 18px', fontWeight: 600 }}>Dung lượng</th>
                  <th style={{ padding: '12px 18px', fontWeight: 600 }}>Thời gian tạo</th>
                  <th style={{ padding: '12px 18px', fontWeight: 600 }}>Trạng thái</th>
                  <th style={{ padding: '12px 18px', fontWeight: 600, textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {hostBackups.map((bk) => (
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
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>ID: {bk.id}</div>
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
                          background: bk.isAutomatic ? 'var(--bg-sunken)' : 'var(--accent-pink-light)',
                          color: bk.isAutomatic ? 'var(--text-secondary)' : 'var(--accent-pink)',
                        }}
                      >
                        {bk.isAutomatic ? 'Tự động' : 'Thủ công'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 18px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      {bk.size}
                    </td>
                    <td style={{ padding: '14px 18px', color: 'var(--text-muted)' }}>
                      {new Date(bk.createdAt).toLocaleString('vi-VN')}
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <StatusBadge status={bk.status} size="sm" />
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setRestoreCandidate(bk)}
                          icon={<RotateCcw size={14} />}
                        >
                          Khôi phục
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => deleteBackup(bk.id)}
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
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Tạo bản sao lưu máy chủ mới"
      >
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input
            label="Tên bản sao lưu"
            placeholder="VD: truoc-khi-nang-cap, hotfix-v2"
            value={backupName}
            onChange={(e) => setBackupName(e.target.value)}
            helper="Để trống để sử dụng mốc thời gian tự động làm định danh."
            autoFocus
          />

          <div
            className="nm-inset"
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.82rem',
              color: 'var(--text-secondary)',
            }}
          >
            ℹ️ Bản sao lưu ghi lại trạng thái đóng băng mã nguồn, tệp cấu hình và cài đặt môi trường container. Dịch vụ máy chủ vẫn hoạt động liên tục trong quá trình tạo.
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" variant="primary">
              Tiến hành tạo
            </Button>
          </div>
        </form>
      </Modal>

      {/* Restore Confirmation Dialog */}
      <Modal
        isOpen={!!restoreCandidate}
        onClose={() => setRestoreCandidate(null)}
        title="Xác nhận khôi phục bản sao lưu"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
            Bạn có chắc chắn muốn khôi phục bản sao lưu <strong>"{restoreCandidate?.name}"</strong>?
          </p>
          <div
            style={{
              padding: '12px',
              background: 'var(--color-error-bg)',
              color: 'var(--color-error)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.82rem',
              border: '1px solid rgba(239, 68, 68, 0.2)',
            }}
          >
            ⚠️ Khôi phục sẽ ghi đè toàn bộ tệp tin và biến môi trường hiện tại bằng trạng thái bản sao lưu và khởi động lại container.
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <Button type="button" variant="secondary" onClick={() => setRestoreCandidate(null)}>
              Hủy
            </Button>
            <Button type="button" variant="primary" onClick={handleConfirmRestore}>
              Xác nhận khôi phục
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
