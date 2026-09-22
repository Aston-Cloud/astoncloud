import { z } from 'zod';

export const createHostSchema = z.object({
  name: z
    .string({ required_error: 'Tên máy chủ là bắt buộc' })
    .trim()
    .min(3, 'Tên máy chủ phải có ít nhất 3 ký tự')
    .max(50, 'Tên máy chủ không được vượt quá 50 ký tự')
    .regex(
      /^[a-z0-9-]+$/,
      'Tên máy chủ chỉ được chứa chữ cái thường không dấu, chữ số và dấu gạch nối (-)'
    ),
  runtimeId: z
    .string({ required_error: 'Môi trường thực thi (runtime) là bắt buộc' })
    .trim()
    .min(1, 'Runtime không được để trống'),
  runtimeVersion: z
    .string({ required_error: 'Phiên bản runtime là bắt buộc' })
    .trim()
    .min(1, 'Phiên bản runtime không được để trống'),
  planId: z
    .string({ required_error: 'Gói dịch vụ (plan) là bắt buộc' })
    .trim()
    .min(1, 'Gói dịch vụ không được để trống'),
  region: z
    .string()
    .trim()
    .optional()
    .default('Singapore'),
  autoRestart: z
    .boolean()
    .optional()
    .default(true),
  idempotencyKey: z
    .string()
    .trim()
    .max(128)
    .optional(),
});

export const updateHostSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, 'Tên máy chủ phải có ít nhất 3 ký tự')
    .max(50, 'Tên máy chủ không được vượt quá 50 ký tự')
    .regex(
      /^[a-z0-9-]+$/,
      'Tên máy chủ chỉ được chứa chữ cái thường không dấu, chữ số và dấu gạch nối (-)'
    )
    .optional(),
  autoRestart: z.boolean().optional(),
});

export const hostActionSchema = z.object({
  action: z.enum(['start', 'stop', 'restart'], {
    required_error: 'Hành động điều khiển là bắt buộc (start, stop, restart)',
  }),
});

export const hostLogsQuerySchema = z.object({
  tail: z.coerce.number().int().min(1).max(1000).optional().default(100),
  since: z.coerce.number().int().positive().optional(),
  level: z.enum(['all', 'info', 'warn', 'error', 'debug']).optional().default('all'),
  search: z.string().trim().max(100).optional(),
});

// Host File Manager Schemas
export const listFilesQuerySchema = z.object({
  path: z.string().optional().default('/'),
});

export const readFileQuerySchema = z.object({
  path: z.string({ required_error: 'Tham số path là bắt buộc' }).min(1, 'Đường dẫn không được để trống'),
});

export const writeFileSchema = z.object({
  path: z.string({ required_error: 'Đường dẫn tệp tin path là bắt buộc' }).min(1),
  content: z.string({ required_error: 'Nội dung tệp tin content là bắt buộc' }),
  encoding: z.enum(['utf-8', 'base64']).optional().default('utf-8'),
});

export const createDirectorySchema = z.object({
  path: z.string({ required_error: 'Đường dẫn thư mục path là bắt buộc' }).min(1),
});

export const deleteFileQuerySchema = z.object({
  path: z.string({ required_error: 'Tham số path là bắt buộc' }).min(1),
});

export const renameFileSchema = z.object({
  fromPath: z.string({ required_error: 'Đường dẫn nguồn fromPath là bắt buộc' }).min(1),
  toPath: z.string({ required_error: 'Đường dẫn đích toPath là bắt buộc' }).min(1),
});

export const uploadFileSchema = z.object({
  destinationPath: z.string().optional().default('/'),
  filename: z.string({ required_error: 'Tên tệp tin filename là bắt buộc' }).min(1),
  content: z.string({ required_error: 'Nội dung content là bắt buộc' }),
  encoding: z.enum(['utf-8', 'base64']).optional().default('utf-8'),
});

export type CreateHostInput = z.infer<typeof createHostSchema>;
export type UpdateHostInput = z.infer<typeof updateHostSchema>;
export type HostActionInput = z.infer<typeof hostActionSchema>;
export type HostLogsQuery = z.infer<typeof hostLogsQuerySchema>;
export type ListFilesQuery = z.infer<typeof listFilesQuerySchema>;
export type ReadFileQuery = z.infer<typeof readFileQuerySchema>;
export type WriteFileInput = z.infer<typeof writeFileSchema>;
export type CreateDirectoryInput = z.infer<typeof createDirectorySchema>;
export type RenameFileInput = z.infer<typeof renameFileSchema>;
export type UploadFileInput = z.infer<typeof uploadFileSchema>;
