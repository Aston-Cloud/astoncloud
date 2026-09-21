import React from 'react';

export type BadgeStatus =
  | 'online'
  | 'offline'
  | 'starting'
  | 'restarting'
  | 'error'
  | 'active'
  | 'verifying'
  | 'dns_pending'
  | 'failed'
  | 'provisioning'
  | 'ready'
  | 'creating'
  | 'restoring'
  | 'paid'
  | 'open'
  | 'in_progress'
  | 'resolved'
  | 'closed';

interface StatusBadgeProps {
  status: BadgeStatus | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'online':
      case 'active':
      case 'ready':
      case 'paid':
      case 'resolved':
        return {
          label:
            status === 'paid'
              ? 'Đã thanh toán'
              : status === 'resolved'
              ? 'Đã xử lý'
              : status === 'active'
              ? 'Hoạt động'
              : status === 'ready'
              ? 'Sẵn sàng'
              : 'Trực tuyến',
          color: 'var(--color-success)',
          bg: 'var(--color-success-bg)',
          glow: true,
        };
      case 'starting':
      case 'restarting':
      case 'creating':
      case 'restoring':
      case 'verifying':
      case 'provisioning':
      case 'in_progress':
        return {
          label:
            status === 'in_progress'
              ? 'Đang xử lý'
              : status === 'restarting'
              ? 'Đang khởi động lại'
              : status === 'starting'
              ? 'Đang khởi động'
              : status === 'creating'
              ? 'Đang tạo'
              : status === 'restoring'
              ? 'Đang khôi phục'
              : status === 'verifying'
              ? 'Đang xác minh'
              : 'Đang cấp phát',
          color: 'var(--color-warning)',
          bg: 'var(--color-warning-bg)',
          glow: true,
        };
      case 'dns_pending':
      case 'open':
        return {
          label: status === 'dns_pending' ? 'Chờ cấu hình DNS' : 'Đang mở',
          color: 'var(--accent-pink)',
          bg: 'var(--accent-pink-light)',
          glow: false,
        };
      case 'closed':
        return {
          label: 'Đã đóng',
          color: 'var(--text-muted)',
          bg: 'var(--bg-sunken)',
          glow: false,
        };
      case 'offline':
      case 'failed':
      case 'error':
      default:
        return {
          label: status === 'offline' ? 'Ngoại tuyến' : 'Thất bại',
          color: 'var(--color-error)',
          bg: 'var(--color-error-bg)',
          glow: false,
        };
    }
  };

  const config = getStatusConfig();
  const isSm = size === 'sm';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: isSm ? '3px 8px' : '5px 12px',
        borderRadius: 'var(--radius-full)',
        background: config.bg,
        color: config.color,
        fontSize: isSm ? '0.75rem' : '0.82rem',
        fontWeight: 600,
        boxShadow: 'var(--nm-flat-sm)',
        border: `1px solid ${config.color}22`,
      }}
    >
      <span
        className={config.glow ? 'pulse-online' : ''}
        style={{
          width: isSm ? '6px' : '8px',
          height: isSm ? '6px' : '8px',
          borderRadius: '50%',
          backgroundColor: config.color,
          boxShadow: config.glow ? `0 0 8px ${config.color}` : 'none',
        }}
      />
      {config.label}
    </span>
  );
};
