import { z } from 'zod';

export const createCheckoutSchema = z.object({
  planId: z.string().min(1, 'Mã gói dịch vụ không được để trống').transform((val) => val.trim().toLowerCase()),
  billingInterval: z.enum(['MONTHLY', 'YEARLY']).default('MONTHLY'),
  idempotencyKey: z.string().optional(),
});

export const simulatePaymentSchema = z.object({
  checkoutId: z.string().min(1, 'Mã phiên thanh toán (checkoutId) không được để trống'),
  simulateOutcome: z.enum(['success', 'failure']).default('success'),
  failureReason: z.string().optional(),
});

export const webhookSchema = z.object({
  eventType: z.enum(['payment.succeeded', 'payment.failed', 'payment.refunded']),
  providerPaymentId: z.string().min(1, 'Mã thanh toán của cổng (providerPaymentId) không được để trống'),
  amount: z.number().optional(),
  currency: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export const invoiceParamsSchema = z.object({
  invoiceId: z.string().min(1, 'Mã hóa đơn không được để trống'),
});

export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>;
export type SimulatePaymentInput = z.infer<typeof simulatePaymentSchema>;
export type WebhookInput = z.infer<typeof webhookSchema>;
export type InvoiceParamsInput = z.infer<typeof invoiceParamsSchema>;
