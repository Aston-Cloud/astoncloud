import React, { useState } from 'react';
import { FileText, Search, Trash2, Download, Filter, RefreshCw } from 'lucide-react';
import { Host, LogEntry } from '../../types';
import { useAppState } from '../../context/AppStateContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';
import { useToast } from '../../context/ToastContext';

interface HostLogsTabProps {
  host: Host;
}

export const HostLogsTab: React.FC<HostLogsTabProps> = ({ host }) => {
  const { logs, clearLogs } = useAppState();
  const { showToast } = useToast();

  const hostLogs: LogEntry[] = logs[host.id] || [];

  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<'all' | 'info' | 'warn' | 'error' | 'debug'>('all');

  const filteredLogs = hostLogs.filter((l) => {
    const matchesSearch = l.message.toLowerCase().includes(search.toLowerCase()) || l.source.includes(search);
    const matchesLevel = levelFilter === 'all' || l.level === levelFilter;
    return matchesSearch && matchesLevel;
  });

  const handleExport = () => {
    const text = hostLogs.map((l) => `[${l.timestamp}] [${l.level.toUpperCase()}] [${l.source}] ${l.message}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${host.name}-nhat-ky-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast({
      title: 'Đã xuất nhật ký',
      message: 'Quá trình tải tệp nhật ký đã bắt đầu.',
      type: 'success',
    });
  };

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'error':
        return '#ef4444';
      case 'warn':
        return '#f59e0b';
      case 'debug':
        return '#8b5cf6';
      case 'info':
      default:
        return 'var(--accent-pink)';
    }
  };

  const levelLabels: Record<string, string> = {
    all: 'Tất cả',
    info: 'INFO',
    warn: 'WARN',
    error: 'ERROR',
    debug: 'DEBUG',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header & Controls */}
      <Card variant="raised" padding="md">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          {/* Search */}
          <div style={{ flex: 1, minWidth: '220px' }}>
            <Input
              placeholder="Lọc nhật ký theo từ khóa, địa chỉ IP, đường dẫn..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<Search size={16} />}
            />
          </div>

          {/* Log Level Filter */}
          <div className="nm-inset" style={{ display: 'inline-flex', padding: '4px', borderRadius: 'var(--radius-md)', gap: '4px' }}>
            {(['all', 'info', 'warn', 'error', 'debug'] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setLevelFilter(lvl)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: levelFilter === lvl ? 'var(--bg-card)' : 'transparent',
                  boxShadow: levelFilter === lvl ? 'var(--nm-flat-sm)' : 'none',
                  color: levelFilter === lvl ? 'var(--accent-pink)' : 'var(--text-secondary)',
                  fontWeight: levelFilter === lvl ? 700 : 500,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                }}
              >
                {levelLabels[lvl]}
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="secondary" size="sm" onClick={handleExport} icon={<Download size={14} />}>
              Xuất tệp
            </Button>
            <Button variant="secondary" size="sm" onClick={() => clearLogs(host.id)} icon={<Trash2 size={14} />}>
              Xóa sạch
            </Button>
          </div>
        </div>
      </Card>

      {/* Log Output Display */}
      {filteredLogs.length === 0 ? (
        <EmptyState
          icon={<FileText size={32} />}
          title="Không tìm thấy nhật ký"
          description="Hiện không có dòng nhật ký nào phù hợp với bộ lọc tìm kiếm."
        />
      ) : (
        <Card
          variant="sunken"
          padding="none"
          style={{
            background: '#0d1117',
            color: '#e6edf3',
            fontFamily: 'var(--font-mono)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--nm-inset-lg)',
            border: '1px solid #30363d',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '10px 18px',
              background: '#161b22',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #30363d',
              fontSize: '0.8rem',
              color: '#8b949e',
            }}
          >
            <span>Hiển thị {filteredLogs.length} sự kiện</span>
            <span>Dòng xuất chuẩn stdout/stderr thời gian thực</span>
          </div>

          {/* Stream */}
          <div style={{ padding: '16px', maxHeight: '480px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  fontSize: '0.86rem',
                  lineHeight: 1.5,
                }}
              >
                <span style={{ color: '#484f58', fontSize: '0.76rem', minWidth: '65px', userSelect: 'none' }}>
                  {log.timestamp}
                </span>
                <span
                  style={{
                    color: getLevelColor(log.level),
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    minWidth: '50px',
                  }}
                >
                  [{log.level}]
                </span>
                <span style={{ color: '#8b949e', fontSize: '0.76rem', minWidth: '60px' }}>
                  ({log.source})
                </span>
                <span style={{ color: '#f0f6fc', wordBreak: 'break-all' }}>
                  {log.message}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
