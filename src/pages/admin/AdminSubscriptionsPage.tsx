import React, { useState, useEffect } from 'react';
import { CreditCard, RefreshCw, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { useToast } from '../../context/ToastContext';

export const AdminSubscriptionsPage: React.FC = () => {
  const { authToken } = useAppState();
  const { showToast } = useToast();

  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchSubscriptions = async () => {
    if (!authToken) return;
    try {
      setIsLoading(true);
      const res = await fetch('/api/v1/admin/subscriptions', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.success && data.data) {
        const list = Array.isArray(data.data) ? data.data : (data.data.subscriptions || []);
        setSubscriptions(list);
      }
    } catch (err: any) {
      showToast({
        title: 'Lỗi',
        message: err.message || 'Không thể tải danh sách thuê bao',
        type: 'alert',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, [authToken]);

  const formatVND = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
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
                color: '#2563eb',
                background: 'rgba(37, 99, 235, 0.1)',
                padding: '2px 8px',
                borderRadius: '4px',
              }}
            >
              BILLING & SUBSCRIPTIONS
            </span>
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', margin: '6px 0 2px 0' }}>
            Quản Lý Thuê Bao Hệ Thống
          </h1>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Theo dõi tình trạng gói cước của toàn bộ khách hàng và thời hạn gia hạn định kỳ.
          </p>
        </div>

        <button
          onClick={() => fetchSubscriptions()}
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

      {/* Subscriptions Table */}
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
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)' }}>Khách hàng</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)' }}>Gói Hosting</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)' }}>Chu kỳ</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)' }}>Số tiền</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)' }}>Trạng thái</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)' }}>Hạn dịch vụ</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    {isLoading ? 'Đang tải danh sách thuê bao...' : 'Chưa có thuê bao nào trong hệ thống.'}
                  </td>
                </tr>
              ) : (
                subscriptions.map((sub) => {
                  const isActive = sub.status === 'ACTIVE';

                  return (
                    <tr
                      key={sub.id}
                      style={{
                        borderBottom: '1px solid rgba(210, 218, 230, 0.3)',
                        transition: 'background 0.2s ease',
                      }}
                    >
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{sub.userName || 'Chưa rõ'}</div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{sub.userEmail || sub.userId}</div>
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{sub.planName || sub.planId}</span>
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <span
                          style={{
                            fontSize: '0.74rem',
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: 'var(--bg-sunken)',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          {sub.billingInterval === 'YEARLY' ? 'Theo Năm' : 'Theo Tháng'}
                        </span>
                      </td>

                      <td style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-main)' }}>
                        {formatVND(sub.price || 0)}
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: 'var(--radius-full)',
                            background: isActive ? 'rgba(20, 184, 166, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                            color: isActive ? 'var(--accent-teal)' : '#ef4444',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          {isActive ? <CheckCircle size={12} /> : <XCircle size={12} />}
                          {sub.status}
                        </span>
                      </td>

                      <td style={{ padding: '14px 18px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString('vi-VN') : '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
