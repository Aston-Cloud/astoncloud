import { Router } from 'express';
import { HostsController } from './hosts.controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import {
  createHostSchema,
  updateHostSchema,
  hostActionSchema,
  hostLogsQuerySchema,
  listFilesQuerySchema,
  readFileQuerySchema,
  writeFileSchema,
  createDirectorySchema,
  deleteFileQuerySchema,
  renameFileSchema,
  uploadFileSchema,
  createEnvVariableSchema,
  updateEnvVariableSchema,
  envVariableParamsSchema,
} from './hosts.schema.js';

export const hostsRouter = Router();

// All Host management routes require authentication
hostsRouter.use(requireAuth);

// GET /api/v1/hosts - List customer's hosts
hostsRouter.get('/', HostsController.listHosts);

// POST /api/v1/hosts - Create host (initial status: PENDING)
hostsRouter.post('/', validate({ body: createHostSchema }), HostsController.createHost);

// GET /api/v1/hosts/:id - Get host details
hostsRouter.get('/:id', HostsController.getHost);

// PATCH /api/v1/hosts/:id - Update host settings
hostsRouter.patch('/:id', validate({ body: updateHostSchema }), HostsController.updateHost);

// DELETE /api/v1/hosts/:id - Delete host
hostsRouter.delete('/:id', HostsController.deleteHost);

// POST /api/v1/hosts/:id/actions - Execute lifecycle action (start, stop, restart)
hostsRouter.post('/:id/actions', validate({ body: hostActionSchema }), HostsController.executeAction);

// GET /api/v1/hosts/:id/stats - Get container live stats
hostsRouter.get('/:id/stats', HostsController.getStats);

// GET /api/v1/hosts/:id/logs - Get container live logs
hostsRouter.get('/:id/logs', validate({ query: hostLogsQuerySchema }), HostsController.getLogs);

// GET /api/v1/hosts/:id/logs/stream - Server-Sent Events (SSE) live logs stream
hostsRouter.get('/:id/logs/stream', HostsController.streamLogs);

// ==========================================
// HOST FILE MANAGER ROUTES
// ==========================================

// GET /api/v1/hosts/:id/files - List directory entries
hostsRouter.get('/:id/files', validate({ query: listFilesQuerySchema }), HostsController.listFiles);

// GET /api/v1/hosts/:id/files/content - Read file content
hostsRouter.get('/:id/files/content', validate({ query: readFileQuerySchema }), HostsController.readFile);

// PUT /api/v1/hosts/:id/files/content - Write file content
hostsRouter.put('/:id/files/content', validate({ body: writeFileSchema }), HostsController.writeFile);

// POST /api/v1/hosts/:id/files/directory - Create directory
hostsRouter.post('/:id/files/directory', validate({ body: createDirectorySchema }), HostsController.createDirectory);

// DELETE /api/v1/hosts/:id/files - Delete file or directory
hostsRouter.delete('/:id/files', validate({ query: deleteFileQuerySchema }), HostsController.deleteFile);

// POST /api/v1/hosts/:id/files/rename - Rename file or directory
hostsRouter.post('/:id/files/rename', validate({ body: renameFileSchema }), HostsController.renameFile);

// POST /api/v1/hosts/:id/files/upload - Upload file
hostsRouter.post('/:id/files/upload', validate({ body: uploadFileSchema }), HostsController.uploadFile);

// GET /api/v1/hosts/:id/files/download - Download file
hostsRouter.get('/:id/files/download', validate({ query: readFileQuerySchema }), HostsController.downloadFile);

// ==========================================
// HOST ENVIRONMENT VARIABLES ROUTES (MILESTONE 9)
// ==========================================

// GET /api/v1/hosts/:id/variables - List host environment variables (values masked)
hostsRouter.get('/:id/variables', HostsController.listVariables);

// POST /api/v1/hosts/:id/variables - Create an encrypted environment variable
hostsRouter.post(
  '/:id/variables',
  validate({ body: createEnvVariableSchema }),
  HostsController.createVariable
);

// PATCH /api/v1/hosts/:id/variables/:variableId - Update variable key or value
hostsRouter.patch(
  '/:id/variables/:variableId',
  validate({ params: envVariableParamsSchema, body: updateEnvVariableSchema }),
  HostsController.updateVariable
);

// DELETE /api/v1/hosts/:id/variables/:variableId - Delete variable
hostsRouter.delete(
  '/:id/variables/:variableId',
  validate({ params: envVariableParamsSchema }),
  HostsController.deleteVariable
);

