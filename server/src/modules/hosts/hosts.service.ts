import crypto from 'node:crypto';
import { query } from '../../db/index.js';
import { PlansService } from '../plans/plans.service.js';
import { RuntimesService } from '../runtimes/runtimes.service.js';
import { NodesService, NodeRow } from '../nodes/nodes.service.js';
import { SchedulerService } from '../scheduler/scheduler.service.js';
import { getNodeAgentClient } from '../node-agent/client.factory.js';
import { NodeContext } from '../node-agent/node-agent.interface.js';
import { BadRequestError, NotFoundError, AppError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';
import type {
  CreateHostInput,
  UpdateHostInput,
  HostActionInput,
  HostLogsQuery,
} from './hosts.schema.js';

export type HostStatus =
  | 'PENDING'
  | 'PROVISIONING'
  | 'RUNNING'
  | 'STOPPED'
  | 'SUSPENDED'
  | 'ERROR'
  | 'DELETING';

export interface HostRow {
  id: string;
  user_id: string;
  plan_id: string;
  node_id: string | null;
  name: string;
  slug: string;
  runtime: string;
  runtime_id?: string;
  runtime_version: string;
  status: HostStatus;
  memory_mb: number;
  cpu_limit: number | string;
  disk_mb: number;
  port: number | null;
  region: string;
  auto_restart: boolean;
  container_id?: string | null;
  error_reason?: string | null;
  idempotency_key?: string | null;
  created_at: Date;
  updated_at: Date;
  // Joined fields
  plan_name?: string;
  plan_ram_mb?: number;
  plan_cpu_cores?: number | string;
  plan_disk_mb?: number;
  plan_price_monthly?: number | string;
  node_name?: string;
  node_region?: string;
  runtime_name?: string;
}

export interface FormattedHost {
  id: string;
  userId: string;
  name: string;
  slug: string;
  runtimeId: string;
  runtime: string;
  runtimeVersion: string;
  planId: string;
  nodeId: string | null;
  status: HostStatus;
  cpuLimit: number;
  memoryLimit: number;
  diskLimit: number;
  port: number | null;
  region: string;
  autoRestart: boolean;
  containerId?: string | null;
  errorReason?: string | null;
  idempotencyKey?: string | null;
  createdAt: string;
  updatedAt: string;
  plan?: {
    id: string;
    name: string;
    cpu: string;
    ram: string;
    disk: string;
    price: number;
  };
  node?: {
    id: string;
    name: string;
    region: string;
  };
}

export function formatHost(row: HostRow): FormattedHost {
  const ramMb = row.memory_mb;
  const diskMb = row.disk_mb;
  const cpuCores = Number(row.cpu_limit);

  const ramFormatted = ramMb >= 1024 ? `${(ramMb / 1024).toFixed(0)} GB` : `${ramMb} MB`;
  const diskFormatted = diskMb >= 1024 ? `${(diskMb / 1024).toFixed(0)} GB` : `${diskMb} MB`;

  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    slug: row.slug,
    runtimeId: row.runtime_id || row.runtime,
    runtime: row.runtime,
    runtimeVersion: row.runtime_version,
    planId: row.plan_id,
    nodeId: row.node_id,
    status: row.status,
    cpuLimit: cpuCores,
    memoryLimit: ramMb,
    diskLimit: diskMb,
    port: row.port,
    region: row.region || 'Singapore',
    autoRestart: row.auto_restart,
    containerId: row.container_id || null,
    errorReason: row.error_reason || null,
    idempotencyKey: row.idempotency_key || null,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
    plan: {
      id: row.plan_id,
      name: row.plan_name || row.plan_id.toUpperCase(),
      cpu: `${cpuCores} vCPU`,
      ram: ramFormatted,
      disk: `${diskFormatted} NVMe`,
      price: Number(row.plan_price_monthly || 0),
    },
    node: row.node_id
      ? {
          id: row.node_id,
          name: row.node_name || row.node_id,
          region: row.node_region || row.region,
        }
      : undefined,
  };
}

