import { Router } from 'express';
import { PlansController } from './plans.controller.js';

export const plansRouter = Router();

// GET /api/v1/plans
plansRouter.get('/', PlansController.listPlans);
