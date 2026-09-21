-- Migration 001: Initial Schema for Aston Cloud Hosting Platform
-- Supports Node.js, Bun, and Python cloud hosting

-- Enable UUID extension if available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Migrations Tracker Table
CREATE TABLE IF NOT EXISTS schema_migrations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  role VARCHAR(50) NOT NULL DEFAULT 'customer',
  is_active BOOLEAN NOT NULL DEFAULT true,
  email_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 3. User Sessions
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) UNIQUE NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

-- 4. Hosting Plans Table
CREATE TABLE IF NOT EXISTS hosting_plans (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price_monthly NUMERIC(12, 2) NOT NULL,
  ram_mb INTEGER NOT NULL,
  cpu_cores NUMERIC(4, 2) NOT NULL,
  disk_mb INTEGER NOT NULL,
  bandwidth_mb INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Hosting Nodes (Cluster servers)
CREATE TABLE IF NOT EXISTS hosting_nodes (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  region VARCHAR(50) NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'online',
  total_ram_mb INTEGER NOT NULL,
  total_cpu_cores NUMERIC(6, 2) NOT NULL,
  total_disk_mb INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Runtime Versions
CREATE TABLE IF NOT EXISTS runtime_versions (
  id SERIAL PRIMARY KEY,
  runtime VARCHAR(50) NOT NULL,
  version VARCHAR(50) NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_runtime_version UNIQUE (runtime, version)
);

-- 7. Hosts (Applications / Containers)
CREATE TABLE IF NOT EXISTS hosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id VARCHAR(50) NOT NULL REFERENCES hosting_plans(id),
  node_id VARCHAR(50) REFERENCES hosting_nodes(id),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  runtime VARCHAR(50) NOT NULL,
  runtime_version VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'stopped',
  memory_mb INTEGER NOT NULL,
  cpu_limit NUMERIC(4, 2) NOT NULL,
  disk_mb INTEGER NOT NULL,
  port INTEGER,
  auto_restart BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hosts_user_id ON hosts(user_id);
CREATE INDEX IF NOT EXISTS idx_hosts_status ON hosts(status);

-- 8. Host Environment Variables
CREATE TABLE IF NOT EXISTS host_env_vars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES hosts(id) ON DELETE CASCADE,
  key VARCHAR(255) NOT NULL,
  value TEXT NOT NULL,
  is_secret BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_host_env_key UNIQUE (host_id, key)
);

CREATE INDEX IF NOT EXISTS idx_host_env_vars_host_id ON host_env_vars(host_id);

-- 9. Host Domains
CREATE TABLE IF NOT EXISTS host_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES hosts(id) ON DELETE CASCADE,
  domain VARCHAR(255) NOT NULL UNIQUE,
  is_custom BOOLEAN NOT NULL DEFAULT false,
  ssl_enabled BOOLEAN NOT NULL DEFAULT false,
  ssl_status VARCHAR(50) NOT NULL DEFAULT 'pending',
  verification_status VARCHAR(50) NOT NULL DEFAULT 'verified',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_host_domains_host_id ON host_domains(host_id);

-- 10. Host Backups
CREATE TABLE IF NOT EXISTS host_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES hosts(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'completed',
  backup_type VARCHAR(50) NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_host_backups_host_id ON host_backups(host_id);

-- 11. Billing Invoices
CREATE TABLE IF NOT EXISTS billing_invoices (
  id VARCHAR(50) PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'VND',
  status VARCHAR(50) NOT NULL DEFAULT 'paid',
  description TEXT,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_invoices_user_id ON billing_invoices(user_id);

-- 12. User Subscriptions
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id VARCHAR(50) NOT NULL REFERENCES hosting_plans(id),
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);

-- 13. Support Tickets & Messages
CREATE TABLE IF NOT EXISTS support_tickets (
  id VARCHAR(50) PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  host_id UUID REFERENCES hosts(id) ON DELETE SET NULL,
  subject VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'open',
  priority VARCHAR(50) NOT NULL DEFAULT 'medium',
  department VARCHAR(50) NOT NULL DEFAULT 'technical',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);

CREATE TABLE IF NOT EXISTS support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id VARCHAR(50) NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  sender_type VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_id ON support_messages(ticket_id);

-- SEED DATA
-- Seed Plans
INSERT INTO hosting_plans (id, name, description, price_monthly, ram_mb, cpu_cores, disk_mb, bandwidth_mb)
VALUES
  ('plan-starter', 'Gói Khởi Đầu (Starter)', 'Phù hợp bot, api nhỏ hoặc dev test cá nhân', 49000, 1024, 1.0, 10240, 102400),
  ('plan-pro', 'Gói Tiêu Chuẩn (Pro)', 'Khuyên dùng cho ứng dụng web sản xuất và API vừa', 129000, 2048, 2.0, 25600, 256000),
  ('plan-ultra', 'Gói Hiệu Năng Cao (Ultra)', 'Dành cho hệ thống lưu lượng cao và microservices', 289000, 4096, 4.0, 51200, 512000)
ON CONFLICT (id) DO NOTHING;

-- Seed Nodes
INSERT INTO hosting_nodes (id, name, region, ip_address, status, total_ram_mb, total_cpu_cores, total_disk_mb)
VALUES
  ('node-sg-01', 'Singapore Node 01 (AWS ap-southeast-1)', 'Singapore', '13.212.45.10', 'online', 32768, 16.0, 1048576),
  ('node-vn-01', 'Việt Nam Node 01 (FPT HCM)', 'Vietnam', '103.142.12.8', 'online', 32768, 16.0, 1048576)
ON CONFLICT (id) DO NOTHING;

-- Seed Runtime Versions (Node.js, Bun, Python)
INSERT INTO runtime_versions (runtime, version, is_default)
VALUES
  ('node', '20.x LTS (Khuyên dùng)', true),
  ('node', '22.x LTS', false),
  ('node', '18.x Maintenance', false),
  ('bun', '1.2.x Mới nhất', true),
  ('bun', '1.1.x Ổn định', false),
  ('python', '3.12 Ổn định', true),
  ('python', '3.11 Phổ biến', false),
  ('python', '3.10 Legacy', false)
ON CONFLICT (runtime, version) DO NOTHING;
