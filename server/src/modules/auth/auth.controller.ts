import type { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service.js';
import { sendSuccess } from '../../utils/response.js';
import { UnauthorizedError } from '../../utils/errors.js';

export class AuthController {
  public static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.register(
        req.body,
        req.ip,
        req.get('user-agent')
      );
      sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  }

  public static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.login(
        req.body,
        req.ip,
        req.get('user-agent')
      );
      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  public static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.sessionId) {
        throw new UnauthorizedError('Phiên đăng nhập không tồn tại');
      }

      await AuthService.logout(req.sessionId);
      sendSuccess(res, { message: 'Đăng xuất thành công' }, 200);
    } catch (err) {
      next(err);
    }
  }

  public static async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Chưa xác thực người dùng');
      }
      sendSuccess(res, { user: req.user }, 200);
    } catch (err) {
      next(err);
    }
  }
}
