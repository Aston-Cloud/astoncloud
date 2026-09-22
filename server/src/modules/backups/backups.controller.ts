import type { Request, Response, NextFunction } from 'express';
import { BackupsService } from './backups.service.js';
import { sendSuccess } from '../../utils/response.js';

export class BackupsController {
  /**
   * POST /api/v1/hosts/:id/backups
   * Creates a new backup snapshot for a host
   */
  public static async createHostBackup(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const user = (req as any).user;
      const hostId = String(req.params.id);
      const result = await BackupsService.createBackup(
        user.id,
        user.role,
        hostId,
        req.body
      );
      sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/hosts/:id/backups
   * Lists all active backups for a host
   */
  public static async listHostBackups(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const user = (req as any).user;
      const hostId = String(req.params.id);
      const result = await BackupsService.listHostBackups(
        user.id,
        user.role,
        hostId
      );
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/hosts/:id/backups/:backupId
   * Gets details for a single backup
   */
  public static async getHostBackup(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const user = (req as any).user;
      const hostId = String(req.params.id);
      const backupId = String(req.params.backupId);
      const result = await BackupsService.getHostBackup(
        user.id,
        user.role,
        hostId,
        backupId
      );
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/hosts/:id/backups/:backupId/restore
   * Restores a host from a backup snapshot
   */
  public static async restoreHostBackup(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const user = (req as any).user;
      const hostId = String(req.params.id);
      const backupId = String(req.params.backupId);
      const result = await BackupsService.restoreBackup(
        user.id,
        user.role,
        hostId,
        backupId
      );
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/v1/hosts/:id/backups/:backupId
   * Deletes a backup snapshot
   */
  public static async deleteHostBackup(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const user = (req as any).user;
      const hostId = String(req.params.id);
      const backupId = String(req.params.backupId);
      const result = await BackupsService.deleteBackup(
        user.id,
        user.role,
        hostId,
        backupId
      );
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/backups
   * Lists all backups belonging to the authenticated user across all hosts
   */
  public static async listAllUserBackups(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const user = (req as any).user;
      const result = await BackupsService.listAllUserBackups(user.id);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }
}
