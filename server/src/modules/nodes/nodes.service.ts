import crypto from 'node:crypto';
import { query } from '../../db/index.js';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { AppError, NotFoundError, BadRequestError, UnauthorizedError } from '../../utils/errors.js';
import type { RegisterNodeInput, NodeHeartbeatInput } from './nodes.schema.js';

export type NodeStatus = 'ONLINE' | 'OFFLINE' | 'MAINTENANCE' | 'DRAINING';

export interface NodeRow {
  id: string;
  name: string;
  hostname: string;
  region: string;
  ip_address: string;
  status: NodeStatus;
  total_ram_mb: number;
  available_ram_mb: number;
  allocated_ram_mb?: number;
  total_cpu_cores: number | string;
  available_cpu_cores: number | string;
  allocated_cpu_cores?: number | string;
  total_disk_mb: number;
  available_disk_mb: number;
  allocated_disk_mb?: number;
  agent_url?: string;
  agent_key?: string;
  agent_version?: string;
  agent_token_hash?: string;
  last_heartbeat?: Date | string | null;
  is_active: boolean;
  created_at: Date;
  updated_at?: Date;
  host_count?: number | string;
}

export interface FormattedNode {
  id: string;
  name: string;
  hostname: string;
  region: string;
  ipAddress: string;
  status: NodeStatus;
  totalCpu: number;
  availableCpu: number;
  allocatedCpu: number;
  totalRam: number;
  availableRam: number;
  allocatedRam: number;
  totalDisk: number;
  availableDisk: number;
  allocatedDisk: number;
  agentUrl: string;
  agentVersion: string;
  lastHeartbeat: string | null;
  isMock: boolean;
  mockNotice: string;
  hostCount: number;
  createdAt: string;
}

export function formatNode(row: NodeRow, hostCount = 0): FormattedNode {
  const totalCpu = Number(row.total_cpu_cores);
  const availableCpu = Number(row.available_cpu_cores);
  const allocatedCpu =
    row.allocated_cpu_cores !== undefined
      ? Number(row.allocated_cpu_cores)
      : Math.max(0, Number((totalCpu - availableCpu).toFixed(2)));

  const totalRam = Number(row.total_ram_mb);
  const availableRam = Number(row.available_ram_mb);
  const allocatedRam =
    row.allocated_ram_mb !== undefined
      ? Number(row.allocated_ram_mb)
      : Math.max(0, totalRam - availableRam);

  const totalDisk = Number(row.total_disk_mb);
  const availableDisk = Number(row.available_disk_mb);
  const allocatedDisk =
    row.allocated_disk_mb !== undefined
      ? Number(row.allocated_disk_mb)
      : Math.max(0, totalDisk - availableDisk);

  const lastHeartbeat =
    row.last_heartbeat instanceof Date
      ? row.last_heartbeat.toISOString()
      : row.last_heartbeat
      ? String(row.last_heartbeat)
      : null;

  return {
    id: row.id,
    name: row.name,
    hostname: row.hostname,
    region: row.region,
    ipAddress: row.ip_address,
    status: row.status,
    totalCpu,
    availableCpu,
    allocatedCpu,
    totalRam,
    availableRam,
    allocatedRam,
    totalDisk,
    availableDisk,
    allocatedDisk,
    agentUrl: row.agent_url || 'http://127.0.0.1:5001',
    agentVersion: row.agent_version || '1.0.0-mock',
    lastHeartbeat,
    isMock: true,
    mockNotice: 'Mock Infrastructure Node - Local development mode active',
    hostCount: row.host_count !== undefined ? Number(row.host_count) : hostCount,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  };
}

