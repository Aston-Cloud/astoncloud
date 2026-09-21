import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Trash2,
  ArrowDownCircle,
  CornerDownLeft,
  RefreshCw,
  Search,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Download,
} from 'lucide-react';
import { Host } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

interface HostConsoleTabProps {
  host: Host;
}

interface ConsoleLine {
  id: string;
  type: 'stdout' | 'stderr' | 'system' | 'command';
  text: string;
  time: string;
  level?: 'info' | 'warn' | 'error' | 'debug';
}

export const HostConsoleTab: React.FC<HostConsoleTabProps> = ({ host }) => {
  const [command, setCommand] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<'all' | 'info' | 'warn' | 'error' | 'debug'>('all');
  const [lines, setLines] = useState<ConsoleLine[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('connecting');
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const isClearedRef = useRef(false);

  const targetHostId = (host as any).numericId || host.id.replace('host-', '');

  const formatRawLine = (raw: string, idx: number): ConsoleLine => {
    // Attempt parsing standard format: [ISO] [LEVEL] Message
    const match = raw.match(/^\[(.*?)\]\s+\[(INFO|WARN|ERROR|DEBUG)\]\s+(.*)$/i);
    if (match) {
      const [, ts, lvl, msg] = match;
      const lowerLvl = lvl.toLowerCase() as 'info' | 'warn' | 'error' | 'debug';
      const timeStr = ts.includes('T') ? new Date(ts).toLocaleTimeString() : ts;
      return {
        id: `raw-${idx}-${Date.now()}`,
        type: lowerLvl === 'error' ? 'stderr' : lowerLvl === 'warn' ? 'system' : 'stdout',
        text: msg,
        time: timeStr,
        level: lowerLvl,
      };
    }

    return {
      id: `raw-${idx}-${Date.now()}`,
      type: raw.toLowerCase().includes('error') ? 'stderr' : raw.toLowerCase().includes('warn') ? 'system' : 'stdout',
      text: raw,
      time: new Date().toLocaleTimeString(),
      level: raw.toLowerCase().includes('error') ? 'error' : raw.toLowerCase().includes('warn') ? 'warn' : 'info',
    };
  };

  const fetchLogs = useCallback(async (isManualRefresh = false) => {
    const token = localStorage.getItem('aston_auth_token');
    if (isManualRefresh) {
      setIsLoading(true);
      isClearedRef.current = false;
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`/api/v1/hosts/${targetHostId}/logs?tail=150`, { headers });
      if (!res.ok) {
        if (res.status === 401) {
          setConnectionStatus('unauthorized');
        } else {
          setConnectionStatus('error');
        }
        return;
      }

      const json = await res.json();
      if (json.success && json.data?.logs) {
        if (isClearedRef.current) {
          // If user clicked clear locally and this is a background poll, keep view cleared
          return;
        }

        const logData = json.data.logs;
        let newLines: ConsoleLine[] = [];

        if (Array.isArray(logData.entries) && logData.entries.length > 0) {
          newLines = logData.entries.map((e: any, idx: number) => {
            const timeStr = e.timestamp ? new Date(e.timestamp).toLocaleTimeString() : '';
            return {
              id: `${e.timestamp}-${idx}`,
              type: e.level === 'error' ? 'stderr' : e.level === 'warn' ? 'system' : 'stdout',
              text: e.message,
              time: timeStr,
              level: e.level,
            };
          });
        } else if (Array.isArray(logData.lines)) {
          newLines = logData.lines.map((l: string, idx: number) => formatRawLine(l, idx));
        }

        setLines(newLines);
        setConnectionStatus(host.status === 'RUNNING' ? 'connected' : host.status.toLowerCase());
      }
    } catch {
      setConnectionStatus('disconnected');
    } finally {
      if (isManualRefresh) {
        setIsLoading(false);
      }
    }
  }, [targetHostId, host.status]);

  // Initial fetch and polling loop
  useEffect(() => {
    isClearedRef.current = false;
    fetchLogs(true);

    // Live update polling for RUNNING or PROVISIONING host
    let interval: any;
    if (host.status === 'RUNNING' || host.status === 'PROVISIONING') {
      interval = setInterval(() => {
        fetchLogs(false);
      }, 2500);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [fetchLogs, host.status]);

  // Auto-scroll handler
  useEffect(() => {
    if (autoScroll && terminalEndRef.current) {
      terminalEndRef.current.scrollTop = terminalEndRef.current.scrollHeight;
    }
  }, [lines, autoScroll, search, levelFilter]);

  const handleClearView = () => {
    isClearedRef.current = true;
    setLines([]);
  };

  const handleExportLogs = () => {
    const text = lines
      .map((l) => `[${l.time}] [${(l.level || 'INFO').toUpperCase()}] ${l.text}`)
      .join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${host.name}-console-${Date.now()}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRunCommand = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = command.trim();
    if (!cmd) return;

    const time = new Date().toLocaleTimeString();
    const newLines: ConsoleLine[] = [
      ...lines,
      { id: `${Date.now()}-cmd`, type: 'command', text: `$ ${cmd}`, time },
    ];

    const lower = cmd.toLowerCase();
    if (lower === 'clear') {
      handleClearView();
      setCommand('');
      return;
    } else if (lower === 'refresh') {
      fetchLogs(true);
      newLines.push({
        id: `${Date.now()}-out`,
        type: 'system',
        text: `[Aston Cloud] Đã làm mới nhật ký máy chủ từ cơ sở hạ tầng.`,
        time,
      });
    } else if (lower === 'help') {
      newLines.push({
        id: `${Date.now()}-out`,
        type: 'stdout',
        text: `Trợ giúp Bảng điều khiển Aston Cloud (Chế độ An toàn):\n  status   - Xem thông số cấu hình và tình trạng hạ tầng của máy chủ\n  uptime   - Xem thời gian máy chủ đã hoạt động\n  version  - In phiên bản runtime và môi trường thực thi\n  refresh  - Tải lại nhật ký trực tiếp từ Node Agent\n  clear    - Xóa màn hình dòng lệnh hiện tại`,
        time,
      });
    } else if (lower === 'status' || lower === 'info') {
      newLines.push({
        id: `${Date.now()}-out`,
        type: 'stdout',
        text: `Thông số Máy chủ Aston Cloud:\n  Tên máy chủ: ${host.name}\n  Trạng thái: ${host.status}\n  Runtime: ${host.runtime} (Phiên bản: ${host.version})\n  Địa chỉ IP & Cổng: ${host.ipAddress}:${host.port}\n  Giới hạn CPU: ${host.cpuLimit ? host.cpuLimit + ' vCPU' : '1 vCPU'}\n  Giới hạn RAM: ${host.ramTotal} MB\n  Giới hạn Ổ cứng: ${host.diskTotal} GB\n  Thời gian hoạt động: ${host.uptime}`,
        time,
      });
    } else if (lower === 'uptime') {
      newLines.push({
        id: `${Date.now()}-out`,
        type: 'stdout',
        text: `Thời gian hoạt động máy chủ: ${host.uptime} (Trạng thái: ${host.status})`,
        time,
      });
    } else if (lower.includes('version')) {
      newLines.push({
        id: `${Date.now()}-out`,
        type: 'stdout',
        text: `${host.runtime} ${host.version} (Môi trường bảo vệ cô lập Aston Cloud Hypervisor)`,
        time,
      });
    } else {
      // Safe denial of arbitrary execution
      newLines.push({
        id: `${Date.now()}-out`,
        type: 'stderr',
        text: `[Bảo mật] Lệnh "${cmd}" bị từ chối. Bảng điều khiển Console hoạt động ở chế độ an toàn (Chỉ đọc nhật ký trực tiếp và các lệnh chẩn đoán cục bộ). Không hỗ trợ chạy shell tùy ý trên máy chủ.`,
        time,
      });
    }

    isClearedRef.current = false;
    setLines(newLines);
    setCommand('');
  };

  // Filter lines based on search and level
  const filteredLines = lines.filter((line) => {
    const matchesSearch = !search || line.text.toLowerCase().includes(search.toLowerCase());
    const matchesLevel = levelFilter === 'all' || line.level === levelFilter || line.type === 'command';
    return matchesSearch && matchesLevel;
  });

  const getStatusBadge = () => {
    switch (host.status) {
      case 'RUNNING':
        return (
          <div
            className="nm-card"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.82rem',
              fontWeight: 600,
            }}
          >
            <span
              className="pulse-online"
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-success)',
              }}
            />
            <span style={{ color: 'var(--text-main)' }}>Đã kết nối (Trực tiếp)</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>Node Agent</span>
          </div>
        );
      case 'STOPPED':
        return (
          <div
            className="nm-card"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.82rem',
              fontWeight: 600,
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#9ca3af',
              }}
            />
            <span style={{ color: 'var(--text-secondary)' }}>Đã dừng (STOPPED)</span>
          </div>
        );
      case 'PROVISIONING':
        return (
          <div
            className="nm-card"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.82rem',
              fontWeight: 600,
            }}
          >
            <span
              className="pulse-online"
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-warning)',
              }}
            />
            <span style={{ color: 'var(--color-warning)' }}>Đang cấp phát (PROVISIONING)...</span>
          </div>
        );
      case 'ERROR':
        return (
          <div
            className="nm-card"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.82rem',
              fontWeight: 600,
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-error)',
              }}
            />
            <span style={{ color: 'var(--color-error)' }}>Lỗi hạ tầng (ERROR)</span>
          </div>
        );
      default:
        return (
          <div
            className="nm-card"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.82rem',
              fontWeight: 600,
            }}
          >
            <span style={{ color: 'var(--text-muted)' }}>Trạng thái: {host.status}</span>
          </div>
        );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Console Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {getStatusBadge()}

          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Cổng container: <strong>{host.port || 'Chưa cấp'}</strong>
          </span>
        </div>

        {/* Toolbar Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fetchLogs(true)}
            icon={<RefreshCw size={14} className={isLoading ? 'spin-icon' : ''} />}
            disabled={isLoading}
          >
            Làm mới
          </Button>

          <Button
            variant={autoScroll ? 'inset' : 'secondary'}
            size="sm"
            onClick={() => setAutoScroll(!autoScroll)}
            icon={<ArrowDownCircle size={15} />}
          >
            Tự cuộn: {autoScroll ? 'BẬT' : 'TẮT'}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleClearView}
            icon={<Trash2 size={15} />}
          >
            Xóa màn hình
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportLogs}
            icon={<Download size={15} />}
          >
            Xuất log
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <Card variant="raised" padding="sm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        {/* Search */}
        <div className="nm-inset" style={{ flex: 1, minWidth: '200px', display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: 'var(--radius-md)' }}>
          <Search size={15} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Lọc nhật ký theo từ khóa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              width: '100%',
              fontSize: '0.84rem',
              color: 'var(--text-main)',
            }}
          />
        </div>

        {/* Level filter buttons */}
        <div className="nm-inset" style={{ display: 'inline-flex', padding: '4px', borderRadius: 'var(--radius-md)', gap: '4px' }}>
          {(['all', 'info', 'warn', 'error', 'debug'] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setLevelFilter(lvl)}
              style={{
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: levelFilter === lvl ? 'var(--bg-card)' : 'transparent',
                boxShadow: levelFilter === lvl ? 'var(--nm-flat-sm)' : 'none',
                color: levelFilter === lvl ? 'var(--accent-pink)' : 'var(--text-secondary)',
                fontWeight: levelFilter === lvl ? 700 : 500,
                fontSize: '0.76rem',
                cursor: 'pointer',
                textTransform: 'uppercase',
              }}
            >
              {lvl === 'all' ? 'Tất cả' : lvl}
            </button>
          ))}
        </div>
      </Card>

      {/* Terminal Display Window */}
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
          display: 'flex',
          flexDirection: 'column',
          height: '520px',
        }}
      >
        {/* Terminal Titlebar */}
        <div
          style={{
            background: '#161b22',
            padding: '10px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #30363d',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ff5f56', display: 'inline-block' }} />
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ffbd2e', display: 'inline-block' }} />
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#27c93f', display: 'inline-block' }} />
            <span style={{ fontSize: '0.8rem', color: '#8b949e', marginLeft: '8px' }}>
              aston-cloud@{host.name}: ~ ({host.runtime} {host.version})
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={14} style={{ color: 'var(--accent-pink)' }} />
            <span style={{ fontSize: '0.72rem', color: 'var(--accent-pink)', fontWeight: 600 }}>
              Cơ chế Cô lập An toàn (Read-Only Logs)
            </span>
          </div>
        </div>

        {/* Terminal Output Area */}
        <div
          ref={terminalEndRef}
          style={{
            flex: 1,
            padding: '18px',
            overflowY: 'auto',
            fontSize: '0.88rem',
            lineHeight: 1.6,
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          {filteredLines.length === 0 ? (
            <div style={{ color: '#8b949e', fontStyle: 'italic', padding: '12px 0' }}>
              {lines.length === 0
                ? '[Aston Cloud] Màn hình hiện đang trống. Nhấn "Làm mới" hoặc nhập "refresh" để lấy nhật ký từ hệ thống.'
                : 'Không tìm thấy dòng nhật ký nào phù hợp với bộ lọc.'}
            </div>
          ) : (
            filteredLines.map((line) => (
              <div key={line.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <span style={{ color: '#484f58', fontSize: '0.76rem', userSelect: 'none', minWidth: '65px' }}>
                  {line.time}
                </span>

                {line.level && (
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      userSelect: 'none',
                      minWidth: '52px',
                      color:
                        line.level === 'error'
                          ? '#ff7b72'
                          : line.level === 'warn'
                          ? '#d29922'
                          : line.level === 'debug'
                          ? '#d2a8ff'
                          : '#7ee787',
                    }}
                  >
                    [{line.level.toUpperCase()}]
                  </span>
                )}

                <pre
                  style={{
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    fontFamily: 'inherit',
                    color:
                      line.type === 'command'
                        ? 'var(--accent-pink)'
                        : line.level === 'error' || line.type === 'stderr'
                        ? '#ff7b72'
                        : line.level === 'warn' || line.type === 'system'
                        ? '#e3b341'
                        : '#c9d1d9',
                  }}
                >
                  {line.text}
                </pre>
              </div>
            ))
          )}
        </div>

        {/* Command Input Bar (Safe predefined commands only) */}
        <form
          onSubmit={handleRunCommand}
          style={{
            background: '#161b22',
            padding: '12px 18px',
            borderTop: '1px solid #30363d',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <span style={{ color: 'var(--accent-pink)', fontWeight: 700 }}>$</span>
          <input
            type="text"
            placeholder="Nhập lệnh an toàn ('help', 'status', 'uptime', 'version', 'refresh', 'clear')..."
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#f0f6fc',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.9rem',
            }}
          />
          <button
            type="submit"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--accent-pink)',
              display: 'flex',
              alignItems: 'center',
              padding: '4px 8px',
            }}
            title="Thực thi"
          >
            <CornerDownLeft size={16} />
          </button>
        </form>
      </Card>
    </div>
  );
};
