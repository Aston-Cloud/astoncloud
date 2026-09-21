import React, { useState } from 'react';
import {
  User,
  Shield,
  KeyRound,
  Smartphone,
  Sliders,
  Check,
  Save,
  Laptop,
  Globe,
  Trash2,
} from 'lucide-react';
import { useAppState } from '../context/AppStateContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Tabs, TabItem } from '../components/ui/Tabs';
import { useToast } from '../context/ToastContext';

interface SettingsPageProps {
  onNavigate: (route: string) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = () => {
  const { userProfile, updateUserProfile } = useAppState();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('profile');

  // Profile form state
  const [name, setName] = useState(userProfile.name);
  const [email, setEmail] = useState(userProfile.email);
  const [username, setUsername] = useState(userProfile.username);
  const [company, setCompany] = useState(userProfile.company);

  // Password form state
  const [currPassword, setCurrPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Security state
  const [twoFactor, setTwoFactor] = useState(userProfile.twoFactorEnabled);
  const [notifyEmail, setNotifyEmail] = useState(userProfile.notificationEmail);

  // Sessions state
  const [sessions, setSessions] = useState([
    { id: 'sess-1', device: 'Chrome trên Windows 11', ip: '118.69.182.25', location: 'TP. Hồ Chí Minh, Việt Nam', current: true, time: 'Đang hoạt động' },
    { id: 'sess-2', device: 'Safari trên macOS Sequoia', ip: '14.161.42.10', location: 'Tokyo, Nhật Bản', current: false, time: 'Hôm qua, 18:30' },
    { id: 'sess-3', device: 'Firefox trên Linux Ubuntu', ip: '42.114.88.9', location: 'Frankfurt, Đức', current: false, time: '15/09/2026' },
  ]);

  const tabs: TabItem[] = [
    { id: 'profile', label: 'Hồ sơ cá nhân', icon: <User size={16} /> },
    { id: 'security', label: 'Bảo mật & 2FA', icon: <Shield size={16} /> },
    { id: 'password', label: 'Mật khẩu', icon: <KeyRound size={16} /> },
    { id: 'sessions', label: 'Phiên đăng nhập', icon: <Smartphone size={16} /> },
    { id: 'preferences', label: 'Tùy chọn hệ thống', icon: <Sliders size={16} /> },
  ];

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserProfile({ name, email, username, company });
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword !== confirmPassword) {
      showToast({
        title: 'Mật khẩu không khớp',
        message: 'Mật khẩu mới và xác nhận mật khẩu phải trùng khớp.',
        type: 'error',
      });
      return;
    }
    showToast({
      title: 'Đã đổi mật khẩu',
      message: 'Thông tin xác thực tài khoản đã được cập nhật thành công.',
      type: 'success',
    });
    setCurrPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleRevokeSession = (sessId: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== sessId));
    showToast({
      title: 'Đã hủy phiên',
      message: 'Phiên đăng nhập từ xa đã bị chấm dứt thành công.',
      type: 'info',
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px' }}>
          Cài đặt tài khoản
        </h1>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Quản lý hồ sơ nhà phát triển, thông tin xác thực bảo mật, phiên đăng nhập và các tùy chọn cá nhân.
        </p>
      </div>

      {/* Settings Navigation Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab 1: Profile */}
      {activeTab === 'profile' && (
        <Card variant="raised" padding="lg">
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '16px' }}>
            Hồ sơ cá nhân
          </h3>

          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '8px' }}>
              <img
                src={userProfile.avatar}
                alt={userProfile.name}
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '3px solid var(--accent-pink-soft)',
                  boxShadow: 'var(--nm-flat-sm)',
                }}
              />
              <div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => alert('Chọn ảnh đại diện mới')}
                >
                  Đổi ảnh đại diện
                </Button>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Định dạng JPG, PNG hoặc SVG dung lượng dưới 2MB
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px' }}>
              <Input
                label="Họ và tên"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <Input
                label="Địa chỉ email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Input
                label="Tên tài khoản (Username)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
              <Input
                label="Công ty / Tổ chức"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
              <Button type="submit" variant="primary" icon={<Save size={16} />}>
                Lưu thay đổi
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Tab 2: Security & 2FA */}
      {activeTab === 'security' && (
        <Card variant="raised" padding="lg">
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '16px' }}>
            Xác thực hai yếu tố (2FA)
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div
              className="nm-inset"
              style={{
                padding: '18px',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '14px',
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.98rem', color: 'var(--text-main)' }}>
                  Ứng dụng xác thực (TOTP)
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Bảo vệ hạ tầng máy chủ đám mây của bạn bằng Google Authenticator, 1Password hoặc Authy.
                </div>
              </div>

              <Button
                variant={twoFactor ? 'secondary' : 'primary'}
                size="sm"
                onClick={() => {
                  setTwoFactor(!twoFactor);
                  updateUserProfile({ twoFactorEnabled: !twoFactor });
                }}
              >
                {twoFactor ? 'Tắt 2FA' : 'Bật 2FA'}
              </Button>
            </div>

            <div
              className="nm-inset"
              style={{
                padding: '18px',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '14px',
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.98rem', color: 'var(--text-main)' }}>
                  Khóa công khai SSH (SSH Keys)
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  2 khóa SSH đã cấu hình để đăng nhập SFTP và dòng lệnh không cần mật khẩu.
                </div>
              </div>

              <Button variant="secondary" size="sm" onClick={() => alert('Trình quản lý SSH Keys')}>
                Quản lý khóa
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Tab 3: Password */}
      {activeTab === 'password' && (
        <Card variant="raised" padding="lg">
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '16px' }}>
            Đổi mật khẩu
          </h3>

          <form onSubmit={handleUpdatePassword} style={{ maxWidth: '480px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Input
              label="Mật khẩu hiện tại"
              type="password"
              value={currPassword}
              onChange={(e) => setCurrPassword(e.target.value)}
              required
            />
            <Input
              label="Mật khẩu mới"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              helper="Tối thiểu 8 ký tự bao gồm chữ số và ký hiệu đặc biệt."
              required
            />
            <Input
              label="Xác nhận mật khẩu mới"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
              <Button type="submit" variant="primary">
                Cập nhật mật khẩu
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Tab 4: Sessions */}
      {activeTab === 'sessions' && (
        <Card variant="raised" padding="lg">
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '16px' }}>
            Các phiên đăng nhập đang hoạt động
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {sessions.map((sess) => (
              <div
                key={sess.id}
                className="nm-card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  borderRadius: 'var(--radius-md)',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      background: 'var(--bg-sunken)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: sess.current ? 'var(--accent-pink)' : 'var(--text-muted)',
                    }}
                  >
                    <Laptop size={20} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{sess.device}</span>
                      {sess.current && (
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-success)', background: 'var(--color-success-bg)', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
                          Thiết bị này
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {sess.ip} • {sess.location} • {sess.time}
                    </div>
                  </div>
                </div>

                {!sess.current && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleRevokeSession(sess.id)}
                    icon={<Trash2 size={14} />}
                  >
                    Hủy phiên
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tab 5: Preferences */}
      {activeTab === 'preferences' && (
        <Card variant="raised" padding="lg">
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '16px' }}>
            Tùy chọn hệ thống
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>Thông báo qua Email</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Nhận cảnh báo khi CPU quá tải, trạng thái sao lưu và tự động gia hạn chứng chỉ SSL.</div>
              </div>
              <input
                type="checkbox"
                checked={notifyEmail}
                onChange={(e) => {
                  setNotifyEmail(e.target.checked);
                  updateUserProfile({ notificationEmail: e.target.checked });
                }}
                style={{ width: '20px', height: '20px', accentColor: 'var(--accent-pink)', cursor: 'pointer' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid rgba(210, 218, 230, 0.4)' }}>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>Giao diện hệ thống</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Phong cách Neuromorphism với tông màu chủ đạo Hồng Pastel.</div>
              </div>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-pink)', background: 'var(--accent-pink-light)', padding: '4px 12px', borderRadius: 'var(--radius-full)' }}>
                Đang kích hoạt
              </span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
