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

  public static async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const hostId = req.params.id as string;
      const stats = await HostsService.getHostStats(hostId, user.id, user.role);
      sendSuccess(res, { stats });
    } catch (err) {
      next(err);
    }
  }

  public static async getLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const hostId = req.params.id as string;
      const logs = await HostsService.getHostLogs(hostId, user.id, user.role, req.query as any);
      sendSuccess(res, { logs });
    } catch (err) {
      next(err);
    }
  }

  public static async streamLogs(req: Request, res: Response, _next: NextFunction): Promise<void> {
    const user = req.user!;
    const hostId = req.params.id as string;

    // Verify host ownership first
    try {
      await HostsService.getHostById(hostId, user.id, user.role);
    } catch (err: any) {
      res.status(err.statusCode || 404).json({
        success: false,
        error: { message: err.message || 'Không tìm thấy máy chủ hoặc bạn không có quyền truy cập' },
      });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    let lastSeenCount = 0;
    try {
      const initialLogs = await HostsService.getHostLogs(hostId, user.id, user.role, { tail: 100 });
      lastSeenCount = initialLogs.total;
      res.write(`event: init\ndata: ${JSON.stringify(initialLogs)}\n\n`);
    } catch (err: any) {
      res.write(`event: error\ndata: ${JSON.stringify({ message: err.message })}\n\n`);
    }

    const interval = setInterval(async () => {
      if (res.writableEnded) {
        clearInterval(interval);
        return;
      }

      try {
        const currentLogs = await HostsService.getHostLogs(hostId, user.id, user.role, { tail: 100 });
        if (currentLogs.total > lastSeenCount) {
          const newEntries = currentLogs.entries?.slice(-(currentLogs.total - lastSeenCount)) || [];
          const newLines = currentLogs.lines.slice(-(currentLogs.total - lastSeenCount));
          lastSeenCount = currentLogs.total;

          res.write(
            `event: log\ndata: ${JSON.stringify({ lines: newLines, entries: newEntries, total: currentLogs.total })}\n\n`
          );
        } else {
          res.write(': ping\n\n');
        }
      } catch {
        // Non-fatal error during polling
      }
    }, 1500);

    req.on('close', () => {
      clearInterval(interval);
    });
  }
}
