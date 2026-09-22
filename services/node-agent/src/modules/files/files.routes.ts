import { FastifyInstance } from 'fastify';
import { FilesController } from './files.controller.js';
import { verifyAgentAuth } from '../../middleware/auth.js';

export async function fileRoutes(fastify: FastifyInstance) {
  // Enforce machine-to-machine authentication across all host filesystem endpoints
  fastify.addHook('preHandler', verifyAgentAuth);

  // Filesystem Operations Endpoints
  fastify.get('/hosts/:hostId/files', FilesController.list);
  fastify.get('/hosts/:hostId/files/content', FilesController.read);
  fastify.put('/hosts/:hostId/files/content', FilesController.write);
  fastify.post('/hosts/:hostId/files/directory', FilesController.createDir);
  fastify.delete('/hosts/:hostId/files', FilesController.remove);
  fastify.post('/hosts/:hostId/files/rename', FilesController.rename);
  fastify.post('/hosts/:hostId/files/upload', FilesController.upload);
  fastify.get('/hosts/:hostId/files/download', FilesController.download);
}
