import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { env } from '../src/config/env.js';

describe('Machine-to-Machine Authentication Suite', () => {
  let app: ReturnType<typeof buildApp>;
  const validKey = env.AGENT_SECRET_KEY;
  const wrongKey = 'completely-wrong-token-that-is-at-least-32-chars-long';

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health should be accessible without credentials for monitoring', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.nodeId).toBe(env.NODE_ID);
  });

  it('GET /info should reject requests without credentials (401)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/info',
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('Unauthorized');
  });

  it('GET /info should reject requests with invalid x-agent-key (401)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/info',
      headers: {
        'x-agent-key': wrongKey,
      },
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('Unauthorized');
  });

  it('GET /info should reject requests with invalid Bearer token (401)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/info',
      headers: {
        authorization: `Bearer ${wrongKey}`,
      },
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('Unauthorized');
  });

  it('GET /info should allow requests with valid x-agent-key (200)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/info',
      headers: {
        'x-agent-key': validKey,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.agent.nodeId).toBe(env.NODE_ID);
  });

  it('GET /info should allow requests with valid Bearer token (200)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/info',
      headers: {
        authorization: `Bearer ${validKey}`,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.agent.nodeId).toBe(env.NODE_ID);
  });

  it('POST /containers should reject unauthenticated requests (401)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/containers',
      payload: {
        hostId: 'unauth-host',
        runtime: 'nodejs',
        version: '20',
        port: 3000,
        resources: { cpuLimit: 1, memoryLimitMb: 512, diskLimitMb: 5120 },
      },
    });

    expect(res.statusCode).toBe(401);
  });
});
