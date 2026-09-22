import { Router } from 'express';
import { BillingController } from './billing.controller.js';
import { requireAuth } from '../../middleware/auth.js';

export const billingRouter = Router();

// 1. Hosting Plans: GET /api/v1/billing/plans (Public / Authenticated)
billingRouter.get('/plans', BillingController.getPlans);

// 2. User Subscription: GET /api/v1/billing/subscription
billingRouter.get('/subscription', requireAuth, BillingController.getSubscription);

// 3. Create Checkout: POST /api/v1/billing/checkout
billingRouter.post('/checkout', requireAuth, BillingController.createCheckout);

// 4. Simulate Payment (Development & Test Mode): POST /api/v1/billing/checkout/simulate
billingRouter.post('/checkout/simulate', requireAuth, BillingController.simulatePayment);

// 5. Payment Webhook: POST /api/v1/billing/webhook
billingRouter.post('/webhook', BillingController.handleWebhook);

// 6. User Invoices: GET /api/v1/billing/invoices
billingRouter.get('/invoices', requireAuth, BillingController.getInvoices);

// 7. Single Invoice Detail: GET /api/v1/billing/invoices/:invoiceId (Anti-IDOR)
billingRouter.get('/invoices/:invoiceId', requireAuth, BillingController.getInvoiceById);

// 8. Cancel Subscription: POST /api/v1/billing/subscription/cancel
billingRouter.post('/subscription/cancel', requireAuth, BillingController.cancelSubscription);

// 9. Reactivate Subscription: POST /api/v1/billing/subscription/reactivate
billingRouter.post('/subscription/reactivate', requireAuth, BillingController.reactivateSubscription);
