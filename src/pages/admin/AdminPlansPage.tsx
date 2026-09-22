import React, { useState, useEffect } from 'react';
import {
  Layers,
  PlusCircle,
  Edit2,
  Check,
  X,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  Sparkles,
} from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { useToast } from '../../context/ToastContext';

export const AdminPlansPage: React.FC = () => {
  const { authToken } = useAppState();
  const { showToast } = useToast();

  const [plans, setPlans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modals
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingPlan, setEditingPlan] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form fields
  const [planId, setPlanId] = useState<string>('');
  const [planName, setPlanName] = useState<string>('');
  const [priceMonthly, setPriceMonthly] = useState<number>(0);
  const [priceYearly, setPriceYearly] = useState<number>(0);
  const [cpuCores, setCpuCores] = useState<number>(1);
  const [ramMb, setRamMb] = useState<number>(1024);
  const [diskMb, setDiskMb] = useState<number>(10240);
  const [bandwidthMb, setBandwidthMb] = useState<number>(102400);
  const [isRecommended, setIsRecommended] = useState<boolean>(false);

  const fetchPlans = async () => {
    if (!authToken) return;
    try {
      setIsLoading(true);
      const res = await fetch('/api/v1/admin/plans', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.success && data.data) {
        const list = Array.isArray(data.data) ? data.data : (data.data.plans || []);
        setPlans(list);
      }
    } catch (err: any) {
      showToast({
        title: 'Lỗi',
        message: err.message || 'Không thể tải danh sách gói',
        type: 'alert',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, [authToken]);

  const handleOpenCreate = () => {
    setEditingPlan(null);
    setPlanId('');
    setPlanName('');
    setPriceMonthly(99000);
    setPriceYearly(990000);
    setCpuCores(2);
    setRamMb(2048);
    setDiskMb(20480);
    setBandwidthMb(204800);
    setIsRecommended(false);
    setModalOpen(true);
  };

  const handleOpenEdit = (p: any) => {
    setEditingPlan(p);
    setPlanId(p.id);
    setPlanName(p.name);
    setPriceMonthly(p.priceMonthly || p.price || 0);
    setPriceYearly(p.priceYearly || 0);
    setCpuCores(p.cpuCores || 1);
    setRamMb(p.ramMb || 1024);
    setDiskMb(p.diskMb || 10240);
    setBandwidthMb(p.bandwidthMb || 102400);
    setIsRecommended(!!p.isRecommended);
    setModalOpen(true);
  };

  const handleToggleStatus = async (p: any) => {
    if (!authToken) return;
    try {
      const newActive = !p.isActive;
      const res = await fetch(`/api/v1/admin/plans/${p.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ isActive: newActive }),
      });
      const data = await res.json();
      if (data.success) {
        showToast({
          title: 'Cập nhật thành công',
          message: `Gói ${p.name} hiện đã ${newActive ? 'được kích hoạt' : 'bị tạm ngưng'}`,
          type: 'success',
        });
        fetchPlans();
      } else {
        showToast({
          title: 'Lỗi',
          message: data.message || 'Không thể cập nhật gói',
          type: 'alert',
        });
      }
    } catch (err: any) {
      showToast({
        title: 'Lỗi',
        message: err.message || 'Có lỗi xảy ra',
        type: 'alert',
      });
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken) return;

    if (!planName.trim()) {
      showToast({ title: 'Thiếu thông tin', message: 'Vui lòng nhập tên gói', type: 'warning' });
      return;
    }

    if (!editingPlan && !planId.trim()) {
      showToast({ title: 'Thiếu thông tin', message: 'Vui lòng nhập mã ID gói (vd: business)', type: 'warning' });
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        name: planName,
        priceMonthly,
        priceYearly,
        cpuCores,
        ramMb,
        diskMb,
        bandwidthMb,
        isRecommended,
      };

      let res;
      if (editingPlan) {
        res = await fetch(`/api/v1/admin/plans/${editingPlan.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/v1/admin/plans', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            id: planId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-'),
            ...payload,
          }),
        });
      }

      const data = await res.json();
      if (data.success) {
        showToast({
          title: 'Thành công',
          message: editingPlan ? 'Đã cập nhật thông số gói hosting' : 'Đã tạo gói hosting mới thành công',
          type: 'success',
        });
        setModalOpen(false);
        fetchPlans();
      } else {
        showToast({
          title: 'Lỗi lưu gói',
          message: data.message || 'Không thể lưu gói',
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
      setIsSubmitting(false);
    }
  };

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
              PRICING & PLANS
            </span>
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', margin: '6px 0 2px 0' }}>
            Cấu Hình Gói Hosting (Plans)
          </h1>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Quản lý bảng giá, giới hạn phần cứng (CPU, RAM, Disk) và hiển thị cho người dùng.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => fetchPlans()}
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
          <button
            onClick={handleOpenCreate}
            className="nm-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: '#10b981',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.86rem',
              cursor: 'pointer',
            }}
          >
            <PlusCircle size={16} />
            <span>Tạo Gói Mới</span>
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '24px',
        }}
      >
        {plans.map((p) => {
          const isActive = p.isActive !== false;
          return (
            <div
              key={p.id}
              className="nm-card"
              style={{
                padding: '24px',
                borderRadius: 'var(--radius-lg)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                position: 'relative',
                opacity: isActive ? 1 : 0.65,
                borderTop: p.isRecommended ? '4px solid #10b981' : 'none',
              }}
            >
              {p.isRecommended && (
                <div
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    color: '#10b981',
                    background: 'rgba(16, 185, 129, 0.12)',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                  }}
                >
                  <Sparkles size={12} /> Khuyên Dùng
                </div>
              )}

              <div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                  ID: {p.id}
                </div>
                <h3 style={{ margin: '4px 0 8px 0', fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  {p.name}
                </h3>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981' }}>
                  {formatVND(p.priceMonthly || p.price || 0)}
                  <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)' }}> / tháng</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Năm: {formatVND(p.priceYearly || 0)}
                </div>
              </div>

              {/* Hardware specs */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-sunken)',
                  fontSize: '0.82rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Vi xử lý CPU:</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{p.cpuCores || p.cpu} Cores</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Bộ nhớ RAM:</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{p.ramMb || p.ram} MB</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Ổ đĩa lưu trữ:</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                    {p.diskMb ? Math.round(p.diskMb / 1024) : p.disk} GB
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Băng thông mạng:</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                    {p.bandwidthMb ? Math.round(p.bandwidthMb / 1024) : p.bandwidth} GB
                  </span>
                </div>
              </div>

              {/* Actions Footer */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '12px',
                  borderTop: '1px solid rgba(210, 218, 230, 0.4)',
                }}
              >
                <button
                  onClick={() => handleToggleStatus(p)}
                  className="nm-btn"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: isActive ? 'var(--accent-teal)' : '#ef4444',
                  }}
                  title={isActive ? 'Bấm để tắt gói này' : 'Bấm để kích hoạt gói'}
                >
                  {isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                  <span>{isActive ? 'Đang bật' : 'Tạm tắt'}</span>
                </button>

                <button
                  onClick={() => handleOpenEdit(p)}
                  className="nm-btn"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: 'var(--text-main)',
                  }}
                >
                  <Edit2 size={14} /> Sửa gói
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create / Edit Plan Modal */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
          }}
        >
          <div
            className="nm-card"
            style={{
              width: '100%',
              maxWidth: '560px',
              padding: '28px',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>
                {editingPlan ? 'Chỉnh Sửa Gói Hosting' : 'Tạo Gói Hosting Mới'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="nm-btn"
                style={{ padding: '6px', borderRadius: '50%', border: 'none', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {!editingPlan && (
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>
                    Mã định danh gói (Plan ID, vd: ultra-fast):
                  </label>
                  <input
                    type="text"
                    value={planId}
                    onChange={(e) => setPlanId(e.target.value)}
                    placeholder="ví dụ: business-pro"
                    required
                    className="nm-inset"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: 'none', background: 'var(--bg-sunken)', outline: 'none' }}
                  />
                </div>
              )}

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>
                  Tên gói hiển thị:
                </label>
                <input
                  type="text"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  placeholder="ví dụ: Doanh Nghiệp Cấp Cao"
                  required
                  className="nm-inset"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: 'none', background: 'var(--bg-sunken)', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>
                    Giá theo tháng (VND):
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={priceMonthly}
                    onChange={(e) => setPriceMonthly(Number(e.target.value))}
                    className="nm-inset"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: 'none', background: 'var(--bg-sunken)', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>
                    Giá theo năm (VND):
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={priceYearly}
                    onChange={(e) => setPriceYearly(Number(e.target.value))}
                    className="nm-inset"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: 'none', background: 'var(--bg-sunken)', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>
                    CPU Cores:
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={64}
                    value={cpuCores}
                    onChange={(e) => setCpuCores(Number(e.target.value))}
                    className="nm-inset"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: 'none', background: 'var(--bg-sunken)', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>
                    RAM (MB):
                  </label>
                  <input
                    type="number"
                    min={256}
                    value={ramMb}
                    onChange={(e) => setRamMb(Number(e.target.value))}
                    className="nm-inset"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: 'none', background: 'var(--bg-sunken)', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>
                    Disk Lưu trữ (MB):
                  </label>
                  <input
                    type="number"
                    min={1024}
                    value={diskMb}
                    onChange={(e) => setDiskMb(Number(e.target.value))}
                    className="nm-inset"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: 'none', background: 'var(--bg-sunken)', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>
                    Băng thông (MB):
                  </label>
                  <input
                    type="number"
                    min={1024}
                    value={bandwidthMb}
                    onChange={(e) => setBandwidthMb(Number(e.target.value))}
                    className="nm-inset"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: 'none', background: 'var(--bg-sunken)', outline: 'none' }}
                  />
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.84rem', cursor: 'pointer', marginTop: '4px' }}>
                <input
                  type="checkbox"
                  checked={isRecommended}
                  onChange={(e) => setIsRecommended(e.target.checked)}
                />
                <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>Đánh dấu là gói khuyên dùng (Recommended Badge)</span>
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="nm-btn"
                  style={{ padding: '10px 18px', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer' }}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="nm-btn"
                  style={{
                    padding: '10px 24px',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    background: '#10b981',
                    color: '#ffffff',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {isSubmitting ? 'Đang lưu...' : editingPlan ? 'Cập nhật gói' : 'Tạo gói mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
