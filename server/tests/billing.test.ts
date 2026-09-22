import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { memoryStore } from '../src/db/memory-fallback.js';
import type { Express } from 'express';

describe('Billing & Subscriptions API Test Suite (Milestone 13)', () => {
  let app: Express;
  let userToken: string;
  let userBToken: string;
  let adminToken: string;
  let alexInvoiceId: string;
  let createdCheckoutId: string;
  let createdProviderPaymentId: string;

  beforeAll(async () => {
    app = createApp();

    // 1. Authenticate standard user (Alex Dang - seeded with active Developer subscription)
    const userRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ login: 'alex.dang@astoncloud.vn', password: 'Password@123' });
    expect(userRes.status).toBe(200);
    userToken = userRes.body.data.token;

    // 2. Authenticate / register user B (Secondary user for isolation and anti-IDOR tests)
    const userBRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'billing.userb@astoncloud.vn',
        username: 'billing_user_b',
        password: 'Password@123',
        displayName: 'Billing User B',
      });
    expect([200, 201]).toContain(userBRes.status);
    userBToken = userBRes.body.data.token;

    // 3. Authenticate admin user
    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ login: 'admin@astoncloud.vn', password: 'AdminPassword@123' });
    expect(adminRes.status).toBe(200);
    adminToken = adminRes.body.data.token;
  });

  // ============================================================================
  // 1. Hosting Plans API
  // ============================================================================
  describe('GET /api/v1/billing/plans', () => {
    it('should return list of available plans with monthly and yearly pricing', async () => {
      const res = await request(app).get('/api/v1/billing/plans');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.plans)).toBe(true);
      expect(res.body.data.plans.length).toBeGreaterThanOrEqual(3);

      const planIds = res.body.data.plans.map((p: any) => p.id);
      expect(planIds).toContain('starter');
      expect(planIds).toContain('developer');
      expect(planIds).toContain('pro');

      const devPlan = res.body.data.plans.find((p: any) => p.id === 'developer');
      expect(devPlan.priceMonthly).toBe(129000);
      expect(devPlan.priceYearly).toBe(1290000);
      expect(devPlan.domainLimit).toBe(5);
      expect(devPlan.backupLimit).toBe(5);
    });
  });

  // ============================================================================
  // 2. User Subscription API
  // ============================================================================
  describe('GET /api/v1/billing/subscription', () => {
    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app).get('/api/v1/billing/subscription');
      expect(res.status).toBe(401);
    });

    it('should return active subscription for logged-in user', async () => {
      const res = await request(app)
        .get('/api/v1/billing/subscription')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const sub = res.body.data.subscription;
      expect(sub).toBeDefined();
      expect(sub.planId).toBe('pro');
      expect(sub.status).toBe('ACTIVE');
      expect(sub.billingInterval).toBe('MONTHLY');
      expect(sub.cancelAtPeriodEnd).toBe(false);
      expect(sub.plan).toBeDefined();
      expect(sub.plan.priceMonthly).toBe(259000);
    });
  });

  // ============================================================================
  // 3. Checkout Creation API
  // ============================================================================
  describe('POST /api/v1/billing/checkout', () => {
    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app)
        .post('/api/v1/billing/checkout')
        .send({ planId: 'pro', billingInterval: 'MONTHLY' });
      expect(res.status).toBe(401);
    });

    it('should reject non-existent plan with 400', async () => {
      const res = await request(app)
        .post('/api/v1/billing/checkout')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ planId: 'invalid-tier-999', billingInterval: 'MONTHLY' });
      expect(res.status).toBe(400);
    });

    it('should enforce server-side price calculation and create checkout session', async () => {
      const res = await request(app)
        .post('/api/v1/billing/checkout')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          planId: 'developer',
          billingInterval: 'MONTHLY',
          amount: 1, // Malicious attempt to forge price - server must ignore this!
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      const checkout = res.body.data;
      expect(checkout.checkoutId).toBeDefined();
      expect(checkout.providerPaymentId).toBeDefined();
      expect(checkout.provider).toBe('mock');
      expect(checkout.isMock).toBe(true);
      expect(checkout.amount).toBe(129000); // Server calculated Developer monthly price
      expect(checkout.currency).toBe('VND');
      expect(checkout.invoiceNumber).toMatch(/^INV-/);

      createdCheckoutId = checkout.checkoutId;
      createdProviderPaymentId = checkout.providerPaymentId;
    });

    it('should correctly calculate yearly discount (10 months instead of 12)', async () => {
      const res = await request(app)
        .post('/api/v1/billing/checkout')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          planId: 'starter',
          billingInterval: 'YEARLY',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.amount).toBe(490000); // 49,000 * 10
    });
  });

  // ============================================================================
  // 4. Mock Payment Simulation & Subscription Activation
  // ============================================================================
  describe('POST /api/v1/billing/checkout/simulate', () => {
    it('should simulate failed payment without activating subscription', async () => {
      // Create a fresh checkout session to simulate failure
      const chkRes = await request(app)
        .post('/api/v1/billing/checkout')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ planId: 'developer', billingInterval: 'MONTHLY' });
      expect(chkRes.status).toBe(201);
      const failCheckoutId = chkRes.body.data.checkoutId;

      const simRes = await request(app)
        .post('/api/v1/billing/checkout/simulate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          checkoutId: failCheckoutId,
          simulateOutcome: 'failure',
          failureReason: 'Thẻ hết hạn hoặc không đủ tiền',
        });

      expect(simRes.status).toBe(200);
      expect(simRes.body.data.status).toBe('FAILED');

      // Verify user subscription has NOT changed from initial pro
      const subRes = await request(app)
        .get('/api/v1/billing/subscription')
        .set('Authorization', `Bearer ${userToken}`);
      expect(subRes.body.data.subscription.planId).toBe('pro');
    });

    it('should simulate successful payment, mark invoice PAID and activate Developer subscription', async () => {
      const simRes = await request(app)
        .post('/api/v1/billing/checkout/simulate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          checkoutId: createdCheckoutId,
          simulateOutcome: 'success',
        });

      expect(simRes.status).toBe(200);
      expect(simRes.body.data.status).toBe('SUCCEEDED');
      expect(simRes.body.data.subscription.planId).toBe('developer');
      expect(simRes.body.data.subscription.status).toBe('ACTIVE');

      // Check user subscription now shows Developer
      const subRes = await request(app)
        .get('/api/v1/billing/subscription')
        .set('Authorization', `Bearer ${userToken}`);
      expect(subRes.body.data.subscription.planId).toBe('developer');
    });
  });

  // ============================================================================
  // 5. Idempotency & Webhook
  // ============================================================================
  describe('Webhook & Idempotency', () => {
    it('should safely ignore duplicate payment success events without duplicate invoices', async () => {
      // Send duplicate success webhook with the same providerPaymentId
      const webhookRes = await request(app)
        .post('/api/v1/billing/webhook')
        .send({
          eventType: 'payment.succeeded',
          providerPaymentId: createdProviderPaymentId,
        });

      expect(webhookRes.status).toBe(200);
      expect(webhookRes.body.data.alreadyProcessed).toBe(true);
    });
  });

  // ============================================================================
  // 6. User Invoices & Anti-IDOR
  // ============================================================================
  describe('Invoices API & Anti-IDOR Protections', () => {
    it('should list invoices for the authenticated user', async () => {
      const res = await request(app)
        .get('/api/v1/billing/invoices')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.invoices)).toBe(true);
      expect(res.body.data.invoices.length).toBeGreaterThanOrEqual(1);

      alexInvoiceId = res.body.data.invoices[0].id;
    });

    it('should allow user to get their own invoice by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/billing/invoices/${alexInvoiceId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.invoice.id).toBe(alexInvoiceId);
    });

    it('should prevent User B from accessing Alex’s invoice (Anti-IDOR)', async () => {
      const res = await request(app)
        .get(`/api/v1/billing/invoices/${alexInvoiceId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      // Expect 404 or 403 to prevent enumeration
      expect([403, 404]).toContain(res.status);
    });
  });

  // ============================================================================
  // 7. Subscription Lifecycle: Cancellation & Reactivation
  // ============================================================================
  describe('Subscription Cancellation & Reactivation', () => {
    it('should mark subscription to cancel at period end', async () => {
      const res = await request(app)
        .post('/api/v1/billing/subscription/cancel')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.subscription.cancelAtPeriodEnd).toBe(true);
      expect(res.body.data.subscription.status).toBe('ACTIVE'); // Still ACTIVE until period ends
    });

    it('should reactivate subscription and revoke cancellation flag', async () => {
      const res = await request(app)
        .post('/api/v1/billing/subscription/reactivate')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.subscription.cancelAtPeriodEnd).toBe(false);
      expect(res.body.data.subscription.status).toBe('ACTIVE');
    });
  });

  // ============================================================================
  // 8. Hosting Plan Access & Resource Quota Enforcement
  // ============================================================================
  describe('Hosting Plan Access Enforcement', () => {
    it('should allow user without subscription to create 1 free Starter host', async () => {
      const res = await request(app)
        .post('/api/v1/hosts')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          name: 'userb-free-starter',
          runtimeId: 'nodejs',
          runtimeVersion: '20',
          planId: 'starter',
          region: 'Singapore',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.host.planId).toBe('starter');
    });

    it('should reject user without subscription trying to create Developer host with 400', async () => {
      // Register a third user without any subscription
      const userCRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'billing.userc@astoncloud.vn',
          username: 'billing_user_c',
          password: 'Password@123',
          displayName: 'Billing User C',
        });
      const userCToken = userCRes.body.data.token;

      const res = await request(app)
        .post('/api/v1/hosts')
        .set('Authorization', `Bearer ${userCToken}`)
        .send({
          name: 'userc-unauthorized-dev',
          runtimeId: 'nodejs',
          runtimeVersion: '20',
          planId: 'developer',
          region: 'Singapore',
        });

      expect(res.status).toBe(400);
      expect(res.body.error?.message).toContain('Yêu cầu đăng ký gói dịch vụ');
    });

    it('should reject user without subscription trying to create a 2nd Starter host', async () => {
      const res = await request(app)
        .post('/api/v1/hosts')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          name: 'userb-second-starter',
          runtimeId: 'nodejs',
          runtimeVersion: '20',
          planId: 'starter',
          region: 'Singapore',
        });

      expect(res.status).toBe(400);
      expect(res.body.error?.message).toContain('hết lượt máy chủ dùng thử miễn phí');
    });
  });

  afterAll(() => {
    const alexSub = memoryStore.subscriptions.find((s) => s.user_id === 'usr-alex-002');
    if (alexSub) {
      alexSub.plan_id = 'pro';
      alexSub.status = 'ACTIVE';
      alexSub.cancel_at_period_end = false;
      alexSub.price = 259000;
    }
  });
});
