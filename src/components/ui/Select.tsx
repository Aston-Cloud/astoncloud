import React from 'react';
import { ChevronDown } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: Option[];
  error?: string;
  helper?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  error,
  helper,
  className = '',
  style,
  id,
  ...props
}) => {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
      {label && (
        <label
          htmlFor={selectId}
          style={{
            fontSize: '0.86rem',
            fontWeight: 600,
            color: 'var(--text-secondary)',
          }}
        >
          {label}
        </label>
      )}
      <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
        <select
          id={selectId}
          className={`nm-input ${className}`}
          style={{
            appearance: 'none',
            WebkitAppearance: 'none',
            paddingRight: '38px',
            cursor: 'pointer',
            borderColor: error ? 'var(--color-error)' : undefined,
            ...style,
          }}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <span
          style={{
            position: 'absolute',
            right: '14px',
            pointerEvents: 'none',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <ChevronDown size={18} />
        </span>
      </div>
      {error && (
        <span style={{ fontSize: '0.78rem', color: 'var(--color-error)' }}>{error}</span>
      )}
      {helper && !error && (
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{helper}</span>
      )}
    </div>
  );
};
