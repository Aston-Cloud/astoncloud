import { Router } from 'express';
import { healthRouter } from './health.routes.js';
import { authRouter } from '../modules/auth/auth.routes.js';
import { usersRouter } from '../modules/users/users.routes.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { sendSuccess } from '../utils/response.js';

export const apiRouter = Router();

// 1. Health check: /api/v1/health
apiRouter.use(healthRouter);

// 2. Authentication: /api/v1/auth/* (register, login, logout, me)
apiRouter.use('/auth', authRouter);

// 3. Users: /api/v1/users/* (me)
apiRouter.use('/users', usersRouter);

// 4. Admin preview endpoint (for Admin Authorization & Isolation verification)
apiRouter.get('/admin/stats', requireAuth, requireRole('ADMIN'), (_req, res) => {
  sendSuccess(res, {
    system: 'Aston Cloud Admin Panel API',
    authorizedRole: 'ADMIN',
    clusterStatus: 'operational',
  });
});
