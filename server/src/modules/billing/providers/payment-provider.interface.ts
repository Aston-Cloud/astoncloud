export type BillingInterval = 'MONTHLY' | 'YEARLY';

export type PaymentStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED';

export interface CreateCheckoutParams {
  userId: string;
  userEmail?: string;
  planId: string;
  planName: string;
  amount: number;
  currency: string;
  billingInterval: BillingInterval;
  invoiceId?: string;
  invoiceNumber?: string;
  successUrl?: string;
  cancelUrl?: string;
  idempotencyKey?: string;
}

export interface CheckoutSession {
  checkoutId: string;
  checkoutUrl: string;
  provider: string;
  providerPaymentId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  expiresAt: Date;
  metadata?: Record<string, any>;
}

export interface VerifyPaymentParams {
  checkoutId?: string;
  providerPaymentId?: string;
  signature?: string;
  payload?: any;
}

export interface VerifyPaymentResult {
  verified: boolean;
  providerPaymentId: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  metadata?: Record<string, any>;
  error?: string;
}

export interface WebhookEvent {
  eventId: string;
  eventType: 'payment.succeeded' | 'payment.failed' | 'payment.refunded';
  providerPaymentId: string;
  checkoutId?: string;
  amount: number;
  currency: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface IPaymentProvider {
  readonly providerName: string;
  readonly isMock: boolean;

  createCheckout(params: CreateCheckoutParams): Promise<CheckoutSession>;
  getPaymentStatus(providerPaymentId: string): Promise<VerifyPaymentResult>;
  verifyPayment(params: VerifyPaymentParams): Promise<VerifyPaymentResult>;
  verifyWebhookSignature(signature: string, payload: any): boolean;
  refundPayment?(providerPaymentId: string, amount?: number): Promise<boolean>;
}
