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
    let token: string | undefined;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query?.token && typeof req.query.token === 'string') {
      token = req.query.token;
    }

    if (!token) {
      throw new UnauthorizedError('Vui lòng đăng nhập để thực hiện thao tác này');
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
