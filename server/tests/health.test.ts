import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { closeDatabasePool } from '../src/db/index.js';
import { closeRedisClient } from '../src/redis/index.js';

describe('Aston Cloud Backend Foundation API', () => {
  const app = createApp();

  afterAll(async () => {
    await Promise.allSettled([closeDatabasePool(), closeRedisClient()]);
  });

  it('GET / should return 200 and API info', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Aston Cloud Backend API');
    expect(res.body.data.runtimes).toContain('Node.js');
    expect(res.body.data.runtimes).toContain('Bun');
    expect(res.body.data.runtimes).toContain('Python');
  });

  it('GET /api/v1/health should return health check payload with services', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('status');
    expect(res.body.data).toHaveProperty('timestamp');
    expect(res.body.data).toHaveProperty('services');
    expect(res.body.data.services.api.status).toBe('healthy');
    expect(res.body.data.services).toHaveProperty('database');
    expect(res.body.data.services).toHaveProperty('redis');
  });

  it('GET /api/v1/unknown-endpoint should return 404 with structured error', async () => {
    const res = await request(app).get('/api/v1/unknown-endpoint');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toHaveProperty('message');
    expect(res.body.error.code).toBe('NotFoundError');
  });
});