export class NodesService {
  /**
   * Periodic or on-demand check for heartbeat timeout.
   * If a node stops sending heartbeats: ONLINE -> OFFLINE.
   * Preserves existing host assignments without deleting hosts.
   */
  public static async checkHeartbeatTimeouts(): Promise<number> {
    const timeoutSec = env.NODE_HEARTBEAT_TIMEOUT_SECONDS || 60;
    const timeoutMs = timeoutSec * 1000;
    const cutoffDate = new Date(Date.now() - timeoutMs);

    logger.debug({ cutoffDate, timeoutSec }, '[NodesService] Checking heartbeat timeouts');

    // Query all online nodes
    const { rows: onlineNodes } = await query<NodeRow>(
      `SELECT * FROM hosting_nodes WHERE is_active = true AND status = 'ONLINE'`
    );

    let timedOutCount = 0;

    for (const node of onlineNodes) {
      const lastHbTime = node.last_heartbeat ? new Date(node.last_heartbeat).getTime() : 0;
      if (Date.now() - lastHbTime > timeoutMs) {
        logger.warn(
          { nodeId: node.id, name: node.name, lastHeartbeat: node.last_heartbeat, timeoutSec },
          '[NodesService] Node heartbeat timed out. Transitioning status: ONLINE -> OFFLINE'
        );

        await query(
          `UPDATE hosting_nodes 
           SET status = 'OFFLINE', updated_at = NOW() 
           WHERE id = $1 AND status = 'ONLINE'`,
          [node.id]
        );

        // Record audit log for infrastructure event
        try {
          await query(
            `INSERT INTO audit_logs (actor_id, actor_email, action, target_type, target_id, details, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
            [
              'system',
              'system@astoncloud.internal',
              'NODE_HEARTBEAT_TIMEOUT',
              'NODE',
              node.id,
              JSON.stringify({
                nodeName: node.name,
                previousStatus: 'ONLINE',
                newStatus: 'OFFLINE',
                timeoutSeconds: timeoutSec,
                lastHeartbeat: node.last_heartbeat,
              }),
            ]
          );
        } catch {
          // Ignore audit log error in background check
        }

        timedOutCount++;
      }
    }

    return timedOutCount;
  }

  /**
   * List all active nodes for public or authenticated overview.
   */
  public static async listActiveNodes(): Promise<FormattedNode[]> {
    await this.checkHeartbeatTimeouts();

    const { rows } = await query<NodeRow>(
      `SELECT * FROM hosting_nodes WHERE is_active = true ORDER BY region ASC`
    );
    return rows.map((r) => formatNode(r));
  }

  /**
   * Get single node by ID with current host counts.
   */
  public static async getNodeById(id: string): Promise<NodeRow | null> {
    const { rows } = await query<NodeRow>(
      `SELECT * FROM hosting_nodes WHERE id = $1 AND is_active = true LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  }

  /**
   * Get detailed node information including assigned hosts (Admin only).
   */
  public static async getNodeDetails(nodeId: string): Promise<{
    node: FormattedNode;
    hosts: Array<{
      id: string;
      name: string;
      runtime: string;
      status: string;
      port: number | null;
      memoryMb: number;
      cpuLimit: number;
      createdAt: string;
    }>;
  }> {
    await this.checkHeartbeatTimeouts();

    const node = await this.getNodeById(nodeId);
    if (!node) {
      throw new NotFoundError('Không tìm thấy máy chủ cụm (Node)');
    }

    const { rows: hostRows } = await query<{
      id: string;
      name: string;
      runtime: string;
      status: string;
      port: number | null;
      memory_mb: number;
      cpu_limit: number | string;
      created_at: Date | string;
    }>(
      `SELECT id, name, runtime, status, port, memory_mb, cpu_limit, created_at
       FROM hosts 
       WHERE node_id = $1 AND status != 'DELETING'
       ORDER BY created_at DESC`,
      [nodeId]
    );

    const hosts = hostRows.map((h) => ({
      id: h.id,
      name: h.name,
      runtime: h.runtime,
      status: h.status,
      port: h.port,
      memoryMb: Number(h.memory_mb),
      cpuLimit: Number(h.cpu_limit),
      createdAt: h.created_at instanceof Date ? h.created_at.toISOString() : String(h.created_at),
    }));

    return {
      node: formatNode(node, hosts.length),
      hosts,
    };
  }

  /**
   * Register a new Node Agent (Admin only).
   * Generates secure M2M credentials (one-time token) and hashes it with SHA-256.
   * Never stores plaintext token.
   */
  public static async registerNode(
    input: RegisterNodeInput,
    adminUser: { id: string; email: string },
    ip?: string
  ): Promise<{ node: FormattedNode; agentToken: string }> {
    const rawId = input.id ? input.id.toLowerCase().trim() : `node-${crypto.randomBytes(4).toString('hex')}`;
    const cleanHostname = input.hostname.trim();

    // Check duplicate ID
    const { rows: existingId } = await query('SELECT id FROM hosting_nodes WHERE id = $1 LIMIT 1', [rawId]);
    if (existingId.length > 0) {
      throw new BadRequestError(`Mã Node "${rawId}" đã tồn tại trên hệ thống`);
    }

    // Check duplicate hostname
    const { rows: existingHost } = await query('SELECT id FROM hosting_nodes WHERE hostname = $1 LIMIT 1', [cleanHostname]);
    if (existingHost.length > 0) {
      throw new BadRequestError(`Hostname "${cleanHostname}" đã được sử dụng bởi một Node khác`);
    }

    // Generate secure random machine-to-machine token
    const agentToken = `agt_${crypto.randomBytes(32).toString('hex')}`;
    const agentTokenHash = crypto.createHash('sha256').update(agentToken).digest('hex');

    const totalCpu = input.totalCpu;
    const totalRam = input.totalRamMb;
    const totalDisk = input.totalDiskMb;

    const { rows } = await query<NodeRow>(
      `INSERT INTO hosting_nodes (
        id, name, hostname, region, ip_address, status,
        total_cpu_cores, available_cpu_cores, allocated_cpu_cores,
        total_ram_mb, available_ram_mb, allocated_ram_mb,
        total_disk_mb, available_disk_mb, allocated_disk_mb,
        agent_url, agent_version, agent_token_hash,
        is_active, last_heartbeat, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, 'ONLINE',
        $6, $6, 0,
        $7, $7, 0,
        $8, $8, 0,
        $9, '1.0.0-mock', $10,
        true, NOW(), NOW(), NOW()
      ) RETURNING *`,
      [
        rawId,
        input.name.trim(),
        cleanHostname,
        input.region.trim(),
        input.ipAddress.trim(),
        totalCpu,
        totalRam,
        totalDisk,
        input.agentUrl,
        agentTokenHash,
      ]
    );

    const createdNode = rows[0];

    // Audit log
    await query(
      `INSERT INTO audit_logs (actor_id, actor_email, action, target_type, target_id, details, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        adminUser.id,
        adminUser.email,
        'ADMIN_NODE_REGISTERED',
        'NODE',
        createdNode.id,
        JSON.stringify({
          name: createdNode.name,
          hostname: createdNode.hostname,
          region: createdNode.region,
          totalCpu,
          totalRam,
          totalDisk,
        }),
        ip || null,
      ]
    );

    logger.info(
      { nodeId: createdNode.id, admin: adminUser.email },
      '[NodesService] Node successfully registered with secure M2M credential'
    );

    return {
      node: formatNode(createdNode, 0),
      agentToken, // Returned ONLY ONCE upon registration
    };
  }

  /**
   * Process periodic Node Agent Heartbeat.
   * Authenticates the Node Agent via Bearer token hash.
   * If node was OFFLINE, restores it to ONLINE.
   */
  public static async processHeartbeat(
    token: string,
    input: NodeHeartbeatInput
  ): Promise<{
    success: boolean;
    nodeId: string;
    status: NodeStatus;
    timestamp: string;
  }> {
    if (!token) {
      throw new UnauthorizedError('Thiếu mã xác thực Node Agent (Bearer Token)');
    }

    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');

    // Find node matching token hash
    const { rows: matchedNodes } = await query<NodeRow>(
      `SELECT * FROM hosting_nodes WHERE agent_token_hash = $1 AND is_active = true LIMIT 1`,
      [tokenHash]
    );

    let node = matchedNodes[0];

    // Fallback for pre-seeded mock nodes (agent_key or static tokens for local test)
    if (!node) {
      const { rows: keyMatched } = await query<NodeRow>(
        `SELECT * FROM hosting_nodes WHERE (agent_key = $1 OR id = $2) AND is_active = true LIMIT 1`,
        [token.trim(), token.trim()]
      );
      if (keyMatched.length > 0) {
        node = keyMatched[0];
      }
    }

    if (!node) {
      throw new UnauthorizedError('Mã xác thực Node Agent không hợp lệ hoặc đã bị vô hiệu hóa');
    }

    // Determine updated status
    // If node was OFFLINE due to timeout, receiving a valid heartbeat restores it to ONLINE
    let newStatus: NodeStatus = node.status;
    if (node.status === 'OFFLINE') {
      newStatus = 'ONLINE';
      logger.info(
        { nodeId: node.id },
        '[NodesService] Node received valid heartbeat. Restoring status: OFFLINE -> ONLINE'
      );
    }

    const agentVer = input.agentVersion || node.agent_version || '1.0.0-mock';

    // Update heartbeat timestamp & status
    await query(
      `UPDATE hosting_nodes 
       SET last_heartbeat = NOW(), 
           status = $1, 
           agent_version = $2, 
           updated_at = NOW() 
       WHERE id = $3`,
      [newStatus, agentVer, node.id]
    );

    return {
      success: true,
      nodeId: node.id,
      status: newStatus,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Update Node Status (Admin only).
   * Rules:
   * - ONLINE: can accept new hosts.
   * - DRAINING: existing hosts continue running, no new hosts scheduled.
   * - MAINTENANCE: no new provisioning.
   * - OFFLINE: cannot be manually set to ONLINE without active heartbeat!
   */
  public static async updateNodeStatus(
    nodeId: string,
    status: NodeStatus,
    adminUser: { id: string; email: string },
    ip?: string
  ): Promise<FormattedNode> {
    const node = await this.getNodeById(nodeId);
    if (!node) {
      throw new NotFoundError('Không tìm thấy máy chủ cụm (Node)');
    }

    // Security Rule: Cannot manually change OFFLINE to ONLINE without heartbeat
    if (status === 'ONLINE' && node.status === 'OFFLINE') {
      const timeoutSec = env.NODE_HEARTBEAT_TIMEOUT_SECONDS || 60;
      const timeoutMs = timeoutSec * 1000;
      const lastHbTime = node.last_heartbeat ? new Date(node.last_heartbeat).getTime() : 0;

      if (!node.last_heartbeat || Date.now() - lastHbTime > timeoutMs) {
        throw new BadRequestError(
          'Không thể chuyển thủ công máy chủ ngoại tuyến (OFFLINE) về ONLINE khi chưa nhận được tín hiệu Heartbeat hợp lệ từ Node Agent'
        );
      }
    }

    await query(
      `UPDATE hosting_nodes 
       SET status = $1, updated_at = NOW() 
       WHERE id = $2`,
      [status, nodeId]
    );

    // Audit log
    await query(
      `INSERT INTO audit_logs (actor_id, actor_email, action, target_type, target_id, details, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        adminUser.id,
        adminUser.email,
        'ADMIN_NODE_STATUS_UPDATED',
        'NODE',
        nodeId,
        JSON.stringify({
          nodeName: node.name,
          previousStatus: node.status,
          newStatus: status,
        }),
        ip || null,
      ]
    );

    const updatedNode = await this.getNodeById(nodeId);
    return formatNode(updatedNode!);
  }

  /**
   * Automatic healthy node selection based on requested region (read-only query).
   */
  public static async selectNodeForHost(requestedRegion?: string): Promise<NodeRow | null> {
    await this.checkHeartbeatTimeouts();

    if (requestedRegion) {
      const cleanRegion = requestedRegion.split(' ')[0].trim();
      const { rows } = await query<NodeRow>(
        `SELECT * FROM hosting_nodes 
         WHERE is_active = true 
           AND status = 'ONLINE' 
           AND (LOWER(region) LIKE LOWER($1) OR LOWER(region) = LOWER($2))
         ORDER BY available_ram_mb DESC 
         LIMIT 1`,
        [`%${cleanRegion}%`, cleanRegion]
      );
      if (rows.length > 0) return rows[0];
    }

    const { rows: fallbackRows } = await query<NodeRow>(
      `SELECT * FROM hosting_nodes 
       WHERE is_active = true AND status = 'ONLINE' 
       ORDER BY available_ram_mb DESC 
       LIMIT 1`
    );

    return fallbackRows[0] || null;
  }
}
