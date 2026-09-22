import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { getMockClient } from '../src/modules/node-agent/index.js';
import { LocalMockNodeAgentClient } from '../src/modules/node-agent/mock.client.js';
import { DomainsService } from '../src/modules/domains/domains.service.js';
import { query } from '../src/db/index.js';
import type { Express } from 'express';

describe('Milestone 10: Host Domains & SSL Management Test Suite', () => {
  let app: Express;
  let userToken: string;
  let userBToken: string;
  let adminToken: string;
  let mockClient: LocalMockNodeAgentClient;
  let hostAId: string;
  let hostBId: string;
  let createdDomainId: string;

  beforeAll(async () => {
    app = createApp();
    mockClient = getMockClient();

    // 1. Authenticate User A
    const userRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ login: 'alex.dang@astoncloud.vn', password: 'Password@123' });
    expect(userRes.status).toBe(200);
    userToken = userRes.body.data.token;

    // 2. Register/Login User B
    const userBRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'user.domain.b@astoncloud.vn',
        username: 'user_domain_b',
        password: 'Password@123',
        displayName: 'User Domain B',
      });
    userBToken = userBRes.status === 201 ? userBRes.body.data.token : '';
    if (!userBToken) {
      const loginB = await request(app)
        .post('/api/v1/auth/login')
        .send({ login: 'user.domain.b@astoncloud.vn', password: 'Password@123' });
      userBToken = loginB.body.data.token;
    }
    expect(userBToken).toBeTruthy();

    // 3. Authenticate Admin
    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ login: 'admin@astoncloud.vn', password: 'AdminPassword@123' });
    expect(adminRes.status).toBe(200);
    adminToken = adminRes.body.data.token;

    // 4. Create Host A for User A
    const hostARes = await request(app)
      .post('/api/v1/hosts')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'host-domain-test-a',
        runtimeId: 'nodejs',
        runtimeVersion: '20',
        planId: 'starter',
      });
    expect(hostARes.status).toBe(201);
    hostAId = hostARes.body.data.host.id;

    // 5. Create Host B for User B
    const hostBRes = await request(app)
      .post('/api/v1/hosts')
      .set('Authorization', `Bearer ${userBToken}`)
      .send({
        name: 'host-domain-test-b',
        runtimeId: 'nodejs',
        runtimeVersion: '20',
        planId: 'starter',
      });
    expect(hostBRes.status).toBe(201);
    hostBId = hostBRes.body.data.host.id;
  });

  afterAll(async () => {
    await mockClient.reset();
  });

  // =================================================================
  // 1. Authentication & IDOR Protection Tests
  // =================================================================
  describe('Authentication & IDOR Protection', () => {
    it('rejects unauthenticated requests with 401 Unauthorized', async () => {
      const res = await request(app).get(`/api/v1/hosts/${hostAId}/domains`);
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('prevents User B from viewing User A host domains (404 IDOR protection)', async () => {
      const res = await request(app)
        .get(`/api/v1/hosts/${hostAId}/domains`)
        .set('Authorization', `Bearer ${userBToken}`);
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('prevents User B from attaching a domain to User A host (404 IDOR protection)', async () => {
      const res = await request(app)
        .post(`/api/v1/hosts/${hostAId}/domains`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ domain: 'hacked-domain.com' });
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // =================================================================
  // 2. Domain Validation & Normalization Tests
  // =================================================================
  describe('Domain Name Validation & Normalization', () => {
    it('rejects URLs with protocol scheme (http://, https://)', async () => {
      const badUrls = ['https://myapp.com', 'http://api.myapp.com', '//cdn.myapp.com'];
      for (const domain of badUrls) {
        const res = await request(app)
          .post(`/api/v1/hosts/${hostAId}/domains`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({ domain });
        expect(res.status).toBe(400);
      }
    });

    it('rejects domains containing URL paths or ports', async () => {
      const invalid = ['myapp.com/api', 'myapp.com:8080', 'myapp.com/index.html'];
      for (const domain of invalid) {
        const res = await request(app)
          .post(`/api/v1/hosts/${hostAId}/domains`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({ domain });
        expect(res.status).toBe(400);
      }
    });

    it('rejects localhost and .localhost variations', async () => {
      const invalid = ['localhost', 'api.localhost', 'sub.domain.localhost'];
      for (const domain of invalid) {
        const res = await request(app)
          .post(`/api/v1/hosts/${hostAId}/domains`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({ domain });
        expect(res.status).toBe(400);
      }
    });

    it('rejects IP addresses (loopback, private, and public IPs)', async () => {
      const ips = ['127.0.0.1', '192.168.1.1', '10.0.0.1', '172.16.0.1', '8.8.8.8'];
      for (const domain of ips) {
        const res = await request(app)
          .post(`/api/v1/hosts/${hostAId}/domains`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({ domain });
        expect(res.status).toBe(400);
      }
    });

    it('rejects malformed domains with invalid characters or missing TLD', async () => {
      const malformed = ['nodot', 'my space.com', 'bad@domain.com', '.startdot.com', '-startdash.com'];
      for (const domain of malformed) {
        const res = await request(app)
          .post(`/api/v1/hosts/${hostAId}/domains`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({ domain });
        expect(res.status).toBe(400);
      }
    });

    it('normalizes uppercase letters and trailing dot', async () => {
      const res = await request(app)
        .post(`/api/v1/hosts/${hostAId}/domains`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ domain: 'MyTestApp.VN.' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.domain).toBe('mytestapp.vn');

      // Cleanup this test domain
      await request(app)
        .delete(`/api/v1/hosts/${hostAId}/domains/${res.body.data.id}`)
        .set('Authorization', `Bearer ${userToken}`);
    });
  });

  // =================================================================
  // 3. CRUD Operations, Verification Instructions & Duplicate Handling
  // =================================================================
  describe('CRUD Operations & DNS Verification Instructions', () => {
    it('creates a custom domain and returns secure verification instructions', async () => {
      const res = await request(app)
        .post(`/api/v1/hosts/${hostAId}/domains`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ domain: 'app.mycompany.vn', targetPort: 3000 });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.domain).toBe('app.mycompany.vn');
      expect(res.body.data.status).toBe('PENDING');
      expect(res.body.data.sslStatus).toBe('NOT_REQUESTED');
      expect(res.body.data.targetPort).toBe(3000);
      expect(res.body.data.verificationToken).toContain('aston-verify-');
      expect(res.body.data.dnsRecords.length).toBeGreaterThanOrEqual(2);

      // Verify TXT record instruction
      const txtRecord = res.body.data.dnsRecords.find((r: any) => r.type === 'TXT');
      expect(txtRecord).toBeDefined();
      expect(txtRecord.name).toBe('_aston-verify.app.mycompany.vn');
      expect(txtRecord.value).toBe(res.body.data.verificationToken);

      // Verify CNAME record instruction
      const cnameRecord = res.body.data.dnsRecords.find((r: any) => r.type === 'CNAME');
      expect(cnameRecord).toBeDefined();
      expect(cnameRecord.name).toBe('app.mycompany.vn');

      createdDomainId = res.body.data.id;
    });

    it('rejects duplicate domain assignment across the platform (409 Conflict)', async () => {
      // User B attempts to attach the same domain (app.mycompany.vn) to Host B
      const res = await request(app)
        .post(`/api/v1/hosts/${hostBId}/domains`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ domain: 'app.mycompany.vn' });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('lists domains of Host A with verification status', async () => {
      const res = await request(app)
        .get(`/api/v1/hosts/${hostAId}/domains`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].domain).toBe('app.mycompany.vn');
    });

    it('retrieves single domain details by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/hosts/${hostAId}/domains/${createdDomainId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(createdDomainId);
      expect(res.body.data.domain).toBe('app.mycompany.vn');
    });

    it('prevents User B from accessing User A domain details (404 IDOR)', async () => {
      const res = await request(app)
        .get(`/api/v1/hosts/${hostAId}/domains/${createdDomainId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(404);
    });
  });

  // =================================================================
  // 4. Verification Abstraction & Reverse Proxy Routing
  // =================================================================
  describe('Domain Verification & Reverse Proxy Routing Integration', () => {
    it('simulates verification failure on fail.test domain', async () => {
      // Create a domain designed to trigger mock failure
      const createRes = await request(app)
        .post(`/api/v1/hosts/${hostAId}/domains`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ domain: 'mock-fail.test' });
      expect(createRes.status).toBe(201);
      const failDomId = createRes.body.data.id;

      // Trigger verification
      const verifyRes = await request(app)
        .post(`/api/v1/hosts/${hostAId}/domains/${failDomId}/verify`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.data.verification.verified).toBe(false);
      expect(verifyRes.body.data.domain.status).toBe('ERROR');
      expect(verifyRes.body.data.domain.errorMessage).toBeTruthy();

      // Clean up
      await request(app)
        .delete(`/api/v1/hosts/${hostAId}/domains/${failDomId}`)
        .set('Authorization', `Bearer ${userToken}`);
    });

    it('verifies domain successfully and configures reverse proxy route', async () => {
      const verifyRes = await request(app)
        .post(`/api/v1/hosts/${hostAId}/domains/${createdDomainId}/verify`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.data.verification.verified).toBe(true);
      expect(verifyRes.body.data.domain.status).toBe('ACTIVE');
      expect(verifyRes.body.data.domain.verifiedAt).toBeTruthy();

      // Check routing table in MockDomainRoutingService
      const routingService = DomainsService.getRoutingService();
      const route = await routingService.getDomainRoute('app.mycompany.vn');
      expect(route).toBeDefined();
      expect(route?.hostname).toBe('app.mycompany.vn');
      expect(route?.targetPort).toBe(3000);
    });
  });

  // =================================================================
  // 5. SSL Certificate Lifecycle & Authorization Tests
  // =================================================================
  describe('SSL Certificate Lifecycle & Automated HTTPS', () => {
    it('rejects SSL certificate request if domain is NOT verified (ACTIVE)', async () => {
      // Create unverified domain
      const unverifiedRes = await request(app)
        .post(`/api/v1/hosts/${hostAId}/domains`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ domain: 'unverified-app.test' });
      const unverifiedId = unverifiedRes.body.data.id;

      const sslRes = await request(app)
        .post(`/api/v1/hosts/${hostAId}/domains/${unverifiedId}/ssl`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(sslRes.status).toBe(400);
      expect(JSON.stringify(sslRes.body)).toMatch(/xác thực|ACTIVE/i);

      // Clean up
      await request(app)
        .delete(`/api/v1/hosts/${hostAId}/domains/${unverifiedId}`)
        .set('Authorization', `Bearer ${userToken}`);
    });

    it('simulates SSL issuance failure on cert-error domain', async () => {
      // Create and verify a domain with 'cert-error'
      const res1 = await request(app)
        .post(`/api/v1/hosts/${hostAId}/domains`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ domain: 'cert-error-app.test' });
      const failSslId = res1.body.data.id;

      await request(app)
        .post(`/api/v1/hosts/${hostAId}/domains/${failSslId}/verify`)
        .set('Authorization', `Bearer ${userToken}`);

      // Request SSL
      const sslRes = await request(app)
        .post(`/api/v1/hosts/${hostAId}/domains/${failSslId}/ssl`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(sslRes.status).toBe(200);
      expect(sslRes.body.data.sslResult.success).toBe(false);
      expect(sslRes.body.data.domain.sslStatus).toBe('ERROR');

      // Clean up
      await request(app)
        .delete(`/api/v1/hosts/${hostAId}/domains/${failSslId}`)
        .set('Authorization', `Bearer ${userToken}`);
    });

    it('issues simulated Let\'s Encrypt SSL certificate for active domain', async () => {
      const sslRes = await request(app)
        .post(`/api/v1/hosts/${hostAId}/domains/${createdDomainId}/ssl`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(sslRes.status).toBe(200);
      expect(sslRes.body.success).toBe(true);
      expect(sslRes.body.data.domain.sslStatus).toBe('ACTIVE');
      expect(sslRes.body.data.sslResult.success).toBe(true);
      expect(sslRes.body.data.sslResult.isMock).toBe(true);
      expect(sslRes.body.data.sslResult.issuer).toContain("Let's Encrypt");
    });

    it('disables SSL certificate for domain when requested', async () => {
      const res = await request(app)
        .delete(`/api/v1/hosts/${hostAId}/domains/${createdDomainId}/ssl`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.domain.sslStatus).toBe('NOT_REQUESTED');
    });

    it('prevents User B from triggering SSL actions on User A domain', async () => {
      const res = await request(app)
        .post(`/api/v1/hosts/${hostAId}/domains/${createdDomainId}/ssl`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(404);
    });
  });

  // =================================================================
  // 6. Platform Domain Limits & User All Domains Query
  // =================================================================
  describe('Domain Limits & Platform Overview', () => {
    it('enforces maximum domains per host limit', async () => {
      // Host A currently has 1 domain (app.mycompany.vn)
      // Limit is MAX_DOMAINS_PER_HOST = 5
      const addedIds: string[] = [];

      for (let i = 1; i <= 4; i++) {
        const res = await request(app)
          .post(`/api/v1/hosts/${hostAId}/domains`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({ domain: `sub${i}.mycompany.vn` });
        expect(res.status).toBe(201);
        addedIds.push(res.body.data.id);
      }

      // 6th domain exceeds limit of 5
      const exceedRes = await request(app)
        .post(`/api/v1/hosts/${hostAId}/domains`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ domain: 'exceed-limit.mycompany.vn' });

      expect(exceedRes.status).toBe(400);
      expect(JSON.stringify(exceedRes.body)).toMatch(/giới hạn tối đa/i);

      // Clean up extra domains
      for (const id of addedIds) {
        await request(app)
          .delete(`/api/v1/hosts/${hostAId}/domains/${id}`)
          .set('Authorization', `Bearer ${userToken}`);
      }
    });

    it('lists all user domains across hosts via /api/v1/domains', async () => {
      // Create 1 domain on Host B for User B
      await request(app)
        .post(`/api/v1/hosts/${hostBId}/domains`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ domain: 'user-b-domain.com' });

      // User A query
      const resA = await request(app)
        .get('/api/v1/domains')
        .set('Authorization', `Bearer ${userToken}`);
      expect(resA.status).toBe(200);
      expect(resA.body.data.some((d: any) => d.domain === 'app.mycompany.vn')).toBe(true);
      expect(resA.body.data.some((d: any) => d.domain === 'user-b-domain.com')).toBe(false);

      // User B query
      const resB = await request(app)
        .get('/api/v1/domains')
        .set('Authorization', `Bearer ${userBToken}`);
      expect(resB.status).toBe(200);
      expect(resB.body.data.some((d: any) => d.domain === 'user-b-domain.com')).toBe(true);
      expect(resB.body.data.some((d: any) => d.domain === 'app.mycompany.vn')).toBe(false);
    });
  });

  // =================================================================
  // 7. Deletion & Cascade Clean Up Tests
  // =================================================================
  describe('Domain Deletion & Route Clean Up', () => {
    it('deletes custom domain and cleans up reverse proxy route and database', async () => {
      const delRes = await request(app)
        .delete(`/api/v1/hosts/${hostAId}/domains/${createdDomainId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(delRes.status).toBe(200);
      expect(delRes.body.success).toBe(true);

      // Verify domain is gone from database
      const { rows } = await query<any>(
        `SELECT * FROM host_domains WHERE id = $1`,
        [createdDomainId]
      );
      expect(rows.length).toBe(0);

      // Verify route was removed from MockDomainRoutingService
      const routingService = DomainsService.getRoutingService();
      const route = await routingService.getDomainRoute('app.mycompany.vn');
      expect(route).toBeNull();
    });

    it('cascades deletion of domains when a host is deleted', async () => {
      // Create temporary host
      const hostRes = await request(app)
        .post('/api/v1/hosts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'temp-cascade-host',
          runtimeId: 'nodejs',
          runtimeVersion: '20',
          planId: 'starter',
        });
      const tempHostId = hostRes.body.data.host.id;

      // Add domain to temp host
      const domRes = await request(app)
        .post(`/api/v1/hosts/${tempHostId}/domains`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ domain: 'cascade-test.com' });
      const tempDomId = domRes.body.data.id;

      // Delete the host
      const delHostRes = await request(app)
        .delete(`/api/v1/hosts/${tempHostId}`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(delHostRes.status).toBe(200);

      // Verify domain was cascade deleted
      const { rows } = await query<any>(
        `SELECT * FROM host_domains WHERE id = $1`,
        [tempDomId]
      );
      expect(rows.length).toBe(0);
    });
  });
});