export class HostsService {
  /**
   * List hosts for authenticated user (User isolation enforced)
   */
  public static async listUserHosts(userId: string, role: string): Promise<FormattedHost[]> {
    const sql =
      role === 'ADMIN'
        ? `SELECT h.*, 
                  p.name AS plan_name, p.ram_mb AS plan_ram_mb, p.cpu_cores AS plan_cpu_cores, 
                  p.disk_mb AS plan_disk_mb, p.price_monthly AS plan_price_monthly,
                  n.name AS node_name, n.region AS node_region
           FROM hosts h
           LEFT JOIN hosting_plans p ON h.plan_id = p.id
           LEFT JOIN hosting_nodes n ON h.node_id = n.id
           ORDER BY h.created_at DESC`
        : `SELECT h.*, 
                  p.name AS plan_name, p.ram_mb AS plan_ram_mb, p.cpu_cores AS plan_cpu_cores, 
                  p.disk_mb AS plan_disk_mb, p.price_monthly AS plan_price_monthly,
                  n.name AS node_name, n.region AS node_region
           FROM hosts h
           LEFT JOIN hosting_plans p ON h.plan_id = p.id
           LEFT JOIN hosting_nodes n ON h.node_id = n.id
           WHERE h.user_id = $1
           ORDER BY h.created_at DESC`;

    const params = role === 'ADMIN' ? [] : [userId];
    const { rows } = await query<HostRow>(sql, params);
    return rows.map(formatHost);
  }

  /**
   * Get single host by ID with ownership verification
   */
  public static async getHostById(
    hostId: string,
    userId: string,
    role: string
  ): Promise<FormattedHost> {
    const { rows } = await query<HostRow>(
      `SELECT h.*, 
              p.name AS plan_name, p.ram_mb AS plan_ram_mb, p.cpu_cores AS plan_cpu_cores, 
              p.disk_mb AS plan_disk_mb, p.price_monthly AS plan_price_monthly,
              n.name AS node_name, n.region AS node_region
       FROM hosts h
       LEFT JOIN hosting_plans p ON h.plan_id = p.id
       LEFT JOIN hosting_nodes n ON h.node_id = n.id
       WHERE h.id = $1
       LIMIT 1`,
      [hostId]
    );

    const host = rows[0];
    if (!host) {
      throw new NotFoundError('Không tìm thấy máy chủ được yêu cầu');
    }

    // User isolation: standard users can only view their own hosts
    if (role !== 'ADMIN' && host.user_id !== userId) {
      throw new NotFoundError('Không tìm thấy máy chủ được yêu cầu');
    }

    return formatHost(host);
  }

  /**
   * Helper to retrieve NodeContext from node ID
   */
  private static async getNodeContext(nodeId: string): Promise<NodeContext> {
    const node = await NodesService.getNodeById(nodeId);
    if (!node) {
      throw new AppError(`Không tìm thấy node cụm "${nodeId}"`, 500);
    }
    return {
      id: node.id,
      name: node.name,
      region: node.region,
      ipAddress: node.ip_address,
      agentUrl: (node as any).agent_url || 'http://127.0.0.1:5001',
      agentKey: (node as any).agent_key || undefined,
    };
  }

