import React from 'react';

interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  children: React.ReactNode;
}

export const Table: React.FC<TableProps> = ({ children, className = '', style, ...props }) => {
  return (
    <div
      className="nm-inset"
      style={{
        width: '100%',
        overflowX: 'auto',
        borderRadius: 'var(--radius-lg)',
        padding: '8px',
      }}
    >
      <table
        style={{
          width: '100%',
          borderCollapse: 'separate',
          borderSpacing: '0 6px',
          fontSize: '0.9rem',
          ...style,
        }}
        className={className}
        {...props}
      >
        {children}
      </table>
    </div>
  );
};

export const TableHead: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <thead>
      <tr style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {children}
      </tr>
    </thead>
  );
};

export const TableBody: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <tbody>{children}</tbody>;
};

export const TableRow: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({
  children,
  style,
  ...props
}) => {
  return (
    <tr
      style={{
        background: 'var(--bg-card)',
        boxShadow: 'var(--nm-flat-sm)',
        borderRadius: 'var(--radius-md)',
        transition: 'all var(--transition-fast)',
        ...style,
      }}
      {...props}
    >
      {children}
    </tr>
  );
};

export const TableCell: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({
  children,
  style,
  ...props
}) => {
  return (
    <td
      style={{
        padding: '14px 16px',
        color: 'var(--text-main)',
        ...style,
      }}
      {...props}
    >
      {children}
    </td>
  );
};

export const TableHeaderCell: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({
  children,
  style,
  ...props
}) => {
  return (
    <th
      style={{
        padding: '10px 16px',
        fontWeight: 600,
        textAlign: 'left',
        ...style,
      }}
      {...props}
    >
      {children}
    </th>
  );
};
