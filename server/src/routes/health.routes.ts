import { Router } from 'express';
import { checkDatabaseHealth } from '../db/index.js';
import { checkRedisHealth } from '../redis/index.js';
import { sendSuccess } from '../utils/response.js';

export const healthRouter = Router();

healthRouter.get('/health', async (_req, res) => {
  const [dbHealth, redisHealth] = await Promise.all([
    checkDatabaseHealth(2000),
    checkRedisHealth(2000),
  ]);

  const isDbOk = dbHealth.status === 'healthy';
  const isRedisOk = redisHealth.status === 'healthy';

  const overallStatus = isDbOk && isRedisOk ? 'healthy' : 'degraded';

  const payload = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    services: {
      api: {
        status: 'healthy',
        version: '1.0.0',
        nodeVersion: process.version,
      },
      database: dbHealth,
      redis: redisHealth,
    },
  };

  // Return HTTP 200 even if services are degraded so client/orchestrator can inspect service status
  return sendSuccess(res, payload, 200);
});
