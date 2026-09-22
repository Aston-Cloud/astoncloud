-- ==========================================
-- Migration 006: Host Domains & SSL Management
-- ==========================================

-- 1. Ensure host_domains table has all required columns
CREATE TABLE IF NOT EXISTS host_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES hosts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  domain VARCHAR(255) NOT NULL UNIQUE,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  ssl_status VARCHAR(50) NOT NULL DEFAULT 'NOT_REQUESTED',
  verification_method VARCHAR(50) NOT NULL DEFAULT 'DNS_TXT',
  verification_token VARCHAR(255) NOT NULL,
  target_port INTEGER NOT NULL DEFAULT 80,
  error_message TEXT,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Alter existing table columns if already created in prior migrations
ALTER TABLE host_domains ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'PENDING';
ALTER TABLE host_domains ADD COLUMN IF NOT EXISTS ssl_status VARCHAR(50) NOT NULL DEFAULT 'NOT_REQUESTED';
ALTER TABLE host_domains ADD COLUMN IF NOT EXISTS verification_method VARCHAR(50) NOT NULL DEFAULT 'DNS_TXT';
ALTER TABLE host_domains ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255);
ALTER TABLE host_domains ADD COLUMN IF NOT EXISTS target_port INTEGER NOT NULL DEFAULT 80;
ALTER TABLE host_domains ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE host_domains ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE host_domains ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 3. Indexes for fast lookup & host isolation
CREATE INDEX IF NOT EXISTS idx_host_domains_host_id ON host_domains(host_id);
CREATE INDEX IF NOT EXISTS idx_host_domains_domain ON host_domains(domain);
CREATE INDEX IF NOT EXISTS idx_host_domains_user_id ON host_domains(user_id);
