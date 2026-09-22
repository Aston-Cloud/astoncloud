import React, { useState, useEffect } from 'react';
import {
  Users,
  Server,
  Cpu,
  CreditCard,
  FileText,
  Activity,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  Play,
  Square,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { AdminDashboardStats, AdminAuditLog } from '../../types';
import { useAppState } from '../../context/AppStateContext';

interface AdminDashboardPageProps {
  onNavigate: (route: string) => void;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({ onNavigate }) => {
  const { authToken } = useAppState();
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [recentLogs, setRecentLogs] = useState<AdminAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    if (!authToken) return;
    try {
      setError(null);
      const [statsRes, logsRes] = await Promise.all([
        fetch('/api/v1/admin/stats', {
          headers: { Authorization: `Bearer ${authToken}` },
        }),
        fetch('/api/v1/admin/activity?limit=6', {
          headers: { Authorization: `Bearer ${authToken}` },
        }),
      ]);

      const statsData = await statsRes.json();
      const logsData = await logsRes.json();

      if (statsData.success) {
        setStats(statsData.data);
      } else {
        setError(statsData.message || 'Không thể tải thống kê quản trị');
      }

      if (logsData.success && Array.isArray(logsData.data?.logs)) {
        setRecentLogs(logsData.data.logs);
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối máy chủ quản trị');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [authToken]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchDashboardData();
  };

  const formatVND = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header Banner */}
      <div
        className="nm-card"
        style={{
          padding: '24px 28px',
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          background: 'linear-gradient(135deg, rgba(225, 29, 72, 0.05) 0%, rgba(37, 99, 235, 0.03) 100%), var(--bg-card)',
          borderLeft: '4px solid #e11d48',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.72rem',
                fontWeight: 800,
                letterSpacing: '0.6px',
                color: '#e11d48',
                background: 'rgba(225, 29, 72, 0.1)',
                padding: '3px 10px',
                borderRadius: 'var(--radius-full)',
                textTransform: 'uppercase',
              }}
            >
              <ShieldCheck size={14} /> Khu vực Quản trị Cấp cao
            </span>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: 'var(--accent-teal)',
                background: 'rgba(20, 184, 166, 0.1)',
                padding: '3px 10px',
                borderRadius: 'var(--radius-full)',
              }}
            >
              Mock Node Agent Mode
            </span>
          </div>
          <h1
            style={{
              fontSize: '1.65rem',
              fontWeight: 800,
              color: 'var(--text-main)',
              margin: '8px 0 4px 0',
              letterSpacing: '-0.5px',
            }}
          >
            Trung tâm Điều hành Hệ thống Aston Cloud
          </h1>
          <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            Giám sát toàn diện người dùng, máy chủ container, hạ tầng nodes và doanh thu hệ thống.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="nm-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.86rem',
              color: 'var(--text-main)',
            }}
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            <span>Làm mới số liệu</span>
          </button>
        </div>
      </div>

      {error && (
        <div
          className="nm-card"
          style={{
            padding: '16px 20px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(239, 68, 68, 0.08)',
            borderLeft: '4px solid #ef4444',
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <AlertTriangle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px',
        }}
      >
        {/* Total Users */}
        <div
          className="nm-card"
          onClick={() => onNavigate('admin-users')}
          style={{
            padding: '20px',
            borderRadius: 'var(--radius-lg)',
            cursor: 'pointer',
            transition: 'transform 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Tổng Người Dùng
            </span>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(37, 99, 235, 0.12)',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Users size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '12px' }}>
            {isLoading ? '...' : stats?.totalUsers ?? 0}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginTop: '8px',
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
            }}
          >
            <span style={{ color: 'var(--accent-teal)', fontWeight: 600 }}>
              {stats?.activeUsers ?? 0} hoạt động
            </span>
            <span>•</span>
            <span style={{ color: '#ef4444', fontWeight: 600 }}>
              {stats?.suspendedUsers ?? 0} bị khóa
            </span>
          </div>
        </div>

        {/* Total Hosts */}
        <div
          className="nm-card"
          onClick={() => onNavigate('admin-hosts')}
          style={{
            padding: '20px',
            borderRadius: 'var(--radius-lg)',
            cursor: 'pointer',
            transition: 'transform 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Máy Chủ Container
            </span>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(225, 29, 72, 0.12)',
                color: '#e11d48',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Server size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '12px' }}>
            {isLoading ? '...' : stats?.totalHosts ?? 0}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginTop: '8px',
              fontSize: '0.78rem',
            }}
          >
            <span style={{ color: 'var(--accent-teal)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Play size={12} /> {stats?.runningHosts ?? 0} chạy
            </span>
            <span>•</span>
            <span style={{ color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Square size={12} /> {stats?.stoppedHosts ?? 0} tắt
            </span>
          </div>
        </div>

        {/* Total Nodes */}
        <div
          className="nm-card"
          onClick={() => onNavigate('admin-nodes')}
          style={{
            padding: '20px',
            borderRadius: 'var(--radius-lg)',
            cursor: 'pointer',
            transition: 'transform 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Nodes Hạ Tầng
            </span>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(20, 184, 166, 0.12)',
                color: 'var(--accent-teal)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Cpu size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '12px' }}>
            {isLoading ? '...' : stats?.totalNodes ?? 0}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: '8px',
              fontSize: '0.78rem',
              color: 'var(--accent-teal)',
              fontWeight: 600,
            }}
          >
            <span>{stats?.healthyNodes ?? 0} Node trực tuyến (Mock Mode)</span>
          </div>
        </div>

        {/* Total Revenue & Subscriptions */}
        <div
          className="nm-card"
          onClick={() => onNavigate('admin-invoices')}
          style={{
            padding: '20px',
            borderRadius: 'var(--radius-lg)',
            cursor: 'pointer',
            transition: 'transform 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Doanh Thu Hệ Thống
            </span>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(16, 185, 129, 0.12)',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <TrendingUp size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '12px' }}>
            {isLoading ? '...' : formatVND(stats?.totalRevenue ?? 0)}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginTop: '8px',
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
            }}
          >
            <span style={{ color: '#10b981', fontWeight: 600 }}>
              {stats?.activeSubscriptions ?? 0} thuê bao active
            </span>
            <span>•</span>
            <span style={{ color: '#f59e0b', fontWeight: 600 }}>
              {stats?.pendingInvoices ?? 0} chờ duyệt
            </span>
          </div>
        </div>
      </div>

      {/* Grid: Quick Administrative Actions & Recent Activity */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
          gap: '24px',
        }}
      >
        {/* Quick Access Tiles */}
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>
              Lối tắt Quản trị
            </h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Thao tác nhanh</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <button
              onClick={() => onNavigate('admin-users')}
              className="nm-card"
              style={{
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                background: 'var(--bg-sunken)',
                boxShadow: 'var(--nm-inset-sm)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Users size={20} color="#2563eb" />
                <ArrowRight size={14} color="var(--text-muted)" />
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                Quản lý Người Dùng
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Khóa, mở khóa, đổi quyền ADMIN
              </div>
            </button>

            <button
              onClick={() => onNavigate('admin-hosts')}
              className="nm-card"
              style={{
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                background: 'var(--bg-sunken)',
                boxShadow: 'var(--nm-inset-sm)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Server size={20} color="#e11d48" />
                <ArrowRight size={14} color="var(--text-muted)" />
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                Quản trị Máy Chủ
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Bật, tắt, khởi động lại, xóa an toàn
              </div>
            </button>

            <button
              onClick={() => onNavigate('admin-plans')}
              className="nm-card"
              style={{
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                background: 'var(--bg-sunken)',
                boxShadow: 'var(--nm-inset-sm)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <CreditCard size={20} color="#10b981" />
                <ArrowRight size={14} color="var(--text-muted)" />
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                Cấu hình Gói Hosting
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Thêm gói mới, sửa giá, bật/tắt gói
              </div>
            </button>

            <button
              onClick={() => onNavigate('admin-settings')}
              className="nm-card"
              style={{
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                background: 'var(--bg-sunken)',
                boxShadow: 'var(--nm-inset-sm)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <ShieldCheck size={20} color="#f59e0b" />
                <ArrowRight size={14} color="var(--text-muted)" />
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                Cài đặt Hệ thống
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Bảo trì, đăng ký, giới hạn tài nguyên
              </div>
            </button>
          </div>

          <div
            style={{
              padding: '14px 18px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(37, 99, 235, 0.05)',
              border: '1px solid rgba(37, 99, 235, 0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div style={{ color: '#2563eb' }}>
              <ShieldCheck size={20} />
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              <strong>Bảo mật Quản trị:</strong> Mọi thao tác thay đổi trạng thái người dùng, can thiệp máy chủ hay cấu hình gói đều được hệ thống ghi nhận vào nhật ký kiểm toán không thể chỉnh sửa.
            </div>
          </div>
        </div>

        {/* Recent Audit Activity */}
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={18} color="#e11d48" />
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Nhật Ký Hoạt Động Gần Đây
              </h3>
            </div>
            <button
              onClick={() => onNavigate('admin-activity')}
              style={{
                border: 'none',
                background: 'transparent',
                color: '#e11d48',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              Xem tất cả <ArrowRight size={14} />
            </button>
          </div>

          {recentLogs.length === 0 ? (
            <div
              style={{
                padding: '36px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '0.86rem',
              }}
            >
              Chưa có nhật ký hoạt động nào được ghi nhận.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {recentLogs.map((log) => (
                <div
                  key={log.id}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-sunken)',
                    boxShadow: 'var(--nm-inset-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background:
                            log.action.includes('SUSPEND') || log.action.includes('DELETE')
                              ? 'rgba(239, 68, 68, 0.12)'
                              : log.action.includes('ROLE')
                              ? 'rgba(147, 51, 234, 0.12)'
                              : 'rgba(37, 99, 235, 0.12)',
                          color:
                            log.action.includes('SUSPEND') || log.action.includes('DELETE')
                              ? '#ef4444'
                              : log.action.includes('ROLE')
                              ? '#9333ea'
                              : '#2563eb',
                        }}
                      >
                        {log.action}
                      </span>
                      <span
                        style={{
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          color: 'var(--text-main)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {log.targetType}: {log.targetId}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Bởi: {log.actorEmail}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: '0.72rem',
                      color: 'var(--text-muted)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {new Date(log.createdAt).toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
