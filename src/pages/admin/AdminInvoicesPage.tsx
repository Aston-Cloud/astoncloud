import React, { useState, useEffect } from 'react';
import { FileText, RefreshCw, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { useToast } from '../../context/ToastContext';

export const AdminInvoicesPage: React.FC = () => {
  const { authToken } = useAppState();
  const { showToast } = useToast();

  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchInvoices = async () => {
    if (!authToken) return;
    try {
      setIsLoading(true);
      const res = await fetch('/api/v1/admin/invoices', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.success && data.data) {
        const list = Array.isArray(data.data) ? data.data : (data.data.invoices || []);
        setInvoices(list);
      }
    } catch (err: any) {
      showToast({
        title: 'Lỗi',
        message: err.message || 'Không thể tải danh sách hóa đơn',
        type: 'alert',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
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
                color: '#10b981',
                background: 'rgba(16, 185, 129, 0.1)',
                padding: '2px 8px',
                borderRadius: '4px',
              }}
            >
              FINANCIAL AUDIT
            </span>
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', margin: '6px 0 2px 0' }}>
            Quản Trị Hóa Đơn & Doanh Thu
          </h1>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Tra cứu toàn bộ hóa đơn phát sinh, trạng thái thanh toán và lịch sử giao dịch.
          </p>
        </div>

        <button
          onClick={() => fetchInvoices()}
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

      {/* Invoices Table */}
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
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)' }}>Mã hóa đơn</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)' }}>Khách hàng</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)' }}>Diễn giải</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)' }}>Số tiền</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)' }}>Trạng thái</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)' }}>Thời gian</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    {isLoading ? 'Đang tải danh sách hóa đơn...' : 'Chưa có hóa đơn nào phát sinh.'}
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const isPaid = inv.status === 'PAID';
                  const isFailed = inv.status === 'FAILED';

                  return (
                    <tr
                      key={inv.id}
                      style={{
                        borderBottom: '1px solid rgba(210, 218, 230, 0.3)',
                        transition: 'background 0.2s ease',
                      }}
                    >
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <FileText size={16} color="var(--text-muted)" />
                          <span style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-main)' }}>
                            {inv.invoiceNumber || inv.id}
                          </span>
                        </div>
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{inv.userName || 'Khách hàng'}</div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{inv.userEmail || inv.userId}</div>
                      </td>

                      <td style={{ padding: '14px 18px', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                        {inv.description || 'Đăng ký gói hosting'}
                      </td>

                      <td style={{ padding: '14px 18px', fontWeight: 800, color: isPaid ? '#10b981' : 'var(--text-main)' }}>
                        {formatVND(inv.amount || 0)}
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: 'var(--radius-full)',
                            background: isPaid
                              ? 'rgba(16, 185, 129, 0.12)'
                              : isFailed
                              ? 'rgba(239, 68, 68, 0.12)'
                              : 'rgba(245, 158, 11, 0.12)',
                            color: isPaid ? '#10b981' : isFailed ? '#ef4444' : '#f59e0b',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          {isPaid ? <CheckCircle2 size={12} /> : isFailed ? <AlertCircle size={12} /> : <Clock size={12} />}
                          {inv.status}
                        </span>
                      </td>

                      <td style={{ padding: '14px 18px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString('vi-VN') : '—'}
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
