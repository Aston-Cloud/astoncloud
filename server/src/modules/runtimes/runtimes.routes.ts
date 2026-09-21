import { Router } from 'express';
import { RuntimesController } from './runtimes.controller.js';

export const runtimesRouter = Router();

// GET /api/v1/runtimes
runtimesRouter.get('/', RuntimesController.listRuntimes);
