import type { Request, Response, NextFunction } from 'express';
import { AdminService } from './admin.service.js';
import { sendSuccess } from '../../utils/response.js';
import {
  userListQuerySchema,
  updateUserStatusSchema,
  updateUserRoleSchema,
  hostListQuerySchema,
  hostActionSchema,
  nodeActionSchema,
  createPlanSchema,
  updatePlanSchema,
  planStatusSchema,
  activityQuerySchema,
  updateSettingsSchema,
} from './admin.schema.js';

export class AdminController {
  public static async getDashboardStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await AdminService.getDashboardStats();
      sendSuccess(res, stats);
    } catch (err) {
      next(err);
    }
  }

  // Users
  public static async listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = userListQuerySchema.parse(req.query);
      const result = await AdminService.listUsers(query);
      sendSuccess(res, result.users, 200, { pagination: result.pagination });
    } catch (err) {
      next(err);
    }
  }

  public static async getUserDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = String(req.params.userId);
      const result = await AdminService.getUserDetail(userId);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  public static async updateUserStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = String(req.params.userId);
      const input = updateUserStatusSchema.parse(req.body);
      const admin = { id: req.user!.id, email: req.user!.email };
      const user = await AdminService.updateUserStatus(userId, input, admin, req.ip);
      sendSuccess(res, { message: 'Cập nhật trạng thái người dùng thành công', user });
    } catch (err) {
      next(err);
    }
  }

  public static async updateUserRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = String(req.params.userId);
      const input = updateUserRoleSchema.parse(req.body);
      const admin = { id: req.user!.id, email: req.user!.email };
      const user = await AdminService.updateUserRole(userId, input, admin, req.ip);
      sendSuccess(res, { message: 'Cập nhật vai trò người dùng thành công', user });
    } catch (err) {
      next(err);
    }
  }

  // Hosts
  public static async listHosts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = hostListQuerySchema.parse(req.query);
      const result = await AdminService.listAllHosts(query);
      sendSuccess(res, result.hosts, 200, { pagination: result.pagination });
    } catch (err) {
      next(err);
    }
  }

  public static async executeHostAction(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hostId = String(req.params.hostId);
      const { action } = hostActionSchema.parse(req.body);
      const admin = { id: req.user!.id, email: req.user!.email };
      const result = await AdminService.executeHostAction(hostId, action, admin, req.ip);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  // Nodes
  public static async listNodes(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const nodes = await AdminService.listAllNodes();
      sendSuccess(res, nodes);
    } catch (err) {
      next(err);
    }
  }

  public static async updateNodeStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const nodeId = String(req.params.nodeId);
      const { status } = nodeActionSchema.parse(req.body);
      const admin = { id: req.user!.id, email: req.user!.email };
      const node = await AdminService.updateNodeStatus(nodeId, status, admin, req.ip);
      sendSuccess(res, { message: `Cập nhật trạng thái cụm node thành ${status} thành công`, node });
    } catch (err) {
      next(err);
    }
  }

  // Plans
  public static async listPlans(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const plans = await AdminService.listAllPlans();
      sendSuccess(res, plans);
    } catch (err) {
      next(err);
    }
  }

  public static async createPlan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = createPlanSchema.parse(req.body);
      const admin = { id: req.user!.id, email: req.user!.email };
      const plan = await AdminService.createPlan(input, admin, req.ip);
      sendSuccess(res, plan, 201);
    } catch (err) {
      next(err);
    }
  }

  public static async updatePlan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const planId = String(req.params.planId);
      const input = updatePlanSchema.parse(req.body);
      const admin = { id: req.user!.id, email: req.user!.email };
      const plan = await AdminService.updatePlan(planId, input, admin, req.ip);
      sendSuccess(res, plan);
    } catch (err) {
      next(err);
    }
  }

  public static async togglePlanStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const planId = String(req.params.planId);
      const { isActive } = planStatusSchema.parse(req.body);
      const admin = { id: req.user!.id, email: req.user!.email };
      const result = await AdminService.togglePlanStatus(planId, isActive, admin, req.ip);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  // Subscriptions & Invoices
  public static async listSubscriptions(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subs = await AdminService.listAllSubscriptions();
      sendSuccess(res, subs);
    } catch (err) {
      next(err);
    }
  }

  public static async listInvoices(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const invoices = await AdminService.listAllInvoices();
      sendSuccess(res, invoices);
    } catch (err) {
      next(err);
    }
  }

  // Domains & Backups
  public static async listDomains(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const domains = await AdminService.listAllDomains();
      sendSuccess(res, domains);
    } catch (err) {
      next(err);
    }
  }

  public static async deleteDomain(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const domainId = String(req.params.domainId);
      const admin = { id: req.user!.id, email: req.user!.email };
      const result = await AdminService.deleteDomain(domainId, admin, req.ip);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  public static async listBackups(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const backups = await AdminService.listAllBackups();
      sendSuccess(res, backups);
    } catch (err) {
      next(err);
    }
  }

  // Activity & Settings
  public static async listActivityLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = activityQuerySchema.parse(req.query);
      const result = await AdminService.listActivityLogs(query);
      sendSuccess(res, result.activities, 200, { pagination: result.pagination });
    } catch (err) {
      next(err);
    }
  }

  public static async getSettings(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const settings = await AdminService.getSystemSettings();
      sendSuccess(res, settings);
    } catch (err) {
      next(err);
    }
  }

  public static async updateSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = updateSettingsSchema.parse(req.body);
      const admin = { id: req.user!.id, email: req.user!.email };
      const settings = await AdminService.updateSystemSettings(input, admin, req.ip);
      sendSuccess(res, { message: 'Cập nhật cấu hình hệ thống thành công', settings });
    } catch (err) {
      next(err);
    }
  }
}
