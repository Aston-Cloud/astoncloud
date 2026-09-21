import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { env } from '../src/config/env.js';

describe('Health & Info Endpoints Suite', () => {
  let app: ReturnType<typeof buildApp>;
  const authHeaders = {
    'x-agent-key': env.AGENT_SECRET_KEY,
  };

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /health', () => {
    it('should return health status with nodeId, docker connectivity and uptime', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.status).toBe('healthy');
      expect(body.data.nodeId).toBe(env.NODE_ID);
      expect(body.data.docker).toBeDefined();
      expect(typeof body.data.docker.connected).toBe('boolean');
      expect(['docker-engine', 'simulated-driver']).toContain(body.data.docker.mode);
      expect(typeof body.data.uptime).toBe('number');
      expect(body.data.timestamp).toBeDefined();
    });
  });

  describe('GET /info', () => {
    it('should return detailed system and runtime information when authenticated', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/info',
        headers: authHeaders,
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();

      // Agent information
      expect(body.data.agent.nodeId).toBe(env.NODE_ID);
      expect(body.data.agent.version).toBe('1.0.0');
      expect(body.data.agent.secureMode).toBe(true);

      // System specs
      expect(body.data.system).toBeDefined();
      expect(body.data.system.platform).toBeDefined();
      expect(body.data.system.arch).toBeDefined();
      expect(body.data.system.memory.totalMb).toBeGreaterThan(0);
      expect(body.data.system.memory.freeMb).toBeGreaterThanOrEqual(0);

      // Docker specs
      expect(body.data.docker).toBeDefined();
      expect(body.data.docker.connected).toBe(true);

      // Supported runtimes
      expect(Array.isArray(body.data.runtimes)).toBe(true);
      expect(body.data.runtimes.length).toBeGreaterThan(0);
      
      const runtimeNames = body.data.runtimes.map((r: any) => r.runtime);
      expect(runtimeNames).toContain('nodejs');
      expect(runtimeNames).toContain('bun');
      expect(runtimeNames).toContain('python');

      // Security check: Must never leak AGENT_SECRET_KEY
      const payloadString = res.payload;
      expect(payloadString).not.toContain(env.AGENT_SECRET_KEY);
    });
  });
});
