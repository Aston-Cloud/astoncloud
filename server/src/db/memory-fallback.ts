import crypto from 'node:crypto';
import type pg from 'pg';
import { logger } from '../utils/logger.js';

export interface MemoryPlan {
  id: string;
  name: string;
  description: string;
  price_monthly: number;
  ram_mb: number;
  cpu_cores: number;
  disk_mb: number;
  bandwidth_mb: number;
  is_active: boolean;
  created_at: Date;
}

export interface MemoryRuntime {
  id: string;
  name: string;
  description: string;
  icon: string;
  is_active: boolean;
  created_at: Date;
}

export interface MemoryRuntimeVersion {
  id: number;
  runtime_id: string;
  runtime: string;
  version: string;
  is_default: boolean;
  is_active: boolean;
  created_at: Date;
}

export interface MemoryNode {
  id: string;
  name: string;
  hostname: string;
  region: string;
  ip_address: string;
  status: 'ONLINE' | 'OFFLINE' | 'MAINTENANCE' | 'DRAINING';
  total_ram_mb: number;
  available_ram_mb: number;
  total_cpu_cores: number;
  available_cpu_cores: number;
  total_disk_mb: number;
  available_disk_mb: number;
  agent_url?: string;
  agent_key?: string;
  is_active: boolean;
  created_at: Date;
}

