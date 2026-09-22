import crypto from 'node:crypto';
import { query } from '../../db/index.js';
import { PlansService, FormattedHostingPlan } from '../plans/plans.service.js';
import { getPaymentProvider } from './providers/provider.factory.js';
import { MockPaymentProvider } from './providers/mock-payment.provider.js';
import { BadRequestError, NotFoundError, ForbiddenError, AppError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';
import type { CreateCheckoutInput, SimulatePaymentInput, WebhookInput } from './billing.schema.js';

export interface SubscriptionRow {
  id: string;
  user_id: string;
  plan_id: string;
  status: 'PENDING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'EXPIRED' | 'SUSPENDED';
  billing_interval: 'MONTHLY' | 'YEARLY';
  price: number | string;
  currency: string;
  current_period_start: Date | string;
  current_period_end: Date | string;
  cancel_at_period_end: boolean;
  created_at: Date | string;
  updated_at: Date | string;
  plan_name?: string;
  plan_price_monthly?: number | string;
  plan_cpu_cores?: number | string;
  plan_ram_mb?: number;
  plan_disk_mb?: number;
}

export interface InvoiceRow {
  id: string;
  user_id: string;
  subscription_id?: string | null;
  invoice_number: string;
  amount: number | string;
  currency: string;
  status: 'DRAFT' | 'OPEN' | 'PAID' | 'VOID' | 'FAILED';
  description: string;
  invoice_date: Date | string;
  due_date: Date | string;
  paid_at?: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface PaymentRow {
  id: string;
  user_id: string;
  invoice_id: string;
  subscription_id?: string | null;
  provider: string;
  provider_payment_id: string;
  amount: number | string;
  currency: string;
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED';
  idempotency_key?: string | null;
  metadata?: any;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface FormattedSubscription {
  id: string;
  userId: string;
  planId: string;
  planName: string;
  status: string;
  billingInterval: 'MONTHLY' | 'YEARLY';
  price: number;
  currency: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
  plan?: {
    id: string;
    name: string;
    cpu: string;
    ram: string;
    disk: string;
    priceMonthly: number;
    priceYearly: number;
  };
}

export interface FormattedInvoice {
  id: string;
  userId: string;
  subscriptionId?: string | null;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
  invoiceDate: string;
  dueDate: string;
  paidAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export class BillingService {
  /**
   * List all available plans with Monthly & Yearly pricing and resource limits
   */
  public static async listPlans(): Promise<(FormattedHostingPlan & { priceYearly: number; domainLimit: number; backupLimit: number })[]> {
    const plans = await PlansService.listActivePlans();
    return plans.map((p) => {
      // Yearly price gives ~17% discount (10 months instead of 12)
      const yearlyPrice = Math.round(p.priceMonthly * 10);
      const domainLimit = p.id === 'pro' ? 10 : p.id === 'developer' ? 5 : 2;
      const backupLimit = p.id === 'pro' ? 10 : p.id === 'developer' ? 5 : 3;

      return {
        ...p,
        priceYearly: yearlyPrice,
        domainLimit,
        backupLimit,
      };
    });
  }

  /**
   * Get active subscription for a user
   */
  public static async getUserSubscription(userId: string): Promise<FormattedSubscription | null> {
    const { rows } = await query<SubscriptionRow>(
      `SELECT s.*, 
              p.name AS plan_name, p.price_monthly AS plan_price_monthly, 
              p.cpu_cores AS plan_cpu_cores, p.ram_mb AS plan_ram_mb, p.disk_mb AS plan_disk_mb
       FROM user_subscriptions s
       LEFT JOIN hosting_plans p ON s.plan_id = p.id
       WHERE s.user_id = $1
       ORDER BY s.created_at DESC
       LIMIT 1`,
      [userId]
    );

    if (rows.length === 0) return null;
    const sub = rows[0];

    const planPriceMonthly = Number(sub.plan_price_monthly || sub.price);
    const planCpu = `${Number(sub.plan_cpu_cores || 1)} vCPU`;
    const ramMb = Number(sub.plan_ram_mb || 512);
    const diskMb = Number(sub.plan_disk_mb || 5120);
    const planRam = ramMb >= 1024 ? `${Math.round(ramMb / 1024)} GB` : `${ramMb} MB`;
    const planDisk = `${diskMb >= 1024 ? Math.round(diskMb / 1024) : diskMb} GB NVMe`;

    return {
      id: sub.id,
      userId: sub.user_id,
      planId: sub.plan_id,
      planName: sub.plan_name || sub.plan_id.toUpperCase(),
      status: sub.status,
      billingInterval: sub.billing_interval || 'MONTHLY',
      price: Number(sub.price),
      currency: sub.currency || 'VND',
      currentPeriodStart: sub.current_period_start instanceof Date ? sub.current_period_start.toISOString() : String(sub.current_period_start),
      currentPeriodEnd: sub.current_period_end instanceof Date ? sub.current_period_end.toISOString() : String(sub.current_period_end),
      cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
      createdAt: sub.created_at instanceof Date ? sub.created_at.toISOString() : String(sub.created_at),
      updatedAt: sub.updated_at instanceof Date ? sub.updated_at.toISOString() : String(sub.updated_at),
      plan: {
        id: sub.plan_id,
        name: sub.plan_name || sub.plan_id.toUpperCase(),
        cpu: planCpu,
        ram: planRam,
        disk: planDisk,
        priceMonthly: planPriceMonthly,
        priceYearly: Math.round(planPriceMonthly * 10),
      },
    };
  }

  /**
   * Create Checkout Session for a plan
   */
  public static async createCheckout(userId: string, userEmail: string, input: CreateCheckoutInput) {
    const plan = await PlansService.getPlanById(input.planId);
    if (!plan) {
      throw new BadRequestError(`Gói dịch vụ "${input.planId}" không tồn tại hoặc đã ngừng cung cấp`);
    }

    // Server-enforced price calculation (Tamper-proof)
    const isYearly = input.billingInterval === 'YEARLY';
    const amount = isYearly ? Math.round(plan.priceMonthly * 10) : plan.priceMonthly;
    const currency = 'VND';

    // Unique invoice identification
    const now = new Date();
    const datePrefix = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const invoiceNumber = `INV-${datePrefix}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const invoiceId = `inv-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`;
    const invoiceDesc = `Đăng ký gói ${plan.name} (${isYearly ? 'Hàng năm' : 'Hàng tháng'})`;
    const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // 1. Create Invoice in OPEN state
    await query<InvoiceRow>(
      `INSERT INTO billing_invoices (id, user_id, subscription_id, invoice_number, amount, currency, status, description, invoice_date, due_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [invoiceId, userId, null, invoiceNumber, amount, currency, 'OPEN', invoiceDesc, now, dueDate]
    );

    // 2. Delegate to configured payment provider
    const provider = getPaymentProvider();
    const checkoutSession = await provider.createCheckout({
      userId,
      userEmail,
      planId: plan.id,
      planName: plan.name,
      amount,
      currency,
      billingInterval: input.billingInterval,
      invoiceId,
      invoiceNumber,
      idempotencyKey: input.idempotencyKey,
    });

    // 3. Record pending payment transaction
    const paymentId = crypto.randomUUID();
    await query<PaymentRow>(
      `INSERT INTO billing_payments (id, user_id, invoice_id, subscription_id, provider, provider_payment_id, amount, currency, status, idempotency_key, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        paymentId,
        userId,
        invoiceId,
        null,
        checkoutSession.provider,
        checkoutSession.providerPaymentId,
        amount,
        currency,
        'PENDING',
        input.idempotencyKey || null,
        JSON.stringify({ planId: plan.id, billingInterval: input.billingInterval, checkoutId: checkoutSession.checkoutId }),
      ]
    );

    return {
      checkoutId: checkoutSession.checkoutId,
      checkoutUrl: checkoutSession.checkoutUrl,
      provider: checkoutSession.provider,
      providerPaymentId: checkoutSession.providerPaymentId,
      amount,
      currency,
      invoiceId,
      invoiceNumber,
      expiresAt: checkoutSession.expiresAt,
      isMock: provider.isMock,
    };
  }

  /**
   * Process successful payment idempotently
   */
  public static async processPaymentSuccess(providerPaymentId: string, metadata?: any) {
    const { rows: payments } = await query<PaymentRow>(
      `SELECT * FROM billing_payments WHERE provider_payment_id = $1 LIMIT 1`,
      [providerPaymentId]
    );

    if (payments.length === 0) {
      throw new NotFoundError(`Không tìm thấy giao dịch thanh toán mã ${providerPaymentId}`);
    }

    const payment = payments[0];

    // Idempotency check: if payment already succeeded, return existing state
    if (payment.status === 'SUCCEEDED') {
      logger.info({ providerPaymentId }, '[BillingService] Payment already processed as SUCCEEDED (idempotent no-op)');
      const sub = await this.getUserSubscription(payment.user_id);
      return { subscription: sub, alreadyProcessed: true };
    }

    // 1. Update Payment to SUCCEEDED
    await query(
      `UPDATE billing_payments SET status = $1, updated_at = NOW() WHERE provider_payment_id = $2 RETURNING *`,
      ['SUCCEEDED', providerPaymentId]
    );

    // 2. Update Invoice to PAID
    await query(
      `UPDATE billing_invoices SET status = $1, paid_at = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
      ['PAID', new Date(), payment.invoice_id]
    );

    // 3. Activate / Extend User Subscription
    let paymentMeta = payment.metadata || metadata || {};
    if (typeof paymentMeta === 'string') {
      try {
        paymentMeta = JSON.parse(paymentMeta);
      } catch {}
    }
    const planId = paymentMeta.planId || 'developer';
    const interval = (paymentMeta.billingInterval || 'MONTHLY') as 'MONTHLY' | 'YEARLY';
    const amount = Number(payment.amount);

    const now = new Date();
    const periodEnd = new Date(now.getTime() + (interval === 'YEARLY' ? 365 : 30) * 24 * 60 * 60 * 1000);

    // Check if user already has a subscription
    const { rows: existingSubs } = await query<SubscriptionRow>(
      `SELECT * FROM user_subscriptions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [payment.user_id]
    );

    let activeSubId: string;
    if (existingSubs.length > 0) {
      const existing = existingSubs[0];
      activeSubId = existing.id;
      await query(
        `UPDATE user_subscriptions 
         SET plan_id = $1, billing_interval = $2, price = $3, status = $4, current_period_start = $5, current_period_end = $6, cancel_at_period_end = $7, updated_at = NOW()
         WHERE id = $8 RETURNING *`,
        [planId, interval, amount, 'ACTIVE', now, periodEnd, false, existing.id]
      );
    } else {
      activeSubId = crypto.randomUUID();
      await query(
        `INSERT INTO user_subscriptions (id, user_id, plan_id, status, billing_interval, price, currency, current_period_start, current_period_end, cancel_at_period_end)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [activeSubId, payment.user_id, planId, 'ACTIVE', interval, amount, payment.currency || 'VND', now, periodEnd, false]
      );
    }

    // Link subscription ID back to payment & invoice
    await query(`UPDATE billing_payments SET subscription_id = $1 WHERE id = $2`, [activeSubId, payment.id]);
    await query(`UPDATE billing_invoices SET subscription_id = $1 WHERE id = $2`, [activeSubId, payment.invoice_id]);

    const updatedSub = await this.getUserSubscription(payment.user_id);
    logger.info({ userId: payment.user_id, subscriptionId: activeSubId, planId }, '[BillingService] Subscription activated successfully');

    return { subscription: updatedSub, alreadyProcessed: false };
  }

  /**
   * Process failed payment idempotently
   */
  public static async processPaymentFailure(providerPaymentId: string, _reason?: string) {
    const { rows: payments } = await query<PaymentRow>(
      `SELECT * FROM billing_payments WHERE provider_payment_id = $1 LIMIT 1`,
      [providerPaymentId]
    );

    if (payments.length === 0) {
      throw new NotFoundError(`Không tìm thấy giao dịch thanh toán mã ${providerPaymentId}`);
    }

    const payment = payments[0];
    if (payment.status === 'FAILED') {
      return { payment, alreadyProcessed: true };
    }

    await query(`UPDATE billing_payments SET status = $1, updated_at = NOW() WHERE provider_payment_id = $2`, [
      'FAILED',
      providerPaymentId,
    ]);

    await query(`UPDATE billing_invoices SET status = $1, updated_at = NOW() WHERE id = $2`, [
      'FAILED',
      payment.invoice_id,
    ]);

    logger.warn({ providerPaymentId, userId: payment.user_id }, '[BillingService] Payment recorded as FAILED');
    return { payment, alreadyProcessed: false };
  }

  /**
   * Simulate mock checkout payment result (development & test mode only)
   */
  public static async simulatePayment(userId: string, input: SimulatePaymentInput) {
    const provider = getPaymentProvider();
    if (!provider.isMock) {
      throw new BadRequestError('Tính năng mô phỏng thanh toán chỉ khả dụng trong chế độ phát triển (Mock Mode)');
    }

    const mockProvider = provider as MockPaymentProvider;
    const session = mockProvider.getSession(input.checkoutId);
    if (!session) {
      throw new NotFoundError(`Không tìm thấy phiên thanh toán "${input.checkoutId}"`);
    }

    if (session.userId !== userId) {
      throw new ForbiddenError('Bạn không có quyền thao tác trên phiên thanh toán này');
    }

    if (input.simulateOutcome === 'success') {
      const event = mockProvider.simulatePaymentSuccess(input.checkoutId);
      const result = await this.processPaymentSuccess(event.providerPaymentId, event.metadata);
      return {
        status: 'SUCCEEDED',
        message: 'Mô phỏng thanh toán thành công. Gói dịch vụ đã được kích hoạt!',
        subscription: result.subscription,
      };
    } else {
      const event = mockProvider.simulatePaymentFailure(input.checkoutId, input.failureReason || 'Số dư không đủ');
      await this.processPaymentFailure(event.providerPaymentId, input.failureReason);
      return {
        status: 'FAILED',
        message: 'Mô phỏng thanh toán thất bại.',
        error: input.failureReason || 'Số dư không đủ',
      };
    }
  }

  /**
   * Handle webhook event idempotently
   */
  public static async handleWebhook(input: WebhookInput, signature?: string) {
    const provider = getPaymentProvider();

    // Verify webhook signature
    if (signature && !provider.verifyWebhookSignature(signature, input)) {
      throw new ForbiddenError('Chữ ký webhook không hợp lệ');
    }

    if (input.eventType === 'payment.succeeded') {
      return await this.processPaymentSuccess(input.providerPaymentId, input.metadata);
    } else if (input.eventType === 'payment.failed') {
      return await this.processPaymentFailure(input.providerPaymentId);
    } else {
      logger.info({ eventType: input.eventType }, '[BillingService] Unhandled webhook event type');
      return { received: true };
    }
  }

  /**
   * List invoices for a user
   */
  public static async getUserInvoices(userId: string): Promise<FormattedInvoice[]> {
    const { rows } = await query<InvoiceRow>(
      `SELECT * FROM billing_invoices WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );

    return rows.map((inv) => ({
      id: inv.id,
      userId: inv.user_id,
      subscriptionId: inv.subscription_id,
      invoiceNumber: inv.invoice_number,
      amount: Number(inv.amount),
      currency: inv.currency || 'VND',
      status: inv.status,
      description: inv.description,
      invoiceDate: inv.invoice_date instanceof Date ? inv.invoice_date.toISOString() : String(inv.invoice_date),
      dueDate: inv.due_date instanceof Date ? inv.due_date.toISOString() : String(inv.due_date),
      paidAt: inv.paid_at ? (inv.paid_at instanceof Date ? inv.paid_at.toISOString() : String(inv.paid_at)) : null,
      createdAt: inv.created_at instanceof Date ? inv.created_at.toISOString() : String(inv.created_at),
      updatedAt: inv.updated_at instanceof Date ? inv.updated_at.toISOString() : String(inv.updated_at),
    }));
  }

  /**
   * Get single invoice by ID with Anti-IDOR check
   */
  public static async getInvoiceById(invoiceId: string, userId: string, role: string): Promise<FormattedInvoice> {
    const { rows } = await query<InvoiceRow>(
      `SELECT * FROM billing_invoices WHERE (id = $1 OR invoice_number = $1) LIMIT 1`,
      [invoiceId]
    );

    if (rows.length === 0) {
      throw new NotFoundError('Không tìm thấy hóa đơn được yêu cầu');
    }

    const inv = rows[0];
    if (role !== 'ADMIN' && inv.user_id !== userId) {
      throw new NotFoundError('Không tìm thấy hóa đơn được yêu cầu');
    }

    return {
      id: inv.id,
      userId: inv.user_id,
      subscriptionId: inv.subscription_id,
      invoiceNumber: inv.invoice_number,
      amount: Number(inv.amount),
      currency: inv.currency || 'VND',
      status: inv.status,
      description: inv.description,
      invoiceDate: inv.invoice_date instanceof Date ? inv.invoice_date.toISOString() : String(inv.invoice_date),
      dueDate: inv.due_date instanceof Date ? inv.due_date.toISOString() : String(inv.due_date),
      paidAt: inv.paid_at ? (inv.paid_at instanceof Date ? inv.paid_at.toISOString() : String(inv.paid_at)) : null,
      createdAt: inv.created_at instanceof Date ? inv.created_at.toISOString() : String(inv.created_at),
      updatedAt: inv.updated_at instanceof Date ? inv.updated_at.toISOString() : String(inv.updated_at),
    };
  }

  /**
   * Cancel subscription at period end (graceful non-destructive cancellation)
   */
  public static async cancelSubscription(userId: string): Promise<FormattedSubscription> {
    const sub = await this.getUserSubscription(userId);
    if (!sub || sub.status !== 'ACTIVE') {
      throw new BadRequestError('Bạn không có gói đăng ký đang hoạt động để hủy');
    }

    await query(
      `UPDATE user_subscriptions SET cancel_at_period_end = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [true, sub.id]
    );

    logger.info({ userId, subscriptionId: sub.id }, '[BillingService] Subscription marked to cancel at period end');
    return (await this.getUserSubscription(userId))!;
  }

  /**
   * Reactivate a subscription that was marked to cancel at period end
   */
  public static async reactivateSubscription(userId: string): Promise<FormattedSubscription> {
    const sub = await this.getUserSubscription(userId);
    if (!sub || sub.status !== 'ACTIVE') {
      throw new BadRequestError('Không tìm thấy gói đăng ký hợp lệ để kích hoạt lại');
    }

    if (!sub.cancelAtPeriodEnd) {
      throw new BadRequestError('Gói đăng ký hiện đang được tự động gia hạn');
    }

    await query(
      `UPDATE user_subscriptions SET cancel_at_period_end = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [false, sub.id]
    );

    logger.info({ userId, subscriptionId: sub.id }, '[BillingService] Subscription cancellation revoked (reactivated)');
    return (await this.getUserSubscription(userId))!;
  }
}
