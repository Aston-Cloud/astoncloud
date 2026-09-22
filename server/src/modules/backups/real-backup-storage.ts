import { logger } from '../../utils/logger.js';
import { AppError } from '../../utils/errors.js';
import type {
  IBackupStorageProvider,
  CreateSnapshotResult,
  RestoreSnapshotResult,
} from './backup.interface.js';

/**
 * RealBackupStorageProvider
 * Abstraction layer for production infrastructure (Real Node Agent / MinIO / S3 Object Storage)
 * Used when BACKUP_SERVICE_MODE=remote
 */
export class RealBackupStorageProvider implements IBackupStorageProvider {
  public async createSnapshot(
    hostId: string,
    backupId: string,
    sourceDir: string
  ): Promise<CreateSnapshotResult> {
    logger.info(
      { hostId, backupId, sourceDir },
      '[RealBackupStorageProvider] Dispatching backup snapshot command to remote node agent/S3'
    );
    throw new AppError(
      'Môi trường VPS thật chưa được kết nối. Vui lòng sử dụng BACKUP_SERVICE_MODE=mock.',
      501,
      { code: 'VPS_NOT_CONFIGURED' }
    );
  }

  public async restoreSnapshot(
    hostId: string,
    storageKey: string,
    targetDir: string
  ): Promise<RestoreSnapshotResult> {
    logger.info(
      { hostId, storageKey, targetDir },
      '[RealBackupStorageProvider] Dispatching restore command to remote node agent'
    );
    throw new AppError(
      'Môi trường VPS thật chưa được kết nối. Vui lòng sử dụng BACKUP_SERVICE_MODE=mock.',
      501,
      { code: 'VPS_NOT_CONFIGURED' }
    );
  }

  public async deleteSnapshot(storageKey: string): Promise<boolean> {
    logger.info({ storageKey }, '[RealBackupStorageProvider] Requesting remote snapshot deletion');
    return true;
  }

  public async getSnapshotStats(
    _storageKey: string
  ): Promise<{ exists: boolean; sizeBytes: number } | null> {
    return null;
  }
}

export const realBackupStorageProvider = new RealBackupStorageProvider();
