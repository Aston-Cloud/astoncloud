import { z } from 'zod';

export const userListQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'DISABLED']).optional(),
  role: z.enum(['USER', 'ADMIN']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const updateUserStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED', 'DISABLED']),
  reason: z.string().min(3, 'Vui lòng nhập lý do thay đổi trạng thái tài khoản').max(500),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(['USER', 'ADMIN']),
});

export const hostListQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(['PROVISIONING', 'RUNNING', 'STOPPED', 'ERROR', 'DELETING']).optional(),
  runtime: z.string().optional(),
  node: z.string().optional(),
  region: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const hostActionSchema = z.object({
  action: z.enum(['start', 'stop', 'restart', 'delete']),
});

export const nodeActionSchema = z.object({
  status: z.enum(['ONLINE', 'OFFLINE', 'MAINTENANCE', 'DRAINING']),
});

export const createPlanSchema = z.object({
  id: z.string().min(2).max(50).regex(/^[a-z0-9_-]+$/, 'ID gói chỉ gồm ký tự thường, số, gạch nối'),
  name: z.string().min(2).max(100),
  description: z.string().max(500).default(''),
  priceMonthly: z.number().min(0, 'Giá không được âm'),
  priceYearly: z.number().min(0, 'Giá không được âm').optional(),
  ramMb: z.number().int().min(128, 'RAM tối thiểu 128 MB'),
  cpuCores: z.number().min(0.5, 'CPU tối thiểu 0.5 core'),
  diskMb: z.number().int().min(1024, 'Dung lượng ổ đĩa tối thiểu 1 GB'),
  bandwidthMb: z.number().int().min(1024).optional(),
  domainLimit: z.number().int().min(0).default(1),
  backupLimit: z.number().int().min(0).default(3),
});

export const updatePlanSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
  priceMonthly: z.number().min(0, 'Giá không được âm').optional(),
  priceYearly: z.number().min(0, 'Giá không được âm').optional(),
  ramMb: z.number().int().min(128).optional(),
  cpuCores: z.number().min(0.5).optional(),
  diskMb: z.number().int().min(1024).optional(),
  bandwidthMb: z.number().int().min(1024).optional(),
  domainLimit: z.number().int().min(0).optional(),
  backupLimit: z.number().int().min(0).optional(),
});

export const planStatusSchema = z.object({
  isActive: z.boolean(),
});

export const activityQuerySchema = z.object({
  search: z.string().optional(),
  action: z.string().optional(),
  actorId: z.string().optional(),
  targetType: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const updateSettingsSchema = z.object({
  platformName: z.string().min(2).max(100).optional(),
  supportEmail: z.string().email().optional(),
  defaultRegion: z.string().min(2).max(50).optional(),
  maintenanceMode: z.boolean().optional(),
  allowedRuntimes: z.array(z.string()).optional(),
  maxFreeHostsPerUser: z.number().int().min(0).max(5).optional(),
});

export type UserListQuery = z.infer<typeof userListQuerySchema>;
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
export type HostListQuery = z.infer<typeof hostListQuerySchema>;
export type HostActionInput = z.infer<typeof hostActionSchema>;
export type NodeActionInput = z.infer<typeof nodeActionSchema>;
export type CreatePlanInput = z.infer<typeof createPlanSchema>;
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
export type PlanStatusInput = z.infer<typeof planStatusSchema>;
export type ActivityQuery = z.infer<typeof activityQuerySchema>;
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
