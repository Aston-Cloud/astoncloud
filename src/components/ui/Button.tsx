import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'inset' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  active?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'secondary',
  size = 'md',
  icon,
  active = false,
  className = '',
  style,
  disabled,
  ...props
}) => {
  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return { padding: '8px 12px', fontSize: '0.82rem', borderRadius: 'var(--radius-sm)' };
      case 'lg':
        return { padding: '14px 24px', fontSize: '1rem', borderRadius: 'var(--radius-md)' };
      case 'md':
      default:
        return { padding: '10px 18px', fontSize: '0.9rem', borderRadius: 'var(--radius-md)' };
    }
  };

  const getVariantStyles = (): React.CSSProperties => {
    if (disabled) {
      return {
        background: 'var(--bg-sunken)',
        boxShadow: 'none',
        color: 'var(--text-muted)',
        cursor: 'not-allowed',
        opacity: 0.6,
      };
    }

    if (active || variant === 'inset') {
      return {
        background: 'var(--bg-sunken)',
        boxShadow: 'var(--nm-inset-sm)',
        color: 'var(--accent-pink)',
      };
    }

    switch (variant) {
      case 'primary':
        return {
          background: 'var(--accent-pink-gradient)',
          color: '#ffffff',
          boxShadow: 'var(--accent-pink-glow), var(--nm-flat-sm)',
          border: 'none',
        };
      case 'danger':
        return {
          background: 'var(--color-error-bg)',
          color: 'var(--color-error)',
          boxShadow: 'var(--nm-flat-sm)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
        };
      case 'ghost':
        return {
          background: 'transparent',
          boxShadow: 'none',
          color: 'var(--text-secondary)',
          border: 'none',
        };
      case 'secondary':
      default:
        return {
          background: 'var(--bg-card)',
          boxShadow: 'var(--nm-flat-sm)',
          color: 'var(--text-main)',
          border: 'var(--subtle-border)',
        };
    }
  };

  return (
    <button
      className={`nm-btn ${variant === 'primary' ? 'nm-btn-primary' : ''} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        fontWeight: 600,
        fontFamily: 'inherit',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all var(--transition-fast)',
        outline: 'none',
        ...getSizeStyles(),
        ...getVariantStyles(),
        ...style,
      }}
      disabled={disabled}
      {...props}
    >
      {icon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</span>}
      {children}
    </button>
  );
};
