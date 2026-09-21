import type { Request, Response, NextFunction } from 'express';
import { UsersService } from './users.service.js';
import { sendSuccess } from '../../utils/response.js';
import { UnauthorizedError } from '../../utils/errors.js';

export class UsersController {
  public static async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Chưa xác thực người dùng');
      }

      const profile = await UsersService.getProfile(req.user.id);
      sendSuccess(res, { user: profile }, 200);
    } catch (err) {
      next(err);
    }
  }

  public static async updateMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Chưa xác thực người dùng');
      }

      const updated = await UsersService.updateProfile(req.user.id, req.body);
      sendSuccess(res, { user: updated }, 200);
    } catch (err) {
      next(err);
    }
  }
}
