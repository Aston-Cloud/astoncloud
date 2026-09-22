import React, { useState, useEffect, useRef } from 'react';
import {
  Folder,
  FileCode,
  FileText,
  FileImage,
  FileArchive,
  Upload,
  FilePlus,
  FolderPlus,
  Trash2,
  Edit,
  Save,
  X,
  ChevronRight,
  HardDrive,
  RefreshCw,
  Download,
  AlertCircle,
  CheckCircle2,
  CornerLeftUp,
  FileQuestion,
  Loader2,
} from 'lucide-react';
import { Host } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';

interface HostFilesTabProps {
  host: Host;
}

interface RemoteFileEntry {
  name: string;
  type: 'file' | 'directory';
  size: number;
  modifiedAt: string;
}

interface OpenedFile {
  path: string;
  name: string;
  content: string;
  size: number;
  isBinary: boolean;
  encoding: 'utf-8' | 'base64';
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export const HostFilesTab: React.FC<HostFilesTabProps> = ({ host }) => {
  const [currentFolder, setCurrentFolder] = useState<string>('/');
  const [entries, setEntries] = useState<RemoteFileEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Editor State
  const [editingFile, setEditingFile] = useState<OpenedFile | null>(null);
  const [editorCode, setEditorCode] = useState<string>('');
  const [originalCode, setOriginalCode] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [editorError, setEditorError] = useState<string | null>(null);

  // Modals
  const [isNewFileModalOpen, setIsNewFileModalOpen] = useState<boolean>(false);
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState<boolean>(false);
  const [newItemName, setNewItemName] = useState<string>('');
  const [initialFileContent, setInitialFileContent] = useState<string>('');

  // Rename Modal
  const [renamingItem, setRenamingItem] = useState<RemoteFileEntry | null>(null);
  const [renameNewName, setRenameNewName] = useState<string>('');

  // Delete Confirmation Modal
  const [deletingItem, setDeletingItem] = useState<RemoteFileEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // File Upload
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const getAuthHeaders = (): HeadersInit => {
    const token = localStorage.getItem('aston_auth_token');
    return {
      Authorization: `Bearer ${token || ''}`,
      'Content-Type': 'application/json',
    };
  };

  // 1. Fetch files for current folder
  const fetchFiles = async (folderPath: string = currentFolder) => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('aston_auth_token');
      const res = await fetch(`/api/v1/hosts/${host.id}/files?path=${encodeURIComponent(folderPath)}`, {
        headers: {
          Authorization: `Bearer ${token || ''}`,
        },
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || 'Không thể tải danh sách tệp tin');
      }

      setEntries(json.data?.entries || []);
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối máy chủ');
      setEntries([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles(currentFolder);
  }, [host.id, currentFolder]);

  // Toast auto-hide
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // 2. Open File / Navigate Directory
  const handleItemClick = async (item: RemoteFileEntry) => {
    const targetPath = currentFolder === '/' ? `/${item.name}` : `${currentFolder}/${item.name}`;

    if (item.type === 'directory') {
      setCurrentFolder(targetPath);
    } else {
      await openFile(targetPath);
    }
  };

  const openFile = async (filePath: string) => {
    setIsLoading(true);
    setEditorError(null);
    try {
      const token = localStorage.getItem('aston_auth_token');
      const res = await fetch(`/api/v1/hosts/${host.id}/files/content?path=${encodeURIComponent(filePath)}`, {
        headers: {
          Authorization: `Bearer ${token || ''}`,
        },
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        const errorMsg = json?.error?.message || 'Không thể đọc nội dung tệp tin';
        if (json?.error?.code === 'FILE_TOO_LARGE_TO_EDIT') {
          throw new Error('FILE_TOO_LARGE_TO_EDIT: Tệp tin vượt quá 1MB, không thể hiển thị trong trình duyệt');
        }
        throw new Error(errorMsg);
      }

      const fileData: OpenedFile = json.data;
      setEditingFile(fileData);
      setEditorCode(fileData.isBinary ? '' : fileData.content);
      setOriginalCode(fileData.isBinary ? '' : fileData.content);
    } catch (err: any) {
      setError(err.message || 'Không thể mở tệp tin');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Save Editor
  const handleSaveEditor = async () => {
    if (!editingFile) return;
    setIsSaving(true);
    setEditorError(null);

    try {
      const res = await fetch(`/api/v1/hosts/${host.id}/files/content`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          path: editingFile.path,
          content: editorCode,
          encoding: 'utf-8',
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || 'Không thể lưu thay đổi tệp tin');
      }

      setOriginalCode(editorCode);
      setSuccessMessage(`Đã lưu thay đổi tệp "${editingFile.name}" thành công!`);
      // Update local entry size
      await fetchFiles(currentFolder);
    } catch (err: any) {
      setEditorError(err.message || 'Lỗi khi lưu tệp tin');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseEditor = () => {
    if (editorCode !== originalCode) {
      const confirmClose = window.confirm('Bạn có thay đổi chưa được lưu. Bạn có chắc chắn muốn đóng trình soạn thảo không?');
      if (!confirmClose) return;
    }
    setEditingFile(null);
    setEditorCode('');
    setOriginalCode('');
    setEditorError(null);
  };

  // 4. Create File
  const handleCreateFile = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newItemName.trim();
    if (!name) return;

    const targetPath = currentFolder === '/' ? `/${name}` : `${currentFolder}/${name}`;

    try {
      const res = await fetch(`/api/v1/hosts/${host.id}/files/content`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          path: targetPath,
          content: initialFileContent || '',
          encoding: 'utf-8',
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || 'Không thể tạo tệp tin mới');
      }

      setSuccessMessage(`Đã tạo tệp tin "${name}" thành công!`);
      setNewItemName('');
      setInitialFileContent('');
      setIsNewFileModalOpen(false);
      await fetchFiles(currentFolder);
    } catch (err: any) {
      alert(`Lỗi tạo tệp: ${err.message}`);
    }
  };

  // 5. Create Directory
  const handleCreateDirectory = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newItemName.trim();
    if (!name) return;

    const targetPath = currentFolder === '/' ? `/${name}` : `${currentFolder}/${name}`;

    try {
      const res = await fetch(`/api/v1/hosts/${host.id}/files/directory`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          path: targetPath,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || 'Không thể tạo thư mục');
      }

      setSuccessMessage(`Đã tạo thư mục "${name}" thành công!`);
      setNewItemName('');
      setIsNewFolderModalOpen(false);
      await fetchFiles(currentFolder);
    } catch (err: any) {
      alert(`Lỗi tạo thư mục: ${err.message}`);
    }
  };

  // 6. Delete File or Directory
  const handleDeleteItem = async () => {
    if (!deletingItem) return;
    setIsDeleting(true);

    const targetPath = currentFolder === '/' ? `/${deletingItem.name}` : `${currentFolder}/${deletingItem.name}`;

    try {
      const token = localStorage.getItem('aston_auth_token');
      const res = await fetch(`/api/v1/hosts/${host.id}/files?path=${encodeURIComponent(targetPath)}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token || ''}`,
        },
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || 'Không thể xóa tệp tin / thư mục');
      }

      setSuccessMessage(`Đã xóa "${deletingItem.name}" thành công!`);
      setDeletingItem(null);
      await fetchFiles(currentFolder);
    } catch (err: any) {
      alert(`Lỗi xóa: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // 7. Rename File or Directory
  const handleRenameItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renamingItem) return;
    const newName = renameNewName.trim();
    if (!newName || newName === renamingItem.name) {
      setRenamingItem(null);
      return;
    }

    const fromPath = currentFolder === '/' ? `/${renamingItem.name}` : `${currentFolder}/${renamingItem.name}`;
    const toPath = currentFolder === '/' ? `/${newName}` : `${currentFolder}/${newName}`;

    try {
      const res = await fetch(`/api/v1/hosts/${host.id}/files/rename`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          fromPath,
          toPath,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || 'Không thể đổi tên');
      }

      setSuccessMessage(`Đã đổi tên thành "${newName}" thành công!`);
      setRenamingItem(null);
      setRenameNewName('');
      await fetchFiles(currentFolder);
    } catch (err: any) {
      alert(`Lỗi đổi tên: ${err.message}`);
    }
  };

  // 8. Download File
  const handleDownload = (item: RemoteFileEntry) => {
    const targetPath = currentFolder === '/' ? `/${item.name}` : `${currentFolder}/${item.name}`;
    const token = localStorage.getItem('aston_auth_token');
    const downloadUrl = `/api/v1/hosts/${host.id}/files/download?path=${encodeURIComponent(targetPath)}`;

    // Create a temporary hidden link with token
    fetch(downloadUrl, {
      headers: {
        Authorization: `Bearer ${token || ''}`,
      },
    })
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => null);
          throw new Error(err?.error?.message || 'Lỗi tải tệp tin');
        }
        return res.blob();
      })
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = item.name;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      })
      .catch((err) => {
        alert(`Không thể tải xuống: ${err.message}`);
      });
  };

  // 9. Upload File
  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (file.size > 10 * 1024 * 1024) {
      alert('Kích thước tệp tin vượt quá giới hạn 10MB');
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();

    reader.onload = async () => {
      try {
        const result = reader.result as string;
        // Strip data:*;base64, prefix
        const base64Data = result.includes(',') ? result.split(',')[1] : result;

        const res = await fetch(`/api/v1/hosts/${host.id}/files/upload`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            destinationPath: currentFolder,
            filename: file.name,
            content: base64Data,
            encoding: 'base64',
          }),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json?.error?.message || 'Lỗi tải tệp tin lên');
        }

        setSuccessMessage(`Đã tải lên tệp "${file.name}" thành công!`);
        if (fileInputRef.current) fileInputRef.current.value = '';
        await fetchFiles(currentFolder);
      } catch (err: any) {
        alert(`Lỗi upload: ${err.message}`);
      } finally {
        setIsUploading(false);
      }
    };

    reader.onerror = () => {
      alert('Lỗi đọc tệp tin từ máy tính');
      setIsUploading(false);
    };

    reader.readAsDataURL(file);
  };

  // Navigate breadcrumb
  const navigateToSegment = (index: number) => {
    const segments = currentFolder.split('/').filter(Boolean);
    if (index === -1) {
      setCurrentFolder('/');
    } else {
      const target = '/' + segments.slice(0, index + 1).join('/');
      setCurrentFolder(target);
    }
  };

  const navigateUp = () => {
    if (currentFolder === '/') return;
    const segments = currentFolder.split('/').filter(Boolean);
    segments.pop();
    setCurrentFolder(segments.length === 0 ? '/' : '/' + segments.join('/'));
  };

  // Helper for icon rendering
  const getFileIcon = (item: RemoteFileEntry) => {
    if (item.type === 'directory') {
      return <Folder size={18} color="var(--accent-pink)" />;
    }
    const ext = item.name.split('.').pop()?.toLowerCase() || '';
    if (['js', 'ts', 'jsx', 'tsx', 'mjs', 'cjs'].includes(ext)) {
      return <FileCode size={18} color="#06b6d4" />;
    }
    if (['py'].includes(ext)) {
      return <FileCode size={18} color="#3b82f6" />;
    }
    if (['json', 'yaml', 'yml', 'toml'].includes(ext)) {
      return <FileCode size={18} color="#f59e0b" />;
    }
    if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico'].includes(ext)) {
      return <FileImage size={18} color="#ec4899" />;
    }
    if (['zip', 'tar', 'gz', 'rar'].includes(ext)) {
      return <FileArchive size={18} color="#a855f7" />;
    }
    if (['md', 'txt', 'log', 'env'].includes(ext)) {
      return <FileText size={18} color="#10b981" />;
    }
    return <FileQuestion size={18} color="var(--text-secondary)" />;
  };

  const breadcrumbs = currentFolder.split('/').filter(Boolean);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Alert / Notification banners */}
      {successMessage && (
        <div
          style={{
            padding: '12px 18px',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: '#10b981',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.88rem',
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={16} /> {successMessage}
        </div>
      )}

      {error && (
        <div
          style={{
            padding: '12px 18px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.88rem',
            fontWeight: 600,
          }}
        >
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* File Manager Toolbar */}
      <Card variant="raised" padding="md">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px',
          }}
        >
          {/* Breadcrumbs Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', flexWrap: 'wrap' }}>
            {currentFolder !== '/' && (
              <Button
                variant="secondary"
                size="sm"
                onClick={navigateUp}
                title="Lên thư mục cha"
                style={{ padding: '4px 8px', marginRight: '4px' }}
              >
                <CornerLeftUp size={14} />
              </Button>
            )}

            <button
              onClick={() => navigateToSegment(-1)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
                color: currentFolder === '/' ? 'var(--text-main)' : 'var(--accent-pink)',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 6px',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <HardDrive size={16} /> root
            </button>

            {breadcrumbs.map((part, idx) => (
              <React.Fragment key={idx}>
                <ChevronRight size={14} color="var(--text-muted)" />
                <button
                  onClick={() => navigateToSegment(idx)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: idx === breadcrumbs.length - 1 ? 700 : 600,
                    color: idx === breadcrumbs.length - 1 ? 'var(--text-main)' : 'var(--accent-pink)',
                    padding: '4px 6px',
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  {part}
                </button>
              </React.Fragment>
            ))}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Hidden native file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleUploadFile}
              style={{ display: 'none' }}
            />

            <Button
              variant="secondary"
              size="sm"
              onClick={() => fetchFiles(currentFolder)}
              title="Làm mới danh sách"
              icon={isLoading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
            >
              Làm mới
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setNewItemName('');
                setIsNewFolderModalOpen(true);
              }}
              icon={<FolderPlus size={15} />}
            >
              Thư mục mới
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setNewItemName('');
                setInitialFileContent('');
                setIsNewFileModalOpen(true);
              }}
              icon={<FilePlus size={15} />}
            >
              Tệp tin mới
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              icon={isUploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
            >
              {isUploading ? 'Đang tải...' : 'Tải tệp lên'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Files List Table */}
      {isLoading && entries.length === 0 ? (
        <Card variant="raised" padding="lg">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', color: 'var(--text-muted)' }}>
            <Loader2 size={24} className="animate-spin" />
            <span>Đang tải danh sách tệp tin từ hạ tầng máy chủ...</span>
          </div>
        </Card>
      ) : entries.length === 0 ? (
        <EmptyState
          icon={<Folder size={36} />}
          title="Thư mục hiện đang trống"
          description={`Chưa có tệp tin hoặc thư mục nào tại "${currentFolder}". Bạn có thể tải mã nguồn lên hoặc tạo tệp mới.`}
          actionText="Tạo tệp mới"
          onAction={() => setIsNewFileModalOpen(true)}
        />
      ) : (
        <Card variant="raised" padding="none" style={{ overflow: 'hidden' }}>
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr
                  style={{
                    background: 'var(--bg-sunken)',
                    color: 'var(--text-muted)',
                    fontSize: '0.78rem',
                    textTransform: 'uppercase',
                    borderBottom: '1px solid rgba(210, 218, 230, 0.4)',
                  }}
                >
                  <th style={{ padding: '12px 18px', fontWeight: 600 }}>Tên tệp / Thư mục</th>
                  <th style={{ padding: '12px 18px', fontWeight: 600, width: '140px' }}>Kích thước</th>
                  <th style={{ padding: '12px 18px', fontWeight: 600, width: '190px' }}>Cập nhật lần cuối</th>
                  <th style={{ padding: '12px 18px', fontWeight: 600, textAlign: 'right', width: '180px' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((item) => (
                  <tr
                    key={item.name}
                    style={{
                      borderBottom: '1px solid rgba(210, 218, 230, 0.4)',
                      transition: 'background var(--transition-fast)',
                      cursor: 'pointer',
                    }}
                    className="file-row"
                    onClick={() => handleItemClick(item)}
                  >
                    <td style={{ padding: '12px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {getFileIcon(item)}
                        <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{item.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 18px', color: 'var(--text-secondary)' }}>
                      {item.type === 'directory' ? '—' : formatBytes(item.size)}
                    </td>
                    <td style={{ padding: '12px 18px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      {item.modifiedAt ? new Date(item.modifiedAt).toLocaleString('vi-VN') : '—'}
                    </td>
                    <td
                      style={{ padding: '12px 18px', textAlign: 'right' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        {item.type === 'file' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleItemClick(item)}
                            title="Chỉnh sửa tệp tin"
                            style={{ padding: '5px 9px' }}
                          >
                            <Edit size={14} />
                          </Button>
                        )}
                        {item.type === 'file' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleDownload(item)}
                            title="Tải tệp về máy tính"
                            style={{ padding: '5px 9px' }}
                          >
                            <Download size={14} />
                          </Button>
                        )}
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setRenamingItem(item);
                            setRenameNewName(item.name);
                          }}
                          title="Đổi tên"
                          style={{ padding: '5px 9px' }}
                        >
                          <Edit size={14} color="#f59e0b" />
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setDeletingItem(item)}
                          title="Xóa tệp/thư mục"
                          style={{ padding: '5px 9px' }}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* In-browser File Editor Modal */}
      <Modal
        isOpen={!!editingFile}
        onClose={handleCloseEditor}
        title={`Đang chỉnh sửa: ${editingFile?.name || ''}`}
        maxWidth="920px"
        footer={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {editorCode !== originalCode ? (
                <span style={{ color: '#f59e0b', fontWeight: 600 }}>• Có thay đổi chưa lưu</span>
              ) : (
                <span>Đã đồng bộ với máy chủ</span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <Button variant="secondary" onClick={handleCloseEditor}>
                Đóng
              </Button>
              {editingFile && !editingFile.isBinary && (
                <Button
                  variant="primary"
                  onClick={handleSaveEditor}
                  disabled={isSaving}
                  icon={isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                >
                  {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </Button>
              )}
            </div>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Editor Header Info Bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.82rem',
              color: 'var(--text-muted)',
              background: 'var(--bg-sunken)',
              padding: '8px 14px',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <span>
              Đường dẫn: <strong style={{ color: 'var(--text-main)' }}>{editingFile?.path}</strong>
            </span>
            <span>
              Kích thước: <strong>{editingFile ? formatBytes(editingFile.size) : '0 B'}</strong> • UTF-8
            </span>
          </div>

          {editorError && (
            <div
              style={{
                padding: '10px 14px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-sm)',
                color: '#ef4444',
                fontSize: '0.84rem',
              }}
            >
              {editorError}
            </div>
          )}

          {editingFile?.isBinary ? (
            <div
              style={{
                padding: '40px 20px',
                textAlign: 'center',
                background: '#0d1117',
                borderRadius: 'var(--radius-md)',
                color: '#e6edf3',
              }}
            >
              <FileQuestion size={48} color="#f59e0b" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '6px' }}>
                Tệp tin nhị phân (Binary File)
              </h3>
              <p style={{ color: '#8b949e', fontSize: '0.88rem', maxWidth: '420px', margin: '0 auto 20px' }}>
                Tệp tin này có định dạng nhị phân và không thể chỉnh sửa trực tiếp trong trình duyệt web. Bạn có thể tải tệp tin về máy tính để mở.
              </p>
              <Button
                variant="primary"
                onClick={() => editingFile && handleDownload({ name: editingFile.name, type: 'file', size: editingFile.size, modifiedAt: '' })}
                icon={<Download size={16} />}
              >
                Tải tệp tin về máy
              </Button>
            </div>
          ) : (
            <textarea
              value={editorCode}
              onChange={(e) => setEditorCode(e.target.value)}
              placeholder="// Nhập nội dung mã nguồn..."
              style={{
                width: '100%',
                height: '420px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.88rem',
                lineHeight: 1.6,
                background: '#0d1117',
                color: '#e6edf3',
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid #30363d',
                outline: 'none',
                resize: 'vertical',
                tabSize: 2,
              }}
            />
          )}
        </div>
      </Modal>

      {/* New File Modal */}
      <Modal
        isOpen={isNewFileModalOpen}
        onClose={() => setIsNewFileModalOpen(false)}
        title="Tạo Tệp tin Mới"
      >
        <form onSubmit={handleCreateFile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input
            label="Tên tệp tin"
            placeholder="vd: server.js, app.py, .env, config.json"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            required
            autoFocus
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-main)' }}>
              Nội dung ban đầu (Tùy chọn)
            </label>
            <textarea
              value={initialFileContent}
              onChange={(e) => setInitialFileContent(e.target.value)}
              placeholder="// Viết mã nguồn ban đầu..."
              style={{
                width: '100%',
                height: '120px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.84rem',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-sunken)',
                border: '1px solid rgba(210, 218, 230, 0.6)',
                outline: 'none',
                resize: 'vertical',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <Button type="button" variant="secondary" onClick={() => setIsNewFileModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" variant="primary">
              Tạo tệp tin
            </Button>
          </div>
        </form>
      </Modal>

      {/* New Folder Modal */}
      <Modal
        isOpen={isNewFolderModalOpen}
        onClose={() => setIsNewFolderModalOpen(false)}
        title="Tạo Thư mục Mới"
      >
        <form onSubmit={handleCreateDirectory} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input
            label="Tên thư mục"
            placeholder="vd: src, public, controllers, utils"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            required
            autoFocus
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <Button type="button" variant="secondary" onClick={() => setIsNewFolderModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" variant="primary">
              Tạo thư mục
            </Button>
          </div>
        </form>
      </Modal>

      {/* Rename Modal */}
      <Modal
        isOpen={!!renamingItem}
        onClose={() => setRenamingItem(null)}
        title={`Đổi tên: ${renamingItem?.name || ''}`}
      >
        <form onSubmit={handleRenameItem} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input
            label="Tên mới"
            value={renameNewName}
            onChange={(e) => setRenameNewName(e.target.value)}
            required
            autoFocus
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <Button type="button" variant="secondary" onClick={() => setRenamingItem(null)}>
              Hủy
            </Button>
            <Button type="submit" variant="primary">
              Đổi tên
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingItem}
        onClose={() => setDeletingItem(null)}
        title="Xác nhận Xóa"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: 1.6 }}>
            Bạn có chắc chắn muốn xóa {deletingItem?.type === 'directory' ? 'thư mục' : 'tệp tin'}{' '}
            <strong style={{ color: '#ef4444' }}>"{deletingItem?.name}"</strong> không?
          </p>
          {deletingItem?.type === 'directory' && (
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Lưu ý: Mọi tệp tin và thư mục con bên trong cũng sẽ bị xóa hoàn toàn. Thao tác này không thể hoàn tác.
            </p>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <Button type="button" variant="secondary" onClick={() => setDeletingItem(null)}>
              Hủy bỏ
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleDeleteItem}
              disabled={isDeleting}
              icon={isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            >
              {isDeleting ? 'Đang xóa...' : 'Xác nhận xóa'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
