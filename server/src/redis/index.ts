import { Redis } from 'ioredis';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export interface RedisHealth {
  status: 'healthy' | 'degraded' | 'disconnected';
  latencyMs?: number;
  mode?: string;
  error?: string;
}

let redisInstance: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisInstance) {
    const options = {
      connectTimeout: Math.min(env.REDIS_CONNECT_TIMEOUT_MS, 3000),
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: true,
      retryStrategy(times: number) {
        if (times > 2) {
          return null; // Stop retrying if Redis is not running
        }
        return 500;
      },
    };

    if (env.REDIS_URL) {
      redisInstance = new Redis(env.REDIS_URL, options);
    } else {
      redisInstance = new Redis({
        host: env.REDIS_HOST,
        port: env.REDIS_PORT,
        password: env.REDIS_PASSWORD || undefined,
        db: env.REDIS_DB,
        ...options,
      });
    }

    redisInstance.on('connect', () => {
      logger.info('Connected to Redis');
    });

    redisInstance.on('ready', () => {
      logger.info('Redis connection ready');
    });

    redisInstance.on('error', (err) => {
      logger.warn({ err: err.message }, 'Redis connection warning/error');
    });

    redisInstance.on('close', () => {
      logger.warn('Redis connection closed');
    });
  }

  return redisInstance;
}

export async function checkRedisHealth(timeoutMs = 1500): Promise<RedisHealth> {
  const client = getRedisClient();
  const start = performance.now();

  try {
    if (client.status === 'wait') {
      await Promise.race([
        client.connect(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Redis connection timed out after ${timeoutMs}ms`)), timeoutMs)
        ),
      ]).catch((err) => {
        if (!err.message?.includes('already connected') && !err.message?.includes('status is connecting')) {
          throw err;
        }
      });
    }

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Redis ping timed out after ${timeoutMs}ms`)), timeoutMs);
    });

    const pong = await Promise.race([client.ping(), timeoutPromise]);
    const latencyMs = Math.round(performance.now() - start);

    if (pong === 'PONG') {
      return {
        status: 'healthy',
        latencyMs,
        mode: client.status,
      };
    }

    return {
      status: 'degraded',
      latencyMs,
      error: `Unexpected ping response: ${pong}`,
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown Redis error';
    return {
      status: 'disconnected',
      error: errorMessage,
    };
  }
}

export async function closeRedisClient(): Promise<void> {
  if (redisInstance) {
    logger.info('Closing Redis connection...');
    try {
      redisInstance.disconnect();
    } catch {
      // ignore
    }
    redisInstance = null;
    logger.info('Redis connection closed');
  }
}
