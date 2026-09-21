import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Trash2, ArrowDownCircle, CornerDownLeft, Wifi, CheckCircle2, ShieldCheck } from 'lucide-react';
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
}

export const HostConsoleTab: React.FC<HostConsoleTabProps> = ({ host }) => {
  const [command, setCommand] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [latency] = useState('14ms');
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const initialOutput: ConsoleLine[] = [
    { id: '1', type: 'system', text: `[Aston Cloud] Khởi tạo môi trường container cho máy chủ: ${host.name}`, time: '16:00:00' },
    { id: '2', type: 'system', text: `[Aston Cloud] Đang kết nối tới container cô lập tại ${host.ipAddress}:${host.port}`, time: '16:00:01' },
    { id: '3', type: 'stdout', text: `Mã Container: c-${host.id} [Môi trường: ${host.version}]`, time: '16:00:01' },
    { id: '4', type: 'stdout', text: `Cấu hình môi trường: NODE_ENV=production, PORT=${host.port}`, time: '16:00:02' },
    { id: '5', type: 'stdout', text: `Tiến trình daemon ứng dụng đã chạy với PID 1842. Đang lắng nghe trên 0.0.0.0:${host.port}`, time: '16:00:02' },
    { id: '6', type: 'stdout', text: `[Sẵn sàng] Container đã sẵn sàng tiếp nhận các yêu cầu truy cập.`, time: '16:00:03' },
  ];

  const [lines, setLines] = useState<ConsoleLine[]>(initialOutput);

  useEffect(() => {
    if (autoScroll && terminalEndRef.current) {
      terminalEndRef.current.scrollTop = terminalEndRef.current.scrollHeight;
    }
  }, [lines, autoScroll]);

  const handleRunCommand = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = command.trim();
    if (!cmd) return;

    const time = new Date().toLocaleTimeString();
    const newLines: ConsoleLine[] = [
      ...lines,
      { id: `${Date.now()}-cmd`, type: 'command', text: `$ ${cmd}`, time },
    ];

    // Simulated responses
    const lower = cmd.toLowerCase();
    if (lower === 'clear') {
      setLines([]);
      setCommand('');
      return;
    } else if (lower === 'help') {
      newLines.push({
        id: `${Date.now()}-out`,
        type: 'stdout',
        text: `Trợ giúp Cửa sổ Dòng lệnh Aston Cloud:\n  status     - Xem tình trạng và thông số tài nguyên container\n  pm2 list   - Xem danh sách tiến trình worker\n  version    - In phiên bản runtime và nhân hệ điều hành\n  uptime     - Hiển thị thời gian chạy của máy chủ\n  ls -la     - Liệt kê các tệp tin trong thư mục gốc\n  clear      - Xóa sạch màn hình dòng lệnh\n  restart    - Kích hoạt khởi động lại container an toàn`,
        time,
      });
    } else if (lower === 'status' || lower === 'top') {
      newLines.push({
        id: `${Date.now()}-out`,
        type: 'stdout',
        text: `Tình trạng Container:\n  Máy chủ: ${host.name}\n  Trạng thái: ${host.status.toUpperCase()}\n  CPU: ${host.cpuUsage}% / 100%\n  Bộ nhớ: ${host.ramUsage}MB / ${host.ramTotal}MB\n  Ổ cứng: ${host.diskUsage}GB / ${host.diskTotal}GB\n  Thời gian chạy: ${host.uptime}`,
        time,
      });
    } else if (lower === 'pm2 list' || lower === 'ps') {
      newLines.push({
        id: `${Date.now()}-out`,
        type: 'stdout',
        text: `┌────┬──────────────────────┬─────────────┬─────────┬─────────┬──────────┐\n│ id │ name                 │ mode        │ ↺       │ status  │ cpu      │\n├────┼──────────────────────┼─────────────┼─────────┼─────────┼──────────┤\n│ 0  │ ${host.name.padEnd(20)} │ cluster     │ 0       │ online  │ ${host.cpuUsage}%      │\n└────┴──────────────────────┴─────────────┴─────────┴─────────┴──────────┘`,
        time,
      });
    } else if (lower.includes('node -v') || lower.includes('bun -v') || lower.includes('python -v') || lower === 'version') {
      newLines.push({
        id: `${Date.now()}-out`,
        type: 'stdout',
        text: `${host.version} (Aston Linux Edge Kernel 6.6.14-aston-x86_64)`,
        time,
      });
    } else if (lower === 'uptime') {
      newLines.push({
        id: `${Date.now()}-out`,
        type: 'stdout',
        text: `up ${host.uptime}, 1 user, load average: 0.28, 0.45, 0.38`,
        time,
      });
    } else if (lower.startsWith('ls')) {
      newLines.push({
        id: `${Date.now()}-out`,
        type: 'stdout',
        text: `drwxr-xr-x 4 aston aston 4096 Sep 21 16:00 src\n-rw-r--r-- 1 aston aston 2400 Sep 21 15:40 server.js\n-rw-r--r-- 1 aston aston 1120 Sep 21 15:30 package.json\n-rw------- 1 aston aston  420 Sep 21 14:10 .env\n-rw-r--r-- 1 aston aston  890 Sep 21 14:00 README.md`,
        time,
      });
    } else {
      newLines.push({
        id: `${Date.now()}-out`,
        type: 'stdout',
        text: `bash: ${cmd}: lệnh được mô phỏng trên máy chủ. (Gõ "help" để xem các lệnh khả dụng)`,
        time,
      });
    }

    setLines(newLines);
    setCommand('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Console Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Connection status */}
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
            <span style={{ color: 'var(--text-main)' }}>Đã kết nối WebSocket</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>({latency})</span>
          </div>

          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            TTY: <strong>/dev/pts/1</strong>
          </span>
        </div>

        {/* Toolbar Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
            onClick={() => setLines([])}
            icon={<Trash2 size={15} />}
          >
            Xóa màn hình
          </Button>
        </div>
      </div>

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
              aston-cloud@{host.name}: ~ ({host.runtime})
            </span>
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--accent-pink)', fontWeight: 600 }}>
            Phiên kết nối mã hóa TLS
          </span>
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
          {lines.map((line) => (
            <div key={line.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <span style={{ color: '#484f58', fontSize: '0.76rem', userSelect: 'none', minWidth: '60px' }}>
                {line.time}
              </span>
              <pre
                style={{
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontFamily: 'inherit',
                  color:
                    line.type === 'command'
                      ? 'var(--accent-pink)'
                      : line.type === 'system'
                      ? '#7ee787'
                      : line.type === 'stderr'
                      ? '#ff7b72'
                      : '#c9d1d9',
                }}
              >
                {line.text}
              </pre>
            </div>
          ))}
        </div>

        {/* Command Input Bar */}
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
            placeholder="Nhập lệnh ('help', 'status', 'pm2 list', 'ls', 'version')..."
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
