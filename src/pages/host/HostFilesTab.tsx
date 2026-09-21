import React, { useState } from 'react';
import {
  Folder,
  FileCode,
  FileText,
  Upload,
  FilePlus,
  FolderPlus,
  Trash2,
  Edit,
  Save,
  X,
  ChevronRight,
  HardDrive,
} from 'lucide-react';
import { Host, FileItem } from '../../types';
import { useAppState } from '../../context/AppStateContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';

interface HostFilesTabProps {
  host: Host;
}

export const HostFilesTab: React.FC<HostFilesTabProps> = ({ host }) => {
  const { files, saveFileContent, createFile, deleteFile } = useAppState();

  const hostFiles = files[host.id] || [];

  const [currentFolder, setCurrentFolder] = useState('/app');
  const [editingFile, setEditingFile] = useState<FileItem | null>(null);
  const [editorCode, setEditorCode] = useState('');

  // Modals
  const [isNewFileModalOpen, setIsNewFileModalOpen] = useState(false);
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [newFileName, setNewFileName] = useState('');

  const handleOpenFile = (file: FileItem) => {
    if (file.isDirectory) {
      setCurrentFolder(file.path);
    } else {
      setEditingFile(file);
      setEditorCode(file.content || '// Empty file');
    }
  };

  const handleSaveEditor = () => {
    if (editingFile) {
      saveFileContent(host.id, editingFile.id, editorCode);
      setEditingFile(null);
    }
  };

  const handleCreateNewFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;
    createFile(host.id, newFileName.trim(), false, '// New file\n');
    setNewFileName('');
    setIsNewFileModalOpen(false);
  };

  const handleCreateNewFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;
    createFile(host.id, newFileName.trim(), true);
    setNewFileName('');
    setIsNewFolderModalOpen(false);
  };

  const breadcrumbParts = currentFolder.split('/').filter(Boolean);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* File Manager Toolbar */}
      <Card variant="raised" padding="md">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          {/* Breadcrumbs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem' }}>
            <button
              onClick={() => setCurrentFolder('/app')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
                color: 'var(--accent-pink)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <HardDrive size={16} /> /app
            </button>
            {breadcrumbParts.slice(1).map((part, idx) => (
              <React.Fragment key={idx}>
                <ChevronRight size={14} color="var(--text-muted)" />
                <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{part}</span>
              </React.Fragment>
            ))}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsNewFolderModalOpen(true)}
              icon={<FolderPlus size={15} />}
            >
              Thư mục mới
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsNewFileModalOpen(true)}
              icon={<FilePlus size={15} />}
            >
              Tệp tin mới
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => alert('Kéo thả tệp tin hoặc nhấp để chọn tệp tải lên container')}
              icon={<Upload size={15} />}
            >
              Tải tệp lên
            </Button>
          </div>
        </div>
      </Card>

      {/* Files List Table */}
      {hostFiles.length === 0 ? (
        <EmptyState
          icon={<Folder size={32} />}
          title="Không có tệp trong thư mục"
          description="Thư mục này hiện đang trống. Hãy tải lên mã nguồn dự án hoặc tạo tệp mới để bắt đầu."
          actionText="Tạo tệp mới"
          onAction={() => setIsNewFileModalOpen(true)}
        />
      ) : (
        <Card variant="raised" padding="none" style={{ overflow: 'hidden' }}>
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-sunken)', color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 18px', fontWeight: 600 }}>Tên tệp / Thư mục</th>
                  <th style={{ padding: '12px 18px', fontWeight: 600 }}>Kích thước</th>
                  <th style={{ padding: '12px 18px', fontWeight: 600 }}>Cập nhật lần cuối</th>
                  <th style={{ padding: '12px 18px', fontWeight: 600, textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {hostFiles.map((file) => (
                  <tr
                    key={file.id}
                    style={{
                      borderBottom: '1px solid rgba(210, 218, 230, 0.4)',
                      transition: 'background var(--transition-fast)',
                      cursor: 'pointer',
                    }}
                    className="file-row"
                    onClick={() => handleOpenFile(file)}
                  >
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {file.isDirectory ? (
                          <Folder size={18} color="var(--accent-pink)" />
                        ) : file.name.endsWith('.js') || file.name.endsWith('.ts') || file.name.endsWith('.py') ? (
                          <FileCode size={18} color="#06b6d4" />
                        ) : (
                          <FileText size={18} color="var(--text-secondary)" />
                        )}
                        <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{file.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>
                      {file.isDirectory ? '-' : file.size || '1 KB'}
                    </td>
                    <td style={{ padding: '14px 18px', color: 'var(--text-muted)' }}>
                      {file.updatedAt}
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        {!file.isDirectory && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleOpenFile(file)}
                            title="Chỉnh sửa tệp"
                            style={{ padding: '6px 10px' }}
                          >
                            <Edit size={14} />
                          </Button>
                        )}
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => deleteFile(host.id, file.id)}
                          title="Xóa tệp"
                          style={{ padding: '6px 10px' }}
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
        onClose={() => setEditingFile(null)}
        title={`Đang chỉnh sửa: ${editingFile?.name || ''}`}
        maxWidth="820px"
        footer={
          <div style={{ display: 'flex', gap: '10px' }}>
            <Button variant="secondary" onClick={() => setEditingFile(null)}>
              Đóng
            </Button>
            <Button variant="primary" onClick={handleSaveEditor} icon={<Save size={16} />}>
              Lưu thay đổi
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <span>Đường dẫn: <strong>{editingFile?.path}</strong></span>
            <span>Mã hóa: UTF-8 • LF</span>
          </div>

          <textarea
            value={editorCode}
            onChange={(e) => setEditorCode(e.target.value)}
            style={{
              width: '100%',
              height: '380px',
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
            }}
          />
        </div>
      </Modal>

      {/* New File Modal */}
      <Modal
        isOpen={isNewFileModalOpen}
        onClose={() => setIsNewFileModalOpen(false)}
        title="Tạo Tệp tin Mới"
      >
        <form onSubmit={handleCreateNewFile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input
            label="Tên tệp tin"
            placeholder="vd: index.ts, config.json, .env"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            required
            autoFocus
          />
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
        <form onSubmit={handleCreateNewFolder} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input
            label="Tên thư mục"
            placeholder="vd: controllers, public, utils"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
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
    </div>
  );
};
