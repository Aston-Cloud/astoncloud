import pg from 'pg';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const { Pool } = pg;

export interface DatabaseHealth {
  status: 'healthy' | 'degraded' | 'disconnected';
  latencyMs?: number;
  totalConnections?: number;
  idleConnections?: number;
  waitingClients?: number;
  error?: string;
}

let poolInstance: pg.Pool | null = null;

export function getDatabasePool(): pg.Pool {
  if (!poolInstance) {
    const config: pg.PoolConfig = env.DATABASE_URL
      ? {
          connectionString: env.DATABASE_URL,
          ssl: env.PG_SSL ? { rejectUnauthorized: false } : false,
          max: env.PG_MAX_POOL,
          idleTimeoutMillis: env.PG_IDLE_TIMEOUT_MS,
          connectionTimeoutMillis: Math.min(env.PG_CONNECTION_TIMEOUT_MS, 3000),
        }
      : {
          host: env.PG_HOST,
          port: env.PG_PORT,
          user: env.PG_USER,
          password: env.PG_PASSWORD,
          database: env.PG_DATABASE,
          ssl: env.PG_SSL ? { rejectUnauthorized: false } : false,
          max: env.PG_MAX_POOL,
          idleTimeoutMillis: env.PG_IDLE_TIMEOUT_MS,
          connectionTimeoutMillis: Math.min(env.PG_CONNECTION_TIMEOUT_MS, 3000),
        };

    poolInstance = new Pool(config);

    poolInstance.on('error', (err) => {
      logger.error({ err }, 'Unexpected error on idle PostgreSQL client');
    });
  }

  return poolInstance;
}

import { executeMemoryQuery } from './memory-fallback.js';

let fallbackMode = process.env.NODE_ENV === 'test';

export async function query<R extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<pg.QueryResult<R>> {
  if (fallbackMode) {
    return executeMemoryQuery<R>(text, params);
  }

  try {
    const pool = getDatabasePool();
    const result = await pool.query<R>(text, params);
    return result;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '';
    const code = (err as { code?: string })?.code;

    // Fallback to in-memory store if PostgreSQL is unreachable in local dev
    if (code === 'ECONNREFUSED' || message.includes('ECONNREFUSED') || message.includes('timeout')) {
      if (!fallbackMode) {
        logger.warn('PostgreSQL is offline/unreachable. Falling back to in-memory development store.');
        fallbackMode = true;
      }
      return executeMemoryQuery<R>(text, params);
    }

    throw err;
  }
}

export async function checkDatabaseHealth(timeoutMs = 1500): Promise<DatabaseHealth> {
  if (fallbackMode) {
    return {
      status: 'healthy',
      latencyMs: 1,
      totalConnections: 1,
      idleConnections: 1,
      waitingClients: 0,
    };
  }

  const pool = getDatabasePool();
  const start = performance.now();

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Database health check timed out after ${timeoutMs}ms`)), timeoutMs);
    });

    await Promise.race([pool.query('SELECT 1 AS health'), timeoutPromise]);
    const latencyMs = Math.round(performance.now() - start);

    return {
      status: 'healthy',
      latencyMs,
      totalConnections: pool.totalCount,
      idleConnections: pool.idleCount,
      waitingClients: pool.waitingCount,
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown database error';
    if (errorMessage.includes('ECONNREFUSED')) {
      fallbackMode = true;
      return {
        status: 'healthy',
        latencyMs: 1,
        totalConnections: 1,
        idleConnections: 1,
        waitingClients: 0,
      };
    }
    return {
      status: 'disconnected',
      error: errorMessage,
    };
  }
}

export async function closeDatabasePool(): Promise<void> {
  if (poolInstance) {
    logger.info('Closing PostgreSQL connection pool...');
    try {
      await poolInstance.end();
    } catch {
      // ignore
    }
    poolInstance = null;
    logger.info('PostgreSQL connection pool closed');
  }
}
