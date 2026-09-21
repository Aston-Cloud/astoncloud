import React, { useState } from 'react';
import { X, Mail, Lock, User as UserIcon, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { useToast } from '../../context/ToastContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'login',
}) => {
  const [tab, setTab] = useState<'login' | 'register'>(defaultTab);
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { login: setAuthSession } = useAppState();
  const { showToast } = useToast();

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          login: loginIdentifier.trim(),
          password,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại.');
      }

      setAuthSession(json.data.token, json.data.user);
      showToast({
        title: 'Đăng nhập thành công',
        message: `Chào mừng ${json.data.user.displayName || json.data.user.username}!`,
        type: 'success',
      });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Đã có lỗi xảy ra';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          username: username.trim(),
          displayName: displayName.trim() || undefined,
          password: registerPassword,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        let errMessage = json.error?.message || 'Đăng ký không thành công';
        if (json.error?.details && Array.isArray(json.error.details)) {
          errMessage = json.error.details.map((d: { message: string }) => d.message).join('. ');
        }
        throw new Error(errMessage);
      }

      setAuthSession(json.data.token, json.data.user);
      showToast({
        title: 'Đăng ký thành công',
        message: 'Chào mừng bạn đến với nền tảng Aston Cloud Hosting.',
        type: 'success',
      });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Đã có lỗi xảy ra';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(235, 240, 246, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        className="animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '440px',
          background: 'var(--bg-main)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--nm-flat-lg)',
          padding: '32px',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="nm-btn"
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Đóng"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, var(--accent-pink), #f27398)',
              boxShadow: '0 6px 16px rgba(255, 107, 149, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px auto',
              color: '#ffffff',
            }}
          >
            <ShieldCheck size={26} />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 4px 0' }}>
            {tab === 'login' ? 'Đăng Nhập Tài Khoản' : 'Đăng Ký Tài Khoản'}
          </h2>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', margin: 0 }}>
            Nền tảng Cloud Hosting Node.js, Bun & Python
          </p>
        </div>

        {/* Tab Switcher */}
        <div
          className="nm-inset"
          style={{
            display: 'flex',
            padding: '4px',
            borderRadius: 'var(--radius-full)',
            marginBottom: '24px',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setErrorMsg(null);
            }}
            style={{
              flex: 1,
              padding: '8px 16px',
              borderRadius: 'var(--radius-full)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: tab === 'login' ? 700 : 500,
              fontSize: '0.86rem',
              color: tab === 'login' ? 'var(--accent-pink)' : 'var(--text-muted)',
              background: tab === 'login' ? 'var(--bg-main)' : 'transparent',
              boxShadow: tab === 'login' ? 'var(--nm-flat-sm)' : 'none',
              transition: 'all var(--transition-fast)',
            }}
          >
            Đăng Nhập
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('register');
              setErrorMsg(null);
            }}
            style={{
              flex: 1,
              padding: '8px 16px',
              borderRadius: 'var(--radius-full)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: tab === 'register' ? 700 : 500,
              fontSize: '0.86rem',
              color: tab === 'register' ? 'var(--accent-pink)' : 'var(--text-muted)',
              background: tab === 'register' ? 'var(--bg-main)' : 'transparent',
              boxShadow: tab === 'register' ? 'var(--nm-flat-sm)' : 'none',
              transition: 'all var(--transition-fast)',
            }}
          >
            Đăng Ký
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div
            className="animate-fade-in"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              color: '#ef4444',
              fontSize: '0.84rem',
              marginBottom: '18px',
              border: '1px solid rgba(239, 68, 68, 0.2)',
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form Body */}
        {tab === 'login' ? (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                Email hoặc Tên người dùng
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  required
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="admin hoặc alex.dang@astoncloud.vn"
                  className="nm-inset"
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 40px',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    fontSize: '0.9rem',
                    color: 'var(--text-main)',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <UserIcon size={18} style={{ position: 'absolute', left: '14px', top: '13px', color: 'var(--text-muted)' }} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                Mật khẩu
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="nm-inset"
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 40px',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    fontSize: '0.9rem',
                    color: 'var(--text-main)',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <Lock size={18} style={{ position: 'absolute', left: '14px', top: '13px', color: 'var(--text-muted)' }} />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                background: 'linear-gradient(135deg, var(--accent-pink), #f27398)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.92rem',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.7 : 1,
                boxShadow: '0 6px 16px rgba(255, 107, 149, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '8px',
                transition: 'all var(--transition-fast)',
              }}
            >
              <span>{isLoading ? 'Đang xác thực...' : 'Đăng Nhập'}</span>
              <ArrowRight size={18} />
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                Địa chỉ Email
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tenban@domain.com"
                  className="nm-inset"
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 38px',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    fontSize: '0.88rem',
                    color: 'var(--text-main)',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <Mail size={16} style={{ position: 'absolute', left: '14px', top: '12px', color: 'var(--text-muted)' }} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                Tên người dùng (Username)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="vd: alex_dang"
                  className="nm-inset"
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 38px',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    fontSize: '0.88rem',
                    color: 'var(--text-main)',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <UserIcon size={16} style={{ position: 'absolute', left: '14px', top: '12px', color: 'var(--text-muted)' }} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                Họ và tên
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="vd: Nguyễn Văn A"
                className="nm-inset"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  fontSize: '0.88rem',
                  color: 'var(--text-main)',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                Mật khẩu (Tối thiểu 8 ký tự, gồm chữ & số)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  required
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  placeholder="••••••••"
                  className="nm-inset"
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 38px',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    fontSize: '0.88rem',
                    color: 'var(--text-main)',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <Lock size={16} style={{ position: 'absolute', left: '14px', top: '12px', color: 'var(--text-muted)' }} />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                background: 'linear-gradient(135deg, var(--accent-pink), #f27398)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.92rem',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.7 : 1,
                boxShadow: '0 6px 16px rgba(255, 107, 149, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '6px',
                transition: 'all var(--transition-fast)',
              }}
            >
              <span>{isLoading ? 'Đang tạo tài khoản...' : 'Tạo Tài Khoản Mới'}</span>
              <ArrowRight size={18} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
