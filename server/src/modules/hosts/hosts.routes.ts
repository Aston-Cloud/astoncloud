import { Router } from 'express';
import { HostsController } from './hosts.controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { createHostSchema, updateHostSchema, hostActionSchema } from './hosts.schema.js';

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
hostsRouter.get('/:id/logs', HostsController.getLogs);
