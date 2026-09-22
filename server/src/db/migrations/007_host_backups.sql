-- Migration 007: Complete Host Backups schema for Milestone 11
-- Ensures host_backups has all necessary fields for storage, lifecycle and recovery

ALTER TABLE host_backups ADD COLUMN IF NOT EXISTS storage_key VARCHAR(500) NOT NULL DEFAULT '';
ALTER TABLE host_backups ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE host_backups ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE host_backups ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE host_backups ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE host_backups ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_host_backups_status ON host_backups(status);
CREATE INDEX IF NOT EXISTS idx_host_backups_created_at ON host_backups(created_at DESC);
