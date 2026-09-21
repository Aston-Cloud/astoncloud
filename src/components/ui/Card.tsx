import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'raised' | 'inset' | 'flat' | 'sunken';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverEffect?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'raised',
  padding = 'md',
  hoverEffect = false,
  className = '',
  style,
  ...props
}) => {
  const getShadow = () => {
    switch (variant) {
      case 'inset':
      case 'sunken':
        return 'var(--nm-inset)';
      case 'flat':
        return 'var(--nm-flat-sm)';
      case 'raised':
      default:
        return 'var(--nm-flat)';
    }
  };

  const getPadding = () => {
    switch (padding) {
      case 'none':
        return '0';
      case 'sm':
        return '14px';
      case 'lg':
        return '28px';
      case 'md':
      default:
        return '20px';
    }
  };

  return (
    <div
      className={`nm-card ${hoverEffect ? 'nm-card-hover' : ''} ${className}`}
      style={{
        background: variant === 'sunken' || variant === 'inset' ? 'var(--bg-sunken)' : 'var(--bg-card)',
        boxShadow: getShadow(),
        borderRadius: 'var(--radius-lg)',
        border: 'var(--subtle-border)',
        padding: getPadding(),
        position: 'relative',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
};
