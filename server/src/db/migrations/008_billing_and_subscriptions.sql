-- Migration 008: Billing, Subscriptions, and Payments Schema
-- Enhances user_subscriptions, billing_invoices, and creates billing_payments

-- 1. Enhance user_subscriptions table
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS billing_interval VARCHAR(20) NOT NULL DEFAULT 'MONTHLY';
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS price NUMERIC(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS currency VARCHAR(10) NOT NULL DEFAULT 'VND';
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Ensure status check constraint on user_subscriptions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_user_subscriptions_status'
  ) THEN
    ALTER TABLE user_subscriptions ADD CONSTRAINT chk_user_subscriptions_status
      CHECK (status IN ('PENDING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'EXPIRED', 'SUSPENDED'));
  END IF;
END $$;

-- 2. Enhance billing_invoices table
ALTER TABLE billing_invoices ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE SET NULL;
ALTER TABLE billing_invoices ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(50);
ALTER TABLE billing_invoices ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Backfill invoice_number if null
UPDATE billing_invoices 
SET invoice_number = 'INV-' || TO_CHAR(created_at, 'YYYYMM') || '-' || SUBSTRING(id::text, 1, 6)
WHERE invoice_number IS NULL;

-- Unique constraint on invoice_number
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_billing_invoices_number'
  ) THEN
    ALTER TABLE billing_invoices ADD CONSTRAINT uq_billing_invoices_number UNIQUE (invoice_number);
  END IF;
END $$;

-- Ensure status check constraint on billing_invoices
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_billing_invoices_status'
  ) THEN
    ALTER TABLE billing_invoices ADD CONSTRAINT chk_billing_invoices_status
      CHECK (status IN ('DRAFT', 'OPEN', 'PAID', 'VOID', 'FAILED'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_billing_invoices_subscription_id ON billing_invoices(subscription_id);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_number ON billing_invoices(invoice_number);

-- 3. Create billing_payments table
CREATE TABLE IF NOT EXISTS billing_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invoice_id VARCHAR(50) REFERENCES billing_invoices(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE SET NULL,
  provider VARCHAR(50) NOT NULL DEFAULT 'mock',
  provider_payment_id VARCHAR(100) UNIQUE NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'VND',
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  idempotency_key VARCHAR(100),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_billing_payments_status CHECK (status IN ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED'))
);

CREATE INDEX IF NOT EXISTS idx_billing_payments_user_id ON billing_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_payments_invoice_id ON billing_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_billing_payments_provider_id ON billing_payments(provider_payment_id);
CREATE INDEX IF NOT EXISTS idx_billing_payments_idempotency ON billing_payments(idempotency_key);
