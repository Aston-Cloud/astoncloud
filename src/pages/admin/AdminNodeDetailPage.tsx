import React, { useState, useEffect } from 'react';
import {
  Server,
  Cpu,
  HardDrive,
  Activity,
  ArrowLeft,
  RefreshCw,
  Sliders,
  CheckCircle,
  AlertTriangle,
  Clock,
  Shield,
  ExternalLink,
  Terminal,
  Globe,
  Radio,
  Layers,
  X,
} from 'lucide-react';
import { AdminNode } from '../../types';
import { useAppState } from '../../context/AppStateContext';
import { useToast } from '../../context/ToastContext';

interface AdminNodeDetailPageProps {
  nodeId: string;
  onNavigate?: (route: string) => void;
}

interface AssignedHost {
  id: string;
  name: string;
  slug: string;
  userId: string;
  runtime: string;
  runtimeVersion: string;
  planId: string;
  status: string;
  port: number;
  cpuLimit: number;
  memoryLimit: number;
  diskLimit: number;
  createdAt: string;
}

export const AdminNodeDetailPage: React.FC<AdminNodeDetailPageProps> = ({ nodeId, onNavigate }) => {
  const { authToken } = useAppState();
  const { showToast } = useToast();

  const [node, setNode] = useState<AdminNode | null>(null);
  const [hosts, setHosts] = useState<AssignedHost[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'hosts' | 'resources' | 'security'>('overview');

  // Status modal state
  const [statusModalOpen, setStatusModalOpen] = useState<boolean>(false);
  const [targetStatus, setTargetStatus] = useState<string>('ONLINE');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  const fetchNodeDetails = async () => {
    if (!authToken || !nodeId) return;
    try {
      setIsLoading(true);
      const res = await fetch(`/api/v1/admin/nodes/${nodeId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.success && data.data) {
        const rawNode = data.data.node;
        setNode({
          ...rawNode,
          cpuTotalCores: rawNode.totalCpu || 16,
          cpuUsedCores: rawNode.allocatedCpu || 0,
          ramTotalMb: rawNode.totalRam || 32768,
          ramUsedMb: rawNode.allocatedRam || 0,
          diskTotalGb: Math.round((rawNode.totalDisk || 1048576) / 1024),
          diskUsedGb: Math.round((rawNode.allocatedDisk || 0) / 1024),
        });
        setHosts(data.data.hosts || []);
        setTargetStatus(rawNode.status);
      } else {
        showToast({
          title: 'Lỗi',
          message: data.message || 'Không thể tìm thấy thông tin Node',
          type: 'alert',
        });
      }
    } catch (err: any) {
      showToast({
        title: 'Lỗi',
        message: err.message || 'Có lỗi khi tải thông tin Node',
        type: 'alert',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNodeDetails();
  }, [nodeId, authToken]);

  const handleUpdateStatus = async () => {
    if (!node || !authToken) return;
    try {
      setIsUpdating(true);
      const res = await fetch(`/api/v1/admin/nodes/${node.id}/status`, {
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
          title: 'Cập nhật thành công',
          message: `Node ${node.name} đã chuyển sang trạng thái ${targetStatus}`,
          type: 'success',
        });
        setStatusModalOpen(false);
        fetchNodeDetails();
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

  const formatRelativeTime = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'Chưa từng ghi nhận';
    const date = new Date(dateStr);
    const diffMs = Date.now() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 15) return 'Vừa xong';
    if (diffSec < 60) return `${diffSec} giây trước`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} phút trước`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour} giờ trước`;
    return date.toLocaleDateString('vi-VN');
  };

  if (isLoading && !node) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
        <RefreshCw size={28} className="animate-spin" color="var(--accent-teal)" />
        <span style={{ marginLeft: '12px', fontSize: '0.92rem', color: 'var(--text-secondary)' }}>
          Đang tải dữ liệu node hạ tầng...
        </span>
      </div>
    );
  }

  if (!node) {
    return (
      <div className="nm-card" style={{ padding: '36px', textAlign: 'center', borderRadius: 'var(--radius-lg)' }}>
        <AlertTriangle size={48} color="#ef4444" style={{ margin: '0 auto 16px auto' }} />
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>Không tìm thấy Node</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: '8px 0 20px 0' }}>
          Node với mã định danh "{nodeId}" không tồn tại hoặc đã bị gỡ bỏ khỏi cụm.
        </p>
        <button
          onClick={() => onNavigate ? onNavigate('admin/nodes') : (window.location.hash = '#/admin/nodes')}
          className="nm-btn"
          style={{ padding: '10px 20px', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer', fontWeight: 600 }}
        >
          Quay lại danh sách Nodes
        </button>
      </div>
    );
  }

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

  const cpuPct = Math.round(((node.allocatedCpu || 0) / (node.totalCpu || 1)) * 100);
  const ramPct = Math.round(((node.allocatedRam || 0) / (node.totalRam || 1)) * 100);
  const diskPct = Math.round(((node.allocatedDisk || 0) / (node.totalDisk || 1)) * 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Breadcrumb & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => onNavigate ? onNavigate('admin/nodes') : (window.location.hash = '#/admin/nodes')}
            className="nm-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '38px',
              height: '38px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-main)',
            }}
            title="Quay lại danh sách"
          >
            <ArrowLeft size={18} />
          </button>
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
                NODE TELEMETRY & WORKER
              </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>ID: {node.id}</span>
            </div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main)', margin: '4px 0 0 0' }}>
              {node.name}
            </h1>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={fetchNodeDetails}
            className="nm-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.84rem',
              fontWeight: 600,
            }}
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Làm mới</span>
          </button>

          <button
            onClick={() => setStatusModalOpen(true)}
            className="nm-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.84rem',
              fontWeight: 700,
              background: 'var(--accent-teal)',
              color: '#ffffff',
            }}
          >
            <Sliders size={14} />
            <span>Đổi trạng thái</span>
          </button>
        </div>
      </div>

      {/* Node Status & Key Info Card */}
      <div
        className="nm-card"
        style={{
          padding: '24px',
          borderRadius: 'var(--radius-lg)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
        }}
      >
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>TRẠNG THÁI HOẠT ĐỘNG</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.82rem',
                fontWeight: 800,
                background: `rgba(${isOnline ? '20, 184, 166' : '239, 68, 68'}, 0.12)`,
                color: statusColor,
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: statusColor,
                }}
              />
              {node.status}
            </span>
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>KHU VỰC / VÙNG (REGION)</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: 'var(--text-main)' }}>
            <Globe size={16} color="var(--accent-teal)" />
            <span>{node.region}</span>
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>IP: {node.ipAddress}</div>
        </div>

        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>NHỊP ĐẬP AGENT (HEARTBEAT)</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: 'var(--text-main)' }}>
            <Radio size={16} color={isOnline ? 'var(--accent-teal)' : '#ef4444'} />
            <span>{formatRelativeTime(node.lastHeartbeat)}</span>
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Phiên bản: {node.agentVersion}</div>
        </div>

        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>TỔNG MÁY CHỦ QUẢN LÝ</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-main)' }}>
            <Layers size={20} color="var(--accent-teal)" />
            <span>{hosts.length} Hosts</span>
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Môi trường: {node.isMock ? 'Mock Node' : 'Physical VPS'}</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(210, 218, 230, 0.4)', gap: '8px' }}>
        {[
          { id: 'overview', label: 'Tổng quan (Overview)', icon: Activity },
          { id: 'hosts', label: `Máy chủ đang chạy (${hosts.length})`, icon: Server },
          { id: 'resources', label: 'Phân bổ Tài nguyên', icon: Cpu },
          { id: 'security', label: 'Kết nối & Bảo mật', icon: Shield },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 18px',
                background: 'transparent',
                border: 'none',
                borderBottom: isActive ? '3px solid var(--accent-teal)' : '3px solid transparent',
                color: isActive ? 'var(--accent-teal)' : 'var(--text-secondary)',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.88rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
          {/* Card: Hostname & Specs */}
          <div className="nm-card" style={{ padding: '24px', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>
              Thông Số Hạ Tầng Node
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.86rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px dashed rgba(210, 218, 230, 0.4)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Hostname (FQDN):</span>
                <strong style={{ color: 'var(--text-main)', fontFamily: 'monospace' }}>{node.hostname || `${node.id}.astoncloud.internal`}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px dashed rgba(210, 218, 230, 0.4)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Địa chỉ IP Public:</span>
                <strong style={{ color: 'var(--text-main)' }}>{node.ipAddress}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px dashed rgba(210, 218, 230, 0.4)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>URL Điều khiển Node Agent:</span>
                <strong style={{ color: 'var(--text-main)', fontFamily: 'monospace' }}>{node.agentUrl || 'http://127.0.0.1:5001'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px dashed rgba(210, 218, 230, 0.4)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Ngày khởi tạo:</span>
                <span style={{ color: 'var(--text-main)' }}>{node.createdAt ? new Date(node.createdAt).toLocaleString('vi-VN') : 'Mặc định ban đầu'}</span>
              </div>
            </div>
          </div>

          {/* Card: Resource Capacity */}
          <div className="nm-card" style={{ padding: '24px', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>
              Công Suất Phần Cứng Cung Ứng
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                  <span>vCPU Cores</span>
                  <strong>{node.allocatedCpu} / {node.totalCpu} Cores ({cpuPct}%)</strong>
                </div>
                <div style={{ height: '8px', background: 'var(--bg-sunken)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${cpuPct}%`, height: '100%', background: 'var(--accent-teal)', borderRadius: '4px' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                  <span>Bộ nhớ RAM</span>
                  <strong>{(node.allocatedRam / 1024).toFixed(1)} GB / {(node.totalRam / 1024).toFixed(1)} GB ({ramPct}%)</strong>
                </div>
                <div style={{ height: '8px', background: 'var(--bg-sunken)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${ramPct}%`, height: '100%', background: '#2563eb', borderRadius: '4px' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                  <span>Dung lượng Ổ đĩa NVMe</span>
                  <strong>{(node.allocatedDisk / 1024).toFixed(1)} GB / {(node.totalDisk / 1024).toFixed(1)} GB ({diskPct}%)</strong>
                </div>
                <div style={{ height: '8px', background: 'var(--bg-sunken)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${diskPct}%`, height: '100%', background: '#9333ea', borderRadius: '4px' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Assigned Hosts */}
      {activeTab === 'hosts' && (
        <div className="nm-card" style={{ padding: '24px', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>
              Danh Sách Máy Chủ Khách Hàng Trên Node ({hosts.length})
            </h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Tất cả các container được định tuyến và thực thi độc lập trên Worker Node này.
            </span>
          </div>

          {hosts.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              Chưa có máy chủ ảo nào được lập lịch trên Node này. Node đang ở trạng thái rảnh rỗi và sẵn sàng tiếp nhận yêu cầu cấp phát mới.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(210, 218, 230, 0.4)', textAlign: 'left' }}>
                    <th style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>MÁY CHỦ</th>
                    <th style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>RUNTIME</th>
                    <th style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>GÓI CƯỚC</th>
                    <th style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>CỔNG PORT</th>
                    <th style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>TRẠNG THÁI</th>
                    <th style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>NGÀY TẠO</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-secondary)' }}>THAO TÁC</th>
                  </tr>
                </thead>
                <tbody>
                  {hosts.map((h) => {
                    const isRunning = h.status === 'RUNNING';
                    return (
                      <tr key={h.id} style={{ borderBottom: '1px solid rgba(210, 218, 230, 0.2)' }}>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{h.name}</div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{h.slug}</div>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>
                            {h.runtime} {h.runtimeVersion}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ textTransform: 'uppercase', fontSize: '0.78rem', fontWeight: 700 }}>
                            {h.planId}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', fontFamily: 'monospace' }}>
                          :{h.port}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-full)',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              background: isRunning ? 'rgba(20, 184, 166, 0.12)' : 'rgba(100, 116, 139, 0.12)',
                              color: isRunning ? 'var(--accent-teal)' : '#64748b',
                            }}
                          >
                            {h.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {new Date(h.createdAt).toLocaleDateString('vi-VN')}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          <button
                            onClick={() => onNavigate ? onNavigate(`host-${h.id}`) : (window.location.hash = `#/host-${h.id}`)}
                            className="nm-btn"
                            style={{
                              padding: '6px 10px',
                              borderRadius: '6px',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.76rem',
                              fontWeight: 600,
                            }}
                          >
                            <ExternalLink size={12} />
                            <span>Xem</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Resources */}
      {activeTab === 'resources' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="nm-card" style={{ padding: '24px', borderRadius: 'var(--radius-lg)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>
              Phân Tích Chi Tiết Quản Lý Tài Nguyên Độc Lập
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              {/* CPU Box */}
              <div style={{ padding: '16px', background: 'var(--bg-sunken)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Cpu size={18} color="var(--accent-teal)" />
                  <strong style={{ color: 'var(--text-main)' }}>Xử lý vCPU Cores</strong>
                </div>
                <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                  Đã phân bổ cho hosts: <strong>{node.allocatedCpu} Cores</strong>
                  <br />
                  Công suất còn trống khả dụng: <strong>{node.availableCpu} Cores</strong>
                  <br />
                  Tổng tài nguyên phần cứng: <strong>{node.totalCpu} Cores</strong>
                </div>
                <div style={{ height: '8px', background: 'rgba(0,0,0,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${cpuPct}%`, height: '100%', background: 'var(--accent-teal)' }} />
                </div>
              </div>

              {/* RAM Box */}
              <div style={{ padding: '16px', background: 'var(--bg-sunken)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Server size={18} color="#2563eb" />
                  <strong style={{ color: 'var(--text-main)' }}>Bộ nhớ RAM (MB / GB)</strong>
                </div>
                <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                  Đã phân bổ cho hosts: <strong>{Math.round(node.allocatedRam / 1024)} GB</strong> ({node.allocatedRam} MB)
                  <br />
                  Dung lượng RAM khả dụng: <strong>{Math.round(node.availableRam / 1024)} GB</strong> ({node.availableRam} MB)
                  <br />
                  Tổng dung lượng RAM: <strong>{Math.round(node.totalRam / 1024)} GB</strong> ({node.totalRam} MB)
                </div>
                <div style={{ height: '8px', background: 'rgba(0,0,0,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${ramPct}%`, height: '100%', background: '#2563eb' }} />
                </div>
              </div>

              {/* Disk Box */}
              <div style={{ padding: '16px', background: 'var(--bg-sunken)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <HardDrive size={18} color="#9333ea" />
                  <strong style={{ color: 'var(--text-main)' }}>Dung lượng Ổ đĩa (NVMe SSD)</strong>
                </div>
                <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                  Đã cấp phát cho máy chủ: <strong>{Math.round(node.allocatedDisk / 1024)} GB</strong>
                  <br />
                  Dung lượng lưu trữ trống: <strong>{Math.round(node.availableDisk / 1024)} GB</strong>
                  <br />
                  Tổng công suất lưu trữ: <strong>{Math.round(node.totalDisk / 1024)} GB</strong>
                </div>
                <div style={{ height: '8px', background: 'rgba(0,0,0,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${diskPct}%`, height: '100%', background: '#9333ea' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Security & Connection Guide */}
      {activeTab === 'security' && (
        <div className="nm-card" style={{ padding: '24px', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>
            Giao Thức Bảo Mật & Kết Nối Node Agent (M2M)
          </h3>

          <div style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Hệ thống Aston Cloud hỗ trợ kiến trúc phân tán đa node. Mỗi Worker Node chạy một tiến trình <strong>Aston Node Agent</strong> độc lập để thực thi và quản lý vòng đời container.
          </div>

          <div style={{ background: 'var(--bg-sunken)', padding: '16px', borderRadius: 'var(--radius-md)', fontFamily: 'monospace', fontSize: '0.82rem' }}>
            <div style={{ color: 'var(--text-muted)', marginBottom: '6px' }}># 1. Cấu hình biến môi trường trên máy chủ Worker Node:</div>
            <div>ASTON_NODE_ID={node.id}</div>
            <div>ASTON_CONTROL_PLANE_URL=http://your-control-plane:4000</div>
            <div>ASTON_NODE_AGENT_TOKEN=&lt;YOUR_ONE_TIME_GENERATED_SECRET_TOKEN&gt;</div>
            <div style={{ marginTop: '8px', color: 'var(--text-muted)' }}># 2. Khởi chạy Node Agent daemon:</div>
            <div>systemctl start aston-node-agent</div>
          </div>

          <div
            style={{
              padding: '14px 18px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(20, 184, 166, 0.08)',
              borderLeft: '4px solid var(--accent-teal)',
              fontSize: '0.84rem',
              color: 'var(--text-main)',
            }}
          >
            <strong>Cơ chế tự động phục hồi an toàn:</strong> Khi máy chủ cụm gửi nhịp đập <code>POST /api/v1/node-agent/heartbeat</code> kèm Bearer token hợp lệ, Control Plane sẽ tự động chuyển trạng thái của Node từ <code>OFFLINE</code> sang <code>ONLINE</code> và bắt đầu điều phối các máy chủ mới lên node này.
          </div>
        </div>
      )}

      {/* Node Status Modal */}
      {statusModalOpen && (
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
              Điều chỉnh trạng thái hoạt động cho <strong>{node.name}</strong> ({node.id}):
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
