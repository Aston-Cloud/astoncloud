import React, { useState, useEffect } from 'react';
import {
  Settings,
  ShieldCheck,
  Save,
  RefreshCw,
  AlertTriangle,
  Bell,
  Cpu,
  UserPlus,
  Server,
  Layers,
} from 'lucide-react';
import { AdminSystemSettings } from '../../types';
import { useAppState } from '../../context/AppStateContext';
import { useToast } from '../../context/ToastContext';

export const AdminSettingsPage: React.FC = () => {
  const { authToken } = useAppState();
  const { showToast } = useToast();

  const [settings, setSettings] = useState<AdminSystemSettings>({
    maintenanceMode: false,
    registrationEnabled: true,
    maxHostsPerUser: 5,
    mockAgentMode: true,
    defaultPlanId: 'starter',
    notificationBanner: '',
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const fetchSettings = async () => {
    if (!authToken) return;
    try {
      setIsLoading(true);
      const res = await fetch('/api/v1/admin/settings', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.success && data.data?.settings) {
        setSettings(data.data.settings);
      }
    } catch (err: any) {
      showToast({
        title: 'Lỗi',
        message: err.message || 'Không thể tải cấu hình hệ thống',
        type: 'alert',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [authToken]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken) return;
    try {
      setIsSaving(true);
      const res = await fetch('/api/v1/admin/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) {
        showToast({
          title: 'Đã lưu cấu hình',
          message: 'Các tham số hệ thống đã được cập nhật thành công và áp dụng tức thì.',
          type: 'success',
        });
      } else {
        showToast({
          title: 'Lưu thất bại',
          message: data.message || 'Không thể lưu cài đặt',
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
      setIsSaving(false);
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
                color: '#f59e0b',
                background: 'rgba(245, 158, 11, 0.1)',
                padding: '2px 8px',
                borderRadius: '4px',
              }}
            >
              GLOBAL SYSTEM CONFIG
            </span>
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', margin: '6px 0 2px 0' }}>
            Cấu Hình Hệ Thống Quản Trị
          </h1>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Quản trị chế độ bảo trì, hạn mức máy chủ mỗi tài khoản và thông báo toàn nền tảng.
          </p>
        </div>

        <button
          onClick={() => fetchSettings()}
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

      {/* Settings Form */}
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Card: Platform Operations */}
        <div
          className="nm-card"
          style={{
            padding: '24px',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}
        >
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>
            Vận Hành & Chế Độ Nền Tảng
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Maintenance Mode */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-sunken)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <AlertTriangle size={20} color={settings.maintenanceMode ? '#ef4444' : 'var(--text-muted)'} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                    Chế độ Bảo trì (Maintenance Mode)
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    Khi bật, người dùng thông thường sẽ thấy thông báo bảo trì và không thể khởi tạo tài nguyên mới.
                  </div>
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.maintenanceMode}
                  onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
              </label>
            </div>

            {/* Registration Enabled */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-sunken)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <UserPlus size={20} color={settings.registrationEnabled ? 'var(--accent-teal)' : 'var(--text-muted)'} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                    Mở cổng Đăng ký Thành viên mới
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    Cho phép người dùng công khai đăng ký tài khoản mới trên cổng Aston Cloud.
                  </div>
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.registrationEnabled}
                  onChange={(e) => setSettings({ ...settings, registrationEnabled: e.target.checked })}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
              </label>
            </div>

            {/* Mock Node Agent Mode Info */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-sunken)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Cpu size={20} color="var(--accent-teal)" />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                    Chế độ Mock Node Agent (Không cần VPS thật)
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    Đang hoạt động trong môi trường giả lập an toàn phục vụ phát triển và kiểm thử.
                  </div>
                </div>
              </div>
              <span
                style={{
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  color: 'var(--accent-teal)',
                  background: 'rgba(20, 184, 166, 0.15)',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-full)',
                }}
              >
                MOCK ENABLED
              </span>
            </div>
          </div>
        </div>

        {/* Card: Resource Limits & Defaults */}
        <div
          className="nm-card"
          style={{
            padding: '24px',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}
        >
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>
            Hạn Mức & Giá Trị Mặc Định
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '6px' }}>
                Số máy chủ tối đa mỗi người dùng:
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={settings.maxHostsPerUser}
                onChange={(e) => setSettings({ ...settings, maxHostsPerUser: Number(e.target.value) })}
                className="nm-inset"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: 'var(--bg-sunken)',
                  outline: 'none',
                  fontSize: '0.88rem',
                  color: 'var(--text-main)',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '6px' }}>
                Gói hosting mặc định:
              </label>
              <select
                value={settings.defaultPlanId}
                onChange={(e) => setSettings({ ...settings, defaultPlanId: e.target.value })}
                className="nm-inset"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: 'var(--bg-sunken)',
                  outline: 'none',
                  fontSize: '0.88rem',
                  color: 'var(--text-main)',
                }}
              >
                <option value="starter">Gói Khởi Đầu (Starter)</option>
                <option value="developer">Gói Lập Trình Viên (Developer)</option>
                <option value="pro">Gói Chuyên Nghiệp (Pro)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Card: Global Broadcast Banner */}
        <div
          className="nm-card"
          style={{
            padding: '24px',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Bell size={20} color="#e11d48" />
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>
              Thông Báo Toàn Hệ Thống (Broadcast Banner)
            </h3>
          </div>

          <div>
            <textarea
              value={settings.notificationBanner}
              onChange={(e) => setSettings({ ...settings, notificationBanner: e.target.value })}
              placeholder="Nhập thông điệp hiển thị đầu trang cho toàn bộ người dùng (để trống nếu không muốn phát thông báo)..."
              rows={3}
              className="nm-inset"
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                background: 'var(--bg-sunken)',
                outline: 'none',
                fontSize: '0.86rem',
                color: 'var(--text-main)',
                resize: 'none',
              }}
            />
          </div>
        </div>

        {/* Submit Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            type="submit"
            disabled={isSaving}
            className="nm-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 28px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: '#e11d48',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(225, 29, 72, 0.35)',
            }}
          >
            <Save size={18} />
            <span>{isSaving ? 'Đang lưu cấu hình...' : 'Lưu Cấu Hình Hệ Thống'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
