import type { Server } from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { closeDatabasePool } from './db/index.js';
import { closeRedisClient } from './redis/index.js';

let server: Server | null = null;
let isShuttingDown = false;

async function gracefulShutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  const forceTimeout = setTimeout(() => {
    logger.error('Graceful shutdown timed out. Forcing exit.');
    process.exit(1);
  }, 10000);
  forceTimeout.unref();

  try {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server!.close((err) => {
          if (err) return reject(err);
          logger.info('HTTP server closed.');
          resolve();
        });
      });
    }

    await Promise.allSettled([closeDatabasePool(), closeRedisClient()]);
    logger.info('All database & cache connections closed gracefully.');
    process.exit(0);
  } catch (err) {
    logger.error({ err }, 'Error during graceful shutdown');
    process.exit(1);
  }
}

async function startServer(): Promise<void> {
  const app = createApp();

  server = app.listen(env.PORT, env.HOST, () => {
    logger.info(
      `🚀 Aston Cloud Backend API running at http://${env.HOST}:${env.PORT} [env: ${env.NODE_ENV}]`
    );
    logger.info(`👉 Health check endpoint: http://${env.HOST}:${env.PORT}/api/v1/health`);
  });

  process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => void gracefulShutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled Rejection detected');
  });

  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught Exception detected. Initiating emergency shutdown.');
    void gracefulShutdown('uncaughtException');
  });
}

void startServer();
