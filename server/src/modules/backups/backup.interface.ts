/**
 * Backup Service & Storage Provider Interfaces
 * Defines abstraction for snapshot creation, file recovery, and backup records
 */

export type BackupStatus =
  | 'PENDING'
  | 'CREATING'
  | 'COMPLETED'
  | 'FAILED'
  | 'RESTORING'
  | 'RESTORED'
  | 'DELETING'
  | 'DELETED';

export type BackupType = 'manual' | 'automatic';

export interface HostBackupRecord {
  id: string;
  host_id: string;
  user_id: string;
  name: string;
  status: BackupStatus;
  size_bytes: number;
  storage_key: string;
  backup_type: BackupType;
  error_message?: string | null;
  metadata: Record<string, any>;
  completed_at?: Date | string | null;
  expires_at?: Date | string | null;
  created_at: Date | string;
  updated_at?: Date | string;
}

export interface CreateSnapshotResult {
  storageKey: string;
  sizeBytes: number;
  fileCount: number;
  checksum: string;
  format: 'tar.gz';
}

export interface RestoreSnapshotResult {
  restoredFiles: number;
  sizeBytes: number;
  restoredAt: Date;
}

export interface IBackupStorageProvider {
  /**
   * Creates an isolated snapshot archive of the host's persistent files
   */
  createSnapshot(
    hostId: string,
    backupId: string,
    sourceDir: string
  ): Promise<CreateSnapshotResult>;

  /**
   * Safely restores files from the snapshot archive into the host's directory
   * Guarantees path traversal / Tar Slip / symlink escape protection
   */
  restoreSnapshot(
    hostId: string,
    storageKey: string,
    targetDir: string
  ): Promise<RestoreSnapshotResult>;

  /**
   * Deletes the backup snapshot from storage
   */
  deleteSnapshot(storageKey: string): Promise<boolean>;

  /**
   * Checks existence and size of a snapshot in storage
   */
  getSnapshotStats(
    storageKey: string
  ): Promise<{ exists: boolean; sizeBytes: number } | null>;
}
