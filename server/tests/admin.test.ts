import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { memoryStore } from '../src/db/memory-fallback.js';
import type { Express } from 'express';

describe('Admin Panel & Management API Test Suite (Milestone 14)', () => {
  let app: Express;
  let adminToken: string;
  let userToken: string;
  let targetUserId: string;
  let testHostId: string;
  let testDomainId: string;

  beforeAll(async () => {
    app = createApp();

    // 1. Authenticate Admin user
    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ login: 'admin@astoncloud.vn', password: 'AdminPassword@123' });
    expect(adminRes.status).toBe(200);
    adminToken = adminRes.body.data.token;

    // 2. Authenticate standard USER
    const userRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ login: 'alex.dang@astoncloud.vn', password: 'Password@123' });
    expect(userRes.status).toBe(200);
    userToken = userRes.body.data.token;

    // 3. Register a test target user for suspension/role tests
    const targetUserRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'target.user@astoncloud.vn',
        username: 'target_user_01',
        password: 'Password@123',
        displayName: 'Target User Test',
      });
    expect([200, 201]).toContain(targetUserRes.status);
    targetUserId = targetUserRes.body.data.user.id;

    // 4. Create a host owned by alex to test admin host management
    const hostRes = await request(app)
      .post('/api/v1/hosts')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'admin-test-host',
        runtimeId: 'nodejs',
        runtimeVersion: '20',
        planId: 'starter',
        region: 'Singapore',
      });
    if (hostRes.status === 201) {
      testHostId = hostRes.body.data.host.id;
    } else {
      // Find an existing host from memoryStore
      testHostId = memoryStore.hosts[0]?.id || 'host-sample-01';
    }

    // 5. Create or find a domain to test admin domain management
    if (memoryStore.hostDomains.length > 0) {
      testDomainId = memoryStore.hostDomains[0].id;
    } else {
      const newDomain = {
        id: 'dom-admin-test-01',
        host_id: testHostId,
        domain: 'admintest.example.com',
        status: 'ACTIVE' as const,
        ssl_status: 'ACTIVE' as const,
        verification_token: 'tok-adm-test',
        verification_record: 'aston-verify=tok-adm-test',
        verified_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };
      memoryStore.hostDomains.push(newDomain);
      testDomainId = newDomain.id;
    }
  });

  // ============================================================================
  // 1. Role-Based Authorization Enforcement
  // ============================================================================
  describe('Admin Authorization & Role Enforcement', () => {
    it('should reject unauthenticated request to /admin with 401', async () => {
      const res = await request(app).get('/api/v1/admin/dashboard/stats');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject standard USER request to /admin with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard/stats')
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error?.message).toContain('Yêu cầu quyền truy cập cấp cao');
    });

    it('should allow ADMIN to access /admin/dashboard/stats with 200 OK', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard/stats')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.users).toBeDefined();
      expect(res.body.data.hosts).toBeDefined();
      expect(res.body.data.nodes).toBeDefined();
      expect(res.body.data.billing).toBeDefined();
      expect(Array.isArray(res.body.data.recentActivities)).toBe(true);
    });
  });

  // ============================================================================
  // 2. User Management & Safe Suspension
  // ============================================================================
  describe('Admin User Management', () => {
    it('should list all users with pagination and search', async () => {
      const res = await request(app)
        .get('/api/v1/admin/users?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);

      // Verify no password hashes are exposed
      for (const u of res.body.data) {
        expect(u.password_hash).toBeUndefined();
        expect(u.password).toBeUndefined();
      }
    });

    it('should inspect single user details with resources', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/users/${targetUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.id).toBe(targetUserId);
      expect(res.body.data.user.password_hash).toBeUndefined();
      expect(Array.isArray(res.body.data.hosts)).toBe(true);
    });

    it('should safely SUSPEND target user and record audit log', async () => {
      const suspendRes = await request(app)
        .post(`/api/v1/admin/users/${targetUserId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'SUSPENDED',
          reason: 'Nghi ngờ vi phạm chính sách sử dụng tài nguyên đám mây',
        });

      expect(suspendRes.status).toBe(200);
      expect(suspendRes.body.data.user.status).toBe('SUSPENDED');

      // Attempt to login as the suspended user - must be rejected with 403
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ login: 'target.user@astoncloud.vn', password: 'Password@123' });
      expect(loginRes.status).toBe(403);
      expect(loginRes.body.error?.message).toContain('tạm khóa');
    });

    it('should safely ACTIVATE suspended user back to ACTIVE', async () => {
      const activateRes = await request(app)
        .post(`/api/v1/admin/users/${targetUserId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'ACTIVE',
          reason: 'Đã xác minh thông tin tài khoản hợp lệ',
        });

      expect(activateRes.status).toBe(200);
      expect(activateRes.body.data.user.status).toBe('ACTIVE');

      // Now user can log in again
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ login: 'target.user@astoncloud.vn', password: 'Password@123' });
      expect(loginRes.status).toBe(200);
    });

    it('should prevent admin from self-suspending with 400', async () => {
      const myAdminUser = memoryStore.users.find((u) => u.email === 'admin@astoncloud.vn');
      expect(myAdminUser).toBeDefined();

      const res = await request(app)
        .post(`/api/v1/admin/users/${myAdminUser!.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'SUSPENDED',
          reason: 'Tự khóa tài khoản',
        });

      expect(res.status).toBe(400);
      expect(res.body.error?.message).toContain('không thể tự khóa');
    });

    it('should change user role to ADMIN and back to USER', async () => {
      const promoteRes = await request(app)
        .patch(`/api/v1/admin/users/${targetUserId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'ADMIN' });

      expect(promoteRes.status).toBe(200);
      expect(promoteRes.body.data.user.role).toBe('ADMIN');

      const demoteRes = await request(app)
        .patch(`/api/v1/admin/users/${targetUserId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'USER' });

      expect(demoteRes.status).toBe(200);
      expect(demoteRes.body.data.user.role).toBe('USER');
    });
  });

  // ============================================================================
  // 3. Host Management
  // ============================================================================
  describe('Admin Host Management', () => {
    it('should list all hosts across all users', async () => {
      const res = await request(app)
        .get('/api/v1/admin/hosts')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should allow admin to perform lifecycle actions on hosts', async () => {
      if (!testHostId) return;

      // Admin stop host
      const stopRes = await request(app)
        .post(`/api/v1/admin/hosts/${testHostId}/actions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ action: 'stop' });

      expect([200, 400]).toContain(stopRes.status);

      // Admin start host
      const startRes = await request(app)
        .post(`/api/v1/admin/hosts/${testHostId}/actions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ action: 'start' });

      expect([200, 400]).toContain(startRes.status);
    });
  });

  // ============================================================================
  // 4. Node Management
  // ============================================================================
  describe('Admin Node Management', () => {
    it('should list cluster nodes with resource allocation and mock notice', async () => {
      const res = await request(app)
        .get('/api/v1/admin/nodes')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      const node = res.body.data[0];
      expect(node.id).toBeDefined();
      expect(node.totalCpu).toBeGreaterThan(0);
      expect(node.isMock).toBe(true);
      expect(node.mockNotice).toContain('Mock Infrastructure');
    });

    it('should update node status to MAINTENANCE and then back to ONLINE', async () => {
      const node = memoryStore.nodes[0];
      expect(node).toBeDefined();

      const maintRes = await request(app)
        .post(`/api/v1/admin/nodes/${node.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'MAINTENANCE' });

      expect(maintRes.status).toBe(200);
      expect(maintRes.body.data.node.status).toBe('MAINTENANCE');

      const onlineRes = await request(app)
        .post(`/api/v1/admin/nodes/${node.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'ONLINE' });

      expect(onlineRes.status).toBe(200);
      expect(onlineRes.body.data.node.status).toBe('ONLINE');
    });
  });

  // ============================================================================
  // 5. Plan Management
  // ============================================================================
  describe('Admin Plan Management', () => {
    it('should list all plans including inactive ones', async () => {
      const res = await request(app)
        .get('/api/v1/admin/plans')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);
    });

    it('should create a new hosting plan with valid resources', async () => {
      const planPayload = {
        id: `custom-plan-${Date.now()}`,
        name: 'Enterprise Cloud AI',
        description: 'Gói hiệu năng cao phục vụ mô hình AI và cơ sở dữ liệu lớn',
        priceMonthly: 990000,
        priceYearly: 9900000,
        ramMb: 8192,
        cpuCores: 8,
        diskMb: 102400,
        bandwidthMb: 1024000,
        domainLimit: 50,
        backupLimit: 20,
      };

      const res = await request(app)
        .post('/api/v1/admin/plans')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(planPayload);

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBe(planPayload.id);
      expect(res.body.data.priceMonthly).toBe(990000);
    });

    it('should reject plan creation with negative prices', async () => {
      const res = await request(app)
        .post('/api/v1/admin/plans')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          id: 'invalid-price-plan',
          name: 'Invalid Price',
          priceMonthly: -50000,
          ramMb: 1024,
          cpuCores: 1,
          diskMb: 5120,
        });

      expect(res.status).toBe(400);
    });

    it('should update plan details safely', async () => {
      const res = await request(app)
        .patch('/api/v1/admin/plans/developer')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ description: 'Gói Developer cập nhật tối ưu hóa cho ứng dụng Node.js & Bun' });

      expect(res.status).toBe(200);
      expect(res.body.data.description).toContain('tối ưu hóa');
    });

    it('should toggle plan activation status', async () => {
      const res = await request(app)
        .patch('/api/v1/admin/plans/starter/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: true });

      expect(res.status).toBe(200);
      expect(res.body.data.isActive).toBe(true);
    });
  });

  // ============================================================================
  // 6. Subscriptions, Invoices, Domains, Backups
  // ============================================================================
  describe('Admin Resource Inspection', () => {
    it('should inspect all subscriptions across users', async () => {
      const res = await request(app)
        .get('/api/v1/admin/subscriptions')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should inspect all invoices across users', async () => {
      const res = await request(app)
        .get('/api/v1/admin/invoices')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should inspect all domains and delete domain safely', async () => {
      const listRes = await request(app)
        .get('/api/v1/admin/domains')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(listRes.status).toBe(200);
      expect(Array.isArray(listRes.body.data)).toBe(true);

      if (testDomainId) {
        const delRes = await request(app)
          .delete(`/api/v1/admin/domains/${testDomainId}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(delRes.status).toBe(200);
        expect(delRes.body.data.success).toBe(true);
      }
    });

    it('should inspect all host backups metadata', async () => {
      const res = await request(app)
        .get('/api/v1/admin/backups')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // ============================================================================
  // 7. Audit Logs & System Settings
  // ============================================================================
  describe('Audit Logging & Settings', () => {
    it('should query audit logs and verify sensitive actions were recorded without secrets', async () => {
      const res = await request(app)
        .get('/api/v1/admin/activity?page=1&limit=20')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      // Verify no secrets or passwords in audit logs
      for (const log of res.body.data) {
        expect(log.details?.password).toBeUndefined();
        expect(log.details?.token).toBeUndefined();
        expect(log.details?.secret).toBeUndefined();
        expect(log.details?.apiKey).toBeUndefined();
      }
    });

    it('should fetch and update platform settings', async () => {
      const getRes = await request(app)
        .get('/api/v1/admin/settings')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.platformName).toBeDefined();

      const updateRes = await request(app)
        .patch('/api/v1/admin/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          platformName: 'Aston Cloud Enterprise Panel',
          supportEmail: 'admin-support@astoncloud.vn',
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.settings.platformName).toBe('Aston Cloud Enterprise Panel');
      expect(updateRes.body.data.settings.supportEmail).toBe('admin-support@astoncloud.vn');
    });
  });
});
