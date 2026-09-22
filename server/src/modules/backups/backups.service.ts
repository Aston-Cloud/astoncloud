import path from 'node:path';
import { query } from '../../db/index.js';
import { env } from '../../config/env.js';
import { AppError, BadRequestError, NotFoundError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';
import { HostsService } from '../hosts/hosts.service.js';
import { NodesService } from '../nodes/nodes.service.js';
import { getNodeAgentClient } from '../node-agent/client.factory.js';
import type { NodeContext } from '../node-agent/node-agent.interface.js';
import { mockBackupStorageProvider } from './mock-backup-storage.js';
import { realBackupStorageProvider } from './real-backup-storage.js';
import type {
  IBackupStorageProvider,
  HostBackupRecord,
  BackupStatus,
} from './backup.interface.js';
import type { CreateBackupInput } from './backups.schema.js';

// Global concurrency guard for in-flight restores per host
const activeRestores = new Set<string>();

export class BackupsService {
  private static getStorageProvider(): IBackupStorageProvider {
    if (env.BACKUP_SERVICE_MODE === 'remote') {
      return realBackupStorageProvider;
    }
    return mockBackupStorageProvider;
  }

  private static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  /**
   * Helper to construct NodeContext from node ID
   */
  private static async getNodeContext(nodeId: string | null): Promise<NodeContext> {
    if (!nodeId) {
      return {
        id: 'node-sg-01',
        name: 'Singapore Primary Node',
        region: 'Singapore',
        agentUrl: env.NODE_AGENT_URL || 'http://127.0.0.1:5001',
        agentKey: env.NODE_AGENT_KEY || 'mock-key',
        ipAddress: '127.0.0.1',
      };
    }
    const node = await NodesService.getNodeById(nodeId);
    if (!node) {
      return {
        id: nodeId,
        name: 'Cluster Node',
        region: 'Singapore',
        agentUrl: env.NODE_AGENT_URL || 'http://127.0.0.1:5001',
        agentKey: env.NODE_AGENT_KEY || 'mock-key',
        ipAddress: '127.0.0.1',
      };
    }
    return {
      id: node.id,
      name: node.name,
      region: node.region || 'Singapore',
      agentUrl: (node as any).agent_url || env.NODE_AGENT_URL || 'http://127.0.0.1:5001',
      agentKey: (node as any).agent_key || env.NODE_AGENT_KEY || 'mock-key',
      ipAddress: node.ip_address,
    };
  }

  /**
   * Sanitizes a backup record to avoid exposing internal storage paths
   */
  private static sanitizeBackup(record: any): Record<string, any> {
    const sizeBytes = Number(record.size_bytes) || 0;
    return {
      id: record.id,
      hostId: record.host_id,
      userId: record.user_id,
      name: record.name,
      status: record.status,
      sizeBytes,
      sizeFormatted: BackupsService.formatBytes(sizeBytes),
      backupType: record.backup_type,
      errorMessage: record.error_message || null,
      metadata: typeof record.metadata === 'string' ? JSON.parse(record.metadata) : record.metadata || {},
      createdAt: record.created_at,
      completedAt: record.completed_at || null,
      expiresAt: record.expires_at || null,
    };
  }

  /**
   * Creates a persistent backup snapshot of a host's files
   */
  public static async createBackup(
    userId: string,
    userRole: string,
    hostId: string,
    input?: CreateBackupInput
  ): Promise<Record<string, any>> {
    // 1. Ownership & existence check
    const host = await HostsService.getHostById(hostId, userId, userRole);

    // 2. State validation
    if (host.status === 'PROVISIONING' || host.status === 'DELETING') {
      throw new BadRequestError(
        `Không thể tạo bản sao lưu khi máy chủ đang ở trạng thái "${host.status}"`
      );
    }

    // 3. Quota check: maximum backups per host
    const countRes = await query<{ count: string | number }>(
      `SELECT COUNT(*) as count FROM host_backups WHERE host_id = $1 AND status != 'DELETED'`,
      [hostId]
    );
    const currentCount = Number(countRes.rows[0]?.count) || 0;
    if (currentCount >= env.MAX_BACKUPS_PER_HOST) {
      throw new BadRequestError(
        `Máy chủ đã đạt giới hạn tối đa ${env.MAX_BACKUPS_PER_HOST} bản sao lưu. Vui lòng xóa bớt bản sao lưu cũ để tiếp tục.`
      );
    }

    const backupName =
      input?.name?.trim() ||
      `backup-${host.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${new Date()
        .toISOString()
        .replace(/[:.]/g, '-')
        .slice(0, 19)}`;

    // 4. Create initial DB record with CREATING status
    const initRes = await query<HostBackupRecord>(
      `INSERT INTO host_backups (host_id, user_id, name, status, backup_type, metadata, storage_key, size_bytes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        hostId,
        userId,
        backupName,
        'CREATING',
        input?.backup_type || 'manual',
        JSON.stringify({
          hostName: host.name,
          runtime: host.runtime,
          version: host.runtimeVersion,
          planId: host.planId,
        }),
        '',
        0,
      ]
    );

    const createdRecord = initRes.rows[0];
    const storageProvider = this.getStorageProvider();
    const sourceDir = path.resolve(
      process.cwd(),
      process.env.MOCK_STORAGE_DIR || 'mock-storage',
      hostId
    );

    try {
      // 5. Create storage snapshot
      const snapshot = await storageProvider.createSnapshot(
        hostId,
        createdRecord.id,
        sourceDir
      );

      // Check backup size limit
      const maxSizeBytes = env.MAX_BACKUP_SIZE_MB * 1024 * 1024;
      if (snapshot.sizeBytes > maxSizeBytes) {
        await storageProvider.deleteSnapshot(snapshot.storageKey);
        throw new BadRequestError(
          `Dung lượng bản sao lưu (${this.formatBytes(snapshot.sizeBytes)}) vượt quá giới hạn tối đa cho phép (${env.MAX_BACKUP_SIZE_MB} MB)`
        );
      }

      // 6. Mark COMPLETED with expiration date (14 days retention)
      const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      const updateRes = await query<HostBackupRecord>(
        `UPDATE host_backups
         SET status = $1, size_bytes = $2, storage_key = $3, completed_at = NOW(), expires_at = $4, updated_at = NOW()
         WHERE id = $5
         RETURNING *`,
        ['COMPLETED', snapshot.sizeBytes, snapshot.storageKey, expiresAt.toISOString(), createdRecord.id]
      );

      logger.info(
        { hostId, backupId: createdRecord.id, sizeBytes: snapshot.sizeBytes },
        'Backup created and completed successfully'
      );

      return this.sanitizeBackup(updateRes.rows[0]);
    } catch (err: any) {
      // 7. Handle failure
      await query(
        `UPDATE host_backups
         SET status = $1, error_message = $2, updated_at = NOW()
         WHERE id = $3`,
        ['FAILED', err.message || 'Lỗi không xác định khi sao lưu dữ liệu', createdRecord.id]
      );
      throw err;
    }
  }

  /**
   * Lists all non-deleted backups for a specific host
   */
  public static async listHostBackups(
    userId: string,
    userRole: string,
    hostId: string
  ): Promise<Record<string, any>[]> {
    await HostsService.getHostById(hostId, userId, userRole);

    const res = await query<HostBackupRecord>(
      `SELECT * FROM host_backups WHERE host_id = $1 AND status != 'DELETED' ORDER BY created_at DESC`,
      [hostId]
    );

    return res.rows.map((row) => this.sanitizeBackup(row));
  }

  /**
   * Gets details for a single backup, strictly preventing IDOR
   */
  public static async getHostBackup(
    userId: string,
    userRole: string,
    hostId: string,
    backupId: string
  ): Promise<Record<string, any>> {
    await HostsService.getHostById(hostId, userId, userRole);

    const res = await query<HostBackupRecord>(
      `SELECT * FROM host_backups WHERE id = $1 AND host_id = $2`,
      [backupId, hostId]
    );

    if (res.rows.length === 0) {
      throw new NotFoundError(`Bản sao lưu với ID "${backupId}" không tồn tại trên máy chủ này`);
    }

    return this.sanitizeBackup(res.rows[0]);
  }

  /**
   * Restores a host from a completed backup snapshot
   */
  public static async restoreBackup(
    userId: string,
    userRole: string,
    hostId: string,
    backupId: string
  ): Promise<{ message: string; backup: Record<string, any>; restoredFiles: number }> {
    // 1. Ownership and host check
    const host = await HostsService.getHostById(hostId, userId, userRole);

    // 2. IDOR & existence check on backup
    const backupRes = await query<HostBackupRecord>(
      `SELECT * FROM host_backups WHERE id = $1 AND host_id = $2`,
      [backupId, hostId]
    );

    if (backupRes.rows.length === 0) {
      throw new NotFoundError(`Bản sao lưu với ID "${backupId}" không tồn tại trên máy chủ này`);
    }

    const backup = backupRes.rows[0];

    // 3. Backup status validation
    if (backup.status !== 'COMPLETED' && backup.status !== 'RESTORED') {
      throw new BadRequestError(
        `Chỉ có thể khôi phục các bản sao lưu ở trạng thái "COMPLETED". Trạng thái hiện tại: "${backup.status}"`
      );
    }

    // 4. Concurrency protection
    if (activeRestores.has(hostId)) {
      throw new AppError(
        'Máy chủ hiện đang trong quá trình khôi phục bản sao lưu khác. Vui lòng chờ hoàn tất.',
        409,
        { code: 'CONCURRENT_RESTORE_IN_PROGRESS' }
      );
    }

    // 5. Host state validation
    if (host.status === 'PROVISIONING' || host.status === 'DELETING') {
      throw new BadRequestError(
        `Không thể khôi phục bản sao lưu khi máy chủ đang ở trạng thái "${host.status}"`
      );
    }

    activeRestores.add(hostId);
    const wasRunning = host.status === 'RUNNING';
    const agentClient = getNodeAgentClient();

    try {
      // Mark backup as RESTORING
      await query(`UPDATE host_backups SET status = $1, updated_at = NOW() WHERE id = $2`, [
        'RESTORING',
        backupId,
      ]);

      const nodeContext = await this.getNodeContext(host.nodeId);
      const containerTarget = host.containerId || `mock-${host.id.slice(0, 13)}`;

      // Stop container if it was running
      if (wasRunning) {
        try {
          await agentClient.stopContainer(nodeContext, containerTarget);
          await query(`UPDATE hosts SET status = $1, updated_at = NOW() WHERE id = $2`, [
            'STOPPED',
            hostId,
          ]);
        } catch (stopErr: any) {
          logger.warn({ hostId, err: stopErr.message }, 'Failed to stop container before restore, proceeding');
        }
      }

      // Restore files from snapshot
      const storageProvider = this.getStorageProvider();
      const targetDir = path.resolve(
        process.cwd(),
        process.env.MOCK_STORAGE_DIR || 'mock-storage',
        hostId
      );

      const restoreResult = await storageProvider.restoreSnapshot(
        hostId,
        backup.storage_key,
        targetDir
      );

      // Restart container if it was originally running
      if (wasRunning) {
        try {
          await agentClient.startContainer(nodeContext, containerTarget);
          await query(`UPDATE hosts SET status = $1, updated_at = NOW() WHERE id = $2`, [
            'RUNNING',
            hostId,
          ]);
        } catch (startErr: any) {
          logger.error({ hostId, err: startErr.message }, 'Failed to restart container after restore');
        }
      }

      // Mark backup as RESTORED
      const finalRes = await query<HostBackupRecord>(
        `UPDATE host_backups SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
        ['RESTORED', backupId]
      );

      logger.info(
        { hostId, backupId, restoredFiles: restoreResult.restoredFiles },
        'Host restored successfully from backup'
      );

      return {
        message: `Khôi phục máy chủ "${host.name}" từ bản sao lưu "${backup.name}" thành công.`,
        backup: this.sanitizeBackup(finalRes.rows[0]),
        restoredFiles: restoreResult.restoredFiles,
      };
    } catch (err: any) {
      // Revert backup status back to COMPLETED
      await query(`UPDATE host_backups SET status = $1, updated_at = NOW() WHERE id = $2`, [
        'COMPLETED',
        backupId,
      ]);
      throw err;
    } finally {
      activeRestores.delete(hostId);
    }
  }

  /**
   * Deletes a backup record and its physical storage snapshot
   */
  public static async deleteBackup(
    userId: string,
    userRole: string,
    hostId: string,
    backupId: string
  ): Promise<{ message: string; id: string }> {
    await HostsService.getHostById(hostId, userId, userRole);

    const backupRes = await query<HostBackupRecord>(
      `SELECT * FROM host_backups WHERE id = $1 AND host_id = $2`,
      [backupId, hostId]
    );

    if (backupRes.rows.length === 0) {
      throw new NotFoundError(`Bản sao lưu với ID "${backupId}" không tồn tại trên máy chủ này`);
    }

    const backup = backupRes.rows[0];
    if (backup.status === 'RESTORING') {
      throw new BadRequestError(
        'Không thể xóa bản sao lưu khi đang trong tiến trình khôi phục hệ thống'
      );
    }

    // Delete storage file
    const storageProvider = this.getStorageProvider();
    if (backup.storage_key) {
      await storageProvider.deleteSnapshot(backup.storage_key);
    }

    // Delete DB record
    await query(`DELETE FROM host_backups WHERE id = $1 AND host_id = $2`, [backupId, hostId]);

    logger.info({ hostId, backupId }, 'Host backup deleted successfully');

    return {
      message: `Đã xóa bản sao lưu "${backup.name}" thành công.`,
      id: backupId,
    };
  }

  /**
   * Lists all backups belonging to the authenticated user across all hosts
   */
  public static async listAllUserBackups(userId: string): Promise<Record<string, any>[]> {
    const res = await query<HostBackupRecord>(
      `SELECT * FROM host_backups WHERE user_id = $1 AND status != 'DELETED' ORDER BY created_at DESC`,
      [userId]
    );

    return res.rows.map((row) => this.sanitizeBackup(row));
  }

  /**
   * Service helper to identify and clean up expired backups
   */
  public static async cleanupExpiredBackups(): Promise<number> {
    const storageProvider = this.getStorageProvider();
    const expiredRes = await query<HostBackupRecord>(
      `SELECT * FROM host_backups WHERE expires_at IS NOT NULL AND expires_at < NOW() AND status != 'DELETED'`
    );

    let cleaned = 0;
    for (const b of expiredRes.rows) {
      try {
        if (b.storage_key) {
          await storageProvider.deleteSnapshot(b.storage_key);
        }
        await query(`DELETE FROM host_backups WHERE id = $1`, [b.id]);
        cleaned++;
      } catch (err: any) {
        logger.warn({ backupId: b.id, err: err.message }, 'Failed to cleanup expired backup');
      }
    }

    return cleaned;
  }
}
