import { FastifyInstance } from 'fastify';
import { EnvController } from './env.controller.js';
import { verifyAgentAuth } from '../../middleware/auth.js';

export async function envRoutes(fastify: FastifyInstance) {
  // Enforce machine-to-machine authentication across all host environment endpoints
  fastify.addHook('preHandler', verifyAgentAuth);

  // Environment Variable Endpoints
  fastify.post('/hosts/:hostId/env', EnvController.setVariables);
  fastify.delete('/hosts/:hostId/env/:key', EnvController.removeVariable);
}
