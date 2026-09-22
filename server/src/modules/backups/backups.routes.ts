import { Router } from 'express';
import { BackupsController } from './backups.controller.js';
import { requireAuth } from '../../middleware/auth.js';

export const backupsRouter = Router();

// Protect all backup endpoints with JWT authentication
backupsRouter.use(requireAuth);

// GET /api/v1/backups - List all backups belonging to the authenticated user
backupsRouter.get('/', BackupsController.listAllUserBackups);

export { BackupsController };
