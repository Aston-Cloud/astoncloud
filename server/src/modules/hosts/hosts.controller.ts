import type { Request, Response, NextFunction } from 'express';
import { HostsService } from './hosts.service.js';
import { sendSuccess } from '../../utils/response.js';

export class HostsController {
  public static async listHosts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const hosts = await HostsService.listUserHosts(user.id, user.role);
      sendSuccess(res, { hosts, total: hosts.length });
    } catch (err) {
      next(err);
    }
  }

  public static async getHost(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const hostId = req.params.id as string;
      const host = await HostsService.getHostById(hostId, user.id, user.role);
      sendSuccess(res, { host });
    } catch (err) {
      next(err);
    }
  }

  public static async createHost(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const host = await HostsService.createHost(user.id, req.body);
      sendSuccess(res, { host, message: 'Khởi tạo máy chủ thành công' }, 201);
    } catch (err) {
      next(err);
    }
  }

  public static async updateHost(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const hostId = req.params.id as string;
      const host = await HostsService.updateHost(hostId, user.id, user.role, req.body);
      sendSuccess(res, { host, message: 'Cập nhật cấu hình máy chủ thành công' });
    } catch (err) {
      next(err);
    }
  }

  public static async deleteHost(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const hostId = req.params.id as string;
      await HostsService.deleteHost(hostId, user.id, user.role);
      sendSuccess(res, { message: 'Đã xóa máy chủ thành công' });
    } catch (err) {
      next(err);
    }
  }

  public static async executeAction(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const hostId = req.params.id as string;
      const result = await HostsService.executeAction(hostId, user.id, user.role, req.body);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }
}
