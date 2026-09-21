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

export type CreateHostInput = z.infer<typeof createHostSchema>;
export type UpdateHostInput = z.infer<typeof updateHostSchema>;
export type HostActionInput = z.infer<typeof hostActionSchema>;
