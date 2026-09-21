import type { Request, Response, NextFunction } from 'express';
import { PlansService } from './plans.service.js';
import { sendSuccess } from '../../utils/response.js';

export class PlansController {
  public static async listPlans(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const plans = await PlansService.listActivePlans();
      sendSuccess(res, { plans, total: plans.length });
    } catch (err) {
      next(err);
    }
  }
}
