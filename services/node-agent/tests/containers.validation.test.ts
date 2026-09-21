import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { env } from '../src/config/env.js';

describe('Container Input Validation & Security Rules Suite', () => {
  let app: ReturnType<typeof buildApp>;
  const authHeaders = {
    'x-agent-key': env.AGENT_SECRET_KEY,
  };

  const validPayload = {
    hostId: 'valid-host-01',
    runtime: 'nodejs' as const,
    version: '20',
    port: 3000,
    resources: {
      cpuLimit: 1.0,
      memoryLimitMb: 512,
      diskLimitMb: 5120,
      pidsLimit: 100,
    },
  };

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('hostId Validation', () => {
    it('should reject hostId with invalid characters or path traversal attempt', async () => {
      const payloads = [
        { ...validPayload, hostId: '../../etc/passwd' },
        { ...validPayload, hostId: 'host with space' },
        { ...validPayload, hostId: 'host_underscore_not_allowed' },
        { ...validPayload, hostId: 'ab' }, // too short (< 3)
        { ...validPayload, hostId: '-leading-hyphen' },
      ];

      for (const payload of payloads) {
        const res = await app.inject({
          method: 'POST',
          url: '/containers',
          headers: authHeaders,
          payload,
        });

        expect(res.statusCode).toBe(400);
        const body = JSON.parse(res.payload);
        expect(body.success).toBe(false);
        expect(body.error.code).toBe('ValidationError');
      }
    });
  });

  describe('Runtime & Version Whitelist', () => {
    it('should reject unapproved runtimes (e.g., golang, php, docker)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/containers',
        headers: authHeaders,
        payload: {
          ...validPayload,
          runtime: 'golang',
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(false);
    });

    it('should reject unapproved versions of an approved runtime (e.g., Node.js 14)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/containers',
        headers: authHeaders,
        payload: {
          ...validPayload,
          runtime: 'nodejs',
          version: '14',
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(false);
      expect(body.error.message).toContain('phiên bản');
    });
  });

  describe('Resource Boundaries', () => {
    it('should reject cpuLimit out of bounds (< 0.1 or > 8.0)', async () => {
      const invalidCpus = [0, 0.05, 8.5, 16];
      for (const cpu of invalidCpus) {
        const res = await app.inject({
          method: 'POST',
          url: '/containers',
          headers: authHeaders,
          payload: {
            ...validPayload,
            resources: { ...validPayload.resources, cpuLimit: cpu },
          },
        });

        expect(res.statusCode).toBe(400);
      }
    });

    it('should reject memoryLimitMb out of bounds (< 128 or > 16384)', async () => {
      const invalidMems = [64, 100, 20000, 32768];
      for (const mem of invalidMems) {
        const res = await app.inject({
          method: 'POST',
          url: '/containers',
          headers: authHeaders,
          payload: {
            ...validPayload,
            resources: { ...validPayload.resources, memoryLimitMb: mem },
          },
        });

        expect(res.statusCode).toBe(400);
      }
    });

    it('should reject diskLimitMb out of bounds (< 512 or > 102400)', async () => {
      const invalidDisks = [256, 150000];
      for (const disk of invalidDisks) {
        const res = await app.inject({
          method: 'POST',
          url: '/containers',
          headers: authHeaders,
          payload: {
            ...validPayload,
            resources: { ...validPayload.resources, diskLimitMb: disk },
          },
        });

        expect(res.statusCode).toBe(400);
      }
    });
  });

  describe('Port Constraints', () => {
    it('should reject privileged ports (< 1024) and out-of-range ports (> 65535)', async () => {
      const invalidPorts = [80, 443, 22, 0, 70000];
      for (const port of invalidPorts) {
        const res = await app.inject({
          method: 'POST',
          url: '/containers',
          headers: authHeaders,
          payload: {
            ...validPayload,
            port,
          },
        });

        expect(res.statusCode).toBe(400);
      }
    });
  });

  describe('Container ID & Query Parameters Validation', () => {
    it('should reject invalid container ID containing path traversal characters', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/containers/..%2F..%2Fetc%2Fpasswd',
        headers: authHeaders,
      });

      expect([400, 404]).toContain(res.statusCode);
    });

    it('should reject container logs tail parameter out of range (< 1 or > 1000)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/containers/valid-host-id/logs?tail=2000',
        headers: authHeaders,
      });

      expect(res.statusCode).toBe(400);
    });
  });
});
