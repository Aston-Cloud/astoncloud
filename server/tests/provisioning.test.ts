import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { memoryStore } from '../src/db/memory-fallback.js';
import {
  getMockClient,
  setTestClientOverride,
} from '../src/modules/node-agent/index.js';
import { LocalMockNodeAgentClient } from '../src/modules/node-agent/mock.client.js';
import type { Express } from 'express';

describe('Milestone 6: Real Host Provisioning & Lifecycle Test Suite', () => {
  let app: Express;
  let userToken: string;
  let userBToken: string;
  let adminToken: string;
  let mockClient: LocalMockNodeAgentClient;

  beforeAll(async () => {
    app = createApp();
    mockClient = getMockClient();

    // 1. Authenticate standard user
    const userRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ login: 'alex.dang@astoncloud.vn', password: 'Password@123' });
    expect(userRes.status).toBe(200);
    userToken = userRes.body.data.token;

    // 2. Register secondary user (User B) for isolation tests
    const userBRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'user.provision.b@astoncloud.vn',
        username: 'user_provision_b',
        password: 'Password@123',
        displayName: 'User Provision B',
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

  beforeEach(() => {
    mockClient.failNextCreate = false;
    mockClient.failNextStart = false;
  });

  afterEach(() => {
    setTestClientOverride(null);
  });

  // ============================================================================
  // 1. Provisioning Success for all runtimes (Node.js, Bun, Python)
  // ============================================================================
  describe('1. Successful Provisioning for Node.js, Bun, and Python', () => {
    it('should provision a Node.js host to RUNNING status with allocated port and container_id', async () => {
      const payload = {
        name: 'node-prod-app',
        planId: 'developer',
        runtimeId: 'nodejs',
        runtimeVersion: '20',
        region: 'Singapore',
      };

      const res = await request(app)
        .post('/api/v1/hosts')
        .set('Authorization', `Bearer ${userToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      const host = res.body.data.host;
      expect(host.name).toBe('node-prod-app');
      expect(host.status).toBe('RUNNING');
      expect(host.runtimeId).toBe('nodejs');
      expect(host.runtimeVersion).toBe('20');
      expect(host.containerId).toBeTruthy();
      expect(host.containerId).toMatch(/^mock-c/);
      expect(host.port).toBeGreaterThanOrEqual(20000);
      expect(host.port).toBeLessThanOrEqual(30000);
      expect(host.region).toBe('Singapore');
      expect(host.nodeId).toBe('node-sg-01');
    });

    it('should provision a Bun host to RUNNING status', async () => {
      const payload = {
        name: 'bun-fast-api',
        planId: 'starter',
        runtimeId: 'bun',
        runtimeVersion: 'stable',
        region: 'Singapore',
      };

      const res = await request(app)
        .post('/api/v1/hosts')
        .set('Authorization', `Bearer ${userToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      const host = res.body.data.host;
      expect(host.name).toBe('bun-fast-api');
      expect(host.status).toBe('RUNNING');
      expect(host.runtimeId).toBe('bun');
      expect(host.containerId).toBeTruthy();
    });

    it('should provision a Python host in Vietnam region to RUNNING status', async () => {
      const payload = {
        name: 'python-ai-service',
        planId: 'pro',
        runtimeId: 'python',
        runtimeVersion: '3.12',
        region: 'Vietnam',
      };

      const res = await request(app)
        .post('/api/v1/hosts')
        .set('Authorization', `Bearer ${userToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      const host = res.body.data.host;
      expect(host.name).toBe('python-ai-service');
      expect(host.status).toBe('RUNNING');
      expect(host.runtimeId).toBe('python');
      expect(host.nodeId).toBe('node-vn-01');
      expect(host.region).toBe('Vietnam');
    });
  });

  // ============================================================================
  // 2. Input & Runtime Validation
  // ============================================================================
  describe('2. Validation Rejection', () => {
    it('should reject invalid or unsupported runtime', async () => {
      const res = await request(app)
        .post('/api/v1/hosts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'ruby-app',
          planId: 'starter',
          runtimeId: 'ruby',
          runtimeVersion: '3.2',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/môi trường|runtime/i);
    });

    it('should reject unsupported version for valid runtime', async () => {
      const res = await request(app)
        .post('/api/v1/hosts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'node-ancient',
          planId: 'starter',
          runtimeId: 'nodejs',
          runtimeVersion: '0.10.0',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/phiên bản/i);
    });

    it('should reject non-existent hosting plan', async () => {
      const res = await request(app)
        .post('/api/v1/hosts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'invalid-plan-app',
          planId: 'ultra-super-enterprise',
          runtimeId: 'nodejs',
          runtimeVersion: '20',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/gói dịch vụ|gói cước/i);
    });
  });

  // ============================================================================
  // 3. Scheduler & Resource Management
  // ============================================================================
  describe('3. Scheduler Resource Constraints', () => {
    it('should reject provisioning when cluster has insufficient resources', async () => {
      // Temporarily exhaust all nodes
      const origNodes = JSON.parse(JSON.stringify(memoryStore.nodes));
      memoryStore.nodes.forEach((n) => {
        n.available_ram_mb = 100; // less than starter plan (512MB)
      });

      const res = await request(app)
        .post('/api/v1/hosts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'exhausted-host',
          planId: 'starter',
          runtimeId: 'nodejs',
          runtimeVersion: '20',
        });

      // Restore nodes
      memoryStore.nodes.forEach((n) => {
        const orig = origNodes.find((o: any) => o.id === n.id);
        if (orig) {
          n.available_ram_mb = orig.available_ram_mb;
        }
      });

      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/tài nguyên khả dụng/i);
    });

    it('should skip nodes that are OFFLINE', async () => {
      // Mark Singapore node as OFFLINE
      const sgNode = memoryStore.nodes.find((n) => n.id === 'node-sg-01');
      if (sgNode) sgNode.status = 'OFFLINE';

      const res = await request(app)
        .post('/api/v1/hosts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'fallback-node-host',
          planId: 'starter',
          runtimeId: 'nodejs',
          runtimeVersion: '20',
          region: 'Singapore',
        });

      // Restore sgNode
      if (sgNode) sgNode.status = 'ONLINE';

      expect(res.status).toBe(201);
      // It should fall back to another active node since Singapore is OFFLINE
      expect(res.body.data.host.nodeId).not.toBe('node-sg-01');
      expect(['node-vn-01', 'node-tokyo-01']).toContain(res.body.data.host.nodeId);
    });
  });

  // ============================================================================
  // 4. Rollback and Cleanup on Failures
  // ============================================================================
  describe('4. Rollback and Resource Cleanup on Failures', () => {
    it('should rollback host to ERROR and refund node resources if container creation fails', async () => {
      const vnNode = memoryStore.nodes.find((n) => n.id === 'node-vn-01')!;
      const ramBefore = vnNode.available_ram_mb;
      const cpuBefore = vnNode.available_cpu_cores;

      // Inject fault in mock client
      mockClient.failNextCreate = true;
      mockClient.createErrorMessage = 'Mô phỏng đứt kết nối Docker daemon';

      const res = await request(app)
        .post('/api/v1/hosts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'fail-create-host',
          planId: 'developer', // 2048 MB, 2.0 Cores
          runtimeId: 'python',
          runtimeVersion: '3.12',
          region: 'Vietnam',
        });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/Mô phỏng đứt kết nối Docker daemon/);

      // Verify node resources were NOT consumed (refunded back)
      expect(vnNode.available_ram_mb).toBe(ramBefore);
      expect(vnNode.available_cpu_cores).toBe(cpuBefore);

      // Verify host in DB has status ERROR with error_reason
      const failedHost = memoryStore.hosts.find((h) => h.slug === 'fail-create-host');
      expect(failedHost).toBeDefined();
      expect(failedHost?.status).toBe('ERROR');
      expect(failedHost?.error_reason).toContain('Mô phỏng đứt kết nối Docker daemon');
    });

    it('should rollback host to ERROR and delete created container if start fails', async () => {
      const sgNode = memoryStore.nodes.find((n) => n.id === 'node-sg-01')!;
      const ramBefore = sgNode.available_ram_mb;

      // Inject fault in mock client for start
      mockClient.failNextStart = true;
      mockClient.startErrorMessage = 'Mô phỏng lỗi OOM khi khởi động container';

      const res = await request(app)
        .post('/api/v1/hosts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'fail-start-host',
          planId: 'starter',
          runtimeId: 'nodejs',
          runtimeVersion: '20',
          region: 'Singapore',
        });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);

      // Verify node resources refunded
      expect(sgNode.available_ram_mb).toBe(ramBefore);

      // Verify host in DB has status ERROR
      const failedHost = memoryStore.hosts.find((h) => h.slug === 'fail-start-host');
      expect(failedHost).toBeDefined();
      expect(failedHost?.status).toBe('ERROR');
    });
  });

  // ============================================================================
  // 5. Idempotency Support
  // ============================================================================
  describe('5. Idempotency Key Handling', () => {
    it('should return identical host without double-allocating resources on duplicate idempotencyKey', async () => {
      const idempotencyKey = `idemp-${Date.now()}`;
      const payload = {
        name: 'idemp-host-test',
        planId: 'starter',
        runtimeId: 'bun',
        runtimeVersion: 'stable',
        idempotencyKey,
      };

      const sgNode = memoryStore.nodes.find((n) => n.id === 'node-sg-01')!;
      const ramBefore = sgNode.available_ram_mb;

      // First call
      const res1 = await request(app)
        .post('/api/v1/hosts')
        .set('Authorization', `Bearer ${userToken}`)
        .send(payload);
      expect(res1.status).toBe(201);
      const host1 = res1.body.data.host;

      const ramAfterFirst = sgNode.available_ram_mb;
      expect(ramAfterFirst).toBe(ramBefore - 512); // starter plan is 512MB

      // Second call with same idempotencyKey
      const res2 = await request(app)
        .post('/api/v1/hosts')
        .set('Authorization', `Bearer ${userToken}`)
        .send(payload);
      expect([200, 201]).toContain(res2.status); // Idempotent hit returns 200 or 201
      const host2 = res2.body.data.host;

      // Should be the exact same host
      expect(host2.id).toBe(host1.id);
      expect(host2.containerId).toBe(host1.containerId);

      // RAM should NOT be deducted a second time
      expect(sgNode.available_ram_mb).toBe(ramAfterFirst);
    });
  });

  // ============================================================================
  // 6. Host Lifecycle: Start, Stop, Restart, Delete
  // ============================================================================
  describe('6. Host Lifecycle and Node Resource Release', () => {
    let lifecycleHostId: string;

    it('should provision a host for lifecycle testing', async () => {
      const res = await request(app)
        .post('/api/v1/hosts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'lifecycle-demo-host',
          planId: 'developer', // 2048MB, 2 CPU, 15360MB Disk
          runtimeId: 'nodejs',
          runtimeVersion: '20',
        });

      expect(res.status).toBe(201);
      lifecycleHostId = res.body.data.host.id;
      expect(res.body.data.host.status).toBe('RUNNING');
    });

    it('should STOP the running host', async () => {
      const res = await request(app)
        .post(`/api/v1/hosts/${lifecycleHostId}/actions`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ action: 'stop' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.host.status).toBe('STOPPED');
      expect(res.body.data.provisioned).toBe(true);
    });

    it('should reject STOP if already stopped', async () => {
      const res = await request(app)
        .post(`/api/v1/hosts/${lifecycleHostId}/actions`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ action: 'stop' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/STOPPED/);
    });

    it('should START the stopped host', async () => {
      const res = await request(app)
        .post(`/api/v1/hosts/${lifecycleHostId}/actions`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ action: 'start' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.host.status).toBe('RUNNING');
    });

    it('should RESTART the running host', async () => {
      const res = await request(app)
        .post(`/api/v1/hosts/${lifecycleHostId}/actions`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ action: 'restart' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.host.status).toBe('RUNNING');
    });

    it('should fetch host stats and logs via NodeAgentClient', async () => {
      // 1. Stats
      const statsRes = await request(app)
        .get(`/api/v1/hosts/${lifecycleHostId}/stats`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(statsRes.status).toBe(200);
      expect(statsRes.body.success).toBe(true);
      expect(statsRes.body.data.stats).toBeDefined();
      expect(statsRes.body.data.stats.cpuPercent).toBeDefined();
      expect(statsRes.body.data.stats.memoryUsageMb).toBeDefined();

      // 2. Logs
      const logsRes = await request(app)
        .get(`/api/v1/hosts/${lifecycleHostId}/logs?tail=20`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(logsRes.status).toBe(200);
      expect(logsRes.body.success).toBe(true);
      expect(logsRes.body.data.logs).toBeDefined();
      expect(Array.isArray(logsRes.body.data.logs.lines)).toBe(true);
      expect(logsRes.body.data.logs.lines.length).toBeGreaterThan(0);
    });

    it('should DELETE host and release node resources', async () => {
      const hostBefore = memoryStore.hosts.find((h) => h.id === lifecycleHostId)!;
      expect(hostBefore).toBeDefined();
      const node = memoryStore.nodes.find((n) => n.id === hostBefore.node_id)!;
      const ramBefore = node.available_ram_mb;

      const res = await request(app)
        .delete(`/api/v1/hosts/${lifecycleHostId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify node resources were released (refunded by 2048MB)
      expect(node.available_ram_mb).toBe(ramBefore + 2048);

      // Verify host is deleted
      const checkRes = await request(app)
        .get(`/api/v1/hosts/${lifecycleHostId}`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(checkRes.status).toBe(404);
    });
  });

  // ============================================================================
  // 7. Security and User Isolation
  // ============================================================================
  describe('7. Security & User Isolation', () => {
    let userAHostId: string;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/v1/hosts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'user-a-private-host',
          planId: 'starter',
          runtimeId: 'nodejs',
          runtimeVersion: '20',
        });
      expect(res.status).toBe(201);
      userAHostId = res.body.data.host.id;
    });

    it('should prevent User B from performing lifecycle actions on User A host', async () => {
      const res = await request(app)
        .post(`/api/v1/hosts/${userAHostId}/actions`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ action: 'stop' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should prevent User B from viewing stats of User A host', async () => {
      const res = await request(app)
        .get(`/api/v1/hosts/${userAHostId}/stats`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should prevent User B from viewing logs of User A host', async () => {
      const res = await request(app)
        .get(`/api/v1/hosts/${userAHostId}/logs`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should prevent User B from deleting User A host', async () => {
      const res = await request(app)
        .delete(`/api/v1/hosts/${userAHostId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should allow ADMIN to manage any host', async () => {
      const res = await request(app)
        .get(`/api/v1/hosts/${userAHostId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.host.id).toBe(userAHostId);
    });
  });
});
