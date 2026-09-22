import { z } from 'zod';

export const createBackupSchema = z.object({
  name: z
    .string()
    .trim()
    .max(100, 'Tên bản sao lưu không được vượt quá 100 ký tự')
    .optional(),
  backup_type: z.enum(['manual', 'automatic']).default('manual'),
});

export const backupParamsSchema = z.object({
  id: z.string().uuid('ID máy chủ không hợp lệ'),
  backupId: z.string().uuid('ID bản sao lưu không hợp lệ'),
});

export const listBackupsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type CreateBackupInput = z.infer<typeof createBackupSchema>;
export type BackupParams = z.infer<typeof backupParamsSchema>;
export type ListBackupsQuery = z.infer<typeof listBackupsQuerySchema>;
