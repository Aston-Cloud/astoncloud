import crypto from 'node:crypto';
import { query } from '../../db/index.js';
import { PlansService } from '../plans/plans.service.js';
import { RuntimesService } from '../runtimes/runtimes.service.js';
import { NodesService, NodeRow } from '../nodes/nodes.service.js';
import { SchedulerService } from '../scheduler/scheduler.service.js';
import { getNodeAgentClient } from '../node-agent/client.factory.js';
import {
  NodeContext,
  ListFilesResult,
  ReadFileResult,
  FileDownloadStream,
} from '../node-agent/node-agent.interface.js';
import { BadRequestError, NotFoundError, AppError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';
import {
  encryptEnvValue,
  decryptEnvValue,
  maskEnvValue,
} from '../../utils/encryption.js';
import type {
  CreateHostInput,
  UpdateHostInput,
  HostActionInput,
  HostLogsQuery,
  WriteFileInput,
  UploadFileInput,
  CreateEnvVariableInput,
  UpdateEnvVariableInput,
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

export interface HostEnvVariableRow {
  id: string;
  host_id: string;
  key: string;
  encrypted_value: string;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface FormattedHostEnvVariable {
  id: string;
  hostId: string;
  key: string;
  hasValue: boolean;
  maskedValue: string;
  createdAt: string;
  updatedAt: string;
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
   * Helper to retrieve NodeContext from node ID with offline failure guard
   */
  private static async getNodeContext(nodeId: string, allowOffline = false): Promise<NodeContext> {
    const node = await NodesService.getNodeById(nodeId);
    if (!node) {
      throw new AppError(`Không tìm thấy node cụm "${nodeId}"`, 500);
    }
    if (!allowOffline && node.status === 'OFFLINE') {
      throw new AppError(
        `Máy chủ cụm (Node "${node.name}") hiện đang ngoại tuyến (OFFLINE). Các tác vụ điều khiển hạ tầng tạm thời không khả dụng.`,
        503
      );
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
  public static async createHost(userId: string, input: CreateHostInput, role = 'USER'): Promise<FormattedHost> {
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

    // 3b. Enforce Subscription & Plan Access Limits
    if (role !== 'ADMIN') {
      const { rows: subRows } = await query<{
        plan_id: string;
        status: string;
        cancel_at_period_end: boolean;
      }>(
        `SELECT plan_id, status, cancel_at_period_end 
         FROM user_subscriptions 
         WHERE user_id = $1 AND status = 'ACTIVE' 
         ORDER BY created_at DESC LIMIT 1`,
        [userId]
      );

      const activeSub = subRows[0];

      // Count existing active hosts for user
      const { rows: countRows } = await query<{ count: string | number }>(
        `SELECT COUNT(*) as count FROM hosts WHERE user_id = $1 AND status NOT IN ('DELETING')`,
        [userId]
      );
      const existingHostCount = Number(countRows[0]?.count || 0);

      // Plan tier ranking: starter (1) < developer (2) < pro (3)
      const tierRank: Record<string, number> = {
        starter: 1,
        developer: 2,
        pro: 3,
      };

      if (activeSub) {
        const subTier = tierRank[activeSub.plan_id] || 1;
        const requestedTier = tierRank[cleanPlanId] || 1;

        if (requestedTier > subTier) {
          throw new BadRequestError(
            `Gói đăng ký hiện tại (${activeSub.plan_id.toUpperCase()}) không hỗ trợ tạo máy chủ gói "${plan.name}". Vui lòng nâng cấp gói đăng ký.`
          );
        }

        // Quota limits: starter (2 hosts), developer (5 hosts), pro (10 hosts)
        const maxHosts = activeSub.plan_id === 'pro' ? 10 : activeSub.plan_id === 'developer' ? 5 : 2;
        if (existingHostCount >= maxHosts) {
          throw new BadRequestError(
            `Bạn đã đạt giới hạn tối đa ${maxHosts} máy chủ cho gói ${activeSub.plan_id.toUpperCase()}. Vui lòng nâng cấp gói hoặc xóa bớt máy chủ cũ.`
          );
        }
      } else {
        // Free / Dev trial policy:
        // Users without an active subscription are permitted 1 free/dev Starter host.
        // Attempting to create a Developer or Pro host without a subscription is rejected.
        if (cleanPlanId !== 'starter') {
          throw new BadRequestError(
            `Yêu cầu đăng ký gói dịch vụ để tạo máy chủ "${plan.name}". Tài khoản miễn phí chỉ được tạo gói Starter.`
          );
        }

        if (existingHostCount >= 1) {
          throw new BadRequestError(
            'Bạn đã sử dụng hết lượt máy chủ dùng thử miễn phí (1 máy chủ). Vui lòng đăng ký gói dịch vụ để tạo thêm máy chủ.'
          );
        }
      }
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

    // Load any pre-configured decrypted host environment variables
    const customEnv = await this.loadDecryptedHostEnvironment(hostRecord.id);
    const containerEnv: Record<string, string> = {
      NODE_ENV: 'production',
      ...customEnv,
      PORT: String(allocatedPort), // PORT is strictly platform-controlled
    };

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
        env: containerEnv,
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

      // Sync latest decrypted environment variables before starting container
      try {
        const decryptedEnv = await this.loadDecryptedHostEnvironment(hostId);
        if (host.port) {
          decryptedEnv.PORT = String(host.port);
        }
        decryptedEnv.NODE_ENV = 'production';
        await agentClient.setEnvironmentVariables(nodeContext, hostId, decryptedEnv);
      } catch (envErr: any) {
        logger.warn({ hostId, err: envErr.message }, 'Failed to sync container environment before start');
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
      // Sync latest decrypted environment variables before restarting container
      try {
        const decryptedEnv = await this.loadDecryptedHostEnvironment(hostId);
        if (host.port) {
          decryptedEnv.PORT = String(host.port);
        }
        decryptedEnv.NODE_ENV = 'production';
        await agentClient.setEnvironmentVariables(nodeContext, hostId, decryptedEnv);
      } catch (envErr: any) {
        logger.warn({ hostId, err: envErr.message }, 'Failed to sync container environment before restart');
      }

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
        const nodeContext = await this.getNodeContext(host.nodeId, true);
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
   * Fetch live statistics from Node Agent with lifecycle awareness and plan limits
   */
  public static async getHostStats(hostId: string, userId: string, role: string) {
    const host = await this.getHostById(hostId, userId, role);
    const nowIso = new Date().toISOString();

    const defaultLimits = {
      cpuLimit: host.cpuLimit || 1,
      memoryLimit: host.memoryLimit || 512,
      diskLimit: host.diskLimit || 5120,
    };

    // 0. Check if assigned host node is OFFLINE
    if (host.nodeId) {
      try {
        await this.getNodeContext(host.nodeId);
      } catch (err: any) {
        if (err.statusCode === 503 || err.message?.includes('OFFLINE')) {
          return {
            id: host.id,
            hostId: host.id,
            status: host.status,
            available: false,
            cpu: { usage: 0, limit: defaultLimits.cpuLimit },
            memory: { usage: 0, limit: defaultLimits.memoryLimit },
            disk: { usage: 0, limit: defaultLimits.diskLimit },
            network: { rx: 0, tx: 0 },
            uptime: 0,
            uptimeFormatted: '0m',
            timestamp: nowIso,
            cpuPercent: 0,
            memoryUsageMb: 0,
            memoryLimitMb: defaultLimits.memoryLimit,
            pids: 0,
            error: 'Máy chủ cụm (Node) hiện đang ngoại tuyến',
          };
        }
      }
    }

    // 1. Handling non-running states: PROVISIONING, PENDING, ERROR, DELETING
    if (host.status === 'PROVISIONING' || host.status === 'PENDING') {
      return {
        id: host.id,
        hostId: host.id,
        status: host.status,
        available: false,
        cpu: { usage: 0, limit: defaultLimits.cpuLimit },
        memory: { usage: 0, limit: defaultLimits.memoryLimit },
        disk: { usage: 0, limit: defaultLimits.diskLimit },
        network: { rx: 0, tx: 0 },
        uptime: 0,
        uptimeFormatted: '0m',
        timestamp: nowIso,
        cpuPercent: 0,
        memoryUsageMb: 0,
        memoryLimitMb: defaultLimits.memoryLimit,
        pids: 0,
      };
    }

    if (host.status === 'ERROR' || host.status === 'DELETING') {
      return {
        id: host.id,
        hostId: host.id,
        status: host.status,
        available: false,
        cpu: { usage: 0, limit: defaultLimits.cpuLimit },
        memory: { usage: 0, limit: defaultLimits.memoryLimit },
        disk: { usage: 0, limit: defaultLimits.diskLimit },
        network: { rx: 0, tx: 0 },
        uptime: 0,
        uptimeFormatted: '0m',
        timestamp: nowIso,
        cpuPercent: 0,
        memoryUsageMb: 0,
        memoryLimitMb: defaultLimits.memoryLimit,
        pids: 0,
      };
    }

    if (host.status === 'STOPPED') {
      return {
        id: host.id,
        hostId: host.id,
        status: 'STOPPED',
        available: true,
        cpu: { usage: 0, limit: defaultLimits.cpuLimit },
        memory: { usage: 0, limit: defaultLimits.memoryLimit },
        disk: {
          usage: Math.round(defaultLimits.diskLimit * 0.08),
          limit: defaultLimits.diskLimit,
        },
        network: { rx: 0, tx: 0 },
        uptime: 0,
        uptimeFormatted: '0m',
        timestamp: nowIso,
        cpuPercent: 0,
        memoryUsageMb: 0,
        memoryLimitMb: defaultLimits.memoryLimit,
        pids: 0,
      };
    }

    // 2. Handling RUNNING state
    if (!host.nodeId || !host.containerId) {
      return {
        id: host.id,
        hostId: host.id,
        status: host.status,
        available: true,
        cpu: { usage: 0, limit: defaultLimits.cpuLimit },
        memory: { usage: 0, limit: defaultLimits.memoryLimit },
        disk: { usage: Math.round(defaultLimits.diskLimit * 0.08), limit: defaultLimits.diskLimit },
        network: { rx: 0, tx: 0 },
        uptime: 0,
        uptimeFormatted: '0m',
        timestamp: nowIso,
        cpuPercent: 0,
        memoryUsageMb: 0,
        memoryLimitMb: defaultLimits.memoryLimit,
        pids: 0,
      };
    }

    try {
      const nodeContext = await this.getNodeContext(host.nodeId);
      const agentClient = getNodeAgentClient();
      const rawStats = await agentClient.getContainerStats(nodeContext, host.containerId);

      const cpuUsage = rawStats.cpu?.usage ?? rawStats.cpuPercent ?? 0;
      const memUsage = rawStats.memory?.usage ?? rawStats.memoryUsageMb ?? 0;
      const diskUsage = rawStats.disk?.usage ?? Math.round(defaultLimits.diskLimit * 0.08);
      const rx = rawStats.network?.rx ?? 0;
      const tx = rawStats.network?.tx ?? 0;

      return {
        id: host.id,
        hostId: host.id,
        status: 'RUNNING',
        available: true,
        cpu: {
          usage: cpuUsage,
          limit: defaultLimits.cpuLimit,
        },
        memory: {
          usage: memUsage,
          limit: defaultLimits.memoryLimit,
        },
        disk: {
          usage: diskUsage,
          limit: defaultLimits.diskLimit,
        },
        network: {
          rx,
          tx,
        },
        uptime: rawStats.uptime ?? 0,
        uptimeFormatted: rawStats.uptimeFormatted || '0m',
        timestamp: rawStats.timestamp || nowIso,
        cpuPercent: cpuUsage,
        memoryUsageMb: memUsage,
        memoryLimitMb: defaultLimits.memoryLimit,
        pids: rawStats.pids ?? 0,
      };
    } catch (err: any) {
      logger.warn(
        { hostId: host.id, containerId: host.containerId, err: err.message },
        '[HostsService] Failed to retrieve live container stats from Node Agent, returning safe fallback'
      );
      return {
        id: host.id,
        hostId: host.id,
        status: host.status,
        available: false,
        cpu: { usage: 0, limit: defaultLimits.cpuLimit },
        memory: { usage: 0, limit: defaultLimits.memoryLimit },
        disk: { usage: Math.round(defaultLimits.diskLimit * 0.08), limit: defaultLimits.diskLimit },
        network: { rx: 0, tx: 0 },
        uptime: 0,
        uptimeFormatted: 'Chưa khả dụng',
        timestamp: nowIso,
        cpuPercent: 0,
        memoryUsageMb: 0,
        memoryLimitMb: defaultLimits.memoryLimit,
        pids: 0,
        error: 'Node Agent metrics unavailable',
      };
    }
  }

  /**
   * Fetch live logs from Node Agent or lifecycle history
   */
  public static async getHostLogs(
    hostId: string,
    userId: string,
    role: string,
    queryOptions?: Partial<HostLogsQuery>
  ) {
    const host = await this.getHostById(hostId, userId, role);

    // 0. Check if assigned host node is OFFLINE
    if (host.nodeId) {
      try {
        await this.getNodeContext(host.nodeId);
      } catch (err: any) {
        if (err.statusCode === 503 || err.message?.includes('OFFLINE')) {
          const entries = [
            {
              timestamp: new Date().toISOString(),
              level: 'warn' as const,
              message: `[CẢNH BÁO HẠ TẦNG] Máy chủ cụm (Node) hiện đang ngoại tuyến (OFFLINE). Không thể kết nối lấy nhật ký thời gian thực.`,
            },
          ];
          return {
            id: host.id,
            ...this.filterAndFormatLogEntries(entries, queryOptions),
          };
        }
      }
    }

    // If host is PROVISIONING
    if (host.status === 'PROVISIONING') {
      const createdTs = host.createdAt ? new Date(host.createdAt).toISOString() : new Date().toISOString();
      const entries: Array<{ timestamp: string; level: 'info' | 'warn' | 'error' | 'debug'; message: string }> = [
        {
          timestamp: createdTs,
          level: 'info',
          message: `Tiếp nhận yêu cầu cấp phát máy chủ: ${host.name} (${host.runtime} ${host.runtimeVersion})`,
        },
        {
          timestamp: new Date(new Date(createdTs).getTime() + 100).toISOString(),
          level: 'info',
          message: `Lập lịch điều phối tài nguyên trên node ${host.node?.name || 'hạ tầng'} (${host.node?.region || host.region || 'Singapore'})`,
        },
        {
          timestamp: new Date(new Date(createdTs).getTime() + 200).toISOString(),
          level: 'info',
          message: `Đang kết nối tới Node Agent để khởi tạo môi trường container cô lập...`,
        },
      ];
      return {
        id: host.id,
        ...this.filterAndFormatLogEntries(entries, queryOptions),
      };
    }

    // If host is in ERROR state
    if (host.status === 'ERROR') {
      const createdTs = host.createdAt ? new Date(host.createdAt).toISOString() : new Date().toISOString();
      const updatedTs = host.updatedAt ? new Date(host.updatedAt).toISOString() : new Date().toISOString();
      const entries: Array<{ timestamp: string; level: 'info' | 'warn' | 'error' | 'debug'; message: string }> = [
        {
          timestamp: createdTs,
          level: 'info',
          message: `Tiếp nhận yêu cầu cấp phát máy chủ: ${host.name} (${host.runtime} ${host.runtimeVersion})`,
        },
        {
          timestamp: updatedTs,
          level: 'error',
          message: `Cấp phát thất bại: ${host.errorReason || 'Lỗi không xác định khi khởi tạo hạ tầng'}`,
        },
        {
          timestamp: new Date(new Date(updatedTs).getTime() + 50).toISOString(),
          level: 'info',
          message: `Tài nguyên hệ thống đã được hoàn trả về node an toàn`,
        },
      ];
      return {
        id: host.id,
        ...this.filterAndFormatLogEntries(entries, queryOptions),
      };
    }

    // If host is DELETING
    if (host.status === 'DELETING') {
      const now = new Date().toISOString();
      const entries: Array<{ timestamp: string; level: 'info' | 'warn' | 'error' | 'debug'; message: string }> = [
        {
          timestamp: now,
          level: 'warn',
          message: `Máy chủ đang trong quá trình xóa dọn dẹp hạ tầng container và giải phóng tài nguyên.`,
        },
      ];
      return {
        id: host.id,
        ...this.filterAndFormatLogEntries(entries, queryOptions),
      };
    }

    // If host has containerId and nodeId
    if (host.nodeId && host.containerId) {
      try {
        const nodeContext = await this.getNodeContext(host.nodeId);
        const agentClient = getNodeAgentClient();
        const rawResult = await agentClient.getContainerLogs(nodeContext, host.containerId, queryOptions);

        // Redact sensitive patterns in logs
        const sanitizedLines = rawResult.lines.map((l) => this.redactSensitiveData(l));
        const sanitizedEntries = rawResult.entries?.map((e) => ({
          ...e,
          message: this.redactSensitiveData(e.message),
        }));

        return {
          id: host.id,
          lines: sanitizedLines,
          total: rawResult.total,
          entries: sanitizedEntries,
        };
      } catch (err: any) {
        if (err.statusCode === 503 || err.message?.includes('OFFLINE')) {
          const entries = [
            {
              timestamp: new Date().toISOString(),
              level: 'warn' as const,
              message: `[CẢNH BÁO HẠ TẦNG] Máy chủ cụm (Node) hiện đang ngoại tuyến (OFFLINE). Không thể kết nối lấy nhật ký thời gian thực.`,
            },
          ];
          return {
            id: host.id,
            ...this.filterAndFormatLogEntries(entries, queryOptions),
          };
        }
        throw err;
      }
    }

    // Fallback if STOPPED or PENDING without active containerId
    const now = new Date().toISOString();
    const statusMsg =
      host.status === 'STOPPED'
        ? 'Container hiện đang ở trạng thái DỪNG (STOPPED). Không có tiến trình ứng dụng đang chạy.'
        : `Máy chủ đang ở trạng thái ${host.status}. Chưa có container hoạt động.`;

    const entries: Array<{ timestamp: string; level: 'info' | 'warn' | 'error' | 'debug'; message: string }> = [
      {
        timestamp: now,
        level: host.status === 'STOPPED' ? 'warn' : 'info',
        message: statusMsg,
      },
    ];

    return {
      id: host.id,
      ...this.filterAndFormatLogEntries(entries, queryOptions),
    };
  }

  private static filterAndFormatLogEntries(
    entries: Array<{ timestamp: string; level: 'info' | 'warn' | 'error' | 'debug'; message: string }>,
    options?: Partial<HostLogsQuery>
  ) {
    let filtered = [...entries];

    if (options?.since) {
      filtered = filtered.filter((e) => new Date(e.timestamp).getTime() >= options.since!);
    }

    if (options?.level && options.level !== 'all') {
      const lvl = options.level.toLowerCase();
      filtered = filtered.filter((e) => e.level.toLowerCase() === lvl);
    }

    if (options?.search) {
      const q = options.search.toLowerCase();
      filtered = filtered.filter(
        (e) => e.message.toLowerCase().includes(q) || e.level.toLowerCase().includes(q)
      );
    }

    const tail = options?.tail ? Math.max(1, options.tail) : 100;
    const sliced = filtered.slice(-tail);
    const lines = sliced.map(
      (e) => `[${e.timestamp}] [${e.level.toUpperCase()}] ${this.redactSensitiveData(e.message)}`
    );

    return {
      lines,
      total: filtered.length,
      entries: sliced.map((e) => ({ ...e, message: this.redactSensitiveData(e.message) })),
    };
  }

  private static redactSensitiveData(text: string): string {
    return text
      .replace(/password\s*=\s*['"][^'"]+['"]/gi, 'password="[REDACTED]"')
      .replace(/secret\s*=\s*['"][^'"]+['"]/gi, 'secret="[REDACTED]"')
      .replace(/token\s*=\s*['"][^'"]+['"]/gi, 'token="[REDACTED]"')
      .replace(/api[_-]?key\s*=\s*['"][^'"]+['"]/gi, 'apiKey="[REDACTED]"')
      .replace(/bearer\s+[a-zA-Z0-9_\-\.]+/gi, 'Bearer [REDACTED]');
  }

  // ==========================================
  // HOST FILE MANAGER METHODS
  // ==========================================

  private static async getHostAndNodeForFiles(hostId: string, userId: string, role: string) {
    const host = await this.getHostById(hostId, userId, role);

    if (host.status === 'DELETING') {
      throw new BadRequestError('Máy chủ đang trong quá trình xóa dọn dẹp, không thể thao tác tệp tin');
    }

    if (!host.nodeId) {
      throw new BadRequestError('Máy chủ chưa được gán node hạ tầng');
    }

    const nodeContext = await this.getNodeContext(host.nodeId);
    const agentClient = getNodeAgentClient();

    return { host, nodeContext, agentClient };
  }

  public static async listFiles(
    userId: string,
    role: string,
    hostId: string,
    dirPath: string = '/'
  ): Promise<ListFilesResult> {
    const { nodeContext, agentClient } = await this.getHostAndNodeForFiles(hostId, userId, role);
    return agentClient.listFiles(nodeContext, hostId, dirPath);
  }

  public static async readFile(
    userId: string,
    role: string,
    hostId: string,
    filePath: string
  ): Promise<ReadFileResult> {
    const { nodeContext, agentClient } = await this.getHostAndNodeForFiles(hostId, userId, role);
    return agentClient.readFile(nodeContext, hostId, filePath);
  }

  public static async writeFile(
    userId: string,
    role: string,
    hostId: string,
    input: WriteFileInput
  ): Promise<{ path: string; size: number }> {
    const { nodeContext, agentClient } = await this.getHostAndNodeForFiles(hostId, userId, role);
    return agentClient.writeFile(nodeContext, hostId, {
      path: input.path,
      content: input.content,
      encoding: input.encoding,
    });
  }

  public static async createDirectory(
    userId: string,
    role: string,
    hostId: string,
    dirPath: string
  ): Promise<{ path: string }> {
    const { nodeContext, agentClient } = await this.getHostAndNodeForFiles(hostId, userId, role);
    return agentClient.createDirectory(nodeContext, hostId, dirPath);
  }

  public static async deleteFile(
    userId: string,
    role: string,
    hostId: string,
    targetPath: string
  ): Promise<{ path: string; deleted: boolean }> {
    const { nodeContext, agentClient } = await this.getHostAndNodeForFiles(hostId, userId, role);
    return agentClient.deleteFile(nodeContext, hostId, targetPath);
  }

  public static async renameFile(
    userId: string,
    role: string,
    hostId: string,
    fromPath: string,
    toPath: string
  ): Promise<{ from: string; to: string }> {
    const { nodeContext, agentClient } = await this.getHostAndNodeForFiles(hostId, userId, role);
    return agentClient.renameFile(nodeContext, hostId, fromPath, toPath);
  }

  public static async uploadFile(
    userId: string,
    role: string,
    hostId: string,
    input: UploadFileInput
  ): Promise<{ path: string; size: number }> {
    const { nodeContext, agentClient } = await this.getHostAndNodeForFiles(hostId, userId, role);
    return agentClient.uploadFile(nodeContext, hostId, {
      destinationPath: input.destinationPath || '/',
      filename: input.filename,
      content: input.content,
      encoding: input.encoding,
    });
  }

  public static async downloadFile(
    userId: string,
    role: string,
    hostId: string,
    filePath: string
  ): Promise<FileDownloadStream> {
    const { nodeContext, agentClient } = await this.getHostAndNodeForFiles(hostId, userId, role);
    return agentClient.downloadFile(nodeContext, hostId, filePath);
  }

  // ==========================================
  // HOST ENVIRONMENT VARIABLES (MILESTONE 9)
  // ==========================================

  /**
   * Helper to load and decrypt all environment variables for a host
   * Used strictly for container provisioning and runtime execution
   */
  public static async loadDecryptedHostEnvironment(hostId: string): Promise<Record<string, string>> {
    const { rows } = await query<HostEnvVariableRow>(
      `SELECT * FROM host_env_variables WHERE host_id = $1 ORDER BY key ASC`,
      [hostId]
    );

    const envMap: Record<string, string> = {};
    for (const row of rows) {
      try {
        envMap[row.key] = decryptEnvValue(row.encrypted_value);
      } catch (err: any) {
        logger.error(
          { hostId, key: row.key, err: err.message },
          'Failed to decrypt environment variable'
        );
      }
    }
    return envMap;
  }

  /**
   * List environment variables for a host (Values are masked with •••••••• for security)
   */
  public static async listHostVariables(
    hostId: string,
    userId: string,
    role: string
  ): Promise<FormattedHostEnvVariable[]> {
    // Verify host ownership (IDOR protection)
    await this.getHostById(hostId, userId, role);

    const { rows } = await query<HostEnvVariableRow>(
      `SELECT * FROM host_env_variables WHERE host_id = $1 ORDER BY key ASC`,
      [hostId]
    );

    return rows.map((row) => ({
      id: row.id,
      hostId: row.host_id,
      key: row.key,
      hasValue: true,
      maskedValue: maskEnvValue(),
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
      updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
    }));
  }

  /**
   * Create an encrypted environment variable for a host
   */
  public static async createHostVariable(
    hostId: string,
    userId: string,
    role: string,
    input: CreateEnvVariableInput
  ): Promise<{ variable: FormattedHostEnvVariable; requiresRestart: boolean }> {
    const host = await this.getHostById(hostId, userId, role);

    const cleanKey = input.key.trim().toUpperCase();
    if (cleanKey === 'PORT') {
      throw new BadRequestError(
        "Biến môi trường 'PORT' được quản lý tự động bởi hạ tầng cụm máy chủ và không thể thay đổi thủ công"
      );
    }

    // Check duplicate key on this host
    const { rows: existing } = await query<HostEnvVariableRow>(
      `SELECT * FROM host_env_variables WHERE host_id = $1 AND key = $2 LIMIT 1`,
      [hostId, cleanKey]
    );
    if (existing.length > 0) {
      throw new AppError(`Biến môi trường với tên "${cleanKey}" đã tồn tại trên máy chủ`, 409);
    }

    const encryptedVal = encryptEnvValue(input.value);

    const { rows } = await query<HostEnvVariableRow>(
      `INSERT INTO host_env_variables (host_id, key, encrypted_value, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       RETURNING *`,
      [hostId, cleanKey, encryptedVal]
    );

    const created = rows[0];

    // Safe Audit Logging - never log plaintext value or secret payload
    logger.info(
      {
        event: 'ENV_CREATED',
        userId,
        hostId,
        variableKey: cleanKey,
        timestamp: new Date().toISOString(),
      },
      `[Audit] Biến môi trường "${cleanKey}" được khởi tạo cho host "${hostId}"`
    );

    // Sync with Node Agent container if host is assigned to a node
    if (host.nodeId) {
      try {
        const nodeContext = await this.getNodeContext(host.nodeId);
        const agentClient = getNodeAgentClient();
        await agentClient.setEnvironmentVariables(nodeContext, hostId, {
          [cleanKey]: input.value,
        });
      } catch (agentErr: any) {
        logger.warn(
          { hostId, err: agentErr.message },
          'Failed to sync new environment variable to Node Agent immediately'
        );
      }
    }

    return {
      variable: {
        id: created.id,
        hostId: created.host_id,
        key: created.key,
        hasValue: true,
        maskedValue: maskEnvValue(),
        createdAt: created.created_at instanceof Date ? created.created_at.toISOString() : String(created.created_at),
        updatedAt: created.updated_at instanceof Date ? created.updated_at.toISOString() : String(created.updated_at),
      },
      requiresRestart: true,
    };
  }

  /**
   * Update an environment variable (key or value)
   */
  public static async updateHostVariable(
    hostId: string,
    variableId: string,
    userId: string,
    role: string,
    input: UpdateEnvVariableInput
  ): Promise<{ variable: FormattedHostEnvVariable; requiresRestart: boolean }> {
    const host = await this.getHostById(hostId, userId, role);

    // Verify variable exists on requested host (IDOR protection)
    const { rows: existingRows } = await query<HostEnvVariableRow>(
      `SELECT * FROM host_env_variables WHERE id = $1 AND host_id = $2 LIMIT 1`,
      [variableId, hostId]
    );
    const existing = existingRows[0];
    if (!existing) {
      throw new NotFoundError('Không tìm thấy biến môi trường được yêu cầu');
    }

    let targetKey = existing.key;
    if (input.key !== undefined) {
      const cleanKey = input.key.trim().toUpperCase();
      if (cleanKey === 'PORT') {
        throw new BadRequestError(
          "Biến môi trường 'PORT' được quản lý tự động bởi hạ tầng cụm máy chủ và không thể thay đổi thủ công"
        );
      }
      if (cleanKey !== existing.key) {
        const { rows: dupRows } = await query<HostEnvVariableRow>(
          `SELECT * FROM host_env_variables WHERE host_id = $1 AND key = $2 AND id != $3 LIMIT 1`,
          [hostId, cleanKey, variableId]
        );
        if (dupRows.length > 0) {
          throw new AppError(`Biến môi trường với tên "${cleanKey}" đã tồn tại trên máy chủ`, 409);
        }
      }
      targetKey = cleanKey;
    }

    let encryptedVal = existing.encrypted_value;
    if (input.value !== undefined) {
      encryptedVal = encryptEnvValue(input.value);
    }

    let updated: HostEnvVariableRow;
    if (input.key !== undefined && input.value !== undefined) {
      const { rows: updatedRows } = await query<HostEnvVariableRow>(
        `UPDATE host_env_variables 
         SET key = $1, encrypted_value = $2, updated_at = NOW() 
         WHERE id = $3 AND host_id = $4 
         RETURNING *`,
        [targetKey, encryptedVal, variableId, hostId]
      );
      updated = updatedRows[0];
    } else if (input.key !== undefined) {
      const { rows: updatedRows } = await query<HostEnvVariableRow>(
        `UPDATE host_env_variables 
         SET key = $1, updated_at = NOW() 
         WHERE id = $2 AND host_id = $3 
         RETURNING *`,
        [targetKey, variableId, hostId]
      );
      updated = updatedRows[0];
    } else {
      const { rows: updatedRows } = await query<HostEnvVariableRow>(
        `UPDATE host_env_variables 
         SET encrypted_value = $1, updated_at = NOW() 
         WHERE id = $2 AND host_id = $3 
         RETURNING *`,
        [encryptedVal, variableId, hostId]
      );
      updated = updatedRows[0];
    }

    // Safe Audit Logging
    logger.info(
      {
        event: 'ENV_UPDATED',
        userId,
        hostId,
        variableKey: updated.key,
        timestamp: new Date().toISOString(),
      },
      `[Audit] Biến môi trường "${updated.key}" được cập nhật cho host "${hostId}"`
    );

    // Sync with Node Agent container if host has node
    if (host.nodeId) {
      try {
        const nodeContext = await this.getNodeContext(host.nodeId);
        const agentClient = getNodeAgentClient();
        if (input.key && input.key !== existing.key) {
          await agentClient.removeEnvironmentVariable(nodeContext, hostId, existing.key).catch(() => {});
        }
        const valToSet = input.value !== undefined ? input.value : decryptEnvValue(updated.encrypted_value);
        await agentClient.setEnvironmentVariables(nodeContext, hostId, {
          [updated.key]: valToSet,
        });
      } catch (agentErr: any) {
        logger.warn(
          { hostId, err: agentErr.message },
          'Failed to sync updated environment variable to Node Agent immediately'
        );
      }
    }

    return {
      variable: {
        id: updated.id,
        hostId: updated.host_id,
        key: updated.key,
        hasValue: true,
        maskedValue: maskEnvValue(),
        createdAt: updated.created_at instanceof Date ? updated.created_at.toISOString() : String(updated.created_at),
        updatedAt: updated.updated_at instanceof Date ? updated.updated_at.toISOString() : String(updated.updated_at),
      },
      requiresRestart: true,
    };
  }

  /**
   * Delete an environment variable
   */
  public static async deleteHostVariable(
    hostId: string,
    variableId: string,
    userId: string,
    role: string
  ): Promise<{ success: boolean; message: string; requiresRestart: boolean }> {
    const host = await this.getHostById(hostId, userId, role);

    const { rows: existingRows } = await query<HostEnvVariableRow>(
      `SELECT * FROM host_env_variables WHERE id = $1 AND host_id = $2 LIMIT 1`,
      [variableId, hostId]
    );
    const existing = existingRows[0];
    if (!existing) {
      throw new NotFoundError('Không tìm thấy biến môi trường được yêu cầu');
    }

    await query(`DELETE FROM host_env_variables WHERE id = $1 AND host_id = $2`, [variableId, hostId]);

    // Safe Audit Logging
    logger.info(
      {
        event: 'ENV_DELETED',
        userId,
        hostId,
        variableKey: existing.key,
        timestamp: new Date().toISOString(),
      },
      `[Audit] Biến môi trường "${existing.key}" đã bị xóa khỏi host "${hostId}"`
    );

    // Sync with Node Agent container
    if (host.nodeId) {
      try {
        const nodeContext = await this.getNodeContext(host.nodeId);
        const agentClient = getNodeAgentClient();
        await agentClient.removeEnvironmentVariable(nodeContext, hostId, existing.key);
      } catch (agentErr: any) {
        logger.warn(
          { hostId, err: agentErr.message },
          'Failed to remove environment variable from Node Agent'
        );
      }
    }

    return {
      success: true,
      message: `Biến môi trường "${existing.key}" đã được xóa thành công.`,
      requiresRestart: true,
    };
  }
}
