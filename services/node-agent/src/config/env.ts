import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(5001),
  HOST: z.string().default('0.0.0.0'),
  NODE_ID: z.string().min(1).default('node-sg-edge-01'),
  NODE_REGION: z.string().min(1).default('Singapore'),
  AGENT_SECRET_KEY: z
    .string()
    .min(32, { message: 'AGENT_SECRET_KEY must be at least 32 characters long for security' })
    .default('aston-agent-secret-key-super-secure-32chars-min'),
  DOCKER_SOCKET_PATH: z.string().optional(),
  DATA_ROOT_PATH: z.string().default(process.platform === 'win32' ? 'C:/aston-cloud/hosts' : '/var/lib/aston/hosts'),
  DOCKER_SIMULATION_MODE: z
    .string()
    .optional()
    .transform((val) => val === 'true' || val === '1'),
});

export type EnvConfig = z.infer<typeof envSchema>;

function parseEnv(): EnvConfig {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const errorDetails = result.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    console.error(`[NodeAgent] Invalid environment configuration:\n${errorDetails}`);
    process.exit(1);
  }
  return result.data;
}

export const env = parseEnv();
