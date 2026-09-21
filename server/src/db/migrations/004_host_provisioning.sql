-- Migration 004: Host Provisioning Schema & Infrastructure Links
-- Adds container_id, error_reason, idempotency_key to hosts
-- Adds agent_url, agent_key to hosting_nodes
-- Adds unique index for (node_id, port) to guarantee zero port collisions

-- 1. Add columns to hosts table
ALTER TABLE hosts ADD COLUMN IF NOT EXISTS container_id VARCHAR(128);
ALTER TABLE hosts ADD COLUMN IF NOT EXISTS error_reason TEXT;
ALTER TABLE hosts ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(128);

-- 2. Unique index for idempotency
CREATE UNIQUE INDEX IF NOT EXISTS idx_hosts_idempotency_key 
  ON hosts(idempotency_key) 
  WHERE idempotency_key IS NOT NULL;

-- 3. Unique index to guarantee no port collision on the same node
CREATE UNIQUE INDEX IF NOT EXISTS idx_hosts_node_port 
  ON hosts(node_id, port) 
  WHERE status != 'DELETING' AND port IS NOT NULL;

-- 4. Add agent configuration to hosting_nodes table
ALTER TABLE hosting_nodes ADD COLUMN IF NOT EXISTS agent_url VARCHAR(255) DEFAULT 'http://127.0.0.1:5001';
ALTER TABLE hosting_nodes ADD COLUMN IF NOT EXISTS agent_key VARCHAR(255);

-- 5. Backfill default agent_url for existing nodes
UPDATE hosting_nodes SET agent_url = 'http://127.0.0.1:5001' WHERE agent_url IS NULL;