  /**
   * Full automated host provisioning flow:
   * 1. Check idempotency
   * 2. Validate runtime, version, plan, region
   * 3. Select node & atomically reserve resources
   * 4. Allocate unique port on node
   * 5. Insert Host DB record (status: PROVISIONING)
   * 6. Call NodeAgentClient.createContainer
   * 7. Call NodeAgentClient.startContainer
   * 8. Verify running state
   * 9. Update Host status to RUNNING & record container_id
   * 10. Automatic rollback & cleanup on any failure
   */
  public static async createHost(userId: string, input: CreateHostInput): Promise<FormattedHost> {
    const cleanRuntime = input.runtimeId.toLowerCase().trim();
    const cleanVersion = input.runtimeVersion.trim();
    const cleanPlanId = input.planId.toLowerCase().trim();
    const cleanRegion = input.region || 'Singapore';

    // 1. Idempotency check
    if (input.idempotencyKey) {
      const { rows: existingRows } = await query<HostRow>(
        `SELECT h.*, 
                p.name AS plan_name, p.ram_mb AS plan_ram_mb, p.cpu_cores AS plan_cpu_cores, 
                p.disk_mb AS plan_disk_mb, p.price_monthly AS plan_price_monthly,
                n.name AS node_name, n.region AS node_region
         FROM hosts h
         LEFT JOIN hosting_plans p ON h.plan_id = p.id
         LEFT JOIN hosting_nodes n ON h.node_id = n.id
         WHERE h.idempotency_key = $1 AND h.user_id = $2
         LIMIT 1`,
        [input.idempotencyKey, userId]
      );

      if (existingRows.length > 0) {
        logger.info(
          { idempotencyKey: input.idempotencyKey, hostId: existingRows[0].id },
          '[HostsService] Idempotency match: returning existing host record'
        );
        return formatHost(existingRows[0]);
      }
    }

    // 2. Validate Runtime & Version
    const isRuntimeValid = await RuntimesService.isValidRuntimeAndVersion(
      cleanRuntime,
      cleanVersion
    );
    if (!isRuntimeValid) {
      throw new BadRequestError(
        `Môi trường ${input.runtimeId} phiên bản ${input.runtimeVersion} không hợp lệ hoặc không được hỗ trợ`
      );
    }

    // 3. Validate Hosting Plan
    const plan = await PlansService.getPlanById(cleanPlanId);
    if (!plan) {
      throw new BadRequestError(`Gói dịch vụ "${input.planId}" không tồn tại hoặc đã ngừng cung cấp`);
    }

    logger.info(
      { userId, name: input.name, runtime: cleanRuntime, planId: plan.id, region: cleanRegion },
      'PROVISIONING_STARTED'
    );

    // 4. Automated Healthy Node Selection & Atomic Resource Reservation
    const { node: reservedNode, context: nodeContext } = await SchedulerService.selectAndReserveNode(
      cleanRegion,
      plan.cpuCores,
      plan.ramMb,
      plan.diskMb
    );

    logger.info(
      { nodeId: reservedNode.id, cpu: plan.cpuCores, ram: plan.ramMb, disk: plan.diskMb },
      'NODE_SELECTED'
    );
    logger.info({ nodeId: reservedNode.id }, 'RESOURCES_RESERVED');

    // 5. Allocate Unique Application Port
    let allocatedPort: number;
    try {
      allocatedPort = await SchedulerService.allocatePort(reservedNode.id);
      logger.info({ nodeId: reservedNode.id, port: allocatedPort }, 'PORT_ALLOCATED');
    } catch (portErr: any) {
      // Rollback node resources if port allocation fails
      await SchedulerService.releaseNodeResources(
        reservedNode.id,
        plan.cpuCores,
        plan.ramMb,
        plan.diskMb
      );
      throw portErr;
    }

    // 6. Generate Unique Slug
    const baseSlug = input.name.toLowerCase().trim();
    let finalSlug = baseSlug;
    const existingSlug = await query('SELECT 1 FROM hosts WHERE slug = $1 LIMIT 1', [finalSlug]);
    if (existingSlug.rowCount && existingSlug.rowCount > 0) {
      finalSlug = `${baseSlug}-${crypto.randomBytes(3).toString('hex')}`;
    }

    // 7. Insert Host DB record with initial status 'PROVISIONING'
    let hostRecord: HostRow;
    try {
      const { rows } = await query<HostRow>(
        `INSERT INTO hosts (
          user_id, plan_id, node_id, name, slug, runtime, runtime_version,
          status, memory_mb, cpu_limit, disk_mb, port, region, auto_restart,
          idempotency_key, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'PROVISIONING', $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
        RETURNING *`,
        [
          userId,
          plan.id,
          reservedNode.id,
          input.name,
          finalSlug,
          cleanRuntime,
          cleanVersion,
          plan.ramMb,
          plan.cpuCores,
          plan.diskMb,
          allocatedPort,
          reservedNode.region,
          input.autoRestart ?? true,
          input.idempotencyKey || null,
        ]
      );
      hostRecord = rows[0];
    } catch (insertErr: any) {
      // Rollback node resources on DB insert error
      await SchedulerService.releaseNodeResources(
        reservedNode.id,
        plan.cpuCores,
        plan.ramMb,
        plan.diskMb
      );
      throw insertErr;
    }

    // 8. Communicate with Node Agent via NodeAgentClient
    const agentClient = getNodeAgentClient();
    let createdContainerId: string | null = null;

    try {
      logger.info({ hostId: hostRecord.id, nodeId: reservedNode.id }, 'CONTAINER_CREATE_STARTED');

      const containerResult = await agentClient.createContainer(nodeContext, {
        hostId: hostRecord.id,
        runtime: cleanRuntime as 'nodejs' | 'bun' | 'python',
        version: cleanVersion,
        port: allocatedPort,
        resources: {
          cpuLimit: plan.cpuCores,
          memoryLimitMb: plan.ramMb,
          diskLimitMb: plan.diskMb,
          pidsLimit: 200,
        },
        env: {
          NODE_ENV: 'production',
          PORT: String(allocatedPort),
        },
      });

      createdContainerId = containerResult.containerId;
      logger.info(
        { hostId: hostRecord.id, containerId: createdContainerId },
        'CONTAINER_CREATED'
      );

      // 9. Start Container
      logger.info({ hostId: hostRecord.id, containerId: createdContainerId }, 'CONTAINER_START_STARTED');
      await agentClient.startContainer(nodeContext, createdContainerId);
      logger.info({ hostId: hostRecord.id, containerId: createdContainerId }, 'CONTAINER_STARTED');

      // 10. Verify Container State
      const statusResult = await agentClient.getContainerStatus(nodeContext, createdContainerId);
      if (!statusResult || (statusResult.status !== 'running' && statusResult.status !== 'created')) {
        throw new AppError('Container không khởi chạy thành công sau bước cấp phát', 500);
      }

      // 11. Update Host status to RUNNING and persist container_id
      await query(
        `UPDATE hosts 
         SET status = 'RUNNING', container_id = $1, error_reason = NULL, updated_at = NOW() 
         WHERE id = $2`,
        [createdContainerId, hostRecord.id]
      );

      logger.info(
        { hostId: hostRecord.id, containerId: createdContainerId, port: allocatedPort },
        'PROVISIONING_COMPLETED'
      );

      hostRecord.status = 'RUNNING';
      hostRecord.container_id = createdContainerId;
      hostRecord.plan_name = plan.name;
      hostRecord.plan_price_monthly = plan.priceMonthly;
      hostRecord.node_name = reservedNode.name;
      hostRecord.node_region = reservedNode.region;

      return formatHost(hostRecord);
    } catch (provisionErr: any) {
      const safeReason = provisionErr.message || 'Lỗi cấp phát hạ tầng container';
      logger.error(
        { hostId: hostRecord.id, err: safeReason },
        'PROVISIONING_FAILED'
      );

      // Rollback host status to ERROR
      await query(
        `UPDATE hosts 
         SET status = 'ERROR', error_reason = $1, updated_at = NOW() 
         WHERE id = $2`,
        [safeReason, hostRecord.id]
      );

      // Rollback Node resources
      await SchedulerService.releaseNodeResources(
        reservedNode.id,
        plan.cpuCores,
        plan.ramMb,
        plan.diskMb
      );

      // Cleanup orphan container if already created
      if (createdContainerId) {
        await agentClient.deleteContainer(nodeContext, createdContainerId, true).catch((cleanupErr) => {
          logger.warn({ containerId: createdContainerId, cleanupErr }, 'Failed to cleanup orphan container');
        });
      }

      throw new AppError(`Cấp phát máy chủ thất bại: ${safeReason}`, provisionErr.statusCode || 500);
    }
  }

