import React, { useState } from 'react';
import { PlusCircle, Eye, EyeOff, Edit, Trash2, Key, Copy, Check } from 'lucide-react';
import { Host, EnvVariable } from '../../types';
import { useAppState } from '../../context/AppStateContext';
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
  const { envVars, addEnvVar, updateEnvVar, deleteEnvVar } = useAppState();
  const { showToast } = useToast();

  const hostVars = envVars[host.id] || [];

  const [visibleSecrets, setVisibleSecrets] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Add / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVar, setEditingVar] = useState<EnvVariable | null>(null);
  const [formKey, setFormKey] = useState('');
  const [formValue, setFormValue] = useState('');
  const [formIsSecret, setFormIsSecret] = useState(false);

  const toggleSecret = (id: string) => {
    setVisibleSecrets((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleOpenAdd = () => {
    setEditingVar(null);
    setFormKey('');
    setFormValue('');
    setFormIsSecret(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (v: EnvVariable) => {
    setEditingVar(v);
    setFormKey(v.key);
    setFormValue(v.value);
    setFormIsSecret(v.isSecret);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formKey.trim()) return;

    if (editingVar) {
      updateEnvVar(host.id, editingVar.id, formKey, formValue, formIsSecret);
    } else {
      addEnvVar(host.id, formKey, formValue, formIsSecret);
    }
    setIsModalOpen(false);
  };

  const handleCopy = (value: string, id: string) => {
    navigator.clipboard.writeText(value);
    setCopiedId(id);
    showToast({
      title: 'Đã sao chép',
      message: 'Giá trị biến môi trường đã được sao chép vào bộ nhớ tạm.',
      type: 'info',
    });
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header & Add Button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>
            Biến Môi trường
          </h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
            Cấu hình các khóa bảo mật nhạy cảm, chuỗi kết nối cơ sở dữ liệu và cờ tham số runtime ứng dụng.
          </p>
        </div>

        <Button variant="primary" onClick={handleOpenAdd} icon={<PlusCircle size={16} />}>
          Thêm biến mới
        </Button>
      </div>

      {/* Variables List */}
      {hostVars.length === 0 ? (
        <EmptyState
          icon={<Key size={32} />}
          title="Chưa có biến môi trường nào"
          description="Thêm biến môi trường để tùy biến cấu hình runtime của ứng dụng mà không cần thay đổi mã nguồn."
          actionText="Thêm biến mới"
          onAction={handleOpenAdd}
        />
      ) : (
        <Card variant="raised" padding="none" style={{ overflow: 'hidden' }}>
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-sunken)', color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 18px', fontWeight: 600 }}>Khóa Biến (Key)</th>
                  <th style={{ padding: '12px 18px', fontWeight: 600 }}>Giá trị</th>
                  <th style={{ padding: '12px 18px', fontWeight: 600 }}>Loại</th>
                  <th style={{ padding: '12px 18px', fontWeight: 600, textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {hostVars.map((v) => {
                  const isVisible = visibleSecrets[v.id] || !v.isSecret;
                  return (
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
                              color: isVisible ? 'var(--text-secondary)' : 'var(--text-muted)',
                              background: 'var(--bg-sunken)',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              maxWidth: '300px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              display: 'inline-block',
                            }}
                          >
                            {isVisible ? v.value : '••••••••••••••••••••'}
                          </code>

                          {v.isSecret && (
                            <button
                              onClick={() => toggleSecret(v.id)}
                              className="nm-btn"
                              style={{ padding: '4px 8px', borderRadius: 'var(--radius-sm)' }}
                              title={isVisible ? 'Ẩn giá trị' : 'Hiện giá trị'}
                            >
                              {isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          )}

                          <button
                            onClick={() => handleCopy(v.value, v.id)}
                            className="nm-btn"
                            style={{ padding: '4px 8px', borderRadius: 'var(--radius-sm)' }}
                            title="Sao chép giá trị"
                          >
                            {copiedId === v.id ? <Check size={14} color="var(--color-success)" /> : <Copy size={14} />}
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: 'var(--radius-full)',
                            background: v.isSecret ? 'var(--accent-pink-light)' : 'var(--bg-sunken)',
                            color: v.isSecret ? 'var(--accent-pink)' : 'var(--text-secondary)',
                          }}
                        >
                          {v.isSecret ? 'Bảo mật (Mã hóa)' : 'Văn bản thuần'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleOpenEdit(v)}
                            title="Chỉnh sửa"
                            style={{ padding: '6px 10px' }}
                          >
                            <Edit size={14} />
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => deleteEnvVar(host.id, v.id)}
                            title="Xóa"
                            style={{ padding: '6px 10px' }}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingVar ? 'Chỉnh sửa Biến Môi trường' : 'Thêm Biến Môi trường Mới'}
      >
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input
            label="Tên biến (Key)"
            placeholder="vd: DATABASE_URL, API_KEY, PORT"
            value={formKey}
            onChange={(e) => setFormKey(e.target.value)}
            helper="Sử dụng chữ cái hoa, chữ số và dấu gạch dưới (_)."
            required
            autoFocus
          />

          <Input
            label="Giá trị biến"
            placeholder="vd: postgres://user:pass@host:5432/db"
            value={formValue}
            onChange={(e) => setFormValue(e.target.value)}
            required
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
            <input
              type="checkbox"
              id="is-secret-checkbox"
              checked={formIsSecret}
              onChange={(e) => setFormIsSecret(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: 'var(--accent-pink)', cursor: 'pointer' }}
            />
            <label htmlFor="is-secret-checkbox" style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)', cursor: 'pointer' }}>
              Đánh dấu là Biến bảo mật (ẩn giá trị trên giao diện)
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" variant="primary">
              {editingVar ? 'Lưu thay đổi' : 'Thêm biến'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
