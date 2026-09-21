import os from 'node:os';
import { FastifyInstance } from 'fastify';
import { env } from '../../config/env.js';
import { dockerService } from '../../services/docker.service.js';
import { verifyAgentAuth } from '../../middleware/auth.js';
import { APPROVED_RUNTIMES } from '../../config/runtimes.js';

export async function infoRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/info',
    {
      preHandler: [verifyAgentAuth],
    },
    async (_request, reply) => {
      const dockerInfo = await dockerService.getEngineInfo();

      return reply.status(200).send({
        success: true,
        data: {
          agent: {
            name: 'Aston Cloud Node Agent',
            version: '1.0.0',
            nodeId: env.NODE_ID,
            region: env.NODE_REGION,
            port: env.PORT,
            status: 'ONLINE',
            secureMode: true,
          },
          system: {
            platform: process.platform,
            arch: process.arch,
            nodeVersion: process.version,
            uptimeSeconds: Math.floor(process.uptime()),
            memory: {
              totalMb: Math.round(os.totalmem() / (1024 * 1024)),
              freeMb: Math.round(os.freemem() / (1024 * 1024)),
            },
          },
          docker: {
            connected: dockerInfo.available,
            available: dockerInfo.available,
            driver: dockerInfo.driver,
            version: dockerInfo.version,
            containersRunning: dockerInfo.containersRunning,
            containersTotal: dockerInfo.containersTotal,
          },
          runtimes: Object.values(APPROVED_RUNTIMES).map((r) => ({
            runtime: r.id,
            name: r.name,
            defaultPort: r.defaultPort,
            versions: Object.keys(r.versions),
          })),
        },
      });
    }
  );
}
