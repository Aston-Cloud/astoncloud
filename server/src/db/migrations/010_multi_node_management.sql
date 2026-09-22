-- Migration 010: Multi-Node Management & Heartbeat Architecture
-- Enhances hosting_nodes with explicit resource allocation, heartbeat tracking, and secure M2M agent credentials

-- 1. Add allocated resources, heartbeat timestamp, agent version and token hash
ALTER TABLE hosting_nodes ADD COLUMN IF NOT EXISTS allocated_cpu_cores NUMERIC(6, 2) DEFAULT 0;
ALTER TABLE hosting_nodes ADD COLUMN IF NOT EXISTS allocated_ram_mb INTEGER DEFAULT 0;
ALTER TABLE hosting_nodes ADD COLUMN IF NOT EXISTS allocated_disk_mb INTEGER DEFAULT 0;
ALTER TABLE hosting_nodes ADD COLUMN IF NOT EXISTS last_heartbeat TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE hosting_nodes ADD COLUMN IF NOT EXISTS agent_version VARCHAR(50) DEFAULT '1.0.0-mock';
ALTER TABLE hosting_nodes ADD COLUMN IF NOT EXISTS agent_token_hash VARCHAR(255);
ALTER TABLE hosting_nodes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Backfill allocated resources where available resources exist
UPDATE hosting_nodes 
SET allocated_cpu_cores = GREATEST(0, total_cpu_cores - available_cpu_cores),
    allocated_ram_mb = GREATEST(0, total_ram_mb - available_ram_mb),
    allocated_disk_mb = GREATEST(0, total_disk_mb - available_disk_mb)
WHERE allocated_cpu_cores = 0 AND allocated_ram_mb = 0;

-- 3. Ensure status constraint matches ONLINE, OFFLINE, MAINTENANCE, DRAINING
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_hosting_nodes_status') THEN
    ALTER TABLE hosting_nodes DROP CONSTRAINT chk_hosting_nodes_status;
  END IF;
  ALTER TABLE hosting_nodes ADD CONSTRAINT chk_hosting_nodes_status
    CHECK (status IN ('ONLINE', 'OFFLINE', 'MAINTENANCE', 'DRAINING'));
END $$;

-- 4. Seed / Update deterministic mock nodes with distinct capacities for local multi-node development
INSERT INTO hosting_nodes (
  id, name, hostname, region, ip_address, status,
  total_ram_mb, available_ram_mb, allocated_ram_mb,
  total_cpu_cores, available_cpu_cores, allocated_cpu_cores,
  total_disk_mb, available_disk_mb, allocated_disk_mb,
  agent_url, agent_version, is_active, last_heartbeat, created_at, updated_at
) VALUES
  ('node-vn-01', 'Việt Nam Edge 01 (FPT HCM)', 'vn-node-01.astoncloud.internal', 'Vietnam', '103.142.12.8', 'ONLINE', 8192, 8192, 0, 4.0, 4.0, 0, 51200, 51200, 0, 'http://127.0.0.1:5001', '1.0.0-mock', true, NOW(), NOW(), NOW()),
  ('node-sg-01', 'Singapore Edge 01 (AWS ap-southeast-1)', 'sg-node-01.astoncloud.internal', 'Singapore', '13.212.45.10', 'ONLINE', 16384, 16384, 0, 8.0, 8.0, 0, 102400, 102400, 0, 'http://127.0.0.1:5002', '1.0.0-mock', true, NOW(), NOW(), NOW()),
  ('node-tokyo-01', 'Tokyo Edge 01 (AWS ap-northeast-1)', 'jp-node-01.astoncloud.internal', 'Tokyo', '35.78.112.40', 'ONLINE', 32768, 32768, 0, 16.0, 16.0, 0, 1048576, 1048576, 0, 'http://127.0.0.1:5003', '1.0.0-mock', true, NOW(), NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  hostname = EXCLUDED.hostname,
  region = EXCLUDED.region,
  ip_address = EXCLUDED.ip_address,
  total_ram_mb = EXCLUDED.total_ram_mb,
  available_ram_mb = EXCLUDED.available_ram_mb,
  total_cpu_cores = EXCLUDED.total_cpu_cores,
  available_cpu_cores = EXCLUDED.available_cpu_cores,
  total_disk_mb = EXCLUDED.total_disk_mb,
  available_disk_mb = EXCLUDED.available_disk_mb,
  agent_url = EXCLUDED.agent_url,
  agent_version = EXCLUDED.agent_version,
  is_active = EXCLUDED.is_active,
  last_heartbeat = NOW(),
  updated_at = NOW();

-- 5. Create indices for scheduling and heartbeat lookups
CREATE INDEX IF NOT EXISTS idx_hosting_nodes_status ON hosting_nodes(status);
CREATE INDEX IF NOT EXISTS idx_hosting_nodes_region ON hosting_nodes(region);
CREATE INDEX IF NOT EXISTS idx_hosting_nodes_last_heartbeat ON hosting_nodes(last_heartbeat);
CREATE INDEX IF NOT EXISTS idx_hosting_nodes_agent_token_hash ON hosting_nodes(agent_token_hash);
