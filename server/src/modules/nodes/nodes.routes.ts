import { Router } from 'express';
import { NodesController } from './nodes.controller.js';

export const nodesRouter = Router();

// GET /api/v1/nodes
nodesRouter.get('/', NodesController.listNodes);
