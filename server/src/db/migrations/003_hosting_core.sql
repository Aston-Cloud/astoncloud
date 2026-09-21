-- Migration 003: Hosting Core API Schema & Seed Data
-- Standardizes HostingPlan, Runtime, Node, and Host with PENDING status and strict resource limits

-- 1. Upgrade hosting_plans
INSERT INTO hosting_plans (id, name, description, price_monthly, ram_mb, cpu_cores, disk_mb, bandwidth_mb, is_active)
VALUES
  ('starter', 'Starter', 'Gói khởi đầu tối ưu cho bot, API microservice hoặc dự án cá nhân', 49000, 512, 1.0, 5120, 51200, true),
  ('developer', 'Developer', 'Gói dành cho lập trình viên phát triển ứng dụng web và API hoàn chỉnh', 129000, 2048, 2.0, 15360, 153600, true),
  ('pro', 'Pro', 'Gói chuyên nghiệp hiệu năng cao phục vụ lưu lượng sản xuất lớn', 259000, 4096, 4.0, 30720, 307200, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_monthly = EXCLUDED.price_monthly,
  ram_mb = EXCLUDED.ram_mb,
  cpu_cores = EXCLUDED.cpu_cores,
  disk_mb = EXCLUDED.disk_mb,
  bandwidth_mb = EXCLUDED.bandwidth_mb,
  is_active = EXCLUDED.is_active;

-- 2. Create and populate runtimes table
CREATE TABLE IF NOT EXISTS runtimes (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO runtimes (id, name, description, icon, is_active)
VALUES
  ('nodejs', 'Node.js', 'Môi trường JavaScript hướng sự kiện phía máy chủ tối ưu cho ứng dụng web và API mở rộng', 'node', true),
  ('bun', 'Bun', 'Môi trường runtime JavaScript & TypeScript tích hợp all-in-one siêu tốc', 'bun', true),
  ('python', 'Python', 'Môi trường Python hiện đại tối ưu cho FastAPI, Flask, Django và dịch vụ vi mô AI', 'python', true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  is_active = EXCLUDED.is_active;

-- 3. Enhance runtime_versions table
ALTER TABLE runtime_versions ADD COLUMN IF NOT EXISTS runtime_id VARCHAR(50) REFERENCES runtimes(id);

-- Backfill runtime_id from runtime
UPDATE runtime_versions SET runtime_id = 'nodejs' WHERE runtime IN ('node', 'nodejs') AND runtime_id IS NULL;
UPDATE runtime_versions SET runtime_id = 'bun' WHERE runtime = 'bun' AND runtime_id IS NULL;
UPDATE runtime_versions SET runtime_id = 'python' WHERE runtime = 'python' AND runtime_id IS NULL;

-- Insert / ensure official runtime versions specified in requirements
-- Node.js: 20, 22, 24
-- Bun: latest, stable
-- Python: 3.11, 3.12, 3.13
INSERT INTO runtime_versions (runtime, version, runtime_id, is_default, is_active)
VALUES
  ('nodejs', '20', 'nodejs', true, true),
  ('nodejs', '22', 'nodejs', false, true),
  ('nodejs', '24', 'nodejs', false, true),
  ('bun', 'latest', 'bun', true, true),
  ('bun', 'stable', 'bun', false, true),
  ('python', '3.11', 'python', false, true),
  ('python', '3.12', 'python', true, true),
  ('python', '3.13', 'python', false, true)
ON CONFLICT (runtime, version) DO UPDATE SET
  runtime_id = EXCLUDED.runtime_id,
  is_default = EXCLUDED.is_default,
  is_active = EXCLUDED.is_active;

-- 4. Enhance hosting_nodes table
ALTER TABLE hosting_nodes ADD COLUMN IF NOT EXISTS hostname VARCHAR(255);
ALTER TABLE hosting_nodes ADD COLUMN IF NOT EXISTS available_cpu_cores NUMERIC(6, 2);
ALTER TABLE hosting_nodes ADD COLUMN IF NOT EXISTS available_ram_mb INTEGER;
ALTER TABLE hosting_nodes ADD COLUMN IF NOT EXISTS available_disk_mb INTEGER;

-- Backfill default values for existing nodes
UPDATE hosting_nodes SET hostname = id || '.astoncloud.internal' WHERE hostname IS NULL;
UPDATE hosting_nodes SET available_cpu_cores = total_cpu_cores WHERE available_cpu_cores IS NULL;
UPDATE hosting_nodes SET available_ram_mb = total_ram_mb WHERE available_ram_mb IS NULL;
UPDATE hosting_nodes SET available_disk_mb = total_disk_mb WHERE available_disk_mb IS NULL;
UPDATE hosting_nodes SET status = UPPER(status);

ALTER TABLE hosting_nodes ALTER COLUMN hostname SET NOT NULL;
ALTER TABLE hosting_nodes ALTER COLUMN available_cpu_cores SET NOT NULL;
ALTER TABLE hosting_nodes ALTER COLUMN available_ram_mb SET NOT NULL;
ALTER TABLE hosting_nodes ALTER COLUMN available_disk_mb SET NOT NULL;

-- Enforce Node status constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_hosting_nodes_status'
  ) THEN
    ALTER TABLE hosting_nodes ADD CONSTRAINT chk_hosting_nodes_status
      CHECK (status IN ('ONLINE', 'OFFLINE', 'MAINTENANCE', 'DRAINING'));
  END IF;
END $$;

-- Seed / Update Nodes
INSERT INTO hosting_nodes (
  id, name, hostname, region, ip_address, status,
  total_ram_mb, available_ram_mb, total_cpu_cores, available_cpu_cores, total_disk_mb, available_disk_mb, is_active
) VALUES
  ('node-sg-01', 'Singapore Edge 01 (AWS ap-southeast-1)', 'sg-node-01.astoncloud.internal', 'Singapore', '13.212.45.10', 'ONLINE', 32768, 32768, 16.0, 16.0, 1048576, 1048576, true),
  ('node-tokyo-01', 'Tokyo Edge 01 (AWS ap-northeast-1)', 'jp-node-01.astoncloud.internal', 'Tokyo', '35.78.112.40', 'ONLINE', 32768, 32768, 16.0, 16.0, 1048576, 1048576, true),
  ('node-vn-01', 'Việt Nam Edge 01 (FPT HCM)', 'vn-node-01.astoncloud.internal', 'Vietnam', '103.142.12.8', 'ONLINE', 32768, 32768, 16.0, 16.0, 1048576, 1048576, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  hostname = EXCLUDED.hostname,
  region = EXCLUDED.region,
  ip_address = EXCLUDED.ip_address,
  status = EXCLUDED.status,
  total_ram_mb = EXCLUDED.total_ram_mb,
  available_ram_mb = EXCLUDED.available_ram_mb,
  total_cpu_cores = EXCLUDED.total_cpu_cores,
  available_cpu_cores = EXCLUDED.available_cpu_cores,
  total_disk_mb = EXCLUDED.total_disk_mb,
  available_disk_mb = EXCLUDED.available_disk_mb,
  is_active = EXCLUDED.is_active;

-- 5. Enhance hosts table
ALTER TABLE hosts ADD COLUMN IF NOT EXISTS region VARCHAR(50) NOT NULL DEFAULT 'Singapore';
ALTER TABLE hosts ADD COLUMN IF NOT EXISTS runtime_id VARCHAR(50);

-- Backfill runtime_id
UPDATE hosts SET runtime_id = 'nodejs' WHERE runtime IN ('node', 'nodejs') AND runtime_id IS NULL;
UPDATE hosts SET runtime_id = 'bun' WHERE runtime = 'bun' AND runtime_id IS NULL;
UPDATE hosts SET runtime_id = 'python' WHERE runtime = 'python' AND runtime_id IS NULL;

-- Update existing status values to uppercase
UPDATE hosts SET status = 'STOPPED' WHERE status IN ('stopped', 'offline');
UPDATE hosts SET status = 'RUNNING' WHERE status IN ('online', 'running');
UPDATE hosts SET status = 'PENDING' WHERE status NOT IN ('PENDING', 'PROVISIONING', 'RUNNING', 'STOPPED', 'SUSPENDED', 'ERROR', 'DELETING');

-- Alter default status to PENDING
ALTER TABLE hosts ALTER COLUMN status SET DEFAULT 'PENDING';

-- Enforce Host status constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_hosts_status'
  ) THEN
    ALTER TABLE hosts ADD CONSTRAINT chk_hosts_status
      CHECK (status IN ('PENDING', 'PROVISIONING', 'RUNNING', 'STOPPED', 'SUSPENDED', 'ERROR', 'DELETING'));
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_hosts_slug ON hosts(slug);
CREATE INDEX IF NOT EXISTS idx_hosts_node_id ON hosts(node_id);
CREATE INDEX IF NOT EXISTS idx_hosts_plan_id ON hosts(plan_id);
