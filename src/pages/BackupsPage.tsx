import React, { useState } from 'react';
import { Archive, PlusCircle, RotateCcw, Trash2, Shield, HardDrive, Server } from 'lucide-react';
import { useAppState } from '../context/AppStateContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { StatusBadge } from '../components/ui/StatusBadge';
import { EmptyState } from '../components/ui/EmptyState';
import { BackupItem } from '../types';

interface BackupsPageProps {
  onNavigate: (route: string) => void;
}

export const BackupsPage: React.FC<BackupsPageProps> = ({ onNavigate }) => {
  const { backups, hosts, createBackup, restoreBackup, deleteBackup, setCurrentHostId } = useAppState();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedHostId, setSelectedHostId] = useState(hosts[0]?.id || '');
  const [backupName, setBackupName] = useState('');
  const [restoreCandidate, setRestoreCandidate] = useState<BackupItem | null>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHostId) return;
    createBackup(selectedHostId, backupName);
    setBackupName('');
    setIsModalOpen(false);
  };

  const handleConfirmRestore = () => {
    if (restoreCandidate) {
      restoreBackup(restoreCandidate.id);
      setRestoreCandidate(null);
    }
  };

  const hostOptions = hosts.map((h) => ({
    value: h.id,
    label: `${h.name} (${h.version})`,
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
            Kho lưu trữ bản sao lưu trung tâm
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Khôi phục thảm họa tự động, chụp ảnh trạng thái thời gian thực và lưu trữ đám mây an toàn.
          </p>
        </div>

        <Button variant="primary" onClick={() => setIsModalOpen(true)} icon={<PlusCircle size={18} />}>
          Tạo bản sao lưu
        </Button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
        <Card variant="raised" padding="md">
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Tổng số bản sao lưu</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>{backups.length}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mã hóa bảo mật AES-256</div>
        </Card>

        <Card variant="raised" padding="md">
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Dung lượng kho sao lưu</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-pink)', marginTop: '4px' }}>2.1 GB</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Phân bổ qua 3 vùng địa lý</div>
        </Card>

        <Card variant="raised" padding="md">
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Thời gian lưu trữ tự động</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-success)', marginTop: '4px' }}>14 Ngày</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-success)', fontWeight: 600 }}>Lịch trình xoay vòng hàng ngày</div>
        </Card>
      </div>

      {/* Backups Table */}
      {backups.length === 0 ? (
        <EmptyState
          icon={<Archive size={32} />}
          title="Chưa ghi nhận bản sao lưu nào"
          description="Tạo bản sao lưu máy chủ đầu tiên để bảo vệ an toàn tệp tin và cấu hình môi trường của bạn."
          actionText="Tạo bản sao lưu"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <Card variant="raised" padding="none" style={{ overflow: 'hidden' }}>
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-sunken)', color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '14px 18px', fontWeight: 600 }}>Tên bản sao lưu</th>
                  <th style={{ padding: '14px 18px', fontWeight: 600 }}>Máy chủ đích</th>
                  <th style={{ padding: '14px 18px', fontWeight: 600 }}>Dung lượng</th>
                  <th style={{ padding: '14px 18px', fontWeight: 600 }}>Thời gian tạo</th>
                  <th style={{ padding: '14px 18px', fontWeight: 600 }}>Phân loại</th>
                  <th style={{ padding: '14px 18px', fontWeight: 600 }}>Trạng thái</th>
                  <th style={{ padding: '14px 18px', fontWeight: 600, textAlign: 'right' }}>Thao tác</th>
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
                    <td style={{ padding: '16px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Archive size={18} color="var(--accent-pink)" />
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem' }}>
                            {bk.name}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                            ID: {bk.id}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '16px 18px' }}>
                      <button
                        onClick={() => handleJumpToHost(bk.hostId)}
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
                        <Server size={14} /> {bk.hostName}
                      </button>
                    </td>

                    <td style={{ padding: '16px 18px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {bk.size}
                    </td>

                    <td style={{ padding: '16px 18px', color: 'var(--text-muted)' }}>
                      {new Date(bk.createdAt).toLocaleString('vi-VN')}
                    </td>

                    <td style={{ padding: '16px 18px' }}>
                      <span
                        style={{
                          fontSize: '0.74rem',
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

                    <td style={{ padding: '16px 18px' }}>
                      <StatusBadge status={bk.status} size="sm" />
                    </td>

                    <td style={{ padding: '16px 18px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setRestoreCandidate(bk)}
                          icon={<RotateCcw size={13} />}
                        >
                          Khôi phục
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => deleteBackup(bk.id)}
                          title="Xóa bản sao lưu"
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

      {/* Create Backup Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Tạo bản sao lưu mới"
      >
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Select
            label="Máy chủ mục tiêu"
            options={hostOptions}
            value={selectedHostId}
            onChange={(e) => setSelectedHostId(e.target.value)}
          />

          <Input
            label="Tên định danh bản sao lưu"
            placeholder="VD: truoc-khi-cap-nhat"
            value={backupName}
            onChange={(e) => setBackupName(e.target.value)}
            helper="Nhãn tùy chọn để dễ dàng phân biệt."
            autoFocus
          />

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
        title="Xác nhận khôi phục"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
            Bạn có chắc chắn muốn khôi phục bản sao lưu <strong>"{restoreCandidate?.name}"</strong> trên máy chủ <strong>"{restoreCandidate?.hostName}"</strong>?
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
            ⚠️ Quá trình khôi phục sẽ ghi đè các tệp tin hiện tại và khởi động lại tiến trình máy chủ.
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <Button type="button" variant="secondary" onClick={() => setRestoreCandidate(null)}>
              Hủy
            </Button>
            <Button type="button" variant="primary" onClick={handleConfirmRestore}>
              Tiến hành khôi phục
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
