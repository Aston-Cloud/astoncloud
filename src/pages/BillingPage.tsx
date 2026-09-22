import React, { useState } from 'react';
import {
  CreditCard,
  PlusCircle,
  FileText,
  Download,
  CheckCircle2,
  Sparkles,
  Zap,
  Calendar,
  AlertCircle,
  Clock,
  Shield,
  Layers,
  ArrowRight,
  ExternalLink,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import { useAppState } from '../context/AppStateContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useToast } from '../context/ToastContext';
import { Invoice } from '../types';

interface BillingPageProps {
  onNavigate: (route: string) => void;
}

interface PlanOption {
  id: string;
  name: string;
  tag: string;
  priceMonthly: number;
  priceYearly: number;
  cpu: string;
  ram: string;
  disk: string;
  bandwidth: string;
  domains: number;
  backups: number;
  features: string[];
}

const AVAILABLE_PLANS: PlanOption[] = [
  {
    id: 'starter',
    name: 'Starter Cloud',
    tag: 'Cá nhân & Thử nghiệm',
    priceMonthly: 49000,
    priceYearly: 490000,
    cpu: '1 vCPU Dedicated',
    ram: '512 MB RAM',
    disk: '5 GB NVMe SSD',
    bandwidth: '50 GB Băng thông',
    domains: 2,
    backups: 3,
    features: ['SSL Let\'s Encrypt tự động', 'File Manager trực tiếp', 'Giám sát CPU/RAM thời gian thực'],
  },
  {
    id: 'developer',
    name: 'Developer Cloud',
    tag: 'Khuyên dùng cho Web & API',
    priceMonthly: 129000,
    priceYearly: 1290000,
    cpu: '2 vCPU Dedicated',
    ram: '2 GB RAM',
    disk: '15 GB NVMe SSD',
    bandwidth: '150 GB Băng thông',
    domains: 5,
    backups: 5,
    features: ['Hỗ trợ tối đa 5 máy chủ', 'Tối ưu Node.js, Bun & Python', 'Sao lưu nén gzip an toàn'],
  },
  {
    id: 'pro',
    name: 'Pro Scale',
    tag: 'Doanh nghiệp & Sản xuất',
    priceMonthly: 259000,
    priceYearly: 2590000,
    cpu: '4 vCPU High-Freq',
    ram: '4 GB RAM',
    disk: '30 GB NVMe SSD',
    bandwidth: '300 GB Băng thông',
    domains: 10,
    backups: 10,
    features: ['Hỗ trợ tối đa 10 máy chủ', 'Băng thông cao không giới hạn', 'Hỗ trợ kỹ thuật 24/7'],
  },
];

export const BillingPage: React.FC<BillingPageProps> = ({ onNavigate }) => {
  const {
    userProfile,
    userSubscription,
    invoices,
    hosts,
    createCheckout,
    simulatePayment,
    cancelSubscription,
    reactivateSubscription,
    refreshBilling,
  } = useAppState();

  const { showToast } = useToast();

  // State
  const [billingInterval, setBillingInterval] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState<PlanOption | null>(null);
  const [checkoutSession, setCheckoutSession] = useState<any>(null);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Helper format currency VND
  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString('vi-VN')} ₫`;
  };

  // Open checkout modal
  const handleStartCheckout = async (plan: PlanOption) => {
    setSelectedPlanForCheckout(plan);
    setIsProcessingCheckout(true);
    setIsCheckoutModalOpen(true);
    try {
      const session = await createCheckout(plan.id, billingInterval);
      setCheckoutSession(session);
    } catch (err: any) {
      showToast({
        title: 'Lỗi tạo phiên thanh toán',
        message: err.message || 'Không thể khởi tạo cổng thanh toán',
        type: 'error',
      });
      setIsCheckoutModalOpen(false);
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  // Simulate payment outcome
  const handleSimulatePayment = async (outcome: 'success' | 'failure') => {
    if (!checkoutSession) return;
    setIsProcessingCheckout(true);
    try {
      const res = await simulatePayment(
        checkoutSession.checkoutId,
        outcome,
        outcome === 'failure' ? 'Mô phỏng: Thẻ thanh toán bị từ chối hoặc hết hạn' : undefined
      );

      if (outcome === 'success') {
        showToast({
          title: 'Thanh toán thành công!',
          message: `Gói ${selectedPlanForCheckout?.name} đã được kích hoạt thành công!`,
          type: 'success',
        });
        setIsCheckoutModalOpen(false);
        setCheckoutSession(null);
      } else {
        showToast({
          title: 'Thanh toán không thành công',
          message: res.message || 'Giao dịch bị từ chối trong chế độ thử nghiệm.',
          type: 'error',
        });
      }
    } catch (err: any) {
      showToast({
        title: 'Lỗi xử lý',
        message: err.message || 'Không thể thực hiện mô phỏng thanh toán',
        type: 'error',
      });
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  // Handle cancel subscription
  const handleCancelSubscription = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy tự động gia hạn? Gói dịch vụ vẫn sẽ hoạt động bình thường cho đến hết chu kỳ hiện tại.')) {
      return;
    }
    setIsActionLoading(true);
    try {
      await cancelSubscription();
      showToast({
        title: 'Đã hủy tự động gia hạn',
        message: 'Gói dịch vụ sẽ không tự động gia hạn khi kết thúc chu kỳ này.',
        type: 'info',
      });
    } catch (err: any) {
      showToast({
        title: 'Lỗi',
        message: err.message || 'Không thể hủy tự động gia hạn',
        type: 'error',
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handle reactivate subscription
  const handleReactivateSubscription = async () => {
    setIsActionLoading(true);
    try {
      await reactivateSubscription();
      showToast({
        title: 'Đã bật lại tự động gia hạn',
        message: 'Gói dịch vụ sẽ tiếp tục tự động gia hạn theo định kỳ.',
        type: 'success',
      });
    } catch (err: any) {
      showToast({
        title: 'Lỗi',
        message: err.message || 'Không thể kích hoạt lại tự động gia hạn',
        type: 'error',
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handle download invoice
  const handleDownloadInvoice = (inv: Invoice) => {
    showToast({
      title: 'Đã tạo hóa đơn điện tử',
      message: `Hóa đơn điện tử #${inv.invoiceNumber || inv.id} đã được chuẩn bị và sẵn sàng in/lưu.`,
      type: 'success',
    });
  };

  const activePlanId = userSubscription?.planId || 'free-trial';
  const isSubActive = userSubscription && userSubscription.status === 'ACTIVE';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px' }}>
            Thanh toán & Gói dịch vụ (Billing)
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Quản lý gói thuê bao đám mây, chu kỳ gia hạn và lịch sử hóa đơn tài chính của bạn.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Button variant="secondary" size="sm" onClick={() => refreshBilling()} icon={<RotateCcw size={14} />}>
            Làm mới dữ liệu
          </Button>
        </div>
      </div>

      {/* Current Subscription Card & Active Resources Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Active Subscription Neuromorphic Card */}
        <Card
          variant="raised"
          padding="lg"
          style={{
            background: 'linear-gradient(135deg, #ffffff 0%, var(--bg-card) 60%, rgba(255, 107, 156, 0.08) 100%)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-pink)', letterSpacing: '0.5px' }}>
                Gói Thuê Bao Hiện Tại
              </span>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '12px',
                  background: isSubActive ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                  color: isSubActive ? '#16a34a' : '#dc2626',
                }}
              >
                {userSubscription ? userSubscription.status : 'TÀI KHOẢN MỚI'}
              </span>
            </div>

            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', margin: '14px 0 4px 0' }}>
              {userSubscription ? userSubscription.planName : 'Tài khoản Dùng thử Miễn phí'}
            </div>

            <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              {userSubscription ? (
                <>
                  Chi phí: <strong>{formatCurrency(userSubscription.price)}</strong> /{' '}
                  {userSubscription.billingInterval === 'YEARLY' ? 'Năm' : 'Tháng'}
                </>
              ) : (
                'Bao gồm 1 máy chủ Starter để làm quen và phát triển thử nghiệm.'
              )}
            </div>

            {userSubscription && (
              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={14} color="var(--accent-pink)" />
                  <span>
                    Chu kỳ: {new Date(userSubscription.currentPeriodStart).toLocaleDateString('vi-VN')} &rarr;{' '}
                    <strong>{new Date(userSubscription.currentPeriodEnd).toLocaleDateString('vi-VN')}</strong>
                  </span>
                </div>
                {userSubscription.cancelAtPeriodEnd && (
                  <div style={{ color: '#d97706', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertCircle size={14} />
                    <span>Sẽ tự động kết thúc vào {new Date(userSubscription.currentPeriodEnd).toLocaleDateString('vi-VN')}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ marginTop: '24px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {userSubscription && !userSubscription.cancelAtPeriodEnd ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCancelSubscription}
                disabled={isActionLoading}
                style={{ flex: 1 }}
              >
                Hủy tự động gia hạn
              </Button>
            ) : userSubscription && userSubscription.cancelAtPeriodEnd ? (
              <Button
                variant="primary"
                size="sm"
                onClick={handleReactivateSubscription}
                disabled={isActionLoading}
                style={{ flex: 1 }}
              >
                Kích hoạt lại gia hạn
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const devPlan = AVAILABLE_PLANS[1];
                  handleStartCheckout(devPlan);
                }}
                style={{ flex: 1 }}
              >
                Đăng ký gói Developer
              </Button>
            )}
          </div>
        </Card>

        {/* Resources Usage / Hosting overview */}
        <Card variant="raised" padding="lg" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
              Quyền Hạn Máy Chủ (Quota)
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', margin: '14px 0 4px 0' }}>
              {hosts.length}{' '}
              <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                / {userSubscription?.planId === 'pro' ? '10' : userSubscription?.planId === 'developer' ? '5' : '2'} máy chủ tối đa
              </span>
            </div>
            <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              Đang hoạt động trên các cụm Singapore, Tokyo và Việt Nam.
            </div>
          </div>

          <div
            className="nm-inset"
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              marginTop: '16px',
            }}
          >
            💡 Khi nâng cấp gói đăng ký, các máy chủ hiện tại sẽ ngay lập tức được tăng hạn mức tài nguyên mà không cần cài lại.
          </div>
        </Card>
      </div>

      {/* Plan Selection Section */}
      <Card variant="raised" padding="lg">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)' }}>
              Lựa chọn Gói Dịch Vụ Đám Mây
            </h2>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Mỗi gói dịch vụ đều trang bị CPU chuyên dụng, ổ đĩa NVMe siêu tốc và bảng điều khiển trực quan.
            </p>
          </div>

          {/* Billing Interval Toggle */}
          <div
            className="nm-inset"
            style={{
              display: 'flex',
              padding: '4px',
              borderRadius: '24px',
              background: 'var(--bg-sunken)',
            }}
          >
            <button
              type="button"
              onClick={() => setBillingInterval('MONTHLY')}
              style={{
                padding: '6px 16px',
                borderRadius: '20px',
                border: 'none',
                background: billingInterval === 'MONTHLY' ? 'var(--bg-card)' : 'transparent',
                boxShadow: billingInterval === 'MONTHLY' ? 'var(--nm-flat-sm)' : 'none',
                fontWeight: 700,
                fontSize: '0.82rem',
                color: billingInterval === 'MONTHLY' ? 'var(--accent-pink)' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              Hàng tháng
            </button>
            <button
              type="button"
              onClick={() => setBillingInterval('YEARLY')}
              style={{
                padding: '6px 16px',
                borderRadius: '20px',
                border: 'none',
                background: billingInterval === 'YEARLY' ? 'var(--bg-card)' : 'transparent',
                boxShadow: billingInterval === 'YEARLY' ? 'var(--nm-flat-sm)' : 'none',
                fontWeight: 700,
                fontSize: '0.82rem',
                color: billingInterval === 'YEARLY' ? 'var(--accent-pink)' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              Hàng năm <span style={{ color: '#16a34a', fontSize: '0.74rem' }}>(-17%)</span>
            </button>
          </div>
        </div>

        {/* Plan Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {AVAILABLE_PLANS.map((plan) => {
            const isCurrent = userSubscription?.planId === plan.id;
            const price = billingInterval === 'YEARLY' ? plan.priceYearly : plan.priceMonthly;

            return (
              <div
                key={plan.id}
                className={isCurrent ? 'nm-inset' : 'nm-card'}
                style={{
                  padding: '24px',
                  borderRadius: 'var(--radius-lg)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  border: isCurrent ? '2px solid var(--accent-pink)' : '1px solid rgba(210, 218, 230, 0.4)',
                  position: 'relative',
                }}
              >
                {plan.id === 'developer' && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '-12px',
                      right: '20px',
                      background: 'var(--accent-pink)',
                      color: '#ffffff',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '3px 10px',
                      borderRadius: '10px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    Phổ Biến Nhất
                  </div>
                )}

                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                    {plan.tag}
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
                    {plan.name}
                  </div>

                  <div style={{ margin: '18px 0 16px 0' }}>
                    <span style={{ fontSize: '2.2rem', fontWeight: 900, color: 'var(--text-main)' }}>
                      {formatCurrency(price)}
                    </span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {' '}/ {billingInterval === 'YEARLY' ? 'năm' : 'tháng'}
                    </span>
                  </div>

                  {/* Hardware specs */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '14px 0', borderTop: '1px solid rgba(210, 218, 230, 0.4)', borderBottom: '1px solid rgba(210, 218, 230, 0.4)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                      <Zap size={16} color="var(--accent-pink)" />
                      <span>{plan.cpu}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                      <Layers size={16} color="var(--accent-pink)" />
                      <span>{plan.ram}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                      <Shield size={16} color="var(--accent-pink)" />
                      <span>{plan.disk}</span>
                    </div>
                  </div>

                  {/* Included features */}
                  <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {plan.features.map((feat, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        <CheckCircle2 size={14} color="#16a34a" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: '24px' }}>
                  {isCurrent ? (
                    <Button variant="secondary" size="md" style={{ width: '100%' }} disabled>
                      Gói Đang Sử Dụng
                    </Button>
                  ) : (
                    <Button
                      variant={plan.id === 'developer' ? 'primary' : 'secondary'}
                      size="md"
                      style={{ width: '100%' }}
                      onClick={() => handleStartCheckout(plan)}
                    >
                      {userSubscription ? 'Nâng cấp / Chuyển gói' : 'Chọn Gói Này'}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Invoices History Table */}
      <Card variant="raised" padding="lg">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
              Lịch sử Hóa đơn & Giao dịch
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Danh sách các hóa đơn định kỳ và biên lai điện tử hợp lệ của tài khoản.
            </p>
          </div>
        </div>

        <div style={{ width: '100%', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-sunken)', color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Mã hóa đơn</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Ngày lập</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Nội dung</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Số tiền</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Trạng thái</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Chưa có hóa đơn thanh toán nào được ghi nhận.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} style={{ borderBottom: '1px solid rgba(210, 218, 230, 0.4)' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--text-main)' }}>
                      {inv.invoiceNumber || inv.id}
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                      {inv.date}
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-main)' }}>
                      {inv.description}
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 800, color: 'var(--text-main)' }}>
                      {formatCurrency(inv.amount)}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <StatusBadge status={inv.status} size="sm" />
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setSelectedInvoice(inv)}
                          icon={<FileText size={14} />}
                        >
                          Chi tiết
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleDownloadInvoice(inv)}
                          icon={<Download size={14} />}
                        >
                          PDF
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Mock Checkout Modal */}
      <Modal
        isOpen={isCheckoutModalOpen}
        onClose={() => {
          if (!isProcessingCheckout) {
            setIsCheckoutModalOpen(false);
            setCheckoutSession(null);
          }
        }}
        title={`Thanh toán đăng ký gói: ${selectedPlanForCheckout?.name || ''}`}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Mock Provider Warning Banner */}
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255, 107, 156, 0.1)',
              border: '1px solid rgba(255, 107, 156, 0.3)',
              color: 'var(--accent-pink)',
              fontSize: '0.84rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <Sparkles size={18} />
            <div>
              <strong>Môi trường Thử nghiệm (Mock Payment Gateway):</strong>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Hệ thống đang hoạt động ở chế độ Local Development. Không trừ tiền thật từ tài khoản ngân hàng của bạn.
              </div>
            </div>
          </div>

          {/* Order Details */}
          <div className="nm-inset" style={{ padding: '16px', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.88rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Dịch vụ:</span>
              <strong style={{ color: 'var(--text-main)' }}>{selectedPlanForCheckout?.name}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.88rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Chu kỳ thanh toán:</span>
              <strong>{billingInterval === 'YEARLY' ? 'Hàng năm (12 tháng)' : 'Hàng tháng (30 ngày)'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.88rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Mã hóa đơn:</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{checkoutSession?.invoiceNumber || 'Đang tạo...'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid rgba(210, 218, 230, 0.4)', fontSize: '1.05rem' }}>
              <span style={{ fontWeight: 700 }}>Tổng thanh toán:</span>
              <strong style={{ color: 'var(--accent-pink)', fontSize: '1.3rem' }}>
                {checkoutSession ? formatCurrency(checkoutSession.amount) : '...'}
              </strong>
            </div>
          </div>

          {/* Simulation Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
            <Button
              variant="primary"
              size="lg"
              disabled={isProcessingCheckout || !checkoutSession}
              onClick={() => handleSimulatePayment('success')}
              icon={<CheckCircle2 size={18} />}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {isProcessingCheckout ? 'Đang kích hoạt gói...' : 'Mô phỏng Thanh toán Thành công (Simulate Success)'}
            </Button>

            <Button
              variant="secondary"
              size="md"
              disabled={isProcessingCheckout || !checkoutSession}
              onClick={() => handleSimulatePayment('failure')}
              icon={<XCircle size={16} />}
              style={{ width: '100%', justifyContent: 'center', color: '#dc2626' }}
            >
              Mô phỏng Thanh toán Thất bại (Simulate Failure)
            </Button>
          </div>

          <div style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Sau khi hoàn tất mô phỏng, gói dịch vụ sẽ được cập nhật và hóa đơn sẽ chuyển sang trạng thái tương ứng.
          </div>
        </div>
      </Modal>

      {/* Invoice Details Modal */}
      {selectedInvoice && (
        <Modal
          isOpen={!!selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          title={`Chi tiết Hóa đơn #${selectedInvoice.invoiceNumber || selectedInvoice.id}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(210, 218, 230, 0.4)', paddingBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Khách hàng</div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{userProfile.name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{userProfile.email}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Trạng thái</div>
                <StatusBadge status={selectedInvoice.status} size="sm" />
              </div>
            </div>

            <div className="nm-inset" style={{ padding: '16px', borderRadius: 'var(--radius-md)' }}>
              <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid rgba(210, 218, 230, 0.4)' }}>
                    <th style={{ textAlign: 'left', paddingBottom: '8px' }}>Mục dịch vụ</th>
                    <th style={{ textAlign: 'right', paddingBottom: '8px' }}>Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ paddingTop: '10px', color: 'var(--text-main)', fontWeight: 600 }}>
                      {selectedInvoice.description}
                    </td>
                    <td style={{ paddingTop: '10px', textAlign: 'right', fontWeight: 700 }}>
                      {formatCurrency(selectedInvoice.amount)}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(210, 218, 230, 0.4)', marginTop: '14px', paddingTop: '12px', fontSize: '1rem', fontWeight: 800 }}>
                <span>Tổng cộng (VND):</span>
                <span style={{ color: 'var(--accent-pink)' }}>{formatCurrency(selectedInvoice.amount)}</span>
              </div>
            </div>

            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div>Ngày phát hành: <strong>{selectedInvoice.date}</strong></div>
              {selectedInvoice.dueDate && <div>Hạn thanh toán: <strong>{selectedInvoice.dueDate}</strong></div>}
              <div>Phương thức thanh toán: <strong>Aston Mock Gateway</strong></div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <Button variant="secondary" onClick={() => setSelectedInvoice(null)}>
                Đóng
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  handleDownloadInvoice(selectedInvoice);
                  setSelectedInvoice(null);
                }}
                icon={<Download size={16} />}
              >
                Tải Hóa đơn (PDF)
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
