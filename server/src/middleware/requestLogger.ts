import type { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = performance.now();
  const { method, originalUrl, ip } = req;

  res.on('finish', () => {
    const duration = Math.round(performance.now() - start);
    const { statusCode } = res;

    const logData = {
      method,
      url: originalUrl,
      status: statusCode,
      durationMs: duration,
      ip,
    };

    if (statusCode >= 500) {
      logger.error(logData, `HTTP ${method} ${originalUrl} ${statusCode} - ${duration}ms`);
    } else if (statusCode >= 400) {
      logger.warn(logData, `HTTP ${method} ${originalUrl} ${statusCode} - ${duration}ms`);
    } else {
      logger.info(logData, `HTTP ${method} ${originalUrl} ${statusCode} - ${duration}ms`);
    }
  });

  next();
}
