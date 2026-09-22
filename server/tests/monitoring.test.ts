import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { memoryStore } from '../src/db/memory-fallback.js';
import { getNodeAgentClient } from '../src/modules/node-agent/index.js';
import { LocalMockNodeAgentClient } from '../src/modules/node-agent/mock.client.js';
import type { Express } from 'express';

describe('Milestone 12: Host Monitoring & Resource Usage Test Suite', () => {
  let app: Express;
  let userToken: string;
  let userBToken: string;
  let adminToken: string;
  let runningHostId: string;
  let stoppedHostId: string;
  let provisioningHostId: string;
  let userBHostId: string;

  beforeAll(async () => {
    app = createApp();

    // 1. Authenticate standard user (Alex Dang)
    const userRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ login: 'alex.dang@astoncloud.vn', password: 'Password@123' });
    expect(userRes.status).toBe(200);
    userToken = userRes.body.data.token;

    // 2. Authenticate second user (User B)
    const userBRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'monitoring.b@astoncloud.vn',
        username: 'monitoring_b',
        password: 'Password@123',
        displayName: 'Monitoring User B',
      });
    expect(userBRes.status).toBe(201);
    userBToken = userBRes.body.data.token;

    // 3. Authenticate admin user
    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ login: 'admin@astoncloud.vn', password: 'AdminPassword@123' });
    expect(adminRes.status).toBe(200);
    adminToken = adminRes.body.data.token;

    // 4. Create hosts for testing
    // Host 1: Running Starter host for User A
    const createRunRes = await request(app)
      .post('/api/v1/hosts')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'monitor-running-host',
        runtimeId: 'nodejs',
        runtimeVersion: '20',
        planId: 'starter',
        region: 'Singapore',
        autoRestart: true,
      });
    expect(createRunRes.status).toBe(201);
    runningHostId = String(createRunRes.body.data.host.id);

    // Host 2: Stopped host for User A
    const createStopRes = await request(app)
      .post('/api/v1/hosts')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'monitor-stopped-host',
        runtimeId: 'python',
        runtimeVersion: '3.11',
        planId: 'developer',
        region: 'Singapore',
        autoRestart: true,
      });
    expect(createStopRes.status).toBe(201);
    stoppedHostId = String(createStopRes.body.data.host.id);

    // Stop it to put it into STOPPED state
    const stopRes = await request(app)
      .post(`/api/v1/hosts/${stoppedHostId}/actions`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ action: 'stop' });
    expect(stopRes.status).toBe(200);

    // Host 3: Provisioning/Pending host for User A
    const createProvRes = await request(app)
      .post('/api/v1/hosts')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'monitor-prov-host',
        runtimeId: 'bun',
        runtimeVersion: 'latest',
        planId: 'pro',
        region: 'Tokyo',
        autoRestart: true,
      });
    expect(createProvRes.status).toBe(201);
    provisioningHostId = String(createProvRes.body.data.host.id);
    // Manually set status to PROVISIONING
    const provHost = memoryStore.hosts.find((h) => h.id === provisioningHostId);
    if (provHost) {
      provHost.status = 'PROVISIONING';
      provHost.container_id = null;
    }

    // Host 4: User B's host
    const createBRes = await request(app)
      .post('/api/v1/hosts')
      .set('Authorization', `Bearer ${userBToken}`)
      .send({
        name: 'user-b-monitor-host',
        runtimeId: 'nodejs',
        runtimeVersion: '22',
        planId: 'starter',
        region: 'Singapore',
        autoRestart: true,
      });
    expect(createBRes.status).toBe(201);
    userBHostId = String(createBRes.body.data.host.id);
  });

  // ============================================================================
  // 1. GET /api/v1/hosts/:id/stats for RUNNING host
  // ============================================================================
  describe('Live Metrics for RUNNING Host', () => {
    it('should return complete structured metrics (CPU, RAM, Disk, Network, Uptime, Timestamp)', async () => {
      const res = await request(app)
        .get(`/api/v1/hosts/${runningHostId}/stats`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const data = res.body.data;

      // Status
      expect(data.status).toBe('RUNNING');
      expect(data.available).toBe(true);

      // CPU
      expect(data.cpu).toBeDefined();
      expect(typeof data.cpu.usage).toBe('number');
      expect(data.cpu.usage).toBeGreaterThanOrEqual(0);
      expect(data.cpu.usage).toBeLessThanOrEqual(100);
      expect(data.cpu.limit).toBe(1); // Starter plan: 1 vCPU

      // Memory (RAM)
      expect(data.memory).toBeDefined();
      expect(typeof data.memory.usage).toBe('number');
      expect(data.memory.usage).toBeGreaterThan(0);
      expect(data.memory.limit).toBe(512); // Starter plan: 512 MB
      expect(data.memory.usage).toBeLessThanOrEqual(data.memory.limit);

      // Disk
      expect(data.disk).toBeDefined();
      expect(typeof data.disk.usage).toBe('number');
      expect(data.disk.limit).toBe(5120); // Starter plan: 5120 MB
      expect(data.disk.usage).toBeLessThanOrEqual(data.disk.limit);

      // Network
      expect(data.network).toBeDefined();
      expect(typeof data.network.rx).toBe('number');
      expect(typeof data.network.tx).toBe('number');
      expect(data.network.rx).toBeGreaterThan(0);
      expect(data.network.tx).toBeGreaterThan(0);

      // Uptime
      expect(typeof data.uptime).toBe('number');
      expect(data.uptime).toBeGreaterThanOrEqual(0);
      expect(typeof data.uptimeFormatted).toBe('string');
      expect(data.uptimeFormatted.length).toBeGreaterThan(0);

      // Timestamp
      expect(data.timestamp).toBeDefined();
      expect(new Date(data.timestamp).getTime()).not.toBeNaN();

      // Backward compatibility fields
      expect(data.stats).toBeDefined();
      expect(data.stats.cpuPercent).toBe(data.cpu.usage);
      expect(data.stats.memoryUsageMb).toBe(data.memory.usage);
      expect(data.stats.memoryLimitMb).toBe(data.memory.limit);
    });

    it('should respect Starter plan limits and never exceed them', async () => {
      const res = await request(app)
        .get(`/api/v1/hosts/${runningHostId}/stats`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      const { cpu, memory, disk } = res.body.data;

      expect(cpu.limit).toBe(1);
      expect(cpu.usage).toBeLessThanOrEqual(100);
      expect(memory.limit).toBe(512);
      expect(memory.usage).toBeLessThanOrEqual(512);
      expect(disk.limit).toBe(5120);
      expect(disk.usage).toBeLessThanOrEqual(5120);
    });
  });

  // ============================================================================
  // 2. GET /api/v1/hosts/:id/stats for STOPPED host
  // ============================================================================
  describe('Metrics for STOPPED Host', () => {
    it('should return status STOPPED with CPU, RAM, and uptime at 0', async () => {
      const res = await request(app)
        .get(`/api/v1/hosts/${stoppedHostId}/stats`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const data = res.body.data;

      expect(data.status).toBe('STOPPED');
      expect(data.cpu.usage).toBe(0);
      expect(data.cpu.limit).toBe(2); // Developer plan: 2 vCPU
      expect(data.memory.usage).toBe(0);
      expect(data.memory.limit).toBe(2048); // Developer plan: 2048 MB
      expect(data.uptime).toBe(0);
      expect(data.network.rx).toBe(0);
      expect(data.network.tx).toBe(0);
      // Disk storage is preserved even when stopped
      expect(data.disk.usage).toBeGreaterThan(0);
      expect(data.disk.limit).toBe(15360);
    });
  });

  // ============================================================================
  // 3. GET /api/v1/hosts/:id/stats for PROVISIONING host
  // ============================================================================
  describe('Metrics for PROVISIONING / PENDING Host', () => {
    it('should return status PROVISIONING and indicate metrics unavailable', async () => {
      const res = await request(app)
        .get(`/api/v1/hosts/${provisioningHostId}/stats`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const data = res.body.data;

      expect(data.status).toBe('PROVISIONING');
      expect(data.available).toBe(false);
      expect(data.cpu.usage).toBe(0);
      expect(data.memory.usage).toBe(0);
      expect(data.uptime).toBe(0);
    });
  });

  // ============================================================================
  // 4. GET /api/v1/hosts/:id/stats for ERROR host
  // ============================================================================
  describe('Metrics for ERROR Host', () => {
    it('should return status ERROR and safe zeroed metrics', async () => {
      // Create and set error state
      const errRes = await request(app)
        .post('/api/v1/hosts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'monitor-err-host',
          runtimeId: 'nodejs',
          runtimeVersion: '20',
          planId: 'starter',
          region: 'Singapore',
          autoRestart: true,
        });
      const errHostId = String(errRes.body.data.host.id);
      const errHost = memoryStore.hosts.find((h) => h.id === errHostId);
      if (errHost) {
        errHost.status = 'ERROR';
        errHost.error_reason = 'Node Agent communication failed';
      }

      const res = await request(app)
        .get(`/api/v1/hosts/${errHostId}/stats`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('ERROR');
      expect(res.body.data.available).toBe(false);
      expect(res.body.data.cpu.usage).toBe(0);
    });
  });

  // ============================================================================
  // 5. Security & Authorization (Auth, IDOR, Missing host)
  // ============================================================================
  describe('Security and Authorization Protections', () => {
    it('should reject unauthenticated requests with 401 Unauthorized', async () => {
      const res = await request(app).get(`/api/v1/hosts/${runningHostId}/stats`);
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should prevent User B from viewing User A host stats (Anti-IDOR)', async () => {
      const res = await request(app)
        .get(`/api/v1/hosts/${runningHostId}/stats`)
        .set('Authorization', `Bearer ${userBToken}`);

      // Should return 404 to avoid leaking existence
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should return 404 for non-existent host ID', async () => {
      const res = await request(app)
        .get('/api/v1/hosts/999999/stats')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should allow ADMIN to retrieve stats of any host', async () => {
      const res = await request(app)
        .get(`/api/v1/hosts/${runningHostId}/stats`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('RUNNING');
    });
  });

  // ============================================================================
  // 6. Deterministic Mock Metrics Test
  // ============================================================================
  describe('Mock Node Agent Deterministic Metrics', () => {
    it('should produce deterministic and consistent stats for identical conditions', async () => {
      const agentClient = getNodeAgentClient() as LocalMockNodeAgentClient;
      const nodeContext = {
        id: 'node-1',
        name: 'Node Singapore',
        region: 'Singapore',
        ipAddress: '128.199.204.15',
      };

      const runningHost = memoryStore.hosts.find((h) => h.id === runningHostId);
      expect(runningHost).toBeDefined();

      const stats1 = await agentClient.getContainerStats(nodeContext, runningHost!.container_id!);
      const stats2 = await agentClient.getContainerStats(nodeContext, runningHost!.container_id!);

      // Same host and container within same second should yield identical CPU and memory
      expect(stats1.cpu.usage).toBe(stats2.cpu.usage);
      expect(stats1.memory.usage).toBe(stats2.memory.usage);
      expect(stats1.disk.usage).toBe(stats2.disk.usage);
      expect(stats1.status).toBe('RUNNING');
      expect(stats1.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================================
  // 7. Node Agent Failure & Safe Fallback Handling
  // ============================================================================
  describe('Infrastructure Fault Tolerance', () => {
    it('should handle Node Agent failure gracefully without crashing or leaking stack traces', async () => {
      const hostRow = memoryStore.hosts.find((h) => h.id === runningHostId);
      const originalNodeId = hostRow?.node_id;

      // Point host to an invalid node to simulate Node Agent unreachable
      if (hostRow) {
        hostRow.node_id = 'non-existent-node-xyz';
      }

      const res = await request(app)
        .get(`/api/v1/hosts/${runningHostId}/stats`)
        .set('Authorization', `Bearer ${userToken}`);

      // Restore original node_id
      if (hostRow && originalNodeId) {
        hostRow.node_id = originalNodeId;
      }

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.available).toBe(false);
      expect(res.body.data.cpu.usage).toBe(0);
      expect(res.body.data.error).toBeDefined();
      // No stack trace in response
      expect(res.body.stack).toBeUndefined();
    });
  });
});
