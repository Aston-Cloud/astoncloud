import type { Request, Response, NextFunction } from 'express';
import { BillingService } from './billing.service.js';
import {
  createCheckoutSchema,
  simulatePaymentSchema,
  webhookSchema,
  invoiceParamsSchema,
} from './billing.schema.js';
import { sendSuccess } from '../../utils/response.js';
import { UnauthorizedError } from '../../utils/errors.js';

export class BillingController {
  /**
   * GET /api/v1/billing/plans
   */
  public static async getPlans(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const plans = await BillingService.listPlans();
      sendSuccess(res, { plans });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/billing/subscription
   */
  public static async getSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) throw new UnauthorizedError();

      const subscription = await BillingService.getUserSubscription(user.id);
      sendSuccess(res, { subscription });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/billing/checkout
   */
  public static async createCheckout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) throw new UnauthorizedError();

      const input = createCheckoutSchema.parse(req.body);
      const checkout = await BillingService.createCheckout(user.id, user.email, input);
      sendSuccess(res, checkout, 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/billing/checkout/simulate
   */
  public static async simulatePayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) throw new UnauthorizedError();

      const input = simulatePaymentSchema.parse(req.body);
      const result = await BillingService.simulatePayment(user.id, input);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/billing/webhook
   */
  public static async handleWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const signature = (req.headers['x-webhook-signature'] || req.headers['authorization']) as string | undefined;
      const input = webhookSchema.parse(req.body);
      const result = await BillingService.handleWebhook(input, signature);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/billing/invoices
   */
  public static async getInvoices(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) throw new UnauthorizedError();

      const invoices = await BillingService.getUserInvoices(user.id);
      sendSuccess(res, { invoices });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/billing/invoices/:invoiceId
   */
  public static async getInvoiceById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) throw new UnauthorizedError();

      const { invoiceId } = invoiceParamsSchema.parse(req.params);
      const invoice = await BillingService.getInvoiceById(invoiceId, user.id, user.role);
      sendSuccess(res, { invoice });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/billing/subscription/cancel
   */
  public static async cancelSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) throw new UnauthorizedError();

      const subscription = await BillingService.cancelSubscription(user.id);
      sendSuccess(res, {
        subscription,
        message: 'Gói đăng ký sẽ kết thúc khi hết chu kỳ hiện tại và không tự động gia hạn',
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/billing/subscription/reactivate
   */
  public static async reactivateSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) throw new UnauthorizedError();

      const subscription = await BillingService.reactivateSubscription(user.id);
      sendSuccess(res, {
        subscription,
        message: 'Đã kích hoạt lại tự động gia hạn thành công cho gói dịch vụ',
      });
    } catch (err) {
      next(err);
    }
  }
}
