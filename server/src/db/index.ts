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

export async function query<R extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<pg.QueryResult<R>> {
  const pool = getDatabasePool();
  return pool.query<R>(text, params);
}

export async function checkDatabaseHealth(timeoutMs = 1500): Promise<DatabaseHealth> {
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
