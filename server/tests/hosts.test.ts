import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { memoryStore } from '../src/db/memory-fallback.js';
import type { Express } from 'express';

describe('Hosting Core API Test Suite', () => {
  let app: Express;
  let userToken: string;
  let userBToken: string;
  let adminToken: string;
  let testHostId: string;

  beforeAll(async () => {
    app = createApp();

    // 1. Authenticate standard user (Alex Dang)
    const userRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ login: 'alex.dang@astoncloud.vn', password: 'Password@123' });
    expect(userRes.status).toBe(200);
    userToken = userRes.body.data.token;

    // 2. Register a secondary user for isolation tests (User B)
    const userBRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'user.b@astoncloud.vn',
        username: 'user_b',
        password: 'Password@123',
        displayName: 'User B',
      });
    expect(userBRes.status).toBe(201);
    userBToken = userBRes.body.data.token;

    // 3. Authenticate admin user
    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ login: 'admin@astoncloud.vn', password: 'AdminPassword@123' });
    expect(adminRes.status).toBe(200);
    adminToken = adminRes.body.data.token;
  });

  // ============================================================================
  // 1. Auxiliary APIs: Plans, Runtimes, Nodes
  // ============================================================================
  describe('GET /api/v1/plans', () => {
    it('should return list of active hosting plans (Starter, Developer, Pro)', async () => {
      const res = await request(app).get('/api/v1/plans');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.plans)).toBe(true);
      expect(res.body.data.plans.length).toBeGreaterThanOrEqual(3);

      const planIds = res.body.data.plans.map((p: any) => p.id);
      expect(planIds).toContain('starter');
      expect(planIds).toContain('developer');
      expect(planIds).toContain('pro');

      // Verify Starter plan resource specifications
      const starter = res.body.data.plans.find((p: any) => p.id === 'starter');
      expect(starter.cpuCores).toBe(1);
      expect(starter.ramMb).toBe(512);
      expect(starter.diskMb).toBe(5120);
    });
  });

  describe('GET /api/v1/runtimes', () => {
    it('should return available runtimes (Node.js, Bun, Python) with versions', async () => {
      const res = await request(app).get('/api/v1/runtimes');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.runtimes)).toBe(true);

      const runtimeIds = res.body.data.runtimes.map((r: any) => r.id);
      expect(runtimeIds).toContain('nodejs');
      expect(runtimeIds).toContain('bun');
      expect(runtimeIds).toContain('python');

      const nodejs = res.body.data.runtimes.find((r: any) => r.id === 'nodejs');
      expect(nodejs.versions).toContain('20');
      expect(nodejs.versions).toContain('22');
      expect(nodejs.versions).toContain('24');

      const bun = res.body.data.runtimes.find((r: any) => r.id === 'bun');
      expect(bun.versions).toContain('latest');
      expect(bun.versions).toContain('stable');

      const python = res.body.data.runtimes.find((r: any) => r.id === 'python');
      expect(python.versions).toContain('3.11');
      expect(python.versions).toContain('3.12');
      expect(python.versions).toContain('3.13');
    });
  });

  describe('GET /api/v1/nodes', () => {
    it('should return cluster nodes with region and capacity', async () => {
      const res = await request(app).get('/api/v1/nodes');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.nodes)).toBe(true);
      expect(res.body.data.nodes.length).toBeGreaterThanOrEqual(1);

      const firstNode = res.body.data.nodes[0];
      expect(firstNode).toHaveProperty('id');
      expect(firstNode).toHaveProperty('name');
      expect(firstNode).toHaveProperty('hostname');
      expect(firstNode).toHaveProperty('region');
      expect(firstNode).toHaveProperty('status');
      expect(firstNode).toHaveProperty('totalCpu');
      expect(firstNode).toHaveProperty('availableCpu');
      expect(firstNode).toHaveProperty('totalRam');
      expect(firstNode).toHaveProperty('availableRam');
    });
  });

  // ============================================================================
  // 2. Host Creation (POST /api/v1/hosts)
  // ============================================================================
  describe('POST /api/v1/hosts', () => {
    it('should create a new host with PENDING status and plan resource limits', async () => {
      const res = await request(app)
        .post('/api/v1/hosts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'my-production-api',
          runtimeId: 'nodejs',
          runtimeVersion: '20',
          planId: 'developer',
          region: 'Singapore',
          autoRestart: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.host).toBeDefined();

      const host = res.body.data.host;
      testHostId = host.id;

      expect(host.name).toBe('my-production-api');
      expect(host.status).toBe('PENDING'); // MUST BE PENDING
      expect(host.runtimeId).toBe('nodejs');
      expect(host.runtimeVersion).toBe('20');
      expect(host.planId).toBe('developer');
      expect(host.cpuLimit).toBe(2); // strictly enforced from developer plan
      expect(host.memoryLimit).toBe(2048); // strictly enforced from developer plan
      expect(host.diskLimit).toBe(15360); // strictly enforced from developer plan
      expect(host.region).toBe('Singapore');
      expect(host.port).toBeGreaterThan(0);
      expect(host.nodeId).toBeDefined();
    });

    it('should reject unauthenticated host creation with 401', async () => {
      const res = await request(app)
        .post('/api/v1/hosts')
        .send({
          name: 'unauthorized-host',
          runtimeId: 'nodejs',
          runtimeVersion: '20',
          planId: 'starter',
        });
      expect(res.status).toBe(401);
    });

    it('should reject invalid host name with 400', async () => {
      const res = await request(app)
        .post('/api/v1/hosts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Invalid_Host_Name!@#$',
          runtimeId: 'nodejs',
          runtimeVersion: '20',
          planId: 'starter',
        });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject invalid runtime with 400', async () => {
      const res = await request(app)
        .post('/api/v1/hosts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'invalid-runtime-host',
          runtimeId: 'ruby-on-rails',
          runtimeVersion: '3.0',
          planId: 'starter',
        });
      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('không hợp lệ');
    });

    it('should reject invalid runtime version with 400', async () => {
      const res = await request(app)
        .post('/api/v1/hosts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'invalid-version-host',
          runtimeId: 'nodejs',
          runtimeVersion: '14.0-unsupported',
          planId: 'starter',
        });
      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('không hợp lệ');
    });

    it('should reject invalid hosting plan with 400', async () => {
      const res = await request(app)
        .post('/api/v1/hosts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'invalid-plan-host',
          runtimeId: 'python',
          runtimeVersion: '3.12',
          planId: 'infinite-enterprise-free',
        });
      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('không tồn tại');
    });

    it('should ignore client-supplied resource limits and strictly enforce plan limits', async () => {
      const res = await request(app)
        .post('/api/v1/hosts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'hack-limits-host',
          runtimeId: 'bun',
          runtimeVersion: 'latest',
          planId: 'starter', // Starter is 1 vCPU, 512 MB, 5120 MB
          cpuLimit: 64, // Client attempts privilege escalation
          memoryLimit: 131072,
          diskLimit: 10485760,
        });
      expect(res.status).toBe(201);
      const host = res.body.data.host;
      expect(host.cpuLimit).toBe(1); // Enforced from starter plan
      expect(host.memoryLimit).toBe(512); // Enforced from starter plan
      expect(host.diskLimit).toBe(5120); // Enforced from starter plan
    });
  });

  // ============================================================================
  // 3. Host Listing & Details (GET /api/v1/hosts, GET /api/v1/hosts/:id)
  // ============================================================================
  describe('GET /api/v1/hosts', () => {
    it('should list all hosts belonging to the authenticated user', async () => {
      const res = await request(app)
        .get('/api/v1/hosts')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.hosts)).toBe(true);
      expect(res.body.data.hosts.length).toBeGreaterThanOrEqual(1);

      const found = res.body.data.hosts.find((h: any) => h.id === testHostId);
      expect(found).toBeDefined();
      expect(found.status).toBe('PENDING');
    });
  });

  describe('GET /api/v1/hosts/:id', () => {
    it('should return details for an existing host', async () => {
      const res = await request(app)
        .get(`/api/v1/hosts/${testHostId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.host.id).toBe(testHostId);
      expect(res.body.data.host.status).toBe('PENDING');
    });

    it('should return 404 when host does not exist', async () => {
      const res = await request(app)
        .get('/api/v1/hosts/nonexistent-host-uuid')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(404);
    });
  });

  // ============================================================================
  // 4. User Isolation & Security Checks
  // ============================================================================
  describe('User Isolation & Multi-tenant Security', () => {
    it('should prevent User B from viewing User A host (returns 404 for isolation)', async () => {
      const res = await request(app)
        .get(`/api/v1/hosts/${testHostId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(404);
    });

    it('should prevent User B from listing User A hosts', async () => {
      const res = await request(app)
        .get('/api/v1/hosts')
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(200);
      const hostIds = res.body.data.hosts.map((h: any) => h.id);
      expect(hostIds).not.toContain(testHostId);
    });

    it('should prevent User B from modifying User A host', async () => {
      const res = await request(app)
        .patch(`/api/v1/hosts/${testHostId}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ name: 'hacked-name' });

      expect(res.status).toBe(404);
    });

    it('should prevent User B from deleting User A host', async () => {
      const res = await request(app)
        .delete(`/api/v1/hosts/${testHostId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(404);
    });

    it('should allow Admin to view any host', async () => {
      const res = await request(app)
        .get(`/api/v1/hosts/${testHostId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.host.id).toBe(testHostId);
    });
  });

  // ============================================================================
  // 5. Host Update (PATCH /api/v1/hosts/:id)
  // ============================================================================
  describe('PATCH /api/v1/hosts/:id', () => {
    it('should update allowed host settings (name, autoRestart)', async () => {
      const res = await request(app)
        .patch(`/api/v1/hosts/${testHostId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'updated-api-name',
          autoRestart: false,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.host.name).toBe('updated-api-name');
      expect(res.body.data.host.autoRestart).toBe(false);
    });
  });

  // ============================================================================
  // 6. Host Actions Architecture (POST /api/v1/hosts/:id/actions)
  // ============================================================================
  describe('POST /api/v1/hosts/:id/actions', () => {
    it('should accept start action and report pending provisioning state', async () => {
      const res = await request(app)
        .post(`/api/v1/hosts/${testHostId}/actions`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ action: 'start' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.provisioned).toBe(false);
      expect(res.body.data.message).toContain('PENDING');
    });

    it('should accept restart action and report pending provisioning state', async () => {
      const res = await request(app)
        .post(`/api/v1/hosts/${testHostId}/actions`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ action: 'restart' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.provisioned).toBe(false);
    });
  });

  // ============================================================================
  // 7. Host Deletion (DELETE /api/v1/hosts/:id)
  // ============================================================================
  describe('DELETE /api/v1/hosts/:id', () => {
    it('should delete host belonging to the user', async () => {
      const res = await request(app)
        .delete(`/api/v1/hosts/${testHostId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify it is gone
      const verifyRes = await request(app)
        .get(`/api/v1/hosts/${testHostId}`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(verifyRes.status).toBe(404);
    });
  });
});
