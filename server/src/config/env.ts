import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server root or current working directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().default('127.0.0.1'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  CORS_ORIGIN: z.string().default('http://localhost:5173,http://127.0.0.1:5173'),

  // PostgreSQL
  DATABASE_URL: z.string().optional(),
  PG_HOST: z.string().default('localhost'),
  PG_PORT: z.coerce.number().int().positive().default(5432),
  PG_USER: z.string().default('aston_admin'),
  PG_PASSWORD: z.string().default('aston_secret_pass'),
  PG_DATABASE: z.string().default('aston_cloud_dev'),
  PG_SSL: z.coerce.boolean().default(false),
  PG_MAX_POOL: z.coerce.number().int().positive().default(20),
  PG_IDLE_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
  PG_CONNECTION_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),

  // Redis
  REDIS_URL: z.string().optional(),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PASSWORD: z.string().optional().default(''),
  REDIS_DB: z.coerce.number().int().min(0).default(0),
  REDIS_CONNECT_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),

  // Auth & Security
  JWT_SECRET: z.string().min(16).default('aston_cloud_super_secret_jwt_key_2026_dev_environment_min_32_chars'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(4).max(16).default(12),

  // Node Agent Client
  NODE_AGENT_MODE: z.enum(['mock', 'remote']).default('mock'),
  NODE_AGENT_URL: z.string().default('http://127.0.0.1:5001'),
  NODE_AGENT_KEY: z.string().default('aston-agent-secret-key-super-secure-32chars-min'),
  NODE_AGENT_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables detected:', JSON.stringify(parsed.error.format(), null, 2));
  throw new Error('Environment configuration validation failed');
}

export const env = parsed.data;
export type Env = typeof env;
