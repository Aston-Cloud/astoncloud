import { Router } from 'express';
import { healthRouter } from './health.routes.js';
import { authRouter } from '../modules/auth/auth.routes.js';
import { usersRouter } from '../modules/users/users.routes.js';
import { plansRouter } from '../modules/plans/plans.routes.js';
import { runtimesRouter } from '../modules/runtimes/runtimes.routes.js';
import { nodesRouter } from '../modules/nodes/nodes.routes.js';
import { hostsRouter } from '../modules/hosts/hosts.routes.js';
import { domainsRouter } from '../modules/domains/domains.routes.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { sendSuccess } from '../utils/response.js';

export const apiRouter = Router();

// 1. Health check: /api/v1/health
apiRouter.use(healthRouter);

// 2. Authentication: /api/v1/auth/* (register, login, logout, me)
apiRouter.use('/auth', authRouter);

// 3. Users: /api/v1/users/* (me)
apiRouter.use('/users', usersRouter);

// 4. Hosting Plans: /api/v1/plans
apiRouter.use('/plans', plansRouter);

// 5. Runtimes: /api/v1/runtimes
apiRouter.use('/runtimes', runtimesRouter);

// 6. Cluster Nodes: /api/v1/nodes
apiRouter.use('/nodes', nodesRouter);

// 7. Hosting Core: /api/v1/hosts/*
apiRouter.use('/hosts', hostsRouter);

// 8. Custom Domains: /api/v1/domains
apiRouter.use('/domains', domainsRouter);

// 9. Admin preview endpoint (for Admin Authorization & Isolation verification)
apiRouter.get('/admin/stats', requireAuth, requireRole('ADMIN'), (_req, res) => {
  sendSuccess(res, {
    system: 'Aston Cloud Admin Panel API',
    authorizedRole: 'ADMIN',
    clusterStatus: 'operational',
  });
});
