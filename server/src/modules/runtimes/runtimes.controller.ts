import type { Request, Response, NextFunction } from 'express';
import { RuntimesService } from './runtimes.service.js';
import { sendSuccess } from '../../utils/response.js';

export class RuntimesController {
  public static async listRuntimes(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const runtimes = await RuntimesService.listRuntimes();
      sendSuccess(res, { runtimes, total: runtimes.length });
    } catch (err) {
      next(err);
    }
  }
}
