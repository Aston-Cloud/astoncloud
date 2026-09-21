import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDatabasePool, closeDatabasePool } from './index.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations(): Promise<void> {
  const pool = getDatabasePool();
  const client = await pool.connect();

  try {
    logger.info('Checking schema_migrations table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    const migrationsDir = path.resolve(__dirname, 'migrations');
    const files = await fs.readdir(migrationsDir);
    const sqlFiles = files.filter((f) => f.endsWith('.sql')).sort();

    const { rows: executedRows } = await client.query<{ name: string }>(
      'SELECT name FROM schema_migrations'
    );
    const executedSet = new Set(executedRows.map((r) => r.name));

    for (const file of sqlFiles) {
      if (executedSet.has(file)) {
        logger.info({ migration: file }, `Migration already executed: ${file}`);
        continue;
      }

      logger.info({ migration: file }, `Executing migration: ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sqlContent = await fs.readFile(filePath, 'utf-8');

      await client.query('BEGIN');
      try {
        await client.query(sqlContent);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        logger.info({ migration: file }, `Successfully applied migration: ${file}`);
      } catch (migrationErr) {
        await client.query('ROLLBACK');
        logger.error({ migration: file, err: migrationErr }, `Migration failed: ${file}`);
        throw migrationErr;
      }
    }

    logger.info('All database migrations applied successfully.');
  } finally {
    client.release();
  }
}

// Standalone CLI execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations()
    .then(async () => {
      await closeDatabasePool();
      process.exit(0);
    })
    .catch(async (err) => {
      logger.fatal({ err }, 'Migration run failed');
      await closeDatabasePool();
      process.exit(1);
    });
}
