import type { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { AppError, NotFoundError } from '../utils/errors.js';
import { sendError } from '../utils/response.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export const errorHandler: ErrorRequestHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    if (!err.isOperational || err.statusCode >= 500) {
      logger.error({ err, details: err.details }, `Operational error: ${err.message}`);
    }
    sendError(res, err.message, err.statusCode, err.details, err.name);
    return;
  }

  // Handle JSON parse error from express.json()
  if ('type' in err && (err as { type: string }).type === 'entity.parse.failed') {
    sendError(res, 'Định dạng JSON gửi lên không hợp lệ', 400);
    return;
  }

  // Unhandled internal errors
  logger.error({ err }, `Unhandled error: ${err.message}`);
  const message = env.NODE_ENV === 'production' 
    ? 'Đã xảy ra lỗi nội bộ máy chủ' 
    : err.message || 'Đã xảy ra lỗi nội bộ máy chủ';
  
  const details = env.NODE_ENV === 'production' ? undefined : err.stack;
  sendError(res, message, 500, details, 'InternalServerError');
};

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(new NotFoundError(`Đường dẫn không tồn tại: ${req.method} ${req.originalUrl}`));
}