  /**
   * Update host settings (name, autoRestart)
   */
  public static async updateHost(
    hostId: string,
    userId: string,
    role: string,
    input: UpdateHostInput
  ): Promise<FormattedHost> {
    await this.getHostById(hostId, userId, role);

    const updateFields: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (input.name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      params.push(input.name);
    }

    if (input.autoRestart !== undefined) {
      updateFields.push(`auto_restart = $${paramIndex++}`);
      params.push(input.autoRestart);
    }

    if (updateFields.length === 0) {
      return this.getHostById(hostId, userId, role);
    }

    updateFields.push(`updated_at = NOW()`);
    params.push(hostId);
    const hostIdParam = paramIndex++;

    const whereClause =
      role === 'ADMIN'
        ? `WHERE id = $${hostIdParam}`
        : `WHERE id = $${hostIdParam} AND user_id = $${paramIndex++}`;
    if (role !== 'ADMIN') params.push(userId);

    await query(`UPDATE hosts SET ${updateFields.join(', ')} ${whereClause}`, params);

    return this.getHostById(hostId, userId, role);
  }

  /**
   * Execute lifecycle action (start, stop, restart) connected to NodeAgentClient
   */
  public static async executeAction(
    hostId: string,
    userId: string,
    role: string,
    input: HostActionInput
  ): Promise<{ message: string; host: FormattedHost; action: string; provisioned: boolean }> {
    const host = await this.getHostById(hostId, userId, role);

    if (!host.nodeId) {
      throw new AppError('Máy chủ chưa được gắn vào node hạ tầng', 400);
    }

    const nodeContext = await this.getNodeContext(host.nodeId);
    const agentClient = getNodeAgentClient();
    const containerTarget = host.containerId || host.id;

    if (input.action === 'start') {
      if (host.status === 'RUNNING') {
        throw new BadRequestError('Máy chủ hiện đang hoạt động (RUNNING)');
      }

      await agentClient.startContainer(nodeContext, containerTarget);
      await query(`UPDATE hosts SET status = $1, updated_at = NOW() WHERE id = $2`, ['RUNNING', hostId]);
      host.status = 'RUNNING';

      return {
        message: `Máy chủ "${host.name}" đã được khởi chạy thành công.`,
        host,
        action: 'start',
        provisioned: true,
      };
    }

    if (input.action === 'stop') {
      if (host.status === 'STOPPED') {
        throw new BadRequestError('Máy chủ hiện đã dừng hoạt động (STOPPED)');
      }

      await agentClient.stopContainer(nodeContext, containerTarget);
      await query(`UPDATE hosts SET status = $1, updated_at = NOW() WHERE id = $2`, ['STOPPED', hostId]);
      host.status = 'STOPPED';

      return {
        message: `Máy chủ "${host.name}" đã dừng hoạt động an toàn.`,
        host,
        action: 'stop',
        provisioned: true,
      };
    }

    if (input.action === 'restart') {
      await agentClient.restartContainer(nodeContext, containerTarget);
      await query(`UPDATE hosts SET status = $1, updated_at = NOW() WHERE id = $2`, ['RUNNING', hostId]);
      host.status = 'RUNNING';

      return {
        message: `Máy chủ "${host.name}" đã khởi động lại thành công.`,
        host,
        action: 'restart',
        provisioned: true,
      };
    }

    throw new BadRequestError(`Hành động "${input.action}" không hợp lệ`);
  }

