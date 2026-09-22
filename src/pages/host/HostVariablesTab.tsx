import React, { useState, useEffect, useCallback } from 'react';
import {
  PlusCircle,
  Edit,
  Trash2,
  Key,
  ShieldCheck,
  AlertCircle,
  Loader2,
  RefreshCw,
  Server,
  Info,
} from 'lucide-react';
import { Host, HostEnvVariable } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { useToast } from '../../context/ToastContext';

interface HostVariablesTabProps {
  host: Host;
}

export const HostVariablesTab: React.FC<HostVariablesTabProps> = ({ host }) => {
  const { showToast } = useToast();

  const [variables, setVariables] = useState<HostEnvVariable[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [hasUnrestartedChanges, setHasUnrestartedChanges] = useState<boolean>(false);

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVar, setEditingVar] = useState<HostEnvVariable | null>(null);
  const [formKey, setFormKey] = useState('');
  const [formValue, setFormValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete Confirmation Modal State
  const [deletingVar, setDeletingVar] = useState<HostEnvVariable | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const getAuthHeaders = (): HeadersInit => {
    const token = localStorage.getItem('aston_auth_token');
    return {
      Authorization: `Bearer ${token || ''}`,
      'Content-Type': 'application/json',
    };
  };

  // 1. Fetch Variables from Server
  const fetchVariables = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/hosts/${host.id}/variables`, {
        headers: getAuthHeaders(),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || 'Không thể tải danh sách biến môi trường');
      }

      setVariables(json.data || []);
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối máy chủ');
      setVariables([]);
    } finally {
      setIsLoading(false);
    }
  }, [host.id]);

  useEffect(() => {
    fetchVariables();
  }, [fetchVariables]);

  // Modal Handlers
  const handleOpenAdd = () => {
    setEditingVar(null);
    setFormKey('');
    setFormValue('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (v: HostEnvVariable) => {
    setEditingVar(v);
    setFormKey(v.key);
    setFormValue(''); // Keep value empty for replacement rather than exposing secret
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanKey = formKey.trim().toUpperCase();
    if (!cleanKey) {
      setFormError('Vui lòng nhập tên biến môi trường');
      return;
    }

    if (cleanKey === 'PORT') {
      setFormError("Biến 'PORT' được quản lý cố định bởi hệ thống và không thể thay đổi thủ công.");
      return;
    }

    if (!/^[A-Z_][A-Z0-9_]{0,127}$/.test(cleanKey)) {
      setFormError('Tên biến chỉ được chứa chữ cái in hoa (A-Z), số (0-9) và dấu gạch dưới (_), không bắt đầu bằng số.');
      return;
    }

    if (!editingVar && !formValue) {
      setFormError('Vui lòng nhập giá trị cho biến môi trường');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingVar) {
        // PATCH existing variable
        const payload: { key?: string; value?: string } = {};
        if (cleanKey !== editingVar.key) payload.key = cleanKey;
        if (formValue) payload.value = formValue;

        const res = await fetch(`/api/v1/hosts/${host.id}/variables/${editingVar.id}`, {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json?.error?.message || 'Không thể cập nhật biến môi trường');
        }

        showToast({
          title: 'Cập nhật thành công',
          message: `Biến môi trường "${cleanKey}" đã được lưu an toàn. Thay đổi sẽ có hiệu lực sau khi khởi động lại.`,
          type: 'success',
        });
      } else {
        // POST new variable
        const res = await fetch(`/api/v1/hosts/${host.id}/variables`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            key: cleanKey,
            value: formValue,
          }),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json?.error?.message || 'Không thể tạo biến môi trường');
        }

        showToast({
          title: 'Thêm biến thành công',
          message: `Biến môi trường "${cleanKey}" đã được mã hóa và lưu trữ. Thay đổi sẽ có hiệu lực sau khi khởi động lại.`,
          type: 'success',
        });
      }

      setHasUnrestartedChanges(true);
      setIsModalOpen(false);
      fetchVariables();
    } catch (err: any) {
      setFormError(err.message || 'Lỗi khi lưu biến môi trường');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingVar) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/v1/hosts/${host.id}/variables/${deletingVar.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || 'Không thể xóa biến môi trường');
      }

      showToast({
        title: 'Đã xóa biến',
        message: `Đã xóa biến môi trường "${deletingVar.key}". Thay đổi sẽ có hiệu lực sau khi khởi động lại.`,
        type: 'info',
      });

      setHasUnrestartedChanges(true);
      setDeletingVar(null);
      fetchVariables();
    } catch (err: any) {
      showToast({
        title: 'Lỗi xóa biến',
        message: err.message || 'Không thể xóa biến môi trường',
        type: 'error',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header & Add Button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Key size={20} color="var(--accent-pink)" />
            Biến Môi trường (Environment Variables)
          </h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Cấu hình các khóa bí mật nhạy cảm, token API và tham số runtime. Tất cả dữ liệu được mã hóa xác thực AES-256-GCM an toàn.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchVariables}
            disabled={isLoading}
            icon={<RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />}
          >
            Làm mới
          </Button>
          <Button variant="primary" onClick={handleOpenAdd} icon={<PlusCircle size={16} />}>
            Thêm biến mới
          </Button>
        </div>
      </div>

      {/* Restart Notice Banner */}
      {hasUnrestartedChanges && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(255, 107, 107, 0.08)',
            border: '1px solid rgba(255, 107, 107, 0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '0.88rem',
            color: 'var(--text-main)',
          }}
        >
          <AlertCircle size={18} color="var(--accent-pink)" style={{ flexShrink: 0 }} />
          <div>
            <strong>Lưu ý khởi động lại:</strong> Các thay đổi biến môi trường đã được ghi nhận an toàn vào cơ sở dữ liệu. Để biến mới có hiệu lực bên trong container đang chạy, vui lòng khởi động lại máy chủ tại tab <em>Tổng quan</em> hoặc <em>Console</em>.
          </div>
        </div>
      )}

      {/* System Controlled Variables Banner */}
      <div
        style={{
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-sunken)',
          border: '1px solid rgba(210, 218, 230, 0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '0.85rem',
          color: 'var(--text-secondary)',
        }}
      >
        <Server size={18} color="var(--color-info)" style={{ flexShrink: 0 }} />
        <div>
          <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>Biến hệ thống quản lý: </span>
          <code style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-pink)' }}>PORT={host.port || 3000}</code> và{' '}
          <code style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-main)' }}>NODE_ENV=production</code> được cấp phát độc quyền bởi hạ tầng cụm máy chủ và tự động tiêm vào container của bạn.
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <Card variant="flat" padding="lg" style={{ textAlign: 'center' }}>
          <Loader2 size={32} className="animate-spin" color="var(--accent-pink)" style={{ margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Đang tải danh sách biến môi trường...</p>
        </Card>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <Card variant="flat" padding="lg" style={{ textAlign: 'center', borderColor: 'rgba(255, 107, 107, 0.3)' }}>
          <AlertCircle size={32} color="var(--accent-pink)" style={{ margin: '0 auto 12px' }} />
          <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>Không thể tải biến môi trường</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '6px' }}>{error}</p>
          <Button variant="secondary" size="sm" onClick={fetchVariables} style={{ marginTop: '14px' }}>
            Thử lại
          </Button>
        </Card>
      )}

      {/* Variables List */}
      {!isLoading && !error && variables.length === 0 ? (
        <EmptyState
          icon={<Key size={32} />}
          title="Chưa có biến môi trường nào"
          description="Thêm biến môi trường để cấu hình chuỗi kết nối database, khóa API và tham số vận hành của ứng dụng."
          actionText="Thêm biến mới"
          onAction={handleOpenAdd}
        />
      ) : !isLoading && !error && (
        <Card variant="raised" padding="none" style={{ overflow: 'hidden' }}>
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-sunken)', color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 18px', fontWeight: 600 }}>Khóa Biến (Key)</th>
                  <th style={{ padding: '12px 18px', fontWeight: 600 }}>Giá trị (Value)</th>
                  <th style={{ padding: '12px 18px', fontWeight: 600 }}>Cơ chế bảo mật</th>
                  <th style={{ padding: '12px 18px', fontWeight: 600, textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {/* Platform Reserved Row for PORT */}
                <tr style={{ borderBottom: '1px solid rgba(210, 218, 230, 0.4)', background: 'rgba(255, 255, 255, 0.4)' }}>
                  <td style={{ padding: '14px 18px' }}>
                    <code
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                        color: 'var(--text-main)',
                        fontSize: '0.9rem',
                      }}
                    >
                      PORT
                    </code>
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    <code
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.85rem',
                        color: 'var(--text-main)',
                        background: 'var(--bg-sunken)',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        display: 'inline-block',
                      }}
                    >
                      {host.port || 3000}
                    </code>
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: 'var(--radius-full)',
                        background: 'rgba(74, 144, 226, 0.12)',
                        color: 'var(--color-info)',
                      }}
                    >
                      Hạ tầng chỉ định
                    </span>
                  </td>
                  <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      Cố định
                    </span>
                  </td>
                </tr>

                {/* User Variables Rows */}
                {variables.map((v) => (
                  <tr
                    key={v.id}
                    style={{
                      borderBottom: '1px solid rgba(210, 218, 230, 0.4)',
                      transition: 'background var(--transition-fast)',
                    }}
                  >
                    <td style={{ padding: '14px 18px' }}>
                      <code
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          color: 'var(--text-main)',
                          fontSize: '0.9rem',
                        }}
                      >
                        {v.key}
                      </code>
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <code
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.85rem',
                            letterSpacing: '2px',
                            color: 'var(--text-muted)',
                            background: 'var(--bg-sunken)',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            display: 'inline-block',
                          }}
                        >
                          {v.maskedValue || '••••••••'}
                        </code>
                      </div>
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 'var(--radius-full)',
                          background: 'var(--accent-pink-light)',
                          color: 'var(--accent-pink)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <ShieldCheck size={12} />
                        AES-256-GCM Mã hóa
                      </span>
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenEdit(v)}
                          title="Chỉnh sửa hoặc ghi đè giá trị"
                          style={{ padding: '6px 10px' }}
                        >
                          <Edit size={14} />
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setDeletingVar(v)}
                          title="Xóa biến"
                          style={{ padding: '6px 10px' }}
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

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingVar ? `Chỉnh sửa Biến: ${editingVar.key}` : 'Thêm Biến Môi trường Mới'}
      >
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {formError && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(255, 107, 107, 0.1)',
                border: '1px solid rgba(255, 107, 107, 0.3)',
                color: 'var(--color-danger)',
                fontSize: '0.85rem',
              }}
            >
              {formError}
            </div>
          )}

          <Input
            label="Tên biến (Key)"
            placeholder="vd: DATABASE_URL, API_KEY, NODE_ENV"
            value={formKey}
            onChange={(e) => setFormKey(e.target.value)}
            helper="Chữ hoa (A-Z), số (0-9) và dấu gạch dưới (_). Biến PORT được bảo vệ bởi hệ thống."
            required
            autoFocus
          />

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
              {editingVar ? 'Giá trị mới (Nhập để ghi đè giá trị cũ)' : 'Giá trị biến (Value)'}
            </label>
            <textarea
              placeholder={editingVar ? 'Để trống nếu muốn giữ nguyên giá trị hiện tại...' : 'vd: postgres://user:pass@host:5432/db'}
              value={formValue}
              onChange={(e) => setFormValue(e.target.value)}
              rows={3}
              required={!editingVar}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(210, 218, 230, 0.8)',
                background: 'var(--bg-sunken)',
                color: 'var(--text-main)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.85rem',
                resize: 'vertical',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Info size={12} />
              Giá trị sẽ được mã hóa AES-256-GCM tại máy chủ và không bao giờ lưu trữ dưới dạng văn bản thô.
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
              Hủy
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Loader2 size={14} className="animate-spin" />
                  Đang lưu...
                </span>
              ) : editingVar ? (
                'Lưu thay đổi'
              ) : (
                'Thêm biến'
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deletingVar)}
        onClose={() => setDeletingVar(null)}
        title="Xác nhận xóa biến môi trường"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
            Bạn có chắc chắn muốn xóa biến môi trường{' '}
            <code style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-pink)' }}>
              {deletingVar?.key}
            </code>
            ? Ứng dụng có thể gặp sự cố nếu biến này cần thiết cho quá trình khởi động hoặc kết nối dịch vụ.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <Button variant="secondary" onClick={() => setDeletingVar(null)} disabled={isDeleting}>
              Hủy
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Đang xóa...' : 'Xác nhận xóa'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
