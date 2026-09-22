import { Router } from 'express';
import { NodeAgentController } from './node-agent.controller.js';

export const nodeAgentRouter = Router();

// POST /api/v1/node-agent/heartbeat
nodeAgentRouter.post('/heartbeat', NodeAgentController.handleHeartbeat);
