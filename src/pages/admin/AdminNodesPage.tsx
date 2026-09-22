import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Server,
  HardDrive,
  Activity,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Sliders,
  X,
  Info,
  Plus,
  Radio,
  Eye,
  Copy,
  Check,
  ShieldCheck,
  Globe,
} from 'lucide-react';
import { AdminNode } from '../../types';
import { useAppState } from '../../context/AppStateContext';
import { useToast } from '../../context/ToastContext';

interface AdminNodesPageProps {
  onNavigate?: (route: string) => void;
}

export const AdminNodesPage: React.FC<AdminNodesPageProps> = ({ onNavigate }) => {
  const { authToken } = useAppState();
  const { showToast } = useToast();

  const [nodes, setNodes] = useState<AdminNode[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Status modal
  const [statusModalOpen, setStatusModalOpen] = useState<boolean>(false);
  const [selectedNode, setSelectedNode] = useState<AdminNode | null>(null);
  const [targetStatus, setTargetStatus] = useState<string>('ONLINE');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  // Register node modal
  const [registerModalOpen, setRegisterModalOpen] = useState<boolean>(false);
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [nodeForm, setNodeForm] = useState({
    id: '',
    name: '',
    hostname: '',
    region: 'Vietnam',
    ipAddress: '',
    totalCpu: 8,
    totalRamMb: 16384,
    totalDiskMb: 102400,
    agentUrl: 'http://127.0.0.1:5001',
  });

  // One-time token modal
  const [tokenModalOpen, setTokenModalOpen] = useState<boolean>(false);
  const [generatedToken, setGeneratedToken] = useState<string>('');
  const [registeredNodeName, setRegisteredNodeName] = useState<string>('');
  const [tokenCopied, setTokenCopied] = useState<boolean>(false);

  const fetchNodes = async () => {
    if (!authToken) return;
    try {
      setIsLoading(true);
      const res = await fetch('/api/v1/admin/nodes', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.success && data.data) {
        const list = Array.isArray(data.data) ? data.data : (data.data.nodes || []);
        setNodes(
          list.map((n: any) => ({
            ...n,
            totalCpu: n.totalCpu || 8,
            availableCpu: n.availableCpu !== undefined ? n.availableCpu : n.totalCpu || 8,
            allocatedCpu: n.allocatedCpu || 0,
            totalRam: n.totalRam || 16384,
            availableRam: n.availableRam !== undefined ? n.availableRam : n.totalRam || 16384,
            allocatedRam: n.allocatedRam || 0,
            totalDisk: n.totalDisk || 102400,
            availableDisk: n.availableDisk !== undefined ? n.availableDisk : n.totalDisk || 102400,
            allocatedDisk: n.allocatedDisk || 0,
            cpuTotalCores: n.totalCpu || 8,
            cpuUsedCores: n.allocatedCpu || 0,
            ramTotalMb: n.totalRam || 16384,
            ramUsedMb: n.allocatedRam || 0,
            diskTotalGb: Math.round((n.totalDisk || 102400) / 1024),
            diskUsedGb: Math.round((n.allocatedDisk || 0) / 1024),
          }))
        );
      }
    } catch (err: any) {
      showToast({
        title: 'Lỗi',
        message: err.message || 'Không thể tải danh sách nodes',
        type: 'alert',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNodes();
  }, [authToken]);

  const handleOpenStatusModal = (node: AdminNode) => {
    setSelectedNode(node);
    setTargetStatus(node.status);
    setStatusModalOpen(true);
  };

  const handleUpdateStatus = async () => {
    if (!selectedNode || !authToken) return;
    try {
      setIsUpdating(true);
      const res = await fetch(`/api/v1/admin/nodes/${selectedNode.id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ status: targetStatus }),
      });
      const data = await res.json();
      if (data.success) {
        showToast({
          title: 'Đã cập nhật trạng thái Node',
          message: `Node ${selectedNode.name} đã chuyển sang trạng thái ${targetStatus}`,
          type: 'success',
        });
        setStatusModalOpen(false);
        fetchNodes();
      } else {
        showToast({
          title: 'Cập nhật thất bại',
          message: data.error?.message || data.message || 'Lỗi xử lý',
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
      setIsUpdating(false);
    }
  };

  const handleRegisterNode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken) return;

    if (!nodeForm.id.trim() || !nodeForm.name.trim() || !nodeForm.hostname.trim() || !nodeForm.ipAddress.trim()) {
      showToast({
        title: 'Thiếu thông tin',
        message: 'Vui lòng điền đầy đủ các trường bắt buộc',
        type: 'alert',
      });
      return;
    }

    try {
      setIsRegistering(true);
      const res = await fetch('/api/v1/admin/nodes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          id: nodeForm.id.trim(),
          name: nodeForm.name.trim(),
          hostname: nodeForm.hostname.trim(),
          region: nodeForm.region.trim(),
          ipAddress: nodeForm.ipAddress.trim(),
          totalCpu: Number(nodeForm.totalCpu),
          totalRamMb: Number(nodeForm.totalRamMb),
          totalDiskMb: Number(nodeForm.totalDiskMb),
          agentUrl: nodeForm.agentUrl.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (data.success && data.data?.agentToken) {
        setGeneratedToken(data.data.agentToken);
        setRegisteredNodeName(nodeForm.name);
        setRegisterModalOpen(false);
        setTokenModalOpen(true);
        setTokenCopied(false);

        // Reset form
        setNodeForm({
          id: '',
          name: '',
          hostname: '',
          region: 'Vietnam',
          ipAddress: '',
          totalCpu: 8,
          totalRamMb: 16384,
          totalDiskMb: 102400,
          agentUrl: 'http://127.0.0.1:5001',
        });

        showToast({
          title: 'Đăng ký Node thành công',
          message: `Worker Node đã được thêm vào cụm hạ tầng. Vui lòng sao chép token bảo mật.`,
          type: 'success',
        });

        fetchNodes();
      } else {
        showToast({
          title: 'Đăng ký thất bại',
          message: data.error?.message || data.message || 'Không thể tạo node',
          type: 'alert',
        });
      }
    } catch (err: any) {
      showToast({
        title: 'Lỗi',
        message: err.message || 'Có lỗi kết nối máy chủ',
        type: 'alert',
      });
    } finally {
      setIsRegistering(false);
    }
  };

  const copyTokenToClipboard = () => {
    navigator.clipboard.writeText(generatedToken);
    setTokenCopied(true);
    showToast({
      title: 'Đã sao chép',
      message: 'Mã bí mật Node Agent Token đã được lưu vào khay nhớ tạm.',
      type: 'info',
    });
    setTimeout(() => setTokenCopied(false), 3000);
  };

  const formatRelativeHeartbeat = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'Chưa có nhịp đập';
    const date = new Date(dateStr);
    const diffMs = Date.now() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 15) return 'Vừa xong';
    if (diffSec < 60) return `${diffSec}s trước`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} phút trước`;
    return '> 1 giờ trước';
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
                color: 'var(--accent-teal)',
                background: 'rgba(20, 184, 166, 0.1)',
                padding: '2px 8px',
                borderRadius: '4px',
              }}
            >
              MULTI-NODE ORCHESTRATION
            </span>
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', margin: '6px 0 2px 0' }}>
            Quản Trị Cụm Nodes Hạ Tầng
          </h1>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Theo dõi dung lượng CPU, RAM, Disk độc lập, nhịp đập heartbeat và điều phối Worker Nodes phân tán.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setRegisterModalOpen(true)}
            className="nm-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.86rem',
              cursor: 'pointer',
              background: 'var(--accent-teal)',
              color: '#ffffff',
            }}
          >
            <Plus size={16} />
            <span>Đăng ký Node Mới</span>
          </button>

          <button
            onClick={() => fetchNodes()}
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
        </div>
      </div>

      {/* Infrastructure Notice Banner */}
      <div
        className="nm-card"
        style={{
          padding: '16px 20px',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(20, 184, 166, 0.05)',
          borderLeft: '4px solid var(--accent-teal)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Info size={20} color="var(--accent-teal)" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: '0.84rem', color: 'var(--text-main)', lineHeight: 1.4 }}>
            <strong>Cơ chế Multi-Node tự động:</strong> Hệ thống tự động phát hiện ngoại tuyến (Offline Detection sau 60s không nhận heartbeat) và chỉ điều phối máy chủ mới lên các nodes đang <code>ONLINE</code> và đủ tài nguyên CPU/RAM/Disk.
          </div>
        </div>
        <span
          style={{
            fontSize: '0.72rem',
            fontWeight: 800,
            color: 'var(--accent-teal)',
            background: 'rgba(20, 184, 166, 0.15)',
            padding: '4px 10px',
            borderRadius: 'var(--radius-full)',
          }}
        >
          CLUSTER NODES: {nodes.length}
        </span>
      </div>

      {/* Nodes Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
          gap: '24px',
        }}
      >
        {nodes.map((node) => {
          const cpuAlloc = node.allocatedCpu || 0;
          const cpuTotal = node.totalCpu || 8;
          const cpuAvail = node.availableCpu !== undefined ? node.availableCpu : cpuTotal - cpuAlloc;
          const cpuPct = Math.round((cpuAlloc / cpuTotal) * 100);

          const ramAllocGb = (node.allocatedRam / 1024).toFixed(1);
          const ramTotalGb = (node.totalRam / 1024).toFixed(1);
          const ramAvailGb = (node.availableRam / 1024).toFixed(1);
          const ramPct = Math.round(((node.allocatedRam || 0) / (node.totalRam || 1)) * 100);

          const diskAllocGb = (node.allocatedDisk / 1024).toFixed(1);
          const diskTotalGb = (node.totalDisk / 1024).toFixed(1);
          const diskAvailGb = (node.availableDisk / 1024).toFixed(1);
          const diskPct = Math.round(((node.allocatedDisk || 0) / (node.totalDisk || 1)) * 100);

          const isOnline = node.status === 'ONLINE';
          const isDraining = node.status === 'DRAINING';
          const isMaintenance = node.status === 'MAINTENANCE';

          const statusColor = isOnline
            ? 'var(--accent-teal)'
            : isDraining
            ? '#9333ea'
            : isMaintenance
            ? '#f59e0b'
            : '#ef4444';

          return (
            <div
              key={node.id}
              className="nm-card"
              style={{
                padding: '24px',
                borderRadius: 'var(--radius-lg)',
                display: 'flex',
                flexDirection: 'column',
                gap: '18px',
              }}
            >
              {/* Card Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '12px',
                      background: 'rgba(20, 184, 166, 0.12)',
                      color: 'var(--accent-teal)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Cpu size={22} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>
                      {node.name}
                    </h3>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      {node.hostname || `${node.id}.astoncloud.internal`} • {node.region}
                    </div>
                  </div>
                </div>

                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: 'var(--radius-full)',
                    background: `rgba(${isOnline ? '20, 184, 166' : '239, 68, 68'}, 0.12)`,
                    color: statusColor,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: statusColor,
                    }}
                  />
                  {node.status}
                </span>
              </div>

              {/* Heartbeat & Network line */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: 'var(--bg-sunken)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.76rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Radio size={13} color={isOnline ? 'var(--accent-teal)' : '#ef4444'} />
                  <span>Nhịp đập: <strong>{formatRelativeHeartbeat(node.lastHeartbeat)}</strong></span>
                </div>
                <div style={{ color: 'var(--text-muted)' }}>
                  IP: <strong style={{ color: 'var(--text-main)' }}>{node.ipAddress}</strong> • v{node.agentVersion}
                </div>
              </div>

              {/* Three Tier Resource Allocation Bars */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* CPU */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>CPU Cores</span>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      Đã cấp: <strong style={{ color: 'var(--accent-teal)' }}>{cpuAlloc}</strong> | Trống: <strong style={{ color: 'var(--text-main)' }}>{cpuAvail}</strong> / {cpuTotal}C ({cpuPct}%)
                    </span>
                  </div>
                  <div style={{ height: '6px', background: 'var(--bg-sunken)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${cpuPct}%`, height: '100%', background: 'var(--accent-teal)', borderRadius: '3px' }} />
                  </div>
                </div>

                {/* RAM */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Bộ nhớ RAM</span>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      Đã cấp: <strong style={{ color: '#2563eb' }}>{ramAllocGb}GB</strong> | Trống: <strong style={{ color: 'var(--text-main)' }}>{ramAvailGb}GB</strong> / {ramTotalGb}GB ({ramPct}%)
                    </span>
                  </div>
                  <div style={{ height: '6px', background: 'var(--bg-sunken)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${ramPct}%`, height: '100%', background: '#2563eb', borderRadius: '3px' }} />
                  </div>
                </div>

                {/* Disk */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Ổ đĩa NVMe</span>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      Đã cấp: <strong style={{ color: '#9333ea' }}>{diskAllocGb}GB</strong> | Trống: <strong style={{ color: 'var(--text-main)' }}>{diskAvailGb}GB</strong> / {diskTotalGb}GB ({diskPct}%)
                    </span>
                  </div>
                  <div style={{ height: '6px', background: 'var(--bg-sunken)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${diskPct}%`, height: '100%', background: '#9333ea', borderRadius: '3px' }} />
                  </div>
                </div>
              </div>

              {/* Node Stats Footer */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '12px',
                  borderTop: '1px solid rgba(210, 218, 230, 0.4)',
                  fontSize: '0.78rem',
                  color: 'var(--text-muted)',
                }}
              >
                <div>
                  Đang chạy: <strong style={{ color: 'var(--text-main)' }}>{node.hostCount} hosts</strong>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => onNavigate ? onNavigate(`admin/node-${node.id}`) : (window.location.hash = `#/admin/node-${node.id}`)}
                    className="nm-btn"
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: 'var(--accent-teal)',
                    }}
                  >
                    <Eye size={13} />
                    <span>Chi tiết & Hosts</span>
                  </button>

                  <button
                    onClick={() => handleOpenStatusModal(node)}
                    className="nm-btn"
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '0.78rem',
                      color: 'var(--text-main)',
                    }}
                  >
                    <Sliders size={13} />
                    <span>Đổi trạng thái</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Register Node Modal */}
      {registerModalOpen && (
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Server size={22} color="var(--accent-teal)" />
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  Đăng Ký Worker Node Mới
                </h3>
              </div>
              <button
                onClick={() => setRegisterModalOpen(false)}
                className="nm-btn"
                style={{ padding: '6px', borderRadius: '50%', border: 'none', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              Khai báo thông số phần cứng và địa chỉ mạng của Node máy chủ. Hệ thống sẽ tự động cấp phát <strong>Mã bí mật xác thực Node Agent (One-Time Token)</strong> duy nhất.
            </p>

            <form onSubmit={handleRegisterNode} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                    Mã Node ID *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="node-hcm-01"
                    value={nodeForm.id}
                    onChange={(e) => setNodeForm({ ...nodeForm, id: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-sunken)',
                      border: '1px solid rgba(210, 218, 230, 0.4)',
                      color: 'var(--text-main)',
                      fontSize: '0.84rem',
                      fontFamily: 'monospace',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                    Tên hiển thị *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="HCM Edge Cluster 01"
                    value={nodeForm.name}
                    onChange={(e) => setNodeForm({ ...nodeForm, name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-sunken)',
                      border: '1px solid rgba(210, 218, 230, 0.4)',
                      color: 'var(--text-main)',
                      fontSize: '0.84rem',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                    Hostname FQDN *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="hcm-node-01.astoncloud.internal"
                    value={nodeForm.hostname}
                    onChange={(e) => setNodeForm({ ...nodeForm, hostname: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-sunken)',
                      border: '1px solid rgba(210, 218, 230, 0.4)',
                      color: 'var(--text-main)',
                      fontSize: '0.84rem',
                      fontFamily: 'monospace',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                    Khu vực (Region) *
                  </label>
                  <select
                    value={nodeForm.region}
                    onChange={(e) => setNodeForm({ ...nodeForm, region: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-sunken)',
                      border: '1px solid rgba(210, 218, 230, 0.4)',
                      color: 'var(--text-main)',
                      fontSize: '0.84rem',
                    }}
                  >
                    <option value="Vietnam">Vietnam (Việt Nam)</option>
                    <option value="Singapore">Singapore</option>
                    <option value="Tokyo">Tokyo (Japan)</option>
                    <option value="US-West">US West (California)</option>
                    <option value="US-East">US East (Virginia)</option>
                    <option value="Frankfurt">Frankfurt (Germany)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                    Địa chỉ IP Public *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="103.142.15.45"
                    value={nodeForm.ipAddress}
                    onChange={(e) => setNodeForm({ ...nodeForm, ipAddress: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-sunken)',
                      border: '1px solid rgba(210, 218, 230, 0.4)',
                      color: 'var(--text-main)',
                      fontSize: '0.84rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                    Agent URL
                  </label>
                  <input
                    type="text"
                    placeholder="http://127.0.0.1:5001"
                    value={nodeForm.agentUrl}
                    onChange={(e) => setNodeForm({ ...nodeForm, agentUrl: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-sunken)',
                      border: '1px solid rgba(210, 218, 230, 0.4)',
                      color: 'var(--text-main)',
                      fontSize: '0.84rem',
                      fontFamily: 'monospace',
                    }}
                  />
                </div>
              </div>

              {/* Resource inputs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                    vCPU Cores
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={128}
                    required
                    value={nodeForm.totalCpu}
                    onChange={(e) => setNodeForm({ ...nodeForm, totalCpu: Number(e.target.value) })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-sunken)',
                      border: '1px solid rgba(210, 218, 230, 0.4)',
                      color: 'var(--text-main)',
                      fontSize: '0.84rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                    RAM (MB)
                  </label>
                  <input
                    type="number"
                    min={1024}
                    step={1024}
                    required
                    value={nodeForm.totalRamMb}
                    onChange={(e) => setNodeForm({ ...nodeForm, totalRamMb: Number(e.target.value) })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-sunken)',
                      border: '1px solid rgba(210, 218, 230, 0.4)',
                      color: 'var(--text-main)',
                      fontSize: '0.84rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                    Disk (MB)
                  </label>
                  <input
                    type="number"
                    min={5120}
                    step={5120}
                    required
                    value={nodeForm.totalDiskMb}
                    onChange={(e) => setNodeForm({ ...nodeForm, totalDiskMb: Number(e.target.value) })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-sunken)',
                      border: '1px solid rgba(210, 218, 230, 0.4)',
                      color: 'var(--text-main)',
                      fontSize: '0.84rem',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setRegisterModalOpen(false)}
                  className="nm-btn"
                  style={{ padding: '10px 18px', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer' }}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isRegistering}
                  className="nm-btn"
                  style={{
                    padding: '10px 22px',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    background: 'var(--accent-teal)',
                    color: '#ffffff',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {isRegistering ? 'Đang đăng ký...' : 'Xác nhận Đăng ký'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* One-Time Token Modal */}
      {tokenModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 110,
            padding: '20px',
          }}
        >
          <div
            className="nm-card"
            style={{
              width: '100%',
              maxWidth: '540px',
              padding: '30px',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              borderTop: '4px solid var(--accent-teal)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: 'rgba(20, 184, 166, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-teal)',
                }}
              >
                <ShieldCheck size={26} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  Khóa Bảo Mật Node Agent (One-Time Token)
                </h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Đã đăng ký thành công node: <strong>{registeredNodeName}</strong>
                </div>
              </div>
            </div>

            <div
              style={{
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(239, 68, 68, 0.08)',
                borderLeft: '4px solid #ef4444',
                fontSize: '0.82rem',
                color: 'var(--text-main)',
                lineHeight: 1.5,
              }}
            >
              <strong style={{ color: '#ef4444' }}>LƯU Ý BẢO MẬT QUAN TRỌNG:</strong>
              <br />
              Chuỗi mã token dưới đây chỉ được hiển thị <strong>DUY NHẤT một lần này</strong> và sẽ không thể xem lại vì lý do an ninh. Hãy sao chép và cấu hình ngay vào file môi trường của Node Agent.
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Bearer Secret Token:
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'var(--bg-sunken)',
                  border: '1px solid rgba(210, 218, 230, 0.5)',
                  borderRadius: 'var(--radius-md)',
                  padding: '8px 12px',
                  gap: '8px',
                }}
              >
                <input
                  type="text"
                  readOnly
                  value={generatedToken}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-main)',
                    fontSize: '0.82rem',
                    fontFamily: 'monospace',
                    outline: 'none',
                  }}
                />
                <button
                  onClick={copyTokenToClipboard}
                  className="nm-btn"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    background: tokenCopied ? 'var(--accent-teal)' : 'var(--bg-card)',
                    color: tokenCopied ? '#ffffff' : 'var(--text-main)',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                  }}
                >
                  {tokenCopied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{tokenCopied ? 'Đã chép' : 'Sao chép'}</span>
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button
                onClick={() => setTokenModalOpen(false)}
                className="nm-btn"
                style={{
                  padding: '10px 22px',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: 'var(--accent-teal)',
                  color: '#ffffff',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Tôi đã sao chép an toàn & Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Node Status Modal */}
      {statusModalOpen && selectedNode && (
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
              maxWidth: '480px',
              padding: '28px',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Chuyển Trạng Thái Node
              </h3>
              <button
                onClick={() => setStatusModalOpen(false)}
                className="nm-btn"
                style={{ padding: '6px', borderRadius: '50%', border: 'none', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
              Điều chỉnh trạng thái hoạt động cho <strong>{selectedNode.name}</strong> ({selectedNode.id}):
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { id: 'ONLINE', label: 'ONLINE — Sẵn sàng tiếp nhận & duy trì containers', desc: 'Chỉ khả dụng khi Node Agent đang gửi heartbeat hợp lệ.' },
                { id: 'MAINTENANCE', label: 'MAINTENANCE — Tạm ngưng điều phối mới để bảo trì', desc: 'Không cấp phát host mới lên node này.' },
                { id: 'DRAINING', label: 'DRAINING — Đang rút tải sang nodes khác', desc: 'Chuẩn bị ngừng hoạt động node an toàn.' },
                { id: 'OFFLINE', label: 'OFFLINE — Đang tắt hoặc mất kết nối', desc: 'Tạm ngưng tất cả thao tác điều khiển hạ tầng container.' },
              ].map((opt) => (
                <label
                  key={opt.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: targetStatus === opt.id ? 'var(--bg-sunken)' : 'transparent',
                    border: targetStatus === opt.id ? '1px solid var(--accent-teal)' : '1px solid transparent',
                    cursor: 'pointer',
                    fontSize: '0.84rem',
                    color: 'var(--text-main)',
                  }}
                >
                  <input
                    type="radio"
                    name="nodeStatus"
                    value={opt.id}
                    checked={targetStatus === opt.id}
                    onChange={(e) => setTargetStatus(e.target.value)}
                    style={{ marginTop: '3px' }}
                  />
                  <div>
                    <div style={{ fontWeight: 600 }}>{opt.label}</div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
              <button
                onClick={() => setStatusModalOpen(false)}
                className="nm-btn"
                style={{ padding: '10px 18px', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer' }}
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleUpdateStatus}
                disabled={isUpdating}
                className="nm-btn"
                style={{
                  padding: '10px 20px',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: 'var(--accent-teal)',
                  color: '#ffffff',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {isUpdating ? 'Đang lưu...' : 'Lưu trạng thái'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
