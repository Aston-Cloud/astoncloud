import { z } from 'zod';

export const RegisterNodeSchema = z.object({
  id: z
    .string()
    .min(2, 'Mã Node tối thiểu 2 ký tự')
    .max(50, 'Mã Node tối đa 50 ký tự')
    .regex(/^[a-z0-9-]+$/, 'Mã Node chỉ bao gồm chữ thường, số và dấu gạch ngang')
    .optional(),
  name: z.string().min(2, 'Tên Node tối thiểu 2 ký tự').max(100, 'Tên Node tối đa 100 ký tự'),
  hostname: z.string().min(2, 'Hostname tối thiểu 2 ký tự').max(255, 'Hostname tối đa 255 ký tự'),
  region: z.string().min(2, 'Vùng (Region) tối thiểu 2 ký tự').max(50, 'Vùng tối đa 50 ký tự'),
  ipAddress: z.string().min(7, 'Địa chỉ IP tối thiểu 7 ký tự').max(45, 'Địa chỉ IP tối đa 45 ký tự'),
  agentUrl: z.string().url('URL Node Agent không hợp lệ').default('http://127.0.0.1:5001'),
  totalCpu: z.coerce
    .number()
    .positive('Số lượng CPU phải lớn hơn 0')
    .min(1, 'Node phải có ít nhất 1 vCPU')
    .max(128, 'Node tối đa 128 vCPU'),
  totalRamMb: z.coerce
    .number()
    .int('RAM phải là số nguyên')
    .positive('RAM phải lớn hơn 0')
    .min(512, 'Node phải có ít nhất 512 MB RAM')
    .max(1048576, 'Node tối đa 1,048,576 MB RAM (1 TB)'),
  totalDiskMb: z.coerce
    .number()
    .int('Dung lượng ổ đĩa phải là số nguyên')
    .positive('Dung lượng ổ đĩa phải lớn hơn 0')
    .min(10240, 'Node phải có ít nhất 10,240 MB ổ đĩa (10 GB)')
    .max(104857600, 'Node tối đa 100 TB ổ đĩa'),
});

export type RegisterNodeInput = z.infer<typeof RegisterNodeSchema>;

export const NodeHeartbeatSchema = z.object({
  status: z.enum(['ONLINE', 'MAINTENANCE', 'DRAINING', 'OFFLINE']).optional(),
  cpuCapacity: z.coerce.number().positive().optional(),
  ramCapacityMb: z.coerce.number().int().positive().optional(),
  diskCapacityMb: z.coerce.number().int().positive().optional(),
  availableCpu: z.coerce.number().min(0).optional(),
  availableRamMb: z.coerce.number().int().min(0).optional(),
  availableDiskMb: z.coerce.number().int().min(0).optional(),
  agentVersion: z.string().max(50).default('1.0.0'),
  timestamp: z.string().optional(),
});

export type NodeHeartbeatInput = z.infer<typeof NodeHeartbeatSchema>;

export const UpdateNodeStatusSchema = z.object({
  status: z.enum(['ONLINE', 'MAINTENANCE', 'DRAINING', 'OFFLINE']),
  reason: z.string().max(255).optional(),
});

export type UpdateNodeStatusInput = z.infer<typeof UpdateNodeStatusSchema>;
