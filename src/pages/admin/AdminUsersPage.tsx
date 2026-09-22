import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  Shield,
  ShieldAlert,
  UserCheck,
  UserX,
  RefreshCw,
  MoreVertical,
  X,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { AdminUser } from '../../types';
import { useAppState } from '../../context/AppStateContext';
import { useToast } from '../../context/ToastContext';

export const AdminUsersPage: React.FC = () => {
  const { authToken, userProfile } = useAppState();
  const { showToast } = useToast();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);

  // Modals state
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState<boolean>(false);
  const [statusModalOpen, setStatusModalOpen] = useState<boolean>(false);
  const [roleModalOpen, setRoleModalOpen] = useState<boolean>(false);
  const [targetStatus, setTargetStatus] = useState<'ACTIVE' | 'SUSPENDED' | 'DISABLED'>('SUSPENDED');
  const [statusReason, setStatusReason] = useState<string>('');
  const [targetRole, setTargetRole] = useState<'USER' | 'ADMIN'>('USER');

  const fetchUsers = async () => {
    if (!authToken) return;
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '10');
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (roleFilter) params.append('role', roleFilter);

      const res = await fetch(`/api/v1/admin/users?${params.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.success && data.data) {
        const userList = Array.isArray(data.data) ? data.data : (data.data.users || []);
        const totalCount = data.meta?.pagination?.total || data.data?.total || userList.length;
        setUsers(
          userList.map((u: any) => ({
            ...u,
            name: u.name || u.displayName || u.username || 'Người dùng',
          }))
        );
        setTotal(totalCount);
      }
    } catch (err: any) {
      showToast({
        title: 'Lỗi tải danh sách người dùng',
        message: err.message || 'Không thể kết nối máy chủ',
        type: 'alert',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, statusFilter, roleFilter, authToken]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleOpenDetail = async (user: AdminUser) => {
    try {
      const res = await fetch(`/api/v1/admin/users/${user.id}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.success && data.data?.user) {
        setSelectedUser(data.data.user);
      } else {
        setSelectedUser(user);
      }
      setDetailModalOpen(true);
    } catch {
      setSelectedUser(user);
      setDetailModalOpen(true);
    }
  };

  const handleOpenStatusModal = (user: AdminUser, newStatus: 'ACTIVE' | 'SUSPENDED' | 'DISABLED') => {
    if (user.id === userProfile.id && newStatus !== 'ACTIVE') {
      showToast({
        title: 'Thao tác không được phép',
        message: 'Bạn không thể tự khóa tài khoản quản trị viên của chính mình.',
        type: 'warning',
      });
      return;
    }
    setSelectedUser(user);
    setTargetStatus(newStatus);
    setStatusReason(newStatus === 'ACTIVE' ? 'Admin mở khóa tài khoản' : 'Vi phạm điều khoản hoặc nghi ngờ bất thường');
    setStatusModalOpen(true);
  };

  const handleConfirmStatus = async () => {
    if (!selectedUser || !authToken) return;
    try {
      setIsActionLoading(true);
      const res = await fetch(`/api/v1/admin/users/${selectedUser.id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          status: targetStatus,
          reason: statusReason,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast({
          title: 'Cập nhật trạng thái thành công',
          message: `Đã đổi trạng thái tài khoản ${selectedUser.email} thành ${targetStatus}`,
          type: 'success',
        });
        setStatusModalOpen(false);
        fetchUsers();
      } else {
        showToast({
          title: 'Thao tác thất bại',
          message: data.message || 'Không thể cập nhật trạng thái',
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
      setIsActionLoading(false);
    }
  };

  const handleOpenRoleModal = (user: AdminUser) => {
    if (user.id === userProfile.id) {
      showToast({
        title: 'Thao tác không được phép',
        message: 'Bạn không thể tự thay đổi vai trò của chính mình.',
        type: 'warning',
      });
      return;
    }
    setSelectedUser(user);
    setTargetRole(user.role === 'ADMIN' ? 'USER' : 'ADMIN');
    setRoleModalOpen(true);
  };

  const handleConfirmRole = async () => {
    if (!selectedUser || !authToken) return;
    try {
      setIsActionLoading(true);
      const res = await fetch(`/api/v1/admin/users/${selectedUser.id}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          role: targetRole,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast({
          title: 'Đổi vai trò thành công',
          message: `Đã cấp quyền ${targetRole} cho tài khoản ${selectedUser.email}`,
          type: 'success',
        });
        setRoleModalOpen(false);
        fetchUsers();
      } else {
        showToast({
          title: 'Thao tác thất bại',
          message: data.message || 'Không thể đổi vai trò',
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
      setIsActionLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                color: '#e11d48',
                background: 'rgba(225, 29, 72, 0.1)',
                padding: '2px 8px',
                borderRadius: '4px',
              }}
            >
              USER CONTROL
            </span>
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', margin: '6px 0 2px 0' }}>
            Quản Lý Người Dùng Hệ Thống
          </h1>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Xem danh sách, kiểm soát trạng thái hoạt động và phân quyền quản trị an toàn.
          </p>
        </div>

        <button
          onClick={() => fetchUsers()}
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

      {/* Filter and Search Bar */}
      <div
        className="nm-card"
        style={{
          padding: '16px 20px',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '240px' }}>
          <div
            className="nm-inset"
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '8px 14px',
              borderRadius: 'var(--radius-md)',
              width: '100%',
              maxWidth: '380px',
              gap: '10px',
            }}
          >
            <Search size={16} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Tìm theo email hoặc tên hiển thị..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '0.86rem',
                color: 'var(--text-main)',
                width: '100%',
              }}
            />
          </div>
          <button
            type="submit"
            className="nm-btn"
            style={{
              padding: '9px 16px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.84rem',
              cursor: 'pointer',
            }}
          >
            Tìm
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="nm-inset"
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              fontSize: '0.84rem',
              color: 'var(--text-main)',
              background: 'var(--bg-sunken)',
              outline: 'none',
            }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="ACTIVE">Hoạt động (ACTIVE)</option>
            <option value="SUSPENDED">Tạm khóa (SUSPENDED)</option>
            <option value="DISABLED">Vô hiệu hóa (DISABLED)</option>
          </select>

          {/* Role filter */}
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="nm-inset"
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              fontSize: '0.84rem',
              color: 'var(--text-main)',
              background: 'var(--bg-sunken)',
              outline: 'none',
            }}
          >
            <option value="">Tất cả vai trò</option>
            <option value="USER">Người dùng (USER)</option>
            <option value="ADMIN">Quản trị viên (ADMIN)</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div
        className="nm-card"
        style={{
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          padding: '4px',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-sunken)', borderBottom: '1px solid rgba(210, 218, 230, 0.5)' }}>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)' }}>Tài khoản</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)' }}>Vai trò</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)' }}>Trạng thái</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)' }}>Số Host</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)' }}>Ngày đăng ký</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    {isLoading ? 'Đang tải danh sách người dùng...' : 'Không tìm thấy người dùng nào phù hợp.'}
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isCurrent = u.id === userProfile.id;
                  const isActive = u.status === 'ACTIVE';
                  const isSuspended = u.status === 'SUSPENDED';

                  return (
                    <tr
                      key={u.id}
                      style={{
                        borderBottom: '1px solid rgba(210, 218, 230, 0.3)',
                        transition: 'background 0.2s ease',
                      }}
                    >
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '50%',
                              background: u.role === 'ADMIN' ? 'rgba(225, 29, 72, 0.15)' : 'rgba(37, 99, 235, 0.12)',
                              color: u.role === 'ADMIN' ? '#e11d48' : '#2563eb',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '0.84rem',
                            }}
                          >
                            {(u.name || u.email || 'U')[0].toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                              {u.name || 'Người dùng'} {isCurrent && <span style={{ color: '#2563eb', fontSize: '0.72rem' }}>(Bạn)</span>}
                            </div>
                            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>{u.email}</div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: u.role === 'ADMIN' ? 'rgba(225, 29, 72, 0.12)' : 'rgba(100, 116, 139, 0.12)',
                            color: u.role === 'ADMIN' ? '#e11d48' : 'var(--text-secondary)',
                          }}
                        >
                          {u.role}
                        </span>
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: 'var(--radius-full)',
                            background: isActive
                              ? 'rgba(20, 184, 166, 0.12)'
                              : isSuspended
                              ? 'rgba(239, 68, 68, 0.12)'
                              : 'rgba(100, 116, 139, 0.12)',
                            color: isActive ? 'var(--accent-teal)' : isSuspended ? '#ef4444' : 'var(--text-muted)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: isActive ? 'var(--accent-teal)' : isSuspended ? '#ef4444' : 'var(--text-muted)',
                            }}
                          />
                          {u.status}
                        </span>
                      </td>

                      <td style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--text-main)' }}>
                        {u.hostCount ?? 0} máy chủ
                      </td>

                      <td style={{ padding: '14px 18px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {new Date(u.createdAt).toLocaleDateString('vi-VN')}
                      </td>

                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            onClick={() => handleOpenDetail(u)}
                            className="nm-btn"
                            style={{
                              padding: '6px 10px',
                              borderRadius: '6px',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.78rem',
                              color: 'var(--text-main)',
                            }}
                            title="Xem chi tiết người dùng"
                          >
                            <Eye size={14} /> Chi tiết
                          </button>

                          {/* Lock / Unlock button */}
                          {isActive ? (
                            <button
                              onClick={() => handleOpenStatusModal(u, 'SUSPENDED')}
                              disabled={isCurrent}
                              className="nm-btn"
                              style={{
                                padding: '6px 10px',
                                borderRadius: '6px',
                                border: 'none',
                                cursor: isCurrent ? 'not-allowed' : 'pointer',
                                opacity: isCurrent ? 0.5 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.78rem',
                                color: '#ef4444',
                              }}
                              title="Tạm khóa tài khoản an toàn"
                            >
                              <UserX size={14} /> Khóa
                            </button>
                          ) : (
                            <button
                              onClick={() => handleOpenStatusModal(u, 'ACTIVE')}
                              className="nm-btn"
                              style={{
                                padding: '6px 10px',
                                borderRadius: '6px',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.78rem',
                                color: 'var(--accent-teal)',
                              }}
                              title="Mở khóa tài khoản"
                            >
                              <UserCheck size={14} /> Mở khóa
                            </button>
                          )}

                          {/* Change Role Button */}
                          <button
                            onClick={() => handleOpenRoleModal(u)}
                            disabled={isCurrent}
                            className="nm-btn"
                            style={{
                              padding: '6px 10px',
                              borderRadius: '6px',
                              border: 'none',
                              cursor: isCurrent ? 'not-allowed' : 'pointer',
                              opacity: isCurrent ? 0.5 : 1,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.78rem',
                              color: u.role === 'ADMIN' ? 'var(--text-secondary)' : '#9333ea',
                            }}
                            title="Đổi vai trò USER / ADMIN"
                          >
                            <Shield size={14} /> {u.role === 'ADMIN' ? 'Hạ quyền' : 'Lên Admin'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        {total > 10 && (
          <div
            style={{
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: '1px solid rgba(210, 218, 230, 0.4)',
              fontSize: '0.84rem',
              color: 'var(--text-secondary)',
            }}
          >
            <div>Tổng số: {total} người dùng</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="nm-btn"
                style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
              >
                Trước
              </button>
              <span style={{ display: 'flex', alignItems: 'center', padding: '0 8px', fontWeight: 600 }}>
                Trang {page}
              </span>
              <button
                disabled={page * 10 >= total}
                onClick={() => setPage(page + 1)}
                className="nm-btn"
                style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User Detail Modal */}
      {detailModalOpen && selectedUser && (
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
              gap: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Chi Tiết Người Dùng
              </h3>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="nm-btn"
                style={{ padding: '6px', borderRadius: '50%', border: 'none', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.88rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid rgba(210,218,230,0.3)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Mã ID:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-main)', fontFamily: 'monospace' }}>{selectedUser.id}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid rgba(210,218,230,0.3)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Email:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{selectedUser.email}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid rgba(210,218,230,0.3)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Tên hiển thị:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{selectedUser.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid rgba(210,218,230,0.3)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Vai trò:</span>
                <span style={{ fontWeight: 700, color: selectedUser.role === 'ADMIN' ? '#e11d48' : '#2563eb' }}>{selectedUser.role}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid rgba(210,218,230,0.3)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Trạng thái tài khoản:</span>
                <span style={{ fontWeight: 700, color: selectedUser.status === 'ACTIVE' ? 'var(--accent-teal)' : '#ef4444' }}>{selectedUser.status}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid rgba(210,218,230,0.3)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Số máy chủ sở hữu:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{selectedUser.hostCount ?? 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid rgba(210,218,230,0.3)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Ngày tạo tài khoản:</span>
                <span style={{ color: 'var(--text-main)' }}>{new Date(selectedUser.createdAt).toLocaleString('vi-VN')}</span>
              </div>
            </div>

            <div
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(37, 99, 235, 0.06)',
                border: '1px solid rgba(37, 99, 235, 0.15)',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
              }}
            >
              🔒 Thông tin nhạy cảm như <strong>password_hash</strong> và <strong>secrets</strong> được bảo mật an toàn và không bao giờ xuất hiện ở API quản trị.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="nm-btn"
                style={{
                  padding: '10px 20px',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lock / Unlock Confirmation Modal */}
      {statusModalOpen && selectedUser && (
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
              maxWidth: '500px',
              padding: '28px',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: targetStatus === 'ACTIVE' ? 'rgba(20, 184, 166, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: targetStatus === 'ACTIVE' ? 'var(--accent-teal)' : '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {targetStatus === 'ACTIVE' ? <UserCheck size={22} /> : <UserX size={22} />}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  {targetStatus === 'ACTIVE' ? 'Mở Khóa Tài Khoản' : 'Khóa Tài Khoản Người Dùng'}
                </h3>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{selectedUser.email}</div>
              </div>
            </div>

            <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {targetStatus === 'ACTIVE'
                ? 'Người dùng sẽ có thể đăng nhập trở lại và quản lý tài nguyên máy chủ bình thường.'
                : 'Khóa tài khoản sẽ lập tức ngăn chặn đăng nhập và thu hồi quyền thực thi API. Dữ liệu máy chủ và tệp tin của người dùng KHÔNG bị xóa hay hủy bỏ.'}
            </p>

            {targetStatus !== 'ACTIVE' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Lý do khóa tài khoản (lưu vào nhật ký kiểm toán):
                </label>
                <textarea
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  className="nm-inset"
                  rows={3}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    background: 'var(--bg-sunken)',
                    fontSize: '0.86rem',
                    color: 'var(--text-main)',
                    outline: 'none',
                    resize: 'none',
                  }}
                />
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
              <button
                onClick={() => setStatusModalOpen(false)}
                className="nm-btn"
                style={{ padding: '10px 18px', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer' }}
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmStatus}
                disabled={isActionLoading}
                className="nm-btn"
                style={{
                  padding: '10px 20px',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: targetStatus === 'ACTIVE' ? 'var(--accent-teal)' : '#ef4444',
                  color: '#ffffff',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {isActionLoading ? 'Đang xử lý...' : targetStatus === 'ACTIVE' ? 'Mở khóa ngay' : 'Xác nhận khóa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Change Modal */}
      {roleModalOpen && selectedUser && (
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'rgba(147, 51, 234, 0.15)',
                  color: '#9333ea',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ShieldAlert size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  Thay Đổi Vai Trò Phân Quyền
                </h3>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{selectedUser.email}</div>
              </div>
            </div>

            <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Bạn đang thực hiện chuyển đổi vai trò của tài khoản này từ <strong>{selectedUser.role}</strong> sang{' '}
              <strong style={{ color: targetRole === 'ADMIN' ? '#e11d48' : '#2563eb' }}>{targetRole}</strong>.
            </p>

            <div
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.2)',
                fontSize: '0.8rem',
                color: '#b45309',
                display: 'flex',
                gap: '8px',
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <div>
                Cấp vai trò ADMIN sẽ cho phép người này toàn quyền quản lý tài khoản người dùng khác, điều khiển hạ tầng máy chủ và cấu hình hệ thống.
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
              <button
                onClick={() => setRoleModalOpen(false)}
                className="nm-btn"
                style={{ padding: '10px 18px', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer' }}
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmRole}
                disabled={isActionLoading}
                className="nm-btn"
                style={{
                  padding: '10px 20px',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: targetRole === 'ADMIN' ? '#e11d48' : '#2563eb',
                  color: '#ffffff',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {isActionLoading ? 'Đang xử lý...' : `Xác nhận đổi sang ${targetRole}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
