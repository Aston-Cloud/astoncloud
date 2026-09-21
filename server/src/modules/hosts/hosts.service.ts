import crypto from 'node:crypto';
import { query } from '../../db/index.js';
import { PlansService, FormattedHostingPlan } from '../plans/plans.service.js';
import { RuntimesService } from '../runtimes/runtimes.service.js';
import { NodesService } from '../nodes/nodes.service.js';
import { BadRequestError, NotFoundError, ForbiddenError, AppError } from '../../utils/errors.js';
import type { CreateHostInput, UpdateHostInput, HostActionInput } from './hosts.schema.js';

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
   * Create a new host database record with initial status PENDING
   */
  public static async createHost(userId: string, input: CreateHostInput): Promise<FormattedHost> {
    const cleanRuntime = input.runtimeId.toLowerCase().trim();
    const cleanVersion = input.runtimeVersion.trim();
    const cleanPlanId = input.planId.toLowerCase().trim();
    const cleanRegion = input.region || 'Singapore';

    // 1. Validate Runtime & Version
    const isRuntimeValid = await RuntimesService.isValidRuntimeAndVersion(
      cleanRuntime,
      cleanVersion
    );
    if (!isRuntimeValid) {
      throw new BadRequestError(
        `Môi trường ${input.runtimeId} phiên bản ${input.runtimeVersion} không hợp lệ hoặc không được hỗ trợ`
      );
    }

    // 2. Validate Hosting Plan
    const plan = await PlansService.getPlanById(cleanPlanId);
    if (!plan) {
      throw new BadRequestError(`Gói dịch vụ "${input.planId}" không tồn tại hoặc đã ngừng cung cấp`);
    }

    // 3. Automated Healthy Node Selection (User cannot select arbitrary infrastructure node)
    const assignedNode = await NodesService.selectNodeForHost(cleanRegion);
    if (!assignedNode) {
      throw new AppError('Hiện không có máy chủ cụm (Node) nào trực tuyến để phân bổ', 503);
    }

    // 4. Generate unique slug
    let baseSlug = input.name.toLowerCase().trim();
    let finalSlug = baseSlug;
    const existingSlug = await query('SELECT 1 FROM hosts WHERE slug = $1 LIMIT 1', [finalSlug]);
    if (existingSlug.rowCount && existingSlug.rowCount > 0) {
      finalSlug = `${baseSlug}-${crypto.randomBytes(3).toString('hex')}`;
    }

    // 5. Generate port
    const allocatedPort = 3000 + Math.floor(Math.random() * 6000);

    // 6. Enforce plan resource limits strictly from database (User payload cannot override)
    const cpuLimit = plan.cpuCores;
    const memoryMb = plan.ramMb;
    const diskMb = plan.diskMb;

    // 7. Insert host with initial status PENDING
    const { rows } = await query<HostRow>(
      `INSERT INTO hosts (
        user_id, plan_id, node_id, name, slug, runtime, runtime_version,
        status, memory_mb, cpu_limit, disk_mb, port, region, auto_restart,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING', $8, $9, $10, $11, $12, $13, NOW(), NOW())
      RETURNING *`,
      [
        userId,
        plan.id,
        assignedNode.id,
        input.name,
        finalSlug,
        cleanRuntime,
        cleanVersion,
        memoryMb,
        cpuLimit,
        diskMb,
        allocatedPort,
        assignedNode.region,
        input.autoRestart ?? true,
      ]
    );

    const newHost = rows[0];
    newHost.plan_name = plan.name;
    newHost.plan_price_monthly = plan.priceMonthly;
    newHost.node_name = assignedNode.name;
    newHost.node_region = assignedNode.region;

    return formatHost(newHost);
  }

  /**
   * Update host settings where appropriate
   */
  public static async updateHost(
    hostId: string,
    userId: string,
    role: string,
    input: UpdateHostInput
  ): Promise<FormattedHost> {
    // Check ownership first
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
   * Delete host
   */
  public static async deleteHost(hostId: string, userId: string, role: string): Promise<void> {
    // Check ownership first
    await this.getHostById(hostId, userId, role);

    const whereClause = role === 'ADMIN' ? `WHERE id = $1` : `WHERE id = $1 AND user_id = $2`;
    const params = role === 'ADMIN' ? [hostId] : [hostId, userId];

    await query(`DELETE FROM hosts ${whereClause}`, params);
  }

  /**
   * Prepare API/state architecture for host actions (Start, Stop, Restart)
   * In this milestone, containers are not provisioned yet (status: PENDING).
   */
  public static async executeAction(
    hostId: string,
    userId: string,
    role: string,
    input: HostActionInput
  ): Promise<{ message: string; host: FormattedHost; action: string; provisioned: boolean }> {
    const host = await this.getHostById(hostId, userId, role);

    // If host is in PENDING status, return architectural note that Docker provisioning will be in next milestone
    return {
      message: `Yêu cầu "${input.action}" đã được ghi nhận. Máy chủ hiện ở trạng thái ${host.status} (chờ cấp phát). Điều khiển container thực tế sẽ được kết nối ở mốc Docker Agent tiếp theo.`,
      host,
      action: input.action,
      provisioned: false,
    };
  }
}
