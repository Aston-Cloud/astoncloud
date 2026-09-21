import type { Request, Response, NextFunction } from 'express';
import { AuthService, type UserSanitized, type UserRole } from '../modules/auth/auth.service.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: UserSanitized;
      sessionId?: string;
    }
  }
}

/**
 * Require valid Bearer token and active session
 */
export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Vui lòng đăng nhập để thực hiện thao tác này');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedError('Mã xác thực (Token) bị thiếu');
    }

    const { user, sessionId } = await AuthService.validateToken(token);

    req.user = user;
    req.sessionId = sessionId;

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Require specific role(s), e.g. ADMIN
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Chưa xác thực người dùng'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Yêu cầu quyền truy cập cấp cao (${allowedRoles.join(', ')}). Bạn không có quyền thực hiện thao tác này.`
        )
      );
    }

    next();
  };
}
