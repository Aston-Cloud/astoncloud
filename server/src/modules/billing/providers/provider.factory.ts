import { IPaymentProvider } from './payment-provider.interface.js';
import { MockPaymentProvider } from './mock-payment.provider.js';

let activeProvider: IPaymentProvider | null = null;

/**
 * Returns configured payment provider instance (default: MockPaymentProvider)
 */
export function getPaymentProvider(): IPaymentProvider {
  if (!activeProvider) {
    const mode = process.env.PAYMENT_PROVIDER_MODE || 'mock';
    if (mode === 'mock') {
      activeProvider = new MockPaymentProvider();
    } else {
      // Future production provider hook (e.g. Stripe, PayOS, VNPay)
      activeProvider = new MockPaymentProvider();
    }
  }
  return activeProvider;
}

/**
 * Reset provider instance (useful for test isolation)
 */
export function resetPaymentProvider(): void {
  activeProvider = null;
}
