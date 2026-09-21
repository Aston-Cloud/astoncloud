import { buildApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { dockerService } from './services/docker.service.js';

async function startServer() {
  const app = buildApp();

  try {
    // Pre-initialize DockerService
    await dockerService.initialize();

    await app.listen({
      port: env.PORT,
      host: env.HOST,
    });

    logger.info(`[NodeAgent] Aston Cloud Node Agent is running on http://${env.HOST}:${env.PORT}`);
    logger.info(`[NodeAgent] Node ID: ${env.NODE_ID} | Region: ${env.NODE_REGION} | Env: ${env.NODE_ENV}`);
  } catch (err) {
    logger.error({ err }, '[NodeAgent] Failed to start Node Agent server');
    process.exit(1);
  }

  // Graceful shutdown
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
  for (const sig of signals) {
    process.on(sig, async () => {
      logger.info(`[NodeAgent] Received ${sig}, initiating graceful shutdown...`);
      try {
        await app.close();
        logger.info('[NodeAgent] HTTP server closed cleanly.');
        process.exit(0);
      } catch (closeErr) {
        logger.error({ err: closeErr }, '[NodeAgent] Error during shutdown');
        process.exit(1);
      }
    });
  }
}

startServer();
