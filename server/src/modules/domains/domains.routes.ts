import { Router } from 'express';
import { DomainsController } from './domains.controller.js';
import { requireAuth } from '../../middleware/auth.js';

export const domainsRouter = Router();

domainsRouter.use(requireAuth);

// GET /api/v1/domains - List all domains owned by the authenticated user
domainsRouter.get('/', DomainsController.listUserAllDomains);
