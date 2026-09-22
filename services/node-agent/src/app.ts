import Fastify, { FastifyInstance } from 'fastify';
import { logger } from './utils/logger.js';
import { AppError } from './utils/errors.js';
import { healthRoutes } from './modules/health/health.routes.js';
import { infoRoutes } from './modules/info/info.routes.js';
import { containerRoutes } from './modules/containers/containers.routes.js';
import { fileRoutes } from './modules/files/files.routes.js';

export function buildApp() {
  const app = Fastify({
    loggerInstance: logger,
  });

  // Support empty payload or form content type for parameter-less POST/PUT
  app.addContentTypeParser('application/x-www-form-urlencoded', (_req, _payload, done) => {
    done(null, {});
  });

  // Centralized Error Handler
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      if (error.statusCode >= 500) {
        request.log.error({ err: error }, `[AppError ${error.statusCode}] ${error.message}`);
      } else {
        request.log.warn({ err: error.message }, `[AppError ${error.statusCode}] ${error.message}`);
      }

      return reply.status(error.statusCode).send({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      });
    }

    // Fastify native validation or schema errors
    if ((error as any).validation) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'ValidationError',
          message: 'Dữ liệu yêu cầu không hợp lệ theo lược đồ',
          details: (error as any).validation,
        },
      });
    }

    const statusCode = (error as any).statusCode || 500;
    if (statusCode < 500) {
      return reply.status(statusCode).send({
        success: false,
        error: {
          code: (error as any).code || 'ClientError',
          message: (error as any)?.message || 'Lỗi yêu cầu',
        },
      });
    }

    request.log.error({ err: error }, 'Unhandled server error');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'InternalServerError',
        message: 'Đã xảy ra lỗi nội bộ trên Node Agent',
      },
    });
  });

  // Register Routes
  app.register(healthRoutes);
  app.register(infoRoutes);
  app.register(containerRoutes);
  app.register(fileRoutes);

  return app;
}
