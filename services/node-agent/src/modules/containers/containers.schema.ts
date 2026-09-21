import { z } from 'zod';

export const CreateContainerSchema = z.object({
  hostId: z
    .string({ required_error: 'hostId là bắt buộc' })
    .regex(/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/, {
      message: 'hostId chỉ được chứa chữ cái thường không dấu, số và gạch ngang (-), độ dài 3-63 ký tự',
    }),
  runtime: z.enum(['nodejs', 'bun', 'python'], {
    required_error: 'runtime phải là nodejs, bun hoặc python',
  }),
  version: z
    .string({ required_error: 'version là bắt buộc' })
    .min(1)
    .max(20),
  resources: z.object({
    cpuLimit: z
      .number({ required_error: 'cpuLimit là bắt buộc' })
      .min(0.1, 'cpuLimit tối thiểu là 0.1 vCPU')
      .max(8.0, 'cpuLimit tối đa là 8.0 vCPU'),
    memoryLimitMb: z
      .number({ required_error: 'memoryLimitMb là bắt buộc' })
      .int()
      .min(128, 'memoryLimitMb tối thiểu là 128 MB')
      .max(16384, 'memoryLimitMb tối đa là 16,384 MB (16 GB)'),
    diskLimitMb: z
      .number({ required_error: 'diskLimitMb là bắt buộc' })
      .int()
      .min(512, 'diskLimitMb tối thiểu là 512 MB')
      .max(102400, 'diskLimitMb tối đa là 102,400 MB (100 GB)'),
    pidsLimit: z
      .number()
      .int()
      .min(50)
      .max(500)
      .optional()
      .default(200),
  }),
  port: z
    .number({ required_error: 'port là bắt buộc' })
    .int()
    .min(1024, 'port phải nằm trong dải 1024 - 65535')
    .max(65535, 'port phải nằm trong dải 1024 - 65535'),
  env: z.record(z.string()).optional(),
});

export const ContainerParamsSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(128)
    .regex(/^[a-zA-Z0-9_-]+$/, {
      message: 'Định danh container chỉ được chứa chữ cái, số, gạch dưới và gạch ngang',
    }),
});

export const ContainerLogsQuerySchema = z.object({
  tail: z.coerce.number().int().min(1).max(1000).optional().default(100),
  since: z.coerce.number().int().positive().optional(),
});

export const ContainerTimeoutQuerySchema = z.object({
  timeout: z.coerce.number().int().min(1).max(60).optional().default(10),
});

export const ContainerDeleteQuerySchema = z.object({
  force: z
    .enum(['true', 'false', '1', '0'])
    .optional()
    .transform((v) => v === 'true' || v === '1'),
});

export type CreateContainerInput = z.infer<typeof CreateContainerSchema>;
export type ContainerParams = z.infer<typeof ContainerParamsSchema>;
export type ContainerLogsQuery = z.infer<typeof ContainerLogsQuerySchema>;
export type ContainerTimeoutQuery = z.infer<typeof ContainerTimeoutQuerySchema>;
export type ContainerDeleteQuery = z.infer<typeof ContainerDeleteQuerySchema>;
