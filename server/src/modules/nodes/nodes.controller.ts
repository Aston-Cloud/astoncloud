import type { Request, Response, NextFunction } from 'express';
import { NodesService } from './nodes.service.js';
import { sendSuccess } from '../../utils/response.js';

export class NodesController {
  public static async listNodes(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const nodes = await NodesService.listActiveNodes();
      sendSuccess(res, { nodes, total: nodes.length });
    } catch (err) {
      next(err);
    }
  }
}
