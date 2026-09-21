import React, { useState } from 'react';
import {
  CreditCard,
  TrendingUp,
  PlusCircle,
  FileText,
  Download,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useAppState } from '../context/AppStateContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useToast } from '../context/ToastContext';

interface BillingPageProps {
  onNavigate: (route: string) => void;
}

export const BillingPage: React.FC<BillingPageProps> = ({ onNavigate }) => {
  const { userProfile, invoices, hosts, addBalance } = useAppState();
  const { showToast } = useToast();

  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('50');

  const totalMonthlySpend = hosts.reduce((acc, h) => acc + h.plan.price, 0);

  const handleTopUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(topUpAmount);
    if (isNaN(amount) || amount <= 0) return;
    addBalance(amount);
    setIsTopUpModalOpen(false);
  };

  const handleDownloadInvoice = (invId: string) => {
    showToast({
      title: 'Đã tải hóa đơn',
      message: `Hóa đơn #${invId}.pdf đã được tạo và tải về máy.`,
      type: 'success',
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px' }}>
            Thanh toán & Hóa đơn
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Quản lý số dư tín dụng trả trước, các gói dịch vụ đang kích hoạt và lịch sử thanh toán.
          </p>
        </div>

        <Button variant="primary" onClick={() => setIsTopUpModalOpen(true)} icon={<PlusCircle size={18} />}>
          Nạp tiền
        </Button>
      </div>

      {/* Financial Overview Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        {/* Prepaid Wallet Card */}
        <Card
          variant="raised"
          padding="lg"
          style={{
            background: 'linear-gradient(135deg, #ffffff 0%, var(--bg-card) 60%, var(--accent-pink-light) 100%)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.84rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-pink)', letterSpacing: '0.5px' }}>
                Số dư trả trước
              </span>
              <Sparkles size={20} color="var(--accent-pink)" />
            </div>
            <div style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--text-main)', margin: '12px 0 4px 0' }}>
              ${userProfile.balance.toFixed(2)}{' '}
              <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-muted)' }}>USD</span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Tự động khấu trừ vào ngày mùng 1 hàng tháng
            </div>
          </div>

          <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
            <Button variant="primary" size="sm" onClick={() => setIsTopUpModalOpen(true)} style={{ flex: 1 }}>
              Nạp thêm tín dụng
            </Button>
            <Button variant="secondary" size="sm" onClick={() => alert('Đã bật tính năng tự động nạp ở ngưỡng $15.')}>
              Tự động nạp
            </Button>
          </div>
        </Card>

        {/* Monthly Run Rate */}
        <Card variant="raised" padding="lg" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.84rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
              Ước tính chi phí tháng
            </div>
            <div style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--text-main)', margin: '12px 0 4px 0' }}>
              ${totalMonthlySpend.toFixed(2)}{' '}
              <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-muted)' }}>/ tháng</span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-success)', fontWeight: 600 }}>
              Dự kiến duy trì hoạt động: {(userProfile.balance / (totalMonthlySpend || 1)).toFixed(1)} tháng
            </div>
          </div>

          <div
            className="nm-inset"
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.78rem',
              color: 'var(--text-secondary)',
              marginTop: '16px',
            }}
          >
            Bao gồm {hosts.length} máy chủ đám mây Node.js, Bun và Python đang hoạt động.
          </div>
        </Card>

        {/* Payment Methods */}
        <Card variant="raised" padding="lg" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.84rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
              Phương thức thanh toán chính
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px' }}>
              <div
                style={{
                  width: '46px',
                  height: '32px',
                  borderRadius: '6px',
                  background: 'var(--accent-pink-gradient)',
                  boxShadow: 'var(--accent-pink-glow)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                }}
              >
                <CreditCard size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Thẻ Visa kết thúc bằng 4921</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Hết hạn 08/2028 • Mặc định</div>
              </div>
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => alert('Cửa sổ quản lý thẻ thanh toán')}
            style={{ marginTop: '20px' }}
          >
            Quản lý thẻ & phương thức
          </Button>
        </Card>
      </div>

      {/* Active Subscriptions */}
      <Card variant="raised" padding="lg">
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '16px' }}>
          Gói dịch vụ máy chủ đang dùng
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {hosts.map((host) => (
            <div
              key={host.id}
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
                    color: 'var(--accent-pink)',
                  }}
                >
                  <Zap size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem' }}>
                    {host.name}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {host.plan.name} ({host.plan.cpu}, {host.plan.ram}) • Khu vực {host.region}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-main)' }}>
                    ${host.plan.price.toFixed(2)}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>mỗi tháng</div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onNavigate(`host-${host.id}`)}
                >
                  Quản lý
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Invoices History Table */}
      <Card variant="raised" padding="lg">
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '16px' }}>
          Hóa đơn & Báo cáo giao dịch
        </h3>

        <div style={{ width: '100%', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-sunken)', color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Mã hóa đơn</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Ngày lập</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Nội dung</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Số tiền</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Trạng thái</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Biên lai</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} style={{ borderBottom: '1px solid rgba(210, 218, 230, 0.4)' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--text-main)' }}>
                    {inv.id}
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                    {inv.date}
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-main)' }}>
                    {inv.description}
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--text-main)' }}>
                    ${inv.amount.toFixed(2)} USD
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <StatusBadge status={inv.status} size="sm" />
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleDownloadInvoice(inv.id)}
                      icon={<Download size={14} />}
                    >
                      PDF
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Top Up Modal */}
      <Modal
        isOpen={isTopUpModalOpen}
        onClose={() => setIsTopUpModalOpen(false)}
        title="Nạp số dư tín dụng tài khoản"
      >
        <form onSubmit={handleTopUpSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            {['25', '50', '100', '250'].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setTopUpAmount(preset)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: 'var(--radius-md)',
                  border: topUpAmount === preset ? '1px solid var(--accent-pink)' : 'var(--subtle-border)',
                  background: topUpAmount === preset ? 'var(--bg-sunken)' : 'var(--bg-card)',
                  boxShadow: topUpAmount === preset ? 'var(--nm-inset-sm)' : 'var(--nm-flat-sm)',
                  fontWeight: 700,
                  color: topUpAmount === preset ? 'var(--accent-pink)' : 'var(--text-main)',
                  cursor: 'pointer',
                }}
              >
                ${preset}
              </button>
            ))}
          </div>

          <Input
            label="Số tiền tùy chỉnh (USD)"
            type="number"
            min="5"
            step="1"
            value={topUpAmount}
            onChange={(e) => setTopUpAmount(e.target.value)}
            helper="Số tiền nạp tối thiểu là $5.00."
            required
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
            Thanh toán tức thì qua <strong>Thẻ Visa đuôi 4921</strong>. Tín dụng không có ngày hết hạn.
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <Button type="button" variant="secondary" onClick={() => setIsTopUpModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" variant="primary">
              Xác nhận thanh toán (${topUpAmount || 0})
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
