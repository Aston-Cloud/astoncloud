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
      sendSuccess(res, {
        status: stats.status,
        cpu: stats.cpu,
        memory: stats.memory,
        disk: stats.disk,
        network: stats.network,
        uptime: stats.uptime,
        uptimeFormatted: stats.uptimeFormatted,
        timestamp: stats.timestamp,
        available: (stats as any).available ?? true,
        error: (stats as any).error,
        stats,
      });
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

  // ==========================================
  // HOST FILE MANAGER HANDLERS
  // ==========================================

  public static async listFiles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const hostId = req.params.id as string;
      const dirPath = (req.query.path as string) || '/';
      const result = await HostsService.listFiles(user.id, user.role, hostId, dirPath);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  public static async readFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const hostId = req.params.id as string;
      const filePath = req.query.path as string;
      const result = await HostsService.readFile(user.id, user.role, hostId, filePath);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  public static async writeFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const hostId = req.params.id as string;
      const result = await HostsService.writeFile(user.id, user.role, hostId, req.body);
      sendSuccess(res, { ...result, message: 'Lưu tệp tin thành công' });
    } catch (err) {
      next(err);
    }
  }

  public static async createDirectory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const hostId = req.params.id as string;
      const dirPath = req.body.path as string;
      const result = await HostsService.createDirectory(user.id, user.role, hostId, dirPath);
      sendSuccess(res, { ...result, message: 'Tạo thư mục thành công' }, 201);
    } catch (err) {
      next(err);
    }
  }

  public static async deleteFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const hostId = req.params.id as string;
      const targetPath = req.query.path as string;
      const result = await HostsService.deleteFile(user.id, user.role, hostId, targetPath);
      sendSuccess(res, { ...result, message: 'Đã xóa tệp/thư mục thành công' });
    } catch (err) {
      next(err);
    }
  }

  public static async renameFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const hostId = req.params.id as string;
      const { fromPath, toPath } = req.body;
      const result = await HostsService.renameFile(user.id, user.role, hostId, fromPath, toPath);
      sendSuccess(res, { ...result, message: 'Đổi tên tệp/thư mục thành công' });
    } catch (err) {
      next(err);
    }
  }

  public static async uploadFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const hostId = req.params.id as string;
      const result = await HostsService.uploadFile(user.id, user.role, hostId, req.body);
      sendSuccess(res, { ...result, message: 'Tải tệp tin lên thành công' }, 201);
    } catch (err) {
      next(err);
    }
  }

  public static async downloadFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const hostId = req.params.id as string;
      const filePath = req.query.path as string;
      const download = await HostsService.downloadFile(user.id, user.role, hostId, filePath);

      res.setHeader('Content-Disposition', `attachment; filename="${download.filename}"`);
      res.setHeader('Content-Type', download.mimeType || 'application/octet-stream');
      if (download.size > 0) {
        res.setHeader('Content-Length', String(download.size));
      }

      download.stream.pipe(res);
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // HOST ENVIRONMENT VARIABLES (MILESTONE 9)
  // ==========================================

  public static async listVariables(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const hostId = req.params.id as string;
      const variables = await HostsService.listHostVariables(hostId, user.id, user.role);
      sendSuccess(res, variables);
    } catch (err) {
      next(err);
    }
  }

  public static async createVariable(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const hostId = req.params.id as string;
      const result = await HostsService.createHostVariable(hostId, user.id, user.role, req.body);
      sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  }

  public static async updateVariable(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const hostId = req.params.id as string;
      const variableId = req.params.variableId as string;
      const result = await HostsService.updateHostVariable(hostId, variableId, user.id, user.role, req.body);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  public static async deleteVariable(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const hostId = req.params.id as string;
      const variableId = req.params.variableId as string;
      const result = await HostsService.deleteHostVariable(hostId, variableId, user.id, user.role);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }
}
