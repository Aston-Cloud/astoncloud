import React from 'react';

interface ResourceGaugeProps {
  label: string;
  value: number; // 0 to 100
  displayValue: string;
  subText?: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const ResourceGauge: React.FC<ResourceGaugeProps> = ({
  label,
  value,
  displayValue,
  subText,
  color = 'var(--accent-pink)',
  size = 'md',
}) => {
  const percentage = Math.min(100, Math.max(0, value));

  // Determine color if dynamic
  let dynamicColor = color;
  if (color === 'auto') {
    if (percentage > 85) dynamicColor = 'var(--color-error)';
    else if (percentage > 65) dynamicColor = 'var(--color-warning)';
    else dynamicColor = 'var(--accent-pink)';
  }

  const radius = size === 'sm' ? 24 : size === 'lg' ? 44 : 34;
  const stroke = size === 'sm' ? 5 : size === 'lg' ? 8 : 6;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '12px',
        borderRadius: 'var(--radius-md)',
      }}
    >
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg height={radius * 2} width={radius * 2} style={{ transform: 'rotate(-90deg)' }}>
          {/* Track background */}
          <circle
            stroke="#e2e8f0"
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          {/* Progress circle */}
          <circle
            stroke={dynamicColor}
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={circumference + ' ' + circumference}
            style={{
              strokeDashoffset,
              transition: 'stroke-dashoffset 0.6s ease-in-out',
              strokeLinecap: 'round',
            }}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
        </svg>
        <span
          style={{
            position: 'absolute',
            fontSize: size === 'sm' ? '0.7rem' : size === 'lg' ? '0.95rem' : '0.8rem',
            fontWeight: 700,
            color: 'var(--text-main)',
          }}
        >
          {percentage}%
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          {label}
        </span>
        <span style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
          {displayValue}
        </span>
        {subText && (
          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            {subText}
          </span>
        )}
      </div>
    </div>
  );
};

export const ProgressBar: React.FC<{
  value: number;
  max?: number;
  color?: string;
  height?: number;
  showLabel?: boolean;
}> = ({ value, max = 100, color = 'var(--accent-pink)', height = 8, showLabel = false }) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div style={{ width: '100%' }}>
      {showLabel && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
          <span style={{ color: 'var(--text-secondary)' }}>Utilization</span>
          <span style={{ color: 'var(--text-main)' }}>{percentage.toFixed(0)}%</span>
        </div>
      )}
      <div
        className="nm-inset"
        style={{
          width: '100%',
          height: `${height}px`,
          borderRadius: 'var(--radius-full)',
          overflow: 'hidden',
          padding: '1px',
          background: 'var(--bg-sunken)',
        }}
      >
        <div
          style={{
            width: `${percentage}%`,
            height: '100%',
            borderRadius: 'var(--radius-full)',
            background: color,
            transition: 'width 0.4s ease',
            boxShadow: `0 0 8px ${color}44`,
          }}
        />
      </div>
    </div>
  );
};
