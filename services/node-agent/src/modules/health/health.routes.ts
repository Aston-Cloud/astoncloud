import { FastifyInstance } from 'fastify';
import { env } from '../../config/env.js';
import { dockerService } from '../../services/docker.service.js';

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/health', async (_request, reply) => {
    const isDockerAlive = await dockerService.ping();
    const info = await dockerService.getEngineInfo();

    return reply.status(200).send({
      success: true,
      data: {
        status: isDockerAlive ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        uptimeSeconds: Math.floor(process.uptime()),
        nodeId: env.NODE_ID,
        region: env.NODE_REGION,
        docker: {
          connected: isDockerAlive,
          driver: info.driver,
          mode: info.driver === 'dockerode' ? 'docker-engine' : 'simulated-driver',
        },
      },
    });
  });
}
