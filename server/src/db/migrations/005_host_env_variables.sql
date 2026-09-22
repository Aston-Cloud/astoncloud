-- Migration 005: Host Environment Variables with Authenticated Encryption
-- Persists encrypted environment variables for each cloud host

CREATE TABLE IF NOT EXISTS host_env_variables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES hosts(id) ON DELETE CASCADE,
  key VARCHAR(255) NOT NULL,
  encrypted_value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_host_env_variables_key UNIQUE (host_id, key)
);

CREATE INDEX IF NOT EXISTS idx_host_env_variables_host_id 
  ON host_env_variables(host_id);

CREATE INDEX IF NOT EXISTS idx_host_env_variables_created_at 
  ON host_env_variables(created_at);
