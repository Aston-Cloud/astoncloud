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
} from 'lucide-react';
import { AdminNode } from '../../types';
import { useAppState } from '../../context/AppStateContext';
import { useToast } from '../../context/ToastContext';

export const AdminNodesPage: React.FC = () => {
  const { authToken } = useAppState();
  const { showToast } = useToast();

  const [nodes, setNodes] = useState<AdminNode[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [statusModalOpen, setStatusModalOpen] = useState<boolean>(false);
  const [selectedNode, setSelectedNode] = useState<AdminNode | null>(null);
  const [targetStatus, setTargetStatus] = useState<string>('ONLINE');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

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
            cpuTotalCores: n.totalCpu || n.cpuTotalCores || 16,
            cpuUsedCores: n.cpuUsedCores ?? (n.totalCpu ? n.totalCpu - (n.availableCpu ?? n.totalCpu) : 0),
            ramTotalMb: n.totalRam || n.ramTotalMb || 32768,
            ramUsedMb: n.ramUsedMb ?? (n.totalRam ? n.totalRam - (n.availableRam ?? n.totalRam) : 0),
            diskTotalGb: n.diskTotalGb ?? Math.round((n.totalDisk || 1048576) / 1024),
            diskUsedGb: n.diskUsedGb ?? Math.round(((n.totalDisk || 1048576) - (n.availableDisk ?? n.totalDisk ?? 1048576)) / 1024),
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
          message: data.message || 'Lỗi xử lý',
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
              CLUSTER ORCHESTRATION
            </span>
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', margin: '6px 0 2px 0' }}>
            Quản Trị Cụm Nodes Hạ Tầng
          </h1>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Theo dõi dung lượng CPU, RAM, Disk và điều phối trạng thái bảo trì của các Worker Nodes.
          </p>
        </div>

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

      {/* Mock Infrastructure Notice Banner */}
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
            <strong>Môi trường giả lập Mock Node Agent:</strong> Hệ thống hiện đang chạy chế độ Mock Node Agent độc lập và an toàn, sẵn sàng kết nối Node Agent thực tế khi triển khai cụm VPS trong tương lai.
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
          MOCK MODE: ACTIVE
        </span>
      </div>

      {/* Nodes Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '24px',
        }}
      >
        {nodes.map((node) => {
          const cpuPct = Math.round(((node.cpuUsedCores || 0) / (node.cpuTotalCores || 1)) * 100);
          const ramPct = Math.round(((node.ramUsedMb || 0) / (node.ramTotalMb || 1)) * 100);
          const diskPct = Math.round(((node.diskUsedGb || 0) / (node.diskTotalGb || 1)) * 100);
          const isOnline = node.status === 'ONLINE';

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
                      IP: {node.ipAddress} • {node.region}
                    </div>
                  </div>
                </div>

                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: 'var(--radius-full)',
                    background: isOnline ? 'rgba(20, 184, 166, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                    color: isOnline ? 'var(--accent-teal)' : '#f59e0b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: isOnline ? 'var(--accent-teal)' : '#f59e0b',
                    }}
                  />
                  {node.status}
                </span>
              </div>

              {/* Resource Bars */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* CPU */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>CPU Cores</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                      {node.cpuUsedCores} / {node.cpuTotalCores} Cores ({cpuPct}%)
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
                    <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                      {Math.round((node.ramUsedMb || 0) / 1024)}GB / {Math.round((node.ramTotalMb || 0) / 1024)}GB ({ramPct}%)
                    </span>
                  </div>
                  <div style={{ height: '6px', background: 'var(--bg-sunken)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${ramPct}%`, height: '100%', background: '#2563eb', borderRadius: '3px' }} />
                  </div>
                </div>

                {/* Disk */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Dung lượng Ổ đĩa</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                      {node.diskUsedGb}GB / {node.diskTotalGb}GB ({diskPct}%)
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
                  Máy chủ quản lý: <strong style={{ color: 'var(--text-main)' }}>{node.hostCount} hosts</strong>
                </div>
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
                    gap: '6px',
                    fontSize: '0.78rem',
                    color: 'var(--text-main)',
                  }}
                >
                  <Sliders size={13} />
                  <span>Đổi trạng thái</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

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
                { id: 'ONLINE', label: 'ONLINE — Sẵn sàng tiếp nhận & duy trì containers', color: 'var(--accent-teal)' },
                { id: 'MAINTENANCE', label: 'MAINTENANCE — Tạm ngưng điều phối mới để bảo trì', color: '#f59e0b' },
                { id: 'DRAINING', label: 'DRAINING — Đang rút tải sang nodes khác', color: '#9333ea' },
                { id: 'OFFLINE', label: 'OFFLINE — Đang tắt hoặc mất kết nối', color: '#ef4444' },
              ].map((opt) => (
                <label
                  key={opt.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
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
                  />
                  <span>{opt.label}</span>
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
