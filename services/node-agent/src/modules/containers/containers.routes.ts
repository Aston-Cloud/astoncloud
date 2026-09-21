import { FastifyInstance } from 'fastify';
import { ContainersController } from './containers.controller.js';
import { verifyAgentAuth } from '../../middleware/auth.js';

export async function containerRoutes(fastify: FastifyInstance) {
  // Enforce machine-to-machine authentication across all container management endpoints
  fastify.addHook('preHandler', verifyAgentAuth);

  // Container Lifecycle Endpoints
  fastify.post('/containers', ContainersController.create);
  fastify.get('/containers/:id', ContainersController.get);
  fastify.post('/containers/:id/start', ContainersController.start);
  fastify.post('/containers/:id/stop', ContainersController.stop);
  fastify.post('/containers/:id/restart', ContainersController.restart);
  fastify.delete('/containers/:id', ContainersController.remove);

  // Container Inspection & Observability Endpoints
  fastify.get('/containers/:id/logs', ContainersController.logs);
  fastify.get('/containers/:id/stats', ContainersController.stats);
}
