import express, { Express } from 'express';
import { securityMiddleware } from './middleware/security.js';
import { requestLogger } from './middleware/requestLogger.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';
import { apiRouter } from './routes/index.js';
import { sendSuccess } from './utils/response.js';

export function createApp(): Express {
  const app = express();

  // 1. Security middleware
  securityMiddleware().forEach((mw) => app.use(mw));

  // 2. Request body parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 3. Request logger
  app.use(requestLogger);

  // 4. Root ping endpoint
  app.get('/', (_req, res) => {
    sendSuccess(res, {
      name: 'Aston Cloud Backend API',
      version: '1.0.0',
      runtimes: ['Node.js', 'Bun', 'Python'],
      documentation: '/api/v1/health',
    });
  });

  // 5. API v1 Master Router
  app.use('/api/v1', apiRouter);

  // 6. 404 Not Found Handler
  app.use(notFoundHandler);

  // 7. Global Error Handler
  app.use(errorHandler);

  return app;
}
