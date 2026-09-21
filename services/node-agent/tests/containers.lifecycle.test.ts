import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { env } from '../src/config/env.js';

describe('Container Complete Lifecycle Suite', () => {
  let app: ReturnType<typeof buildApp>;
  const authHeaders = {
    'x-agent-key': env.AGENT_SECRET_KEY,
  };

  const hostId = 'test-lifecycle-host';
  let createdContainerId: string;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    // Cleanup if necessary
    if (createdContainerId) {
      await app.inject({
        method: 'DELETE',
        url: `/containers/${hostId}?force=true`,
        headers: authHeaders,
      });
    }
    await app.close();
  });

  it('1. POST /containers should create a new isolated container (201)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/containers',
      headers: authHeaders,
      payload: {
        hostId,
        runtime: 'nodejs',
        version: '20',
        port: 3001,
        resources: {
          cpuLimit: 1.5,
          memoryLimitMb: 1024,
          diskLimitMb: 5120,
          pidsLimit: 150,
        },
        env: {
          NODE_ENV: 'production',
        },
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(body.data.hostId).toBe(hostId);
    expect(body.data.status).toBe('created');
    expect(body.data.image).toBe('node:20-alpine');
    expect(body.data.port).toBe(3001);

    createdContainerId = body.data.containerId;
    expect(createdContainerId).toBeDefined();
  });

  it('2. POST /containers should reject duplicate hostId with 409 Conflict', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/containers',
      headers: authHeaders,
      payload: {
        hostId,
        runtime: 'nodejs',
        version: '20',
        port: 3001,
        resources: {
          cpuLimit: 1.0,
          memoryLimitMb: 512,
          diskLimitMb: 5120,
        },
      },
    });

    expect(res.statusCode).toBe(409);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('Conflict');
  });

  it('3. GET /containers/:id should retrieve container status', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/containers/${hostId}`,
      headers: authHeaders,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.hostId).toBe(hostId);
    expect(body.data.id).toBe(createdContainerId);
    expect(body.data.status).toBe('created');
  });

  it('4. POST /containers/:id/start should transition container to running state', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/containers/${hostId}/start`,
      headers: authHeaders,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('running');
  });

  it('5. GET /containers/:id/stats should return resource utilization metrics', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/containers/${hostId}/stats`,
      headers: authHeaders,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(body.data.hostId).toBe(hostId);
    expect(typeof body.data.cpuPercent).toBe('number');
    expect(typeof body.data.memoryUsageMb).toBe('number');
    expect(body.data.memoryLimitMb).toBe(1024);
    expect(typeof body.data.pids).toBe('number');
  });

  it('6. GET /containers/:id/logs should return container output logs', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/containers/${hostId}/logs?tail=50`,
      headers: authHeaders,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(Array.isArray(body.data.lines)).toBe(true);
    expect(typeof body.data.total).toBe('number');
  });

  it('7. POST /containers/:id/restart should restart running container', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/containers/${hostId}/restart`,
      headers: authHeaders,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('running');
  });

  it('8. POST /containers/:id/stop should stop running container', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/containers/${hostId}/stop`,
      headers: authHeaders,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('exited');
  });

  it('9. DELETE /containers/:id should remove the container', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/containers/${hostId}`,
      headers: authHeaders,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.deleted).toBe(true);
  });

  it('10. GET /containers/:id on removed container should return 404 NotFound', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/containers/${hostId}`,
      headers: authHeaders,
    });

    expect(res.statusCode).toBe(404);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('NotFound');
  });
});