export interface MemoryHost {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  runtime: string;
  runtime_id: string;
  runtime_version: string;
  plan_id: string;
  node_id: string;
  status: 'PENDING' | 'PROVISIONING' | 'RUNNING' | 'STOPPED' | 'SUSPENDED' | 'ERROR' | 'DELETING';
  cpu_limit: number;
  memory_mb: number;
  disk_mb: number;
  port: number;
  region: string;
  auto_restart: boolean;
  container_id?: string | null;
  error_reason?: string | null;
  idempotency_key?: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface MemoryHostEnvVariable {
  id: string;
  host_id: string;
  key: string;
  encrypted_value: string;
  created_at: Date;
  updated_at: Date;
}

export interface MemoryHostDomain {
  id: string;
  host_id: string;
  user_id?: string | null;
  domain: string;
  status: 'PENDING' | 'VERIFYING' | 'ACTIVE' | 'ERROR' | 'REMOVING';
  ssl_status: 'NOT_REQUESTED' | 'PENDING' | 'ACTIVE' | 'ERROR' | 'EXPIRED';
  verification_method: 'DNS_TXT' | 'DNS_CNAME';
  verification_token: string;
  target_port: number;
  error_message?: string | null;
  verified_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface MemoryHostBackup {
  id: string;
  host_id: string;
  user_id: string;
  name: string;
  status: 'PENDING' | 'CREATING' | 'COMPLETED' | 'FAILED' | 'RESTORING' | 'RESTORED' | 'DELETING' | 'DELETED';
  size_bytes: number;
  storage_key: string;
  backup_type: 'manual' | 'automatic';
  error_message?: string | null;
  metadata?: Record<string, any>;
  completed_at?: Date | null;
  expires_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface MemoryUser {
  id: string;
  email: string;
  username: string;
  display_name: string;
  full_name: string;
  password_hash: string;
  role: 'USER' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED' | 'DISABLED';
  avatar_url: string | null;
  created_at: Date;
  updated_at: Date;
  last_login_at: Date | null;
}

export interface MemorySession {
  id: string;
  user_id: string;
  token_hash: string;
  ip_address: string | null;
  user_agent: string | null;
  expires_at: Date;
  created_at: Date;
}

class MemoryStore {
  public users: MemoryUser[] = [
    {
      id: 'usr-admin-001',
      email: 'admin@astoncloud.vn',
      username: 'admin',
      display_name: 'Aston Administrator',
      full_name: 'Aston Administrator',
      password_hash: '$2b$10$IynC0Nx3j4rxjOl8kUz43ek9R3yYNgf/P7ZNkLJQ.Dg4d7LvE4EHW', // AdminPassword@123
      role: 'ADMIN',
      status: 'ACTIVE',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      created_at: new Date('2026-01-01T00:00:00Z'),
      updated_at: new Date('2026-01-01T00:00:00Z'),
      last_login_at: null,
    },
    {
      id: 'usr-alex-002',
      email: 'alex.dang@astoncloud.vn',
      username: 'alex_dang',
      display_name: 'Alex Đặng',
      full_name: 'Alex Đặng',
      password_hash: '$2b$10$g2AxpJ4v9rQVD6O3E6SkMuXv1L7lCAAxwGLukYoZlbTyXjEODNeCq', // Password@123
      role: 'USER',
      status: 'ACTIVE',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      created_at: new Date('2026-01-01T00:00:00Z'),
      updated_at: new Date('2026-01-01T00:00:00Z'),
      last_login_at: null,
    },
  ];

  public sessions: MemorySession[] = [];

  public plans: MemoryPlan[] = [
    {
      id: 'starter',
      name: 'Starter',
      description: 'Gói khởi đầu tối ưu cho bot, API microservice hoặc dự án cá nhân',
      price_monthly: 49000,
      ram_mb: 512,
      cpu_cores: 1.0,
      disk_mb: 5120,
      bandwidth_mb: 51200,
      is_active: true,
      created_at: new Date(),
    },
    {
      id: 'developer',
      name: 'Developer',
      description: 'Gói dành cho lập trình viên phát triển ứng dụng web và API hoàn chỉnh',
      price_monthly: 129000,
      ram_mb: 2048,
      cpu_cores: 2.0,
      disk_mb: 15360,
      bandwidth_mb: 153600,
      is_active: true,
      created_at: new Date(),
    },
    {
      id: 'pro',
      name: 'Pro',
      description: 'Gói chuyên nghiệp hiệu năng cao phục vụ lưu lượng sản xuất lớn',
      price_monthly: 259000,
      ram_mb: 4096,
      cpu_cores: 4.0,
      disk_mb: 30720,
      bandwidth_mb: 307200,
      is_active: true,
      created_at: new Date(),
    },
  ];

  public runtimes: MemoryRuntime[] = [
    {
      id: 'nodejs',
      name: 'Node.js',
      description: 'Môi trường JavaScript hướng sự kiện phía máy chủ tối ưu cho ứng dụng web và API mở rộng',
      icon: 'node',
      is_active: true,
      created_at: new Date(),
    },
    {
      id: 'bun',
      name: 'Bun',
      description: 'Môi trường runtime JavaScript & TypeScript tích hợp all-in-one siêu tốc',
      icon: 'bun',
      is_active: true,
      created_at: new Date(),
    },
    {
      id: 'python',
      name: 'Python',
      description: 'Môi trường Python hiện đại tối ưu cho FastAPI, Flask, Django và dịch vụ vi mô AI',
      icon: 'python',
      is_active: true,
      created_at: new Date(),
    },
  ];

  public runtimeVersions: MemoryRuntimeVersion[] = [
    { id: 1, runtime_id: 'nodejs', runtime: 'nodejs', version: '20', is_default: true, is_active: true, created_at: new Date() },
    { id: 2, runtime_id: 'nodejs', runtime: 'nodejs', version: '22', is_default: false, is_active: true, created_at: new Date() },
    { id: 3, runtime_id: 'nodejs', runtime: 'nodejs', version: '24', is_default: false, is_active: true, created_at: new Date() },
    { id: 4, runtime_id: 'bun', runtime: 'bun', version: 'latest', is_default: true, is_active: true, created_at: new Date() },
    { id: 5, runtime_id: 'bun', runtime: 'bun', version: 'stable', is_default: false, is_active: true, created_at: new Date() },
    { id: 6, runtime_id: 'python', runtime: 'python', version: '3.11', is_default: false, is_active: true, created_at: new Date() },
    { id: 7, runtime_id: 'python', runtime: 'python', version: '3.12', is_default: true, is_active: true, created_at: new Date() },
    { id: 8, runtime_id: 'python', runtime: 'python', version: '3.13', is_default: false, is_active: true, created_at: new Date() },
  ];

  public nodes: MemoryNode[] = [
    {
      id: 'node-sg-01',
      name: 'Singapore Edge 01 (AWS ap-southeast-1)',
      hostname: 'sg-node-01.astoncloud.internal',
      region: 'Singapore',
      ip_address: '13.212.45.10',
      status: 'ONLINE',
      total_ram_mb: 32768,
      available_ram_mb: 32768,
      total_cpu_cores: 16.0,
      available_cpu_cores: 16.0,
      total_disk_mb: 1048576,
      available_disk_mb: 1048576,
      is_active: true,
      created_at: new Date(),
    },
    {
      id: 'node-tokyo-01',
      name: 'Tokyo Edge 01 (AWS ap-northeast-1)',
      hostname: 'jp-node-01.astoncloud.internal',
      region: 'Tokyo',
      ip_address: '35.78.112.40',
      status: 'ONLINE',
      total_ram_mb: 32768,
      available_ram_mb: 32768,
      total_cpu_cores: 16.0,
      available_cpu_cores: 16.0,
      total_disk_mb: 1048576,
      available_disk_mb: 1048576,
      is_active: true,
      created_at: new Date(),
    },
    {
      id: 'node-vn-01',
      name: 'Việt Nam Edge 01 (FPT HCM)',
      hostname: 'vn-node-01.astoncloud.internal',
      region: 'Vietnam',
      ip_address: '103.142.12.8',
      status: 'ONLINE',
      total_ram_mb: 32768,
      available_ram_mb: 32768,
      total_cpu_cores: 16.0,
      available_cpu_cores: 16.0,
      total_disk_mb: 1048576,
      available_disk_mb: 1048576,
      is_active: true,
      created_at: new Date(),
    },
  ];

  public hosts: MemoryHost[] = [];
  public hostEnvVariables: MemoryHostEnvVariable[] = [];
  public hostDomains: MemoryHostDomain[] = [];
  public hostBackups: MemoryHostBackup[] = [];
}

export const memoryStore = new MemoryStore();

/**
 * Executes a simulated SQL query against the in-memory fallback store
 */
export function executeMemoryQuery<R extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params: unknown[] = []
): pg.QueryResult<R> {
  const q = text.trim();

  // 1. SELECT 1 FROM users WHERE email = $1
  if (q.includes('SELECT 1 FROM users WHERE email = $1')) {
    const email = String(params[0]).toLowerCase();
    const found = memoryStore.users.some((u) => u.email.toLowerCase() === email);
    return {
      command: 'SELECT',
      rowCount: found ? 1 : 0,
      oid: 0,
      fields: [],
      rows: (found ? [{ '?column?': 1 }] : []) as unknown as R[],
    };
  }

  // 2. SELECT 1 FROM users WHERE username = $1
  if (q.includes('SELECT 1 FROM users WHERE username = $1')) {
    const username = String(params[0]).toLowerCase();
    const found = memoryStore.users.some((u) => u.username.toLowerCase() === username);
    return {
      command: 'SELECT',
      rowCount: found ? 1 : 0,
      oid: 0,
      fields: [],
      rows: (found ? [{ '?column?': 1 }] : []) as unknown as R[],
    };
  }

  // 3. SELECT * FROM users WHERE email = $1 OR username = $1
  if (q.includes('FROM users WHERE email = $1 OR username = $1')) {
    const key = String(params[0]).toLowerCase();
    const user = memoryStore.users.find(
      (u) => u.email.toLowerCase() === key || u.username.toLowerCase() === key
    );
    return {
      command: 'SELECT',
      rowCount: user ? 1 : 0,
      oid: 0,
      fields: [],
      rows: (user ? [user] : []) as unknown as R[],
    };
  }

  // 4. SELECT * FROM users WHERE id = $1
  if (q.includes('FROM users WHERE id = $1')) {
    const id = String(params[0]);
    const user = memoryStore.users.find((u) => u.id === id);
    return {
      command: 'SELECT',
      rowCount: user ? 1 : 0,
      oid: 0,
      fields: [],
      rows: (user ? [user] : []) as unknown as R[],
    };
  }

  // 5. INSERT INTO users
  if (q.startsWith('INSERT INTO users')) {
    const newUser: MemoryUser = {
      id: `usr-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      email: String(params[0]),
      username: String(params[1]),
      display_name: String(params[2]),
      full_name: String(params[2]),
      password_hash: String(params[3]),
      role: 'USER',
      status: 'ACTIVE',
      avatar_url: String(params[4] || null),
      created_at: new Date(),
      updated_at: new Date(),
      last_login_at: null,
    };
    memoryStore.users.push(newUser);
    return {
      command: 'INSERT',
      rowCount: 1,
      oid: 0,
      fields: [],
      rows: [newUser] as unknown as R[],
    };
  }

  // 6. UPDATE users SET last_login_at
  if (q.includes('UPDATE users SET last_login_at = NOW()')) {
    const id = String(params[0]);
    const user = memoryStore.users.find((u) => u.id === id);
    if (user) {
      user.last_login_at = new Date();
      user.updated_at = new Date();
    }
    return { command: 'UPDATE', rowCount: user ? 1 : 0, oid: 0, fields: [], rows: [] };
  }

  // 7. INSERT INTO user_sessions
  if (q.startsWith('INSERT INTO user_sessions')) {
    const newSession: MemorySession = {
      id: String(params[0]),
      user_id: String(params[1]),
      token_hash: String(params[2]),
      ip_address: (params[3] as string) || null,
      user_agent: (params[4] as string) || null,
      expires_at: (params[5] as Date) || new Date(Date.now() + 7 * 86400000),
      created_at: new Date(),
    };
    memoryStore.sessions.push(newSession);
    return { command: 'INSERT', rowCount: 1, oid: 0, fields: [], rows: [] };
  }

  // 8. SELECT * FROM user_sessions WHERE id = $1 AND expires_at > NOW()
  if (q.includes('FROM user_sessions WHERE id = $1')) {
    const id = String(params[0]);
    const session = memoryStore.sessions.find(
      (s) => s.id === id && s.expires_at.getTime() > Date.now()
    );
    return {
      command: 'SELECT',
      rowCount: session ? 1 : 0,
      oid: 0,
      fields: [],
      rows: (session ? [session] : []) as unknown as R[],
    };
  }

  // 9. DELETE FROM user_sessions
  if (q.includes('DELETE FROM user_sessions WHERE id = $1')) {
    const id = String(params[0]);
    const idx = memoryStore.sessions.findIndex((s) => s.id === id);
    if (idx !== -1) memoryStore.sessions.splice(idx, 1);
    return { command: 'DELETE', rowCount: idx !== -1 ? 1 : 0, oid: 0, fields: [], rows: [] };
  }

  // 10. SELECT * FROM hosting_plans WHERE is_active = true
  if (q.includes('FROM hosting_plans') && q.includes('ORDER BY price_monthly ASC')) {
    const activePlans = memoryStore.plans.filter((p) => p.is_active);
    return {
      command: 'SELECT',
      rowCount: activePlans.length,
      oid: 0,
      fields: [],
      rows: activePlans as unknown as R[],
    };
  }

  // 11. SELECT * FROM hosting_plans WHERE id = $1
  if (q.includes('FROM hosting_plans WHERE id = $1')) {
    const planId = String(params[0]);
    const plan = memoryStore.plans.find((p) => p.id === planId && p.is_active);
    return {
      command: 'SELECT',
      rowCount: plan ? 1 : 0,
      oid: 0,
      fields: [],
      rows: (plan ? [plan] : []) as unknown as R[],
    };
  }

  // 12. Query runtimes
  if (q.includes('FROM runtimes')) {
    const activeRuntimes = memoryStore.runtimes.filter((r) => r.is_active);
    return {
      command: 'SELECT',
      rowCount: activeRuntimes.length,
      oid: 0,
      fields: [],
      rows: activeRuntimes as unknown as R[],
    };
  }

  // 13. Query runtime_versions
  if (q.includes('FROM runtime_versions')) {
    if (params.length >= 2) {
      const runtimeId = String(params[0]).toLowerCase();
      const version = String(params[1]).toLowerCase();
      const found = memoryStore.runtimeVersions.find(
        (v) =>
          (v.runtime_id.toLowerCase() === runtimeId || v.runtime.toLowerCase() === runtimeId) &&
          v.version.toLowerCase() === version &&
          v.is_active
      );
      return {
        command: 'SELECT',
        rowCount: found ? 1 : 0,
        oid: 0,
        fields: [],
        rows: (found ? [found] : []) as unknown as R[],
      };
    }

    const activeVersions = memoryStore.runtimeVersions.filter((v) => v.is_active);
    return {
      command: 'SELECT',
      rowCount: activeVersions.length,
      oid: 0,
      fields: [],
      rows: activeVersions as unknown as R[],
    };
  }

  // 14. Query hosting_nodes
  if (q.includes('FROM hosting_nodes')) {
    // 14a. Scheduler query checking available resources
    if (q.includes('available_cpu_cores >= $1') || q.includes('available_ram_mb >=')) {
      const cpu = Number(params[0]);
      const ram = Number(params[1]);
      const disk = Number(params[2]);

      const eligibleNodes = memoryStore.nodes.filter(
        (n) =>
          n.status === 'ONLINE' &&
          n.is_active &&
          n.available_cpu_cores >= cpu &&
          n.available_ram_mb >= ram &&
          n.available_disk_mb >= disk
      );

      return {
        command: 'SELECT',
        rowCount: eligibleNodes.length,
        oid: 0,
        fields: [],
        rows: eligibleNodes as unknown as R[],
      };
    }

    // 14b. Query node by specific ID
    if (params.length > 0 && (q.includes('WHERE id = $1') || q.includes('WHERE hosting_nodes.id = $1'))) {
      const nodeId = String(params[0]);
      const match = memoryStore.nodes.find((n) => n.id === nodeId && n.is_active);
      return {
        command: 'SELECT',
        rowCount: match ? 1 : 0,
        oid: 0,
        fields: [],
        rows: (match ? [match] : []) as unknown as R[],
      };
    }

    // 14b. Region search query
    if (params.length > 0 && (q.includes('ILIKE') || q.includes('region'))) {
      const region = String(params[0]).replace(/%/g, '').toLowerCase().trim();
      const match =
        memoryStore.nodes.find(
          (n) =>
            n.status === 'ONLINE' &&
            n.is_active &&
            (n.region.toLowerCase().includes(region) || region.includes(n.region.toLowerCase()))
        ) ||
        memoryStore.nodes.find((n) => n.status === 'ONLINE' && n.is_active) ||
        memoryStore.nodes[0];

      return {
        command: 'SELECT',
        rowCount: match ? 1 : 0,
        oid: 0,
        fields: [],
        rows: (match ? [match] : []) as unknown as R[],
      };
    }

    const nodes = memoryStore.nodes.filter((n) => n.is_active);
    return {
      command: 'SELECT',
      rowCount: nodes.length,
      oid: 0,
      fields: [],
      rows: nodes as unknown as R[],
    };
  }

  // 14b. UPDATE hosting_nodes (Atomic reservation & resource release)
  if (q.startsWith('UPDATE hosting_nodes')) {
    // Check if reservation (subtraction)
    if (q.includes('available_cpu_cores - $1') || q.includes('available_cpu_cores = available_cpu_cores -')) {
      const cpu = Number(params[0]);
      const ram = Number(params[1]);
      const disk = Number(params[2]);
      const nodeId = String(params[3]);

      const node = memoryStore.nodes.find(
        (n) =>
          n.id === nodeId &&
          n.status === 'ONLINE' &&
          n.available_cpu_cores >= cpu &&
          n.available_ram_mb >= ram &&
          n.available_disk_mb >= disk
      );

      if (!node) {
        return { command: 'UPDATE', rowCount: 0, oid: 0, fields: [], rows: [] };
      }

      node.available_cpu_cores = Number((node.available_cpu_cores - cpu).toFixed(2));
      node.available_ram_mb -= ram;
      node.available_disk_mb -= disk;

      return {
        command: 'UPDATE',
        rowCount: 1,
        oid: 0,
        fields: [],
        rows: [node] as unknown as R[],
      };
    }

    // Check if release (addition)
    if (q.includes('available_cpu_cores + $1') || q.includes('available_cpu_cores = available_cpu_cores +')) {
      const cpu = Number(params[0]);
      const ram = Number(params[1]);
      const disk = Number(params[2]);
      const nodeId = String(params[3]);

      const node = memoryStore.nodes.find((n) => n.id === nodeId);
      if (node) {
        node.available_cpu_cores = Math.min(
          node.total_cpu_cores,
          Number((node.available_cpu_cores + cpu).toFixed(2))
        );
        node.available_ram_mb = Math.min(node.total_ram_mb, node.available_ram_mb + ram);
        node.available_disk_mb = Math.min(node.total_disk_mb, node.available_disk_mb + disk);
      }

      return {
        command: 'UPDATE',
        rowCount: node ? 1 : 0,
        oid: 0,
        fields: [],
        rows: (node ? [node] : []) as unknown as R[],
      };
    }
  }

  // 15. SELECT 1 FROM hosts WHERE slug = $1
  if (q.includes('SELECT 1 FROM hosts WHERE slug = $1')) {
    const slug = String(params[0]);
    const found = memoryStore.hosts.some((h) => h.slug === slug);
    return {
      command: 'SELECT',
      rowCount: found ? 1 : 0,
      oid: 0,
      fields: [],
      rows: (found ? [{ '?column?': 1 }] : []) as unknown as R[],
    };
  }

  // 15b. SELECT port FROM hosts WHERE node_id = $1 (Port allocation query)
  if (q.includes('SELECT port FROM hosts WHERE node_id = $1') || (q.includes('FROM hosts') && q.includes('port IS NOT NULL'))) {
    const nodeId = String(params[0]);
    const activePorts = memoryStore.hosts
      .filter((h) => h.node_id === nodeId && h.port != null && h.status !== 'DELETING')
      .map((h) => ({ port: h.port }));

    return {
      command: 'SELECT',
      rowCount: activePorts.length,
      oid: 0,
      fields: [],
      rows: activePorts as unknown as R[],
    };
  }

  // 15c. SELECT * FROM hosts WHERE idempotency_key = $1
  if (q.includes('idempotency_key = $1') || q.includes('idempotency_key =')) {
    const key = String(params[0]);
    const found = memoryStore.hosts.find((h) => h.idempotency_key === key);
    return {
      command: 'SELECT',
      rowCount: found ? 1 : 0,
      oid: 0,
      fields: [],
      rows: (found ? [found] : []) as unknown as R[],
    };
  }

  // 16. INSERT INTO hosts
  if (q.startsWith('INSERT INTO hosts')) {
    const statusVal = (q.includes("'PROVISIONING'") ? 'PROVISIONING' : 'PENDING') as MemoryHost['status'];
    const newHost: MemoryHost = {
      id: crypto.randomUUID(),
      user_id: String(params[0]),
      plan_id: String(params[1]),
      node_id: String(params[2]),
      name: String(params[3]),
      slug: String(params[4]),
      runtime: String(params[5]),
      runtime_id: String(params[5]),
      runtime_version: String(params[6]),
      status: statusVal,
      memory_mb: Number(params[7]),
      cpu_limit: Number(params[8]),
      disk_mb: Number(params[9]),
      port: Number(params[10]),
      region: String(params[11] || 'Singapore'),
      auto_restart: Boolean(params[12] ?? true),
      container_id: null,
      idempotency_key: params[13] ? String(params[13]) : null,
      created_at: new Date(),
      updated_at: new Date(),
    };
    memoryStore.hosts.push(newHost);
    return {
      command: 'INSERT',
      rowCount: 1,
      oid: 0,
      fields: [],
      rows: [newHost] as unknown as R[],
    };
  }

  // 17. SELECT hosts with JOIN plan and node
  if (q.startsWith('SELECT') && q.includes('FROM hosts')) {
    // Single host by id & user_id or id only
    if (q.includes('WHERE h.id = $1') || q.includes('WHERE hosts.id = $1') || q.includes('WHERE id = $1')) {
      const hostId = String(params[0]);
      const host = memoryStore.hosts.find((h) => h.id === hostId);

      if (!host) {
        return { command: 'SELECT', rowCount: 0, oid: 0, fields: [], rows: [] };
      }

      const plan = memoryStore.plans.find((p) => p.id === host.plan_id);
      const node = memoryStore.nodes.find((n) => n.id === host.node_id);
      const runtime = memoryStore.runtimes.find((r) => r.id === host.runtime_id || r.id === host.runtime);

      const row = {
        ...host,
        plan_name: plan?.name,
        plan_ram_mb: plan?.ram_mb,
        plan_cpu_cores: plan?.cpu_cores,
        plan_disk_mb: plan?.disk_mb,
        plan_price_monthly: plan?.price_monthly,
        node_name: node?.name,
        node_region: node?.region,
        runtime_name: runtime?.name,
      };

      return {
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
        rows: [row] as unknown as R[],
      };
    }

    // List hosts
    let targetHosts = memoryStore.hosts;
    if (params.length > 0 && q.includes('user_id = $1')) {
      const userId = String(params[0]);
      targetHosts = targetHosts.filter((h) => h.user_id === userId);
    }
    targetHosts.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());

    const enriched = targetHosts.map((h) => {
      const plan = memoryStore.plans.find((p) => p.id === h.plan_id);
      const node = memoryStore.nodes.find((n) => n.id === h.node_id);
      const runtime = memoryStore.runtimes.find((r) => r.id === h.runtime_id || r.id === h.runtime);
      return {
        ...h,
        plan_name: plan?.name,
        plan_ram_mb: plan?.ram_mb,
        plan_cpu_cores: plan?.cpu_cores,
        plan_disk_mb: plan?.disk_mb,
        plan_price_monthly: plan?.price_monthly,
        node_name: node?.name,
        node_region: node?.region,
        runtime_name: runtime?.name,
      };
    });

    return {
      command: 'SELECT',
      rowCount: enriched.length,
      oid: 0,
      fields: [],
      rows: enriched as unknown as R[],
    };
  }

  // 18. UPDATE hosts
  if (q.startsWith('UPDATE hosts')) {
    const host = memoryStore.hosts.find((h) => params.includes(h.id));
    if (host) {
      // Dynamic updates: status, container_id, error_reason, name, auto_restart
      if (q.includes("status = 'RUNNING'")) {
        host.status = 'RUNNING';
      } else if (q.includes("status = 'ERROR'")) {
        host.status = 'ERROR';
      } else if (q.includes("status = 'STOPPED'")) {
        host.status = 'STOPPED';
      } else if (q.includes("status = 'DELETING'")) {
        host.status = 'DELETING';
      } else if (q.includes("status = 'PROVISIONING'")) {
        host.status = 'PROVISIONING';
      } else if (q.includes('status = $')) {
        const statusIdx = q.indexOf('status = $');
        const pNum = parseInt(q.slice(statusIdx + 10, statusIdx + 12), 10);
        if (!isNaN(pNum) && params[pNum - 1] !== undefined) {
          host.status = String(params[pNum - 1]) as MemoryHost['status'];
        }
      }

      if (q.includes('container_id = $')) {
        const cIdx = q.indexOf('container_id = $');
        const pNum = parseInt(q.slice(cIdx + 16, cIdx + 18), 10);
        if (!isNaN(pNum) && params[pNum - 1] !== undefined) {
          host.container_id = String(params[pNum - 1]);
        }
      }

      if (q.includes('error_reason = NULL')) {
        host.error_reason = null;
      } else if (q.includes('error_reason = $')) {
        const eIdx = q.indexOf('error_reason = $');
        const pNum = parseInt(q.slice(eIdx + 16, eIdx + 18), 10);
        if (!isNaN(pNum) && params[pNum - 1] !== undefined) {
          host.error_reason = String(params[pNum - 1]);
        }
      }

      if (q.includes('name = $') && params[0] !== undefined) {
        host.name = String(params[0]);
      }
      if (q.includes('auto_restart = $') && params[1] !== undefined) {
        host.auto_restart = Boolean(params[1]);
      }
      host.updated_at = new Date();
    }
    return {
      command: 'UPDATE',
      rowCount: host ? 1 : 0,
      oid: 0,
      fields: [],
      rows: (host ? [host] : []) as unknown as R[],
    };
  }

  // 19. DELETE FROM hosts
  if (q.startsWith('DELETE FROM hosts')) {
    const hostId = String(params[0]);
    const prevLen = memoryStore.hosts.length;
    memoryStore.hosts = memoryStore.hosts.filter((h) => h.id !== hostId);
    // Cascade delete related host environment variables
    memoryStore.hostEnvVariables = memoryStore.hostEnvVariables.filter((v) => v.host_id !== hostId);
    // Cascade delete related host domains
    memoryStore.hostDomains = memoryStore.hostDomains.filter((d) => d.host_id !== hostId);
    // Cascade delete related host backups
    memoryStore.hostBackups = memoryStore.hostBackups.filter((b) => b.host_id !== hostId);
    const deleted = prevLen > memoryStore.hosts.length;
    return {
      command: 'DELETE',
      rowCount: deleted ? 1 : 0,
      oid: 0,
      fields: [],
      rows: [],
    };
  }

  // ==========================================
  // HOST ENVIRONMENT VARIABLES (MILESTONE 9)
  // ==========================================

  // 20. SELECT FROM host_env_variables
  if (q.startsWith('SELECT') && q.includes('FROM host_env_variables')) {
    // 20a. SELECT * FROM host_env_variables WHERE id = $1 AND host_id = $2
    if (q.includes('WHERE id = $1 AND host_id = $2')) {
      const varId = String(params[0]);
      const hostId = String(params[1]);
      const item = memoryStore.hostEnvVariables.find((v) => v.id === varId && v.host_id === hostId);
      return {
        command: 'SELECT',
        rowCount: item ? 1 : 0,
        oid: 0,
        fields: [],
        rows: (item ? [item] : []) as unknown as R[],
      };
    }

    // 20b. SELECT * FROM host_env_variables WHERE host_id = $1 AND key = $2
    if (q.includes('WHERE host_id = $1 AND key = $2')) {
      const hostId = String(params[0]);
      const key = String(params[1]).trim().toUpperCase();
      const item = memoryStore.hostEnvVariables.find((v) => v.host_id === hostId && v.key.toUpperCase() === key);
      return {
        command: 'SELECT',
        rowCount: item ? 1 : 0,
        oid: 0,
        fields: [],
        rows: (item ? [item] : []) as unknown as R[],
      };
    }

    // 20c. SELECT * FROM host_env_variables WHERE host_id = $1
    if (q.includes('WHERE host_id = $1')) {
      const hostId = String(params[0]);
      const items = memoryStore.hostEnvVariables
        .filter((v) => v.host_id === hostId)
        .sort((a, b) => a.key.localeCompare(b.key));
      return {
        command: 'SELECT',
        rowCount: items.length,
        oid: 0,
        fields: [],
        rows: items as unknown as R[],
      };
    }

    // 20d. SELECT * FROM host_env_variables WHERE id = $1
    if (q.includes('WHERE id = $1')) {
      const varId = String(params[0]);
      const item = memoryStore.hostEnvVariables.find((v) => v.id === varId);
      return {
        command: 'SELECT',
        rowCount: item ? 1 : 0,
        oid: 0,
        fields: [],
        rows: (item ? [item] : []) as unknown as R[],
      };
    }
  }

  // 21. INSERT INTO host_env_variables
  if (q.startsWith('INSERT INTO host_env_variables')) {
    const hostId = String(params[0]);
    const key = String(params[1]).trim().toUpperCase();
    const encryptedValue = String(params[2]);

    const existing = memoryStore.hostEnvVariables.find(
      (v) => v.host_id === hostId && v.key.toUpperCase() === key
    );
    if (existing) {
      const err: any = new Error(`duplicate key value violates unique constraint "uq_host_env_variables_key"`);
      err.code = '23505';
      throw err;
    }

    const newVar: MemoryHostEnvVariable = {
      id: `env-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      host_id: hostId,
      key,
      encrypted_value: encryptedValue,
      created_at: new Date(),
      updated_at: new Date(),
    };

    memoryStore.hostEnvVariables.push(newVar);
    return {
      command: 'INSERT',
      rowCount: 1,
      oid: 0,
      fields: [],
      rows: [newVar] as unknown as R[],
    };
  }

  // 22. UPDATE host_env_variables
  if (q.startsWith('UPDATE host_env_variables')) {
    // Determine query format
    // UPDATE host_env_variables SET key = $1, encrypted_value = $2, updated_at = NOW() WHERE id = $3 AND host_id = $4 RETURNING *
    // Or SET encrypted_value = $1, updated_at = NOW() WHERE id = $2 AND host_id = $3
    let item: MemoryHostEnvVariable | undefined;

    if (q.includes('SET key = $1, encrypted_value = $2')) {
      const newKey = String(params[0]).trim().toUpperCase();
      const newEncryptedVal = String(params[1]);
      const varId = String(params[2]);
      const hostId = String(params[3]);

      item = memoryStore.hostEnvVariables.find((v) => v.id === varId && v.host_id === hostId);
      if (item) {
        // Check uniqueness if key changed
        if (item.key.toUpperCase() !== newKey) {
          const duplicate = memoryStore.hostEnvVariables.find(
            (v) => v.host_id === hostId && v.key.toUpperCase() === newKey && v.id !== varId
          );
          if (duplicate) {
            const err: any = new Error(`duplicate key value violates unique constraint "uq_host_env_variables_key"`);
            err.code = '23505';
            throw err;
          }
        }
        item.key = newKey;
        item.encrypted_value = newEncryptedVal;
        item.updated_at = new Date();
      }
    } else if (q.includes('SET key = $1')) {
      const newKey = String(params[0]).trim().toUpperCase();
      const varId = String(params[1]);
      const hostId = String(params[2]);

      item = memoryStore.hostEnvVariables.find((v) => v.id === varId && v.host_id === hostId);
      if (item) {
        if (item.key.toUpperCase() !== newKey) {
          const duplicate = memoryStore.hostEnvVariables.find(
            (v) => v.host_id === hostId && v.key.toUpperCase() === newKey && v.id !== varId
          );
          if (duplicate) {
            const err: any = new Error(`duplicate key value violates unique constraint "uq_host_env_variables_key"`);
            err.code = '23505';
            throw err;
          }
        }
        item.key = newKey;
        item.updated_at = new Date();
      }
    } else if (q.includes('SET encrypted_value = $1')) {
      const newEncryptedVal = String(params[0]);
      const varId = String(params[1]);
      const hostId = String(params[2]);

      item = memoryStore.hostEnvVariables.find((v) => v.id === varId && v.host_id === hostId);
      if (item) {
        item.encrypted_value = newEncryptedVal;
        item.updated_at = new Date();
      }
    }

    return {
      command: 'UPDATE',
      rowCount: item ? 1 : 0,
      oid: 0,
      fields: [],
      rows: (item ? [item] : []) as unknown as R[],
    };
  }

  // 23. DELETE FROM host_env_variables
  if (q.startsWith('DELETE FROM host_env_variables')) {
    const varId = String(params[0]);
    const hostId = params[1] !== undefined ? String(params[1]) : undefined;
    const prevLen = memoryStore.hostEnvVariables.length;
    const deletedItem = memoryStore.hostEnvVariables.find((v) => v.id === varId && (!hostId || v.host_id === hostId));
    memoryStore.hostEnvVariables = memoryStore.hostEnvVariables.filter((v) => !(v.id === varId && (!hostId || v.host_id === hostId)));
    const deleted = prevLen > memoryStore.hostEnvVariables.length;
    return {
      command: 'DELETE',
      rowCount: deleted ? 1 : 0,
      oid: 0,
      fields: [],
      rows: (deletedItem ? [deletedItem] : []) as unknown as R[],
    };
  }

  // ==========================================
  // HOST DOMAINS & SSL (MILESTONE 10)
  // ==========================================

  // 24. SELECT FROM host_domains
  if (q.startsWith('SELECT') && q.includes('FROM host_domains')) {
    // 24a. SELECT * FROM host_domains WHERE id = $1 AND host_id = $2
    if (q.includes('WHERE id = $1 AND host_id = $2')) {
      const domId = String(params[0]);
      const hostId = String(params[1]);
      const item = memoryStore.hostDomains.find((d) => d.id === domId && d.host_id === hostId);
      return {
        command: 'SELECT',
        rowCount: item ? 1 : 0,
        oid: 0,
        fields: [],
        rows: (item ? [item] : []) as unknown as R[],
      };
    }

    // 24b. SELECT * FROM host_domains WHERE domain = $1
    if (q.includes('WHERE domain = $1')) {
      const domainName = String(params[0]).trim().toLowerCase();
      const item = memoryStore.hostDomains.find((d) => d.domain.toLowerCase() === domainName);
      return {
        command: 'SELECT',
        rowCount: item ? 1 : 0,
        oid: 0,
        fields: [],
        rows: (item ? [item] : []) as unknown as R[],
      };
    }

    // 24c. SELECT COUNT(*) as count FROM host_domains WHERE host_id = $1
    if (q.includes('COUNT(*)') && q.includes('WHERE host_id = $1')) {
      const hostId = String(params[0]);
      const count = memoryStore.hostDomains.filter((d) => d.host_id === hostId).length;
      return {
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
        rows: [{ count }] as unknown as R[],
      };
    }

    // 24d. SELECT * FROM host_domains WHERE host_id = $1
    if (q.includes('WHERE host_id = $1')) {
      const hostId = String(params[0]);
      const items = memoryStore.hostDomains
        .filter((d) => d.host_id === hostId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return {
        command: 'SELECT',
        rowCount: items.length,
        oid: 0,
        fields: [],
        rows: items as unknown as R[],
      };
    }

    // 24d. SELECT * FROM host_domains WHERE user_id = $1
    if (q.includes('WHERE user_id = $1')) {
      const userId = String(params[0]);
      const items = memoryStore.hostDomains
        .filter((d) => d.user_id === userId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return {
        command: 'SELECT',
        rowCount: items.length,
        oid: 0,
        fields: [],
        rows: items as unknown as R[],
      };
    }

    // 24e. SELECT * FROM host_domains WHERE id = $1
    if (q.includes('WHERE id = $1')) {
      const domId = String(params[0]);
      const item = memoryStore.hostDomains.find((d) => d.id === domId);
      return {
        command: 'SELECT',
        rowCount: item ? 1 : 0,
        oid: 0,
        fields: [],
        rows: (item ? [item] : []) as unknown as R[],
      };
    }

    // 24f. Default select all host_domains
    return {
      command: 'SELECT',
      rowCount: memoryStore.hostDomains.length,
      oid: 0,
      fields: [],
      rows: memoryStore.hostDomains as unknown as R[],
    };
  }

  // 25. INSERT INTO host_domains
  if (q.startsWith('INSERT INTO host_domains')) {
    // Determine columns and params:
    // host_id, user_id, domain, status, ssl_status, verification_method, verification_token, target_port
    const hostId = String(params[0]);
    const userId = params[1] !== undefined ? String(params[1]) : null;
    const domainName = String(params[2]).trim().toLowerCase();
    const status = (params[3] !== undefined ? String(params[3]) : 'PENDING') as MemoryHostDomain['status'];
    const sslStatus = (params[4] !== undefined ? String(params[4]) : 'NOT_REQUESTED') as MemoryHostDomain['ssl_status'];
    const verificationMethod = (params[5] !== undefined ? String(params[5]) : 'DNS_TXT') as MemoryHostDomain['verification_method'];
    const verificationToken = String(params[6]);
    const targetPort = params[7] !== undefined ? Number(params[7]) : 80;

    const existing = memoryStore.hostDomains.find(
      (d) => d.domain.toLowerCase() === domainName
    );
    if (existing) {
      const err: any = new Error(`duplicate key value violates unique constraint "uq_host_domains_domain"`);
      err.code = '23505';
      throw err;
    }

    const newDomain: MemoryHostDomain = {
      id: `dom-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      host_id: hostId,
      user_id: userId,
      domain: domainName,
      status,
      ssl_status: sslStatus,
      verification_method: verificationMethod,
      verification_token: verificationToken,
      target_port: targetPort,
      error_message: null,
      verified_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    memoryStore.hostDomains.push(newDomain);
    return {
      command: 'INSERT',
      rowCount: 1,
      oid: 0,
      fields: [],
      rows: [newDomain] as unknown as R[],
    };
  }

  // 26. UPDATE host_domains
  if (q.startsWith('UPDATE host_domains')) {
    let item: MemoryHostDomain | undefined;

    // Pattern A: UPDATE host_domains SET status = $1, verified_at = $2, error_message = $3, updated_at = NOW() WHERE id = $4 AND host_id = $5 RETURNING *
    if (q.includes('SET status = $1, verified_at = $2')) {
      const status = String(params[0]) as MemoryHostDomain['status'];
      const verifiedAt = params[1] ? new Date(String(params[1])) : null;
      const errorMsg = params[2] !== undefined && params[2] !== null ? String(params[2]) : null;
      const domId = String(params[3]);
      const hostId = String(params[4]);

      item = memoryStore.hostDomains.find((d) => d.id === domId && d.host_id === hostId);
      if (item) {
        item.status = status;
        item.verified_at = verifiedAt;
        item.error_message = errorMsg;
        item.updated_at = new Date();
      }
    }
    // Pattern B: UPDATE host_domains SET ssl_status = $1, updated_at = NOW() WHERE id = $2 AND host_id = $3 RETURNING *
    else if (q.includes('SET ssl_status = $1')) {
      const sslStatus = String(params[0]) as MemoryHostDomain['ssl_status'];
      const domId = String(params[1]);
      const hostId = String(params[2]);

      item = memoryStore.hostDomains.find((d) => d.id === domId && d.host_id === hostId);
      if (item) {
        item.ssl_status = sslStatus;
        item.updated_at = new Date();
      }
    }
    // Pattern C: UPDATE host_domains SET status = $1, error_message = $2, updated_at = NOW() WHERE id = $3 AND host_id = $4 RETURNING *
    else if (q.includes('SET status = $1, error_message = $2')) {
      const status = String(params[0]) as MemoryHostDomain['status'];
      const errorMsg = params[1] !== undefined && params[1] !== null ? String(params[1]) : null;
      const domId = String(params[2]);
      const hostId = String(params[3]);

      item = memoryStore.hostDomains.find((d) => d.id === domId && d.host_id === hostId);
      if (item) {
        item.status = status;
        item.error_message = errorMsg;
        item.updated_at = new Date();
      }
    }
    // Pattern D: UPDATE host_domains SET target_port = $1, updated_at = NOW() WHERE id = $2 AND host_id = $3 RETURNING *
    else if (q.includes('SET target_port = $1')) {
      const targetPort = Number(params[0]);
      const domId = String(params[1]);
      const hostId = String(params[2]);

      item = memoryStore.hostDomains.find((d) => d.id === domId && d.host_id === hostId);
      if (item) {
        item.target_port = targetPort;
        item.updated_at = new Date();
      }
    }

    return {
      command: 'UPDATE',
      rowCount: item ? 1 : 0,
      oid: 0,
      fields: [],
      rows: (item ? [item] : []) as unknown as R[],
    };
  }

  // 27. DELETE FROM host_domains
  if (q.startsWith('DELETE FROM host_domains')) {
    const domId = String(params[0]);
    const hostId = params[1] !== undefined ? String(params[1]) : undefined;
    const prevLen = memoryStore.hostDomains.length;
    const deletedItem = memoryStore.hostDomains.find((d) => d.id === domId && (!hostId || d.host_id === hostId));
    memoryStore.hostDomains = memoryStore.hostDomains.filter((d) => !(d.id === domId && (!hostId || d.host_id === hostId)));
    const deleted = prevLen > memoryStore.hostDomains.length;
    return {
      command: 'DELETE',
      rowCount: deleted ? 1 : 0,
      oid: 0,
      fields: [],
      rows: (deletedItem ? [deletedItem] : []) as unknown as R[],
    };
  }

  // ==========================================
  // HOST BACKUPS & RESTORE (MILESTONE 11)
  // ==========================================

  // 28. SELECT FROM host_backups
  if (q.startsWith('SELECT') && q.includes('FROM host_backups')) {
    // 28a. COUNT(*) query
    if (q.includes('COUNT(*)')) {
      const hostId = String(params[0]);
      const activeBackups = memoryStore.hostBackups.filter(
        (b) => b.host_id === hostId && b.status !== 'DELETED'
      );
      return {
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
        rows: [{ count: activeBackups.length }] as unknown as R[],
      };
    }

    // 28b. SELECT * FROM host_backups WHERE id = $1 AND host_id = $2
    if (q.includes('WHERE id = $1 AND host_id = $2')) {
      const backupId = String(params[0]);
      const hostId = String(params[1]);
      const item = memoryStore.hostBackups.find(
        (b) => b.id === backupId && b.host_id === hostId
      );
      return {
        command: 'SELECT',
        rowCount: item ? 1 : 0,
        oid: 0,
        fields: [],
        rows: (item ? [item] : []) as unknown as R[],
      };
    }

    // 28c. SELECT * FROM host_backups WHERE id = $1
    if (q.includes('WHERE id = $1')) {
      const backupId = String(params[0]);
      const item = memoryStore.hostBackups.find((b) => b.id === backupId);
      return {
        command: 'SELECT',
        rowCount: item ? 1 : 0,
        oid: 0,
        fields: [],
        rows: (item ? [item] : []) as unknown as R[],
      };
    }

    // 28d. SELECT * FROM host_backups WHERE host_id = $1
    if (q.includes('WHERE host_id = $1')) {
      const hostId = String(params[0]);
      let items = memoryStore.hostBackups.filter((b) => b.host_id === hostId);
      if (q.includes("status != 'DELETED'")) {
        items = items.filter((b) => b.status !== 'DELETED');
      }
      items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return {
        command: 'SELECT',
        rowCount: items.length,
        oid: 0,
        fields: [],
        rows: items as unknown as R[],
      };
    }

    // 28e. SELECT * FROM host_backups WHERE user_id = $1
    if (q.includes('WHERE user_id = $1')) {
      const userId = String(params[0]);
      let items = memoryStore.hostBackups.filter((b) => b.user_id === userId);
      if (q.includes("status != 'DELETED'")) {
        items = items.filter((b) => b.status !== 'DELETED');
      }
      items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return {
        command: 'SELECT',
        rowCount: items.length,
        oid: 0,
        fields: [],
        rows: items as unknown as R[],
      };
    }

    // Fallback select all backups
    const items = [...memoryStore.hostBackups].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    return {
      command: 'SELECT',
      rowCount: items.length,
      oid: 0,
      fields: [],
      rows: items as unknown as R[],
    };
  }

  // 29. INSERT INTO host_backups
  if (q.startsWith('INSERT INTO host_backups')) {
    const hostId = String(params[0]);
    const userId = String(params[1]);
    const name = String(params[2]);
    const status = (String(params[3] || 'CREATING')) as MemoryHostBackup['status'];
    const backupType = (String(params[4] || 'manual')) as MemoryHostBackup['backup_type'];
    const metadata = (typeof params[5] === 'string' ? JSON.parse(params[5]) : (params[5] || {})) as Record<string, any>;
    const storageKey = params[6] !== undefined ? String(params[6]) : '';
    const sizeBytes = params[7] !== undefined ? Number(params[7]) : 0;

    const newBackup: MemoryHostBackup = {
      id: crypto.randomUUID(),
      host_id: hostId,
      user_id: userId,
      name,
      status,
      size_bytes: sizeBytes,
      storage_key: storageKey,
      backup_type: backupType,
      metadata,
      error_message: null,
      completed_at: status === 'COMPLETED' ? new Date() : null,
      expires_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    memoryStore.hostBackups.push(newBackup);

    return {
      command: 'INSERT',
      rowCount: 1,
      oid: 0,
      fields: [],
      rows: [newBackup] as unknown as R[],
    };
  }

  // 30. UPDATE host_backups
  if (q.startsWith('UPDATE host_backups')) {
    let item: MemoryHostBackup | undefined;

    // Pattern A: UPDATE host_backups SET status = $1, size_bytes = $2, storage_key = $3, completed_at = NOW(), expires_at = $4, updated_at = NOW() WHERE id = $5 RETURNING *
    if (q.includes('SET status = $1, size_bytes = $2')) {
      const status = String(params[0]) as MemoryHostBackup['status'];
      const sizeBytes = Number(params[1]);
      const storageKey = String(params[2]);
      const expiresAt = params[3] ? new Date(String(params[3])) : null;
      const backupId = String(params[4]);

      item = memoryStore.hostBackups.find((b) => b.id === backupId);
      if (item) {
        item.status = status;
        item.size_bytes = sizeBytes;
        item.storage_key = storageKey;
        item.completed_at = new Date();
        item.expires_at = expiresAt;
        item.updated_at = new Date();
      }
    }
    // Pattern B: UPDATE host_backups SET status = $1, error_message = $2, updated_at = NOW() WHERE id = $3 RETURNING *
    else if (q.includes('SET status = $1, error_message = $2')) {
      const status = String(params[0]) as MemoryHostBackup['status'];
      const errorMsg = params[1] !== undefined && params[1] !== null ? String(params[1]) : null;
      const backupId = String(params[2]);

      item = memoryStore.hostBackups.find((b) => b.id === backupId);
      if (item) {
        item.status = status;
        item.error_message = errorMsg;
        item.updated_at = new Date();
      }
    }
    // Pattern C: Generic UPDATE host_backups SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *
    else if (q.includes('SET status = $1')) {
      const status = String(params[0]) as MemoryHostBackup['status'];
      const backupId = String(params[1]);

      item = memoryStore.hostBackups.find((b) => b.id === backupId);
      if (item) {
        item.status = status;
        item.updated_at = new Date();
      }
    }

    return {
      command: 'UPDATE',
      rowCount: item ? 1 : 0,
      oid: 0,
      fields: [],
      rows: (item ? [item] : []) as unknown as R[],
    };
  }

  // 31. DELETE FROM host_backups
  if (q.startsWith('DELETE FROM host_backups')) {
    const backupId = String(params[0]);
    const hostId = params[1] !== undefined ? String(params[1]) : undefined;
    const prevLen = memoryStore.hostBackups.length;
    const deletedItem = memoryStore.hostBackups.find(
      (b) => b.id === backupId && (!hostId || b.host_id === hostId)
    );
    memoryStore.hostBackups = memoryStore.hostBackups.filter(
      (b) => !(b.id === backupId && (!hostId || b.host_id === hostId))
    );
    const deleted = prevLen > memoryStore.hostBackups.length;
    return {
      command: 'DELETE',
      rowCount: deleted ? 1 : 0,
      oid: 0,
      fields: [],
      rows: (deletedItem ? [deletedItem] : []) as unknown as R[],
    };
  }


  // Default fallback for SELECT 1 health
  if (q.includes('SELECT 1 AS health') || q.includes('SELECT 1')) {
    return {
      command: 'SELECT',
      rowCount: 1,
      oid: 0,
      fields: [],
      rows: [{ health: 1 }] as unknown as R[],
    };
  }

  logger.warn({ query: q }, 'Unmatched memory fallback query executed');
  return {
    command: 'SELECT',
    rowCount: 0,
    oid: 0,
    fields: [],
    rows: [],
  };
}