  /**
   * Delete host, cleanly remove container, release node resources
   */
  public static async deleteHost(hostId: string, userId: string, role: string): Promise<void> {
    const host = await this.getHostById(hostId, userId, role);

    // 1. Mark as DELETING
    await query(`UPDATE hosts SET status = $1, updated_at = NOW() WHERE id = $2`, ['DELETING', hostId]);

    // 2. Remove container from Node Agent if assigned
    if (host.nodeId && host.containerId) {
      try {
        const nodeContext = await this.getNodeContext(host.nodeId);
        const agentClient = getNodeAgentClient();
        await agentClient.deleteContainer(nodeContext, host.containerId, true);
      } catch (err: any) {
        logger.warn({ hostId, err: err.message }, 'Warning during container deletion on node');
      }
    }

    // 3. Release resources on Node
    if (host.nodeId) {
      await SchedulerService.releaseNodeResources(
        host.nodeId,
        host.cpuLimit,
        host.memoryLimit,
        host.diskLimit
      );
    }

    // 4. Delete DB record
    const whereClause = role === 'ADMIN' ? `WHERE id = $1` : `WHERE id = $1 AND user_id = $2`;
    const params = role === 'ADMIN' ? [hostId] : [hostId, userId];
    await query(`DELETE FROM hosts ${whereClause}`, params);
  }

  /**
   * Fetch live statistics from Node Agent
   */
  public static async getHostStats(hostId: string, userId: string, role: string) {
    const host = await this.getHostById(hostId, userId, role);
    if (!host.nodeId || !host.containerId) {
      return {
        id: host.id,
        hostId: host.id,
        cpuPercent: 0,
        memoryUsageMb: 0,
        memoryLimitMb: host.memoryLimit,
        pids: 0,
        timestamp: new Date().toISOString(),
      };
    }

    const nodeContext = await this.getNodeContext(host.nodeId);
    const agentClient = getNodeAgentClient();
    return agentClient.getContainerStats(nodeContext, host.containerId);
  }

  /**
   * Fetch live logs from Node Agent
   */
  public static async getHostLogs(
    hostId: string,
    userId: string,
    role: string,
    queryOptions?: HostLogsQuery
  ) {
    const host = await this.getHostById(hostId, userId, role);
    if (!host.nodeId || !host.containerId) {
      return {
        id: host.id,
        lines: ['[Aston Cloud] Máy chủ chưa có container đang chạy hoặc chưa được cấp phát.'],
        total: 1,
      };
    }

    const nodeContext = await this.getNodeContext(host.nodeId);
    const agentClient = getNodeAgentClient();
    return agentClient.getContainerLogs(nodeContext, host.containerId, queryOptions);
  }
}
