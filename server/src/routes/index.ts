import { Router } from 'express';
import { healthRouter } from './health.routes.js';

export const apiRouter = Router();

// Health check endpoint: /api/v1/health
apiRouter.use(healthRouter);

// Future module routes will be mounted here:
// apiRouter.use('/auth', authRouter);
// apiRouter.use('/users', usersRouter);
// apiRouter.use('/hosts', hostsRouter);
// apiRouter.use('/plans', plansRouter);
// apiRouter.use('/domains', domainsRouter);
// apiRouter.use('/backups', backupsRouter);
// apiRouter.use('/billing', billingRouter);
