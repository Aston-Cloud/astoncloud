import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { AdminController } from './admin.controller.js';

export const adminRouter = Router();

// Enforce authentication & ADMIN role for ALL admin routes
adminRouter.use(requireAuth, requireRole('ADMIN'));

// 1. Dashboard Stats
adminRouter.get('/dashboard/stats', AdminController.getDashboardStats);
adminRouter.get('/stats', AdminController.getDashboardStats); // Backward compatibility

// 2. User Management
adminRouter.get('/users', AdminController.listUsers);
adminRouter.get('/users/:userId', AdminController.getUserDetail);
adminRouter.post('/users/:userId/status', AdminController.updateUserStatus);
adminRouter.patch('/users/:userId/role', AdminController.updateUserRole);

// 3. Host Management
adminRouter.get('/hosts', AdminController.listHosts);
adminRouter.post('/hosts/:hostId/actions', AdminController.executeHostAction);

// 4. Node Management
adminRouter.get('/nodes', AdminController.listNodes);
adminRouter.post('/nodes', AdminController.registerNode);
adminRouter.get('/nodes/:nodeId', AdminController.getNodeDetails);
adminRouter.put('/nodes/:nodeId/status', AdminController.updateNodeStatus);
adminRouter.post('/nodes/:nodeId/status', AdminController.updateNodeStatus); // Backward compatibility

// 5. Plan Management
adminRouter.get('/plans', AdminController.listPlans);
adminRouter.post('/plans', AdminController.createPlan);
adminRouter.patch('/plans/:planId', AdminController.updatePlan);
adminRouter.patch('/plans/:planId/status', AdminController.togglePlanStatus);

// 6. Subscription & Invoice Inspection
adminRouter.get('/subscriptions', AdminController.listSubscriptions);
adminRouter.get('/invoices', AdminController.listInvoices);

// 7. Domain & Backup Management
adminRouter.get('/domains', AdminController.listDomains);
adminRouter.delete('/domains/:domainId', AdminController.deleteDomain);
adminRouter.get('/backups', AdminController.listBackups);

// 8. Audit Logs / Activity
adminRouter.get('/activity', AdminController.listActivityLogs);
adminRouter.get('/logs', AdminController.listActivityLogs);

// 9. Platform Settings
adminRouter.get('/settings', AdminController.getSettings);
adminRouter.patch('/settings', AdminController.updateSettings);
