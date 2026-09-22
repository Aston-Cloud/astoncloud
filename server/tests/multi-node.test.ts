import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { memoryStore } from '../src/db/memory-fallback.js';
import { NodesService } from '../src/modules/nodes/nodes.service.js';
import { SchedulerService } from '../src/modules/scheduler/scheduler.service.js';
import type { Express } from 'express';

describe('Milestone 15: Multi-Node Infrastructure & Node Agent Test Suite', () => {
  let app: Express;
  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    app = createApp();

    // Authenticate Admin
    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ login: 'admin@astoncloud.vn', password: 'AdminPassword@123' });
    expect(adminRes.status).toBe(200);
    adminToken = adminRes.body.data.token;

    // Authenticate Standard User
    const userRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ login: 'alex.dang@astoncloud.vn', password: 'Password@123' });
    expect(userRes.status).toBe(200);
    userToken = userRes.body.data.token;
  });

  beforeEach(() => {
    // Reset nodes to deterministic state
    for (const node of memoryStore.nodes) {
      node.status = 'ONLINE';
      node.available_cpu_cores = node.total_cpu_cores;
      node.allocated_cpu_cores = 0;
      node.available_ram_mb = node.total_ram_mb;
      node.allocated_ram_mb = 0;
      node.available_disk_mb = node.total_disk_mb;
      node.allocated_disk_mb = 0;
      node.last_heartbeat = new Date();
    }
  });

  // ============================================================================
  // 1. Node Registration & Security (Admin only, One-time token, No secret leak)
  // ============================================================================
  describe('1. Node Registration & Authorization', () => {
    it('should reject unauthenticated node registration with 401', async () => {
      const res = await request(app)
        .post('/api/v1/admin/nodes')
        .send({
          name: 'Hanoi Edge 02',
          hostname: 'hn-edge-02.astoncloud.internal',
          region: 'Vietnam',
          ipAddress: '103.142.12.99',
          totalCpu: 8,
          totalRamMb: 16384,
          totalDiskMb: 102400,
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject standard USER node registration with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/admin/nodes')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Hanoi Edge 02',
          hostname: 'hn-edge-02.astoncloud.internal',
          region: 'Vietnam',
          ipAddress: '103.142.12.99',
          totalCpu: 8,
          totalRamMb: 16384,
          totalDiskMb: 102400,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should reject invalid node specifications (e.g. 0 CPU cores)', async () => {
      const res = await request(app)
        .post('/api/v1/admin/nodes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Bad Spec Node',
          hostname: 'bad-node.astoncloud.internal',
          region: 'Vietnam',
          ipAddress: '103.142.12.99',
          totalCpu: 0,
          totalRamMb: 16384,
          totalDiskMb: 102400,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should allow ADMIN to register a new Node and receive a one-time agent token', async () => {
      const res = await request(app)
        .post('/api/v1/admin/nodes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          id: 'node-hn-01',
          name: 'Hanoi Edge 01 (FPT Datacenter)',
          hostname: 'hn-node-01.astoncloud.internal',
          region: 'Vietnam',
          ipAddress: '103.142.15.22',
          agentUrl: 'http://127.0.0.1:5010',
          totalCpu: 8,
          totalRamMb: 16384,
          totalDiskMb: 102400,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.node).toBeDefined();
      expect(res.body.data.node.id).toBe('node-hn-01');
      expect(res.body.data.node.totalCpu).toBe(8);
      expect(res.body.data.node.availableCpu).toBe(8);
      expect(res.body.data.node.allocatedCpu).toBe(0);

      // Verify One-Time Token generation
      expect(res.body.data.agentToken).toBeDefined();
      expect(res.body.data.agentToken).toMatch(/^agt_[a-f0-9]{64}$/);
    });

    it('should reject duplicate node ID or duplicate hostname with 400', async () => {
      const res = await request(app)
        .post('/api/v1/admin/nodes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          id: 'node-hn-01', // Already registered
          name: 'Duplicate Node',
          hostname: 'hn-node-duplicate.astoncloud.internal',
          region: 'Vietnam',
          ipAddress: '103.142.15.23',
          totalCpu: 8,
          totalRamMb: 16384,
          totalDiskMb: 102400,
        });

      expect(res.status).toBe(400);
      const errMsg = res.body.error?.message || res.body.message || '';
      expect(errMsg).toContain('đã tồn tại');
    });

    it('should never expose agentToken or agent_token_hash through GET /api/v1/admin/nodes', async () => {
      const res = await request(app)
        .get('/api/v1/admin/nodes')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);

      for (const node of res.body.data) {
        expect(node.agentToken).toBeUndefined();
        expect(node.agent_token_hash).toBeUndefined();
        expect(node.agent_key).toBeUndefined();
        expect(node.agentTokenHash).toBeUndefined();
      }
    });
  });

  // ============================================================================
  // 2. Node Agent Heartbeat & M2M Authentication
  // ============================================================================
  describe('2. Node Agent Heartbeat & M2M Authentication', () => {
    it('should reject unauthenticated heartbeat with 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/api/v1/node-agent/heartbeat')
        .send({
          status: 'ONLINE',
          agentVersion: '1.2.0',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject heartbeat with an invalid token with 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/api/v1/node-agent/heartbeat')
        .set('Authorization', 'Bearer invalid_random_token_12345')
        .send({
          status: 'ONLINE',
          agentVersion: '1.2.0',
        });

      expect(res.status).toBe(401);
      const errMsg = res.body.error?.message || res.body.message || '';
      expect(errMsg).toContain('không hợp lệ');
    });

    it('should accept valid heartbeat via Bearer token, update last_heartbeat and agent_version', async () => {
      // Register a test node to obtain a real token
      const regRes = await request(app)
        .post('/api/v1/admin/nodes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          id: 'node-hb-test',
          name: 'Heartbeat Test Node',
          hostname: 'hb-node.astoncloud.internal',
          region: 'Singapore',
          ipAddress: '13.212.88.99',
          totalCpu: 8,
          totalRamMb: 16384,
          totalDiskMb: 102400,
        });
      expect(regRes.status).toBe(201);
      const testToken = regRes.body.data.agentToken;

      // Send Heartbeat
      const hbRes = await request(app)
        .post('/api/v1/node-agent/heartbeat')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          status: 'ONLINE',
          agentVersion: '1.5.2',
        });

      expect(hbRes.status).toBe(200);
      expect(hbRes.body.success).toBe(true);
      expect(hbRes.body.data.nodeId).toBe('node-hb-test');
      expect(hbRes.body.data.status).toBe('ONLINE');

      // Verify node was updated in memory/db
      const node = await NodesService.getNodeById('node-hb-test');
      expect(node).not.toBeNull();
      expect(node!.agent_version).toBe('1.5.2');
      expect(node!.last_heartbeat).toBeDefined();
    });
  });

  // ============================================================================
  // 3. Heartbeat Timeout & Automatic Offline Detection
  // ============================================================================
  describe('3. Offline Detection & Safe Recovery', () => {
    it('should automatically mark ONLINE nodes as OFFLINE when heartbeat stops past timeout', async () => {
      const node = memoryStore.nodes.find((n) => n.id === 'node-vn-01');
      expect(node).toBeDefined();

      // Simulate stopped heartbeat (stale timestamp 10 minutes ago)
      node!.last_heartbeat = new Date(Date.now() - 10 * 60 * 1000);
      node!.status = 'ONLINE';

      // Run timeout check
      const timedOutCount = await NodesService.checkHeartbeatTimeouts();
      expect(timedOutCount).toBeGreaterThanOrEqual(1);

      // Verify node status transitioned to OFFLINE
      expect(node!.status).toBe('OFFLINE');
    });

    it('should NOT allow admin to manually force an OFFLINE node to ONLINE without a fresh heartbeat', async () => {
      const node = memoryStore.nodes.find((n) => n.id === 'node-vn-01');
      node!.status = 'OFFLINE';
      node!.last_heartbeat = new Date(Date.now() - 10 * 60 * 1000);

      const res = await request(app)
        .put('/api/v1/admin/nodes/node-vn-01/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'ONLINE' });

      expect(res.status).toBe(400);
      const errMsg = res.body.error?.message || res.body.message || '';
      expect(errMsg).toContain('Heartbeat');
      expect(node!.status).toBe('OFFLINE');
    });

    it('should automatically restore OFFLINE node to ONLINE upon receiving a valid heartbeat', async () => {
      const node = memoryStore.nodes.find((n) => n.id === 'node-vn-01');
      node!.status = 'OFFLINE';
      node!.last_heartbeat = new Date(Date.now() - 10 * 60 * 1000);

      // Send Heartbeat using Vietnam node token
      const hbRes = await request(app)
        .post('/api/v1/node-agent/heartbeat')
        .set('Authorization', 'Bearer mock_agent_token_vn')
        .send({
          status: 'ONLINE',
          agentVersion: '1.0.1-mock',
        });

      expect(hbRes.status).toBe(200);
      expect(hbRes.body.data.status).toBe('ONLINE');
      expect(node!.status).toBe('ONLINE');
    });
  });

  // ============================================================================
  // 4. Multi-Node Deterministic Scheduling & Region Matching
  // ============================================================================
  describe('4. Multi-Node Scheduling & Region Selection', () => {
    it('should select Vietnam node when region requested is Vietnam', async () => {
      const result = await SchedulerService.selectAndReserveNode('Vietnam', 1, 512, 5120);
      expect(['node-vn-01', 'node-hn-01']).toContain(result.node.id);
      expect(result.node.region).toBe('Vietnam');

      // Release reserved resources
      await SchedulerService.releaseNodeResources(result.node.id, 1, 512, 5120);
    });

    it('should select Singapore node when region requested is Singapore', async () => {
      const result = await SchedulerService.selectAndReserveNode('Singapore', 2, 2048, 15360);
      expect(result.node.id).toBe('node-sg-01');
      expect(result.node.region).toBe('Singapore');

      // Release reserved resources
      await SchedulerService.releaseNodeResources('node-sg-01', 2, 2048, 15360);
    });

    it('should bypass Node A if Node A lacks capacity and select Node B with sufficient capacity', async () => {
      // Node A (Vietnam) has 4 CPU cores.
      // Requesting a massive host with 6 vCPU cores should bypass Node A and select Singapore (8 cores) or Tokyo (16 cores)
      const result = await SchedulerService.selectAndReserveNode('Any', 6, 4096, 20480);
      expect(result.node.id).not.toBe('node-vn-01');
      expect(['node-sg-01', 'node-tokyo-01']).toContain(result.node.id);

      // Release
      await SchedulerService.releaseNodeResources(result.node.id, 6, 4096, 20480);
    });

    it('should throw 503 if no node can satisfy requested resources', async () => {
      await expect(
        SchedulerService.selectAndReserveNode('Singapore', 64, 131072, 5000000)
      ).rejects.toThrow('Không có máy chủ cụm (Node) nào còn đủ tài nguyên khả dụng');
    });
  });

  // ============================================================================
  // 5. Independent Per-Node Resource Reservation & Rollback
  // ============================================================================
  describe('5. Independent Resource Accounting & Concurrency', () => {
    it('should reserve resources on Node B without modifying Node A resource allocation', async () => {
      const nodeA = memoryStore.nodes.find((n) => n.id === 'node-vn-01')!;
      const nodeB = memoryStore.nodes.find((n) => n.id === 'node-sg-01')!;

      const initialAvailA = nodeA.available_ram_mb;
      const initialAllocA = nodeA.allocated_ram_mb;
      const initialAvailB = nodeB.available_ram_mb;
      const initialAllocB = nodeB.allocated_ram_mb;

      // Reserve 2048 MB on Node B
      const reservation = await SchedulerService.selectAndReserveNode('Singapore', 2, 2048, 10240);
      expect(reservation.node.id).toBe('node-sg-01');

      // Node B resources must be modified
      expect(nodeB.available_ram_mb).toBe(initialAvailB - 2048);
      expect(nodeB.allocated_ram_mb).toBe(initialAllocB + 2048);

      // Node A resources must NOT be modified
      expect(nodeA.available_ram_mb).toBe(initialAvailA);
      expect(nodeA.allocated_ram_mb).toBe(initialAllocA);

      // Release resources
      await SchedulerService.releaseNodeResources('node-sg-01', 2, 2048, 10240);
      expect(nodeB.available_ram_mb).toBe(initialAvailB);
      expect(nodeB.allocated_ram_mb).toBe(initialAllocB);
    });
  });

  // ============================================================================
  // 6. Node Status Restrictions (DRAINING, MAINTENANCE, OFFLINE)
  // ============================================================================
  describe('6. Node Status Restrictions', () => {
    it('should never schedule new hosts on a DRAINING node', async () => {
      const nodeSg = memoryStore.nodes.find((n) => n.id === 'node-sg-01')!;
      nodeSg.status = 'DRAINING';

      // Attempt to schedule in Singapore
      // Since Singapore is DRAINING, scheduler must bypass it and pick another ONLINE node
      const result = await SchedulerService.selectAndReserveNode('Singapore', 1, 512, 5120);
      expect(result.node.id).not.toBe('node-sg-01');

      await SchedulerService.releaseNodeResources(result.node.id, 1, 512, 5120);
    });

    it('should never schedule new hosts on a MAINTENANCE node', async () => {
      const nodeSg = memoryStore.nodes.find((n) => n.id === 'node-sg-01')!;
      nodeSg.status = 'MAINTENANCE';

      const result = await SchedulerService.selectAndReserveNode('Singapore', 1, 512, 5120);
      expect(result.node.id).not.toBe('node-sg-01');

      await SchedulerService.releaseNodeResources(result.node.id, 1, 512, 5120);
    });

    it('should never schedule new hosts on an OFFLINE node', async () => {
      const nodeSg = memoryStore.nodes.find((n) => n.id === 'node-sg-01')!;
      nodeSg.status = 'OFFLINE';

      const result = await SchedulerService.selectAndReserveNode('Singapore', 1, 512, 5120);
      expect(result.node.id).not.toBe('node-sg-01');

      await SchedulerService.releaseNodeResources(result.node.id, 1, 512, 5120);
    });
  });

  // ============================================================================
  // 7. Host -> Node Routing & Node Failure Handling
  // ============================================================================
  describe('7. Host -> Node Routing & Infrastructure Failure Guard', () => {
    let testHostId: string;

    beforeAll(async () => {
      // Create a test host assigned to Vietnam node
      const createRes = await request(app)
        .post('/api/v1/hosts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'multi-node-host-test',
          runtimeId: 'nodejs',
          runtimeVersion: '20',
          planId: 'starter',
          region: 'Vietnam',
        });
      expect(createRes.status).toBe(201);
      testHostId = createRes.body.data.host.id;
      const assignedNodeId = createRes.body.data.host.nodeId;
      expect(['node-vn-01', 'node-hn-01']).toContain(assignedNodeId);
    });

    it('should return 503 Infrastructure Unavailable when performing lifecycle action on host whose node is OFFLINE', async () => {
      const hostRes = await request(app)
        .get(`/api/v1/hosts/${testHostId}`)
        .set('Authorization', `Bearer ${userToken}`);
      const assignedNodeId = hostRes.body.data.host.nodeId;
      const assignedNode = memoryStore.nodes.find((n) => n.id === assignedNodeId)!;

      // First, stop the host while online
      await request(app)
        .post(`/api/v1/hosts/${testHostId}/actions`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ action: 'stop' });

      // Simulate node becoming OFFLINE
      assignedNode.status = 'OFFLINE';

      // Attempt to start the host on the offline node
      const startRes = await request(app)
        .post(`/api/v1/hosts/${testHostId}/actions`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ action: 'start' });

      expect(startRes.status).toBe(503);
      expect(startRes.body.success).toBe(false);
      const errMsg = startRes.body.error?.message || startRes.body.message || '';
      expect(errMsg).toContain('ngoại tuyến (OFFLINE)');

      // Restore node online
      assignedNode.status = 'ONLINE';
    });

    it('should return safe fallback stats with available: false when host node is OFFLINE', async () => {
      const hostRes = await request(app)
        .get(`/api/v1/hosts/${testHostId}`)
        .set('Authorization', `Bearer ${userToken}`);
      const assignedNodeId = hostRes.body.data.host.nodeId;
      const assignedNode = memoryStore.nodes.find((n) => n.id === assignedNodeId)!;
      assignedNode.status = 'OFFLINE';

      const statsRes = await request(app)
        .get(`/api/v1/hosts/${testHostId}/stats`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(statsRes.status).toBe(200);
      expect(statsRes.body.success).toBe(true);
      expect(statsRes.body.data.available).toBe(false);

      assignedNode.status = 'ONLINE';
    });

    it('should return safe fallback logs warning when host node is OFFLINE', async () => {
      const hostRes = await request(app)
        .get(`/api/v1/hosts/${testHostId}`)
        .set('Authorization', `Bearer ${userToken}`);
      const assignedNodeId = hostRes.body.data.host.nodeId;
      const assignedNode = memoryStore.nodes.find((n) => n.id === assignedNodeId)!;
      assignedNode.status = 'OFFLINE';

      const logsRes = await request(app)
        .get(`/api/v1/hosts/${testHostId}/logs`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(logsRes.status).toBe(200);
      expect(logsRes.body.success).toBe(true);
      const lines = logsRes.body.data?.logs?.lines || logsRes.body.data?.lines || [];
      expect(lines.some((l: string) => l.includes('OFFLINE'))).toBe(true);

      assignedNode.status = 'ONLINE';
    });

    it('should preserve host record and host assignment when node becomes OFFLINE', async () => {
      const hostRes = await request(app)
        .get(`/api/v1/hosts/${testHostId}`)
        .set('Authorization', `Bearer ${userToken}`);
      const assignedNodeId = hostRes.body.data.host.nodeId;
      const assignedNode = memoryStore.nodes.find((n) => n.id === assignedNodeId)!;
      assignedNode.status = 'OFFLINE';

      const getRes = await request(app)
        .get(`/api/v1/hosts/${testHostId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.host.id).toBe(testHostId);
      expect(getRes.body.data.host.nodeId).toBe(assignedNodeId);

      assignedNode.status = 'ONLINE';
    });
  });

  // ============================================================================
  // 8. Admin Node Details & Assigned Hosts API
  // ============================================================================
  describe('8. Admin Node Details & Assigned Hosts Inspection', () => {
    it('should return detailed node metrics and list of assigned hosts', async () => {
      const res = await request(app)
        .get('/api/v1/admin/nodes/node-vn-01')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.node).toBeDefined();
      expect(res.body.data.node.id).toBe('node-vn-01');
      expect(res.body.data.node.allocatedCpu).toBeDefined();
      expect(res.body.data.node.allocatedRam).toBeDefined();
      expect(Array.isArray(res.body.data.hosts)).toBe(true);
    });

    it('should reject non-admin access to node details with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/admin/nodes/node-vn-01')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
    });
  });
});
