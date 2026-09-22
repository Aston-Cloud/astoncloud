import crypto from 'node:crypto';
import {
  IPaymentProvider,
  CreateCheckoutParams,
  CheckoutSession,
  VerifyPaymentParams,
  VerifyPaymentResult,
  WebhookEvent,
} from './payment-provider.interface.js';
import { logger } from '../../../utils/logger.js';

interface StoredMockSession {
  checkoutId: string;
  providerPaymentId: string;
  userId: string;
  planId: string;
  amount: number;
  currency: string;
  billingInterval: 'MONTHLY' | 'YEARLY';
  invoiceId?: string;
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED';
  expiresAt: Date;
  metadata?: Record<string, any>;
  failureReason?: string;
}

export class MockPaymentProvider implements IPaymentProvider {
  public readonly providerName = 'Aston Mock Payment Gateway (Development/Test Mode)';
  public readonly isMock = true;

  private sessions: Map<string, StoredMockSession> = new Map();
  private paymentIdToCheckoutId: Map<string, string> = new Map();

  /**
   * Creates a mock checkout session
   */
  public async createCheckout(params: CreateCheckoutParams): Promise<CheckoutSession> {
    const checkoutId = `mock_chk_${crypto.randomBytes(8).toString('hex')}`;
    const providerPaymentId = `mock_pay_${crypto.randomBytes(8).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    const session: StoredMockSession = {
      checkoutId,
      providerPaymentId,
      userId: params.userId,
      planId: params.planId,
      amount: params.amount,
      currency: params.currency,
      billingInterval: params.billingInterval,
      invoiceId: params.invoiceId,
      status: 'PENDING',
      expiresAt,
      metadata: {
        planName: params.planName,
        userEmail: params.userEmail,
        idempotencyKey: params.idempotencyKey,
      },
    };

    this.sessions.set(checkoutId, session);
    this.paymentIdToCheckoutId.set(providerPaymentId, checkoutId);

    logger.info(
      { checkoutId, providerPaymentId, amount: params.amount, planId: params.planId },
      '[MockPaymentProvider] Mock checkout session created'
    );

    return {
      checkoutId,
      checkoutUrl: `/billing/checkout?session=${checkoutId}&provider=mock`,
      provider: 'mock',
      providerPaymentId,
      amount: params.amount,
      currency: params.currency,
      status: 'PENDING',
      expiresAt,
      metadata: session.metadata,
    };
  }

  /**
   * Retrieves current payment status
   */
  public async getPaymentStatus(providerPaymentId: string): Promise<VerifyPaymentResult> {
    const checkoutId = this.paymentIdToCheckoutId.get(providerPaymentId);
    if (!checkoutId) {
      return {
        verified: false,
        providerPaymentId,
        status: 'FAILED',
        amount: 0,
        currency: 'VND',
        error: 'Không tìm thấy giao dịch thanh toán mock',
      };
    }

    const session = this.sessions.get(checkoutId);
    if (!session) {
      return {
        verified: false,
        providerPaymentId,
        status: 'FAILED',
        amount: 0,
        currency: 'VND',
        error: 'Phiên thanh toán đã hết hạn hoặc không tồn tại',
      };
    }

    return {
      verified: session.status === 'SUCCEEDED',
      providerPaymentId: session.providerPaymentId,
      status: session.status,
      amount: session.amount,
      currency: session.currency,
      metadata: session.metadata,
      error: session.failureReason,
    };
  }

  /**
   * Verifies payment result
   */
  public async verifyPayment(params: VerifyPaymentParams): Promise<VerifyPaymentResult> {
    let session: StoredMockSession | undefined;

    if (params.checkoutId) {
      session = this.sessions.get(params.checkoutId);
    } else if (params.providerPaymentId) {
      const chkId = this.paymentIdToCheckoutId.get(params.providerPaymentId);
      if (chkId) session = this.sessions.get(chkId);
    }

    if (!session) {
      return {
        verified: false,
        providerPaymentId: params.providerPaymentId || '',
        status: 'FAILED',
        amount: 0,
        currency: 'VND',
        error: 'Phiên thanh toán mock không tồn tại',
      };
    }

    return {
      verified: session.status === 'SUCCEEDED',
      providerPaymentId: session.providerPaymentId,
      status: session.status,
      amount: session.amount,
      currency: session.currency,
      metadata: session.metadata,
      error: session.failureReason,
    };
  }

  /**
   * Verifies mock webhook signature
   */
  public verifyWebhookSignature(signature: string, _payload: any): boolean {
    // In mock mode, check if signature matches 'mock_sig_' prefix or is non-empty mock header
    if (!signature) return false;
    return signature.startsWith('mock_sig_') || signature === 'mock-valid-signature';
  }

  /**
   * Simulates a successful payment for development & testing
   */
  public simulatePaymentSuccess(checkoutIdOrPaymentId: string): WebhookEvent {
    let session: StoredMockSession | undefined;

    if (this.sessions.has(checkoutIdOrPaymentId)) {
      session = this.sessions.get(checkoutIdOrPaymentId);
    } else if (this.paymentIdToCheckoutId.has(checkoutIdOrPaymentId)) {
      const chkId = this.paymentIdToCheckoutId.get(checkoutIdOrPaymentId)!;
      session = this.sessions.get(chkId);
    }

    if (!session) {
      throw new Error(`Mock checkout/payment "${checkoutIdOrPaymentId}" không tồn tại`);
    }

    session.status = 'SUCCEEDED';
    session.failureReason = undefined;

    logger.info(
      { checkoutId: session.checkoutId, providerPaymentId: session.providerPaymentId },
      '[MockPaymentProvider] Simulated payment SUCCESS'
    );

    return {
      eventId: `evt_${crypto.randomBytes(6).toString('hex')}`,
      eventType: 'payment.succeeded',
      providerPaymentId: session.providerPaymentId,
      checkoutId: session.checkoutId,
      amount: session.amount,
      currency: session.currency,
      metadata: {
        ...session.metadata,
        userId: session.userId,
        planId: session.planId,
        billingInterval: session.billingInterval,
        invoiceId: session.invoiceId,
      },
      timestamp: new Date(),
    };
  }

  /**
   * Simulates a failed payment for development & testing
   */
  public simulatePaymentFailure(checkoutIdOrPaymentId: string, reason = 'Số dư tài khoản thẻ không đủ'): WebhookEvent {
    let session: StoredMockSession | undefined;

    if (this.sessions.has(checkoutIdOrPaymentId)) {
      session = this.sessions.get(checkoutIdOrPaymentId);
    } else if (this.paymentIdToCheckoutId.has(checkoutIdOrPaymentId)) {
      const chkId = this.paymentIdToCheckoutId.get(checkoutIdOrPaymentId)!;
      session = this.sessions.get(chkId);
    }

    if (!session) {
      throw new Error(`Mock checkout/payment "${checkoutIdOrPaymentId}" không tồn tại`);
    }

    session.status = 'FAILED';
    session.failureReason = reason;

    logger.info(
      { checkoutId: session.checkoutId, providerPaymentId: session.providerPaymentId, reason },
      '[MockPaymentProvider] Simulated payment FAILURE'
    );

    return {
      eventId: `evt_${crypto.randomBytes(6).toString('hex')}`,
      eventType: 'payment.failed',
      providerPaymentId: session.providerPaymentId,
      checkoutId: session.checkoutId,
      amount: session.amount,
      currency: session.currency,
      metadata: {
        ...session.metadata,
        userId: session.userId,
        planId: session.planId,
        billingInterval: session.billingInterval,
        invoiceId: session.invoiceId,
        error: reason,
      },
      timestamp: new Date(),
    };
  }

  /**
   * Optional refund
   */
  public async refundPayment(providerPaymentId: string): Promise<boolean> {
    const chkId = this.paymentIdToCheckoutId.get(providerPaymentId);
    if (!chkId) return false;
    const session = this.sessions.get(chkId);
    if (!session || session.status !== 'SUCCEEDED') return false;

    session.status = 'REFUNDED';
    return true;
  }

  /**
   * Get session by checkout ID (test helper)
   */
  public getSession(checkoutId: string): StoredMockSession | undefined {
    return this.sessions.get(checkoutId);
  }
}
