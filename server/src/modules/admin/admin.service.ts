import { query } from '../../db/index.js';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';
import { HostsService } from '../hosts/hosts.service.js';
import { NodesService, formatNode, NodeStatus, NodeRow } from '../nodes/nodes.service.js';
import type { RegisterNodeInput } from '../nodes/nodes.schema.js';
import type {
  UserListQuery,
  UpdateUserStatusInput,
  UpdateUserRoleInput,
  HostListQuery,
  CreatePlanInput,
  UpdatePlanInput,
  ActivityQuery,
  UpdateSettingsInput,
} from './admin.schema.js';

export interface AuditLogEntry {
  id?: string;
  actorId: string;
  actorEmail: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  details?: Record<string, any> | null;
  ipAddress?: string | null;
}

export class AdminService {
  /**
   * Safe audit logging for administrative actions
   */
  public static async recordAuditLog(entry: AuditLogEntry): Promise<void> {
    try {
      // Clean sensitive details
      const safeDetails = entry.details ? { ...entry.details } : {};
      delete safeDetails.password;
      delete safeDetails.passwordHash;
      delete safeDetails.token;
      delete safeDetails.secret;
      delete safeDetails.key;
      delete safeDetails.apiKey;

      await query(
        `INSERT INTO audit_logs (actor_id, actor_email, action, target_type, target_id, details, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          entry.actorId,
          entry.actorEmail,
          entry.action,
          entry.targetType,
          entry.targetId || null,
          JSON.stringify(safeDetails),
          entry.ipAddress || null,
        ]
      );
    } catch (err) {
      logger.error({ err, action: entry.action }, 'Failed to record audit log');
    }
  }

  /**
   * Get real dashboard overview metrics
   */
  public static async getDashboardStats() {
    // 1. Users stats
    const totalUsersRes = await query('SELECT COUNT(*) FROM users');
    const activeUsersRes = await query("SELECT COUNT(*) FROM users WHERE status = 'ACTIVE'");
    const suspendedUsersRes = await query("SELECT COUNT(*) FROM users WHERE status = 'SUSPENDED'");

    // 2. Hosts stats
    const totalHostsRes = await query('SELECT COUNT(*) FROM hosts');
    const runningHostsRes = await query("SELECT COUNT(*) FROM hosts WHERE status = 'RUNNING'");
    const provHostsRes = await query("SELECT COUNT(*) FROM hosts WHERE status = 'PROVISIONING'");
    const stoppedHostsRes = await query("SELECT COUNT(*) FROM hosts WHERE status = 'STOPPED'");
    const errorHostsRes = await query("SELECT COUNT(*) FROM hosts WHERE status = 'ERROR'");

    // 3. Nodes stats
    const totalNodesRes = await query('SELECT COUNT(*) FROM hosting_nodes');
    const onlineNodesRes = await query("SELECT COUNT(*) FROM hosting_nodes WHERE status = 'ONLINE'");
    const maintNodesRes = await query(
      "SELECT COUNT(*) FROM hosting_nodes WHERE status IN ('MAINTENANCE', 'DRAINING')"
    );

    // 4. Revenue & Billing stats
    const revenueRes = await query("SELECT SUM(amount) FROM billing_invoices WHERE status = 'PAID'");
    const activeSubsRes = await query("SELECT COUNT(*) FROM user_subscriptions WHERE status = 'ACTIVE'");
    const pendingInvoicesRes = await query("SELECT COUNT(*) FROM billing_invoices WHERE status = 'OPEN'");

    // 5. Recent activities
    const recentActivityRes = await query(
      'SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 6'
    );

    return {
      authorizedRole: 'ADMIN',
      totalUsers: parseInt(totalUsersRes.rows[0]?.count || '0', 10),
      activeUsers: parseInt(activeUsersRes.rows[0]?.count || '0', 10),
      suspendedUsers: parseInt(suspendedUsersRes.rows[0]?.count || '0', 10),
      totalHosts: parseInt(totalHostsRes.rows[0]?.count || '0', 10),
      runningHosts: parseInt(runningHostsRes.rows[0]?.count || '0', 10),
      stoppedHosts: parseInt(stoppedHostsRes.rows[0]?.count || '0', 10),
      errorHosts: parseInt(errorHostsRes.rows[0]?.count || '0', 10),
      totalNodes: parseInt(totalNodesRes.rows[0]?.count || '0', 10),
      healthyNodes: parseInt(onlineNodesRes.rows[0]?.count || '0', 10),
      activeSubscriptions: parseInt(activeSubsRes.rows[0]?.count || '0', 10),
      totalRevenue: Number(revenueRes.rows[0]?.sum || 0),
      pendingInvoices: parseInt(pendingInvoicesRes.rows[0]?.count || '0', 10),
      users: {
        total: parseInt(totalUsersRes.rows[0]?.count || '0', 10),
        active: parseInt(activeUsersRes.rows[0]?.count || '0', 10),
        suspended: parseInt(suspendedUsersRes.rows[0]?.count || '0', 10),
      },
      hosts: {
        total: parseInt(totalHostsRes.rows[0]?.count || '0', 10),
        running: parseInt(runningHostsRes.rows[0]?.count || '0', 10),
        provisioning: parseInt(provHostsRes.rows[0]?.count || '0', 10),
        stopped: parseInt(stoppedHostsRes.rows[0]?.count || '0', 10),
        error: parseInt(errorHostsRes.rows[0]?.count || '0', 10),
      },
      nodes: {
        total: parseInt(totalNodesRes.rows[0]?.count || '0', 10),
        online: parseInt(onlineNodesRes.rows[0]?.count || '0', 10),
        maintenance: parseInt(maintNodesRes.rows[0]?.count || '0', 10),
      },
      billing: {
        totalRevenue: Number(revenueRes.rows[0]?.sum || 0),
        activeSubscriptions: parseInt(activeSubsRes.rows[0]?.count || '0', 10),
        pendingInvoices: parseInt(pendingInvoicesRes.rows[0]?.count || '0', 10),
      },
      recentActivities: recentActivityRes.rows.map((row) => ({
        id: row.id,
        actorId: row.actor_id,
        actorEmail: row.actor_email,
        action: row.action,
        targetType: row.target_type,
        targetId: row.target_id,
        details: typeof row.details === 'string' ? JSON.parse(row.details) : row.details,
        ipAddress: row.ip_address,
        createdAt: row.created_at,
      })),
    };
  }

  // ============================================================================
  // USER MANAGEMENT
  // ============================================================================

  public static async listUsers(qInput: UserListQuery) {
    const page = qInput.page || 1;
    const limit = qInput.limit || 20;
    const offset = (page - 1) * limit;

    const countRes = await query(
      'SELECT COUNT(*) FROM users',
      qInput.search
        ? [`%${qInput.search}%`]
        : qInput.status
        ? [qInput.status]
        : qInput.role
        ? [qInput.role]
        : []
    );
    const total = parseInt(countRes.rows[0]?.count || '0', 10);

    const usersRes = await query(
      `SELECT id, email, username, display_name, role, status, avatar_url, created_at, updated_at, last_login_at
       FROM users
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    let users = usersRes.rows;
    if (qInput.search) {
      const term = qInput.search.toLowerCase();
      users = users.filter(
        (u) =>
          u.email?.toLowerCase().includes(term) ||
          u.username?.toLowerCase().includes(term) ||
          u.display_name?.toLowerCase().includes(term)
      );
    }
    if (qInput.status) {
      users = users.filter((u) => u.status === qInput.status);
    }
    if (qInput.role) {
      users = users.filter((u) => u.role === qInput.role);
    }

    return {
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        username: u.username,
        displayName: u.display_name,
        role: u.role,
        status: u.status,
        avatarUrl: u.avatar_url,
        createdAt: u.created_at,
        updatedAt: u.updated_at,
        lastLoginAt: u.last_login_at,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  public static async getUserDetail(userId: string) {
    const userRes = await query('SELECT * FROM users WHERE id = $1 LIMIT 1', [userId]);
    if (!userRes.rows.length) {
      throw new NotFoundError('Không tìm thấy người dùng');
    }
    const u = userRes.rows[0];

    // Get user hosts
    const hostsRes = await query(
      `SELECT h.*, p.name as plan_name, n.name as node_name
       FROM hosts h
       LEFT JOIN hosting_plans p ON h.plan_id = p.id
       LEFT JOIN hosting_nodes n ON h.node_id = n.id
       WHERE h.user_id = $1
       ORDER BY h.created_at DESC`,
      [userId]
    );

    // Get active subscription
    const subRes = await query(
      `SELECT s.*, p.name as plan_name, p.slug as plan_slug
       FROM user_subscriptions s
       JOIN hosting_plans p ON s.plan_id = p.id
       WHERE s.user_id = $1 AND s.status = 'ACTIVE'
       LIMIT 1`,
      [userId]
    );

    // Get user invoices
    const invRes = await query(
      'SELECT * FROM billing_invoices WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10',
      [userId]
    );

    // Get user domains
    const domainsRes = await query(
      'SELECT d.*, h.name as host_name FROM host_domains d JOIN hosts h ON d.host_id = h.id WHERE h.user_id = $1',
      [userId]
    );

    return {
      user: {
        id: u.id,
        email: u.email,
        username: u.username,
        displayName: u.display_name,
        role: u.role,
        status: u.status,
        avatarUrl: u.avatar_url,
        createdAt: u.created_at,
        updatedAt: u.updated_at,
        lastLoginAt: u.last_login_at,
      },
      hosts: hostsRes.rows,
      subscription: subRes.rows[0] || null,
      invoices: invRes.rows,
      domains: domainsRes.rows,
    };
  }

  public static async updateUserStatus(
    userId: string,
    input: UpdateUserStatusInput,
    adminUser: { id: string; email: string },
    ip?: string
  ) {
    if (userId === adminUser.id && (input.status === 'SUSPENDED' || input.status === 'DISABLED')) {
      throw new BadRequestError('Quản trị viên không thể tự khóa tài khoản của chính mình');
    }

    const existingRes = await query('SELECT id, email, status FROM users WHERE id = $1 LIMIT 1', [
      userId,
    ]);
    if (!existingRes.rows.length) {
      throw new NotFoundError('Không tìm thấy người dùng');
    }
    const targetUser = existingRes.rows[0];

    const updatedRes = await query(
      'UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [input.status, userId]
    );

    await this.recordAuditLog({
      actorId: adminUser.id,
      actorEmail: adminUser.email,
      action: `ADMIN_USER_${input.status}`,
      targetType: 'USER',
      targetId: userId,
      details: {
        targetEmail: targetUser.email,
        previousStatus: targetUser.status,
        newStatus: input.status,
        reason: input.reason,
      },
      ipAddress: ip,
    });

    return updatedRes.rows[0];
  }

  public static async updateUserRole(
    userId: string,
    input: UpdateUserRoleInput,
    adminUser: { id: string; email: string },
    ip?: string
  ) {
    if (userId === adminUser.id && input.role !== 'ADMIN') {
      throw new BadRequestError('Quản trị viên không thể tự hạ quyền hạn của chính mình');
    }

    const existingRes = await query('SELECT id, email, role FROM users WHERE id = $1 LIMIT 1', [
      userId,
    ]);
    if (!existingRes.rows.length) {
      throw new NotFoundError('Không tìm thấy người dùng');
    }
    const targetUser = existingRes.rows[0];

    const updatedRes = await query(
      'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [input.role, userId]
    );

    await this.recordAuditLog({
      actorId: adminUser.id,
      actorEmail: adminUser.email,
      action: 'ADMIN_USER_ROLE_CHANGED',
      targetType: 'USER',
      targetId: userId,
      details: {
        targetEmail: targetUser.email,
        previousRole: targetUser.role,
        newRole: input.role,
      },
      ipAddress: ip,
    });

    return updatedRes.rows[0];
  }

  // ============================================================================
  // HOST MANAGEMENT
  // ============================================================================

  public static async listAllHosts(qInput: HostListQuery) {
    const page = qInput.page || 1;
    const limit = qInput.limit || 20;
    const offset = (page - 1) * limit;

    const allHosts = await HostsService.listUserHosts('admin-global', 'ADMIN');
    const usersRes = await query('SELECT id, email FROM users');
    const userEmailMap = new Map<string, string>();
    usersRes.rows.forEach((u) => userEmailMap.set(u.id, u.email));

    let filtered = allHosts.map((h) => ({
      ...h,
      userEmail: userEmailMap.get(h.userId) || 'N/A',
    }));

    if (qInput.search) {
      const term = qInput.search.toLowerCase();
      filtered = filtered.filter(
        (h) =>
          h.name.toLowerCase().includes(term) ||
          h.id.toLowerCase().includes(term) ||
          h.userEmail.toLowerCase().includes(term)
      );
    }
    if (qInput.status) {
      filtered = filtered.filter((h) => h.status === qInput.status);
    }
    if (qInput.runtime) {
      filtered = filtered.filter((h) => h.runtimeId === qInput.runtime);
    }
    if (qInput.node) {
      filtered = filtered.filter((h) => h.nodeId === qInput.node);
    }
    if (qInput.region) {
      filtered = filtered.filter((h) => h.region.toLowerCase().includes(qInput.region!.toLowerCase()));
    }

    const total = filtered.length;
    const paged = filtered.slice(offset, offset + limit);

    return {
      hosts: paged,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  public static async executeHostAction(
    hostId: string,
    action: 'start' | 'stop' | 'restart' | 'delete',
    adminUser: { id: string; email: string },
    ip?: string
  ) {
    if (action === 'delete') {
      const host = await HostsService.getHostById(hostId, adminUser.id, 'ADMIN');
      await HostsService.deleteHost(hostId, adminUser.id, 'ADMIN');

      await this.recordAuditLog({
        actorId: adminUser.id,
        actorEmail: adminUser.email,
        action: 'ADMIN_HOST_DELETED',
        targetType: 'HOST',
        targetId: hostId,
        details: { hostName: host.name, runtime: host.runtimeId },
        ipAddress: ip,
      });

      return { success: true, message: `Máy chủ ${host.name} đã được xóa thành công` };
    }

    const { host: updatedHost } = await HostsService.executeAction(hostId, adminUser.id, 'ADMIN', { action });

    await this.recordAuditLog({
      actorId: adminUser.id,
      actorEmail: adminUser.email,
      action: `ADMIN_HOST_${action.toUpperCase()}`,
      targetType: 'HOST',
      targetId: hostId,
      details: { hostName: updatedHost.name, newStatus: updatedHost.status },
      ipAddress: ip,
    });

    return { success: true, host: updatedHost };
  }

  // ============================================================================
  // NODE MANAGEMENT
  // ============================================================================

  public static async listAllNodes() {
    await NodesService.checkHeartbeatTimeouts();

    const nodesRes = await query<NodeRow>('SELECT * FROM hosting_nodes ORDER BY region ASC');

    const result = [];
    for (const node of nodesRes.rows) {
      const hostCountRes = await query(
        'SELECT COUNT(*) FROM hosts WHERE node_id = $1 AND status != \'DELETING\'',
        [node.id]
      );
      const hostCount = parseInt(hostCountRes.rows[0]?.count || '0', 10);
      result.push(formatNode(node, hostCount));
    }

    return result;
  }

  public static async getNodeDetails(nodeId: string) {
    return NodesService.getNodeDetails(nodeId);
  }

  public static async registerNode(
    input: RegisterNodeInput,
    adminUser: { id: string; email: string },
    ip?: string
  ) {
    return NodesService.registerNode(input, adminUser, ip);
  }

  public static async updateNodeStatus(
    nodeId: string,
    status: NodeStatus,
    adminUser: { id: string; email: string },
    ip?: string
  ) {
    return NodesService.updateNodeStatus(nodeId, status, adminUser, ip);
  }

  // ============================================================================
  // PLAN MANAGEMENT
  // ============================================================================

  public static async listAllPlans() {
    const plansRes = await query('SELECT * FROM hosting_plans ORDER BY price_monthly ASC');
    return plansRes.rows.map((p) => ({
      id: p.id,
      slug: p.slug || p.id,
      name: p.name,
      description: p.description,
      priceMonthly: Number(p.price_monthly),
      priceYearly: Number(p.price_yearly || Number(p.price_monthly) * 10),
      ramMb: p.ram_mb,
      cpuCores: Number(p.cpu_cores),
      diskMb: p.disk_mb,
      bandwidthMb: p.bandwidth_mb,
      domainLimit: p.domain_limit || (p.id === 'pro' ? 20 : p.id === 'developer' ? 5 : 1),
      backupLimit: p.backup_limit || (p.id === 'pro' ? 10 : p.id === 'developer' ? 5 : 3),
      isActive: p.is_active,
    }));
  }

  public static async createPlan(
    input: CreatePlanInput,
    adminUser: { id: string; email: string },
    ip?: string
  ) {
    const existing = await query('SELECT id FROM hosting_plans WHERE id = $1 LIMIT 1', [input.id]);
    if (existing.rows.length) {
      throw new BadRequestError(`Gói dịch vụ với ID "${input.id}" đã tồn tại`);
    }

    const priceYearly = input.priceYearly !== undefined ? input.priceYearly : input.priceMonthly * 10;
    const bw = input.bandwidthMb !== undefined ? input.bandwidthMb : input.diskMb * 10;

    await query(
      `INSERT INTO hosting_plans (id, name, description, price_monthly, ram_mb, cpu_cores, disk_mb, bandwidth_mb)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [input.id, input.name, input.description, input.priceMonthly, input.ramMb, input.cpuCores, input.diskMb, bw]
    );

    await this.recordAuditLog({
      actorId: adminUser.id,
      actorEmail: adminUser.email,
      action: 'ADMIN_PLAN_CREATED',
      targetType: 'PLAN',
      targetId: input.id,
      details: { name: input.name, priceMonthly: input.priceMonthly },
      ipAddress: ip,
    });

    return { ...input, priceYearly, bandwidthMb: bw, isActive: true };
  }

  public static async updatePlan(
    planId: string,
    input: UpdatePlanInput,
    adminUser: { id: string; email: string },
    ip?: string
  ) {
    const existingRes = await query('SELECT * FROM hosting_plans WHERE id = $1 LIMIT 1', [planId]);
    if (!existingRes.rows.length) {
      throw new NotFoundError('Không tìm thấy gói dịch vụ');
    }
    const plan = existingRes.rows[0];

    const updatedName = input.name ?? plan.name;
    const updatedDesc = input.description ?? plan.description;
    const updatedPrice = input.priceMonthly ?? plan.price_monthly;
    const updatedRam = input.ramMb ?? plan.ram_mb;
    const updatedCpu = input.cpuCores ?? plan.cpu_cores;
    const updatedDisk = input.diskMb ?? plan.disk_mb;

    await query(
      `UPDATE hosting_plans
       SET name = $1, description = $2, price_monthly = $3, ram_mb = $4, cpu_cores = $5, disk_mb = $6
       WHERE id = $7`,
      [updatedName, updatedDesc, updatedPrice, updatedRam, updatedCpu, updatedDisk, planId]
    );

    await this.recordAuditLog({
      actorId: adminUser.id,
      actorEmail: adminUser.email,
      action: 'ADMIN_PLAN_UPDATED',
      targetType: 'PLAN',
      targetId: planId,
      details: { previousName: plan.name, newName: updatedName, newPrice: updatedPrice },
      ipAddress: ip,
    });

    return {
      id: planId,
      name: updatedName,
      description: updatedDesc,
      priceMonthly: Number(updatedPrice),
      ramMb: updatedRam,
      cpuCores: Number(updatedCpu),
      diskMb: updatedDisk,
    };
  }

  public static async togglePlanStatus(
    planId: string,
    isActive: boolean,
    adminUser: { id: string; email: string },
    ip?: string
  ) {
    const existingRes = await query('SELECT * FROM hosting_plans WHERE id = $1 LIMIT 1', [planId]);
    if (!existingRes.rows.length) {
      throw new NotFoundError('Không tìm thấy gói dịch vụ');
    }

    await query('UPDATE hosting_plans SET is_active = $1 WHERE id = $2', [isActive, planId]);

    await this.recordAuditLog({
      actorId: adminUser.id,
      actorEmail: adminUser.email,
      action: isActive ? 'ADMIN_PLAN_ACTIVATED' : 'ADMIN_PLAN_DEACTIVATED',
      targetType: 'PLAN',
      targetId: planId,
      details: { planId, isActive },
      ipAddress: ip,
    });

    return { id: planId, isActive };
  }

  // ============================================================================
  // SUBSCRIPTION & INVOICE MANAGEMENT
  // ============================================================================

  public static async listAllSubscriptions() {
    const subsRes = await query(
      `SELECT s.*, u.email as user_email, u.username as user_name, p.name as plan_name
       FROM user_subscriptions s
       LEFT JOIN users u ON s.user_id = u.id
       LEFT JOIN hosting_plans p ON s.plan_id = p.id
       ORDER BY s.created_at DESC`
    );

    return subsRes.rows.map((s) => ({
      id: s.id,
      userId: s.user_id,
      userEmail: s.user_email,
      userName: s.user_name,
      planId: s.plan_id,
      planName: s.plan_name,
      status: s.status,
      billingInterval: s.billing_interval || 'MONTHLY',
      price: Number(s.price),
      currency: s.currency || 'VND',
      currentPeriodStart: s.current_period_start,
      currentPeriodEnd: s.current_period_end,
      cancelAtPeriodEnd: s.cancel_at_period_end,
      createdAt: s.created_at,
    }));
  }

  public static async listAllInvoices() {
    const invRes = await query(
      `SELECT i.*, u.email as user_email, u.username as user_name
       FROM billing_invoices i
       LEFT JOIN users u ON i.user_id = u.id
       ORDER BY i.created_at DESC`
    );

    return invRes.rows.map((inv) => ({
      id: inv.id,
      userId: inv.user_id,
      userEmail: inv.user_email,
      userName: inv.user_name,
      subscriptionId: inv.subscription_id,
      invoiceNumber: inv.invoice_number,
      amount: Number(inv.amount),
      currency: inv.currency || 'VND',
      status: inv.status,
      description: inv.description,
      invoiceDate: inv.invoice_date,
      dueDate: inv.due_date,
      paidAt: inv.paid_at,
      createdAt: inv.created_at,
    }));
  }

  // ============================================================================
  // DOMAIN & BACKUP MANAGEMENT
  // ============================================================================

  public static async listAllDomains() {
    const domRes = await query(
      `SELECT d.*, h.name as host_name, u.email as owner_email, u.id as owner_id
       FROM host_domains d
       JOIN hosts h ON d.host_id = h.id
       JOIN users u ON h.user_id = u.id
       ORDER BY d.created_at DESC`
    );

    return domRes.rows.map((d) => ({
      id: d.id,
      hostId: d.host_id,
      hostName: d.host_name,
      ownerId: d.owner_id,
      ownerEmail: d.owner_email,
      domain: d.domain,
      status: d.status,
      sslStatus: d.ssl_status,
      verificationRecord: d.verification_record,
      createdAt: d.created_at,
    }));
  }

  public static async deleteDomain(
    domainId: string,
    adminUser: { id: string; email: string },
    ip?: string
  ) {
    const domRes = await query('SELECT * FROM host_domains WHERE id = $1 LIMIT 1', [domainId]);
    if (!domRes.rows.length) {
      throw new NotFoundError('Không tìm thấy tên miền');
    }
    const domain = domRes.rows[0];

    await query('DELETE FROM host_domains WHERE id = $1', [domainId]);

    await this.recordAuditLog({
      actorId: adminUser.id,
      actorEmail: adminUser.email,
      action: 'ADMIN_DOMAIN_DELETED',
      targetType: 'DOMAIN',
      targetId: domainId,
      details: { domain: domain.domain, hostId: domain.host_id },
      ipAddress: ip,
    });

    return { success: true, message: `Tên miền ${domain.domain} đã được xóa thành công` };
  }

  public static async listAllBackups() {
    const bkRes = await query(
      `SELECT b.*, h.name as host_name, u.email as owner_email
       FROM host_backups b
       JOIN hosts h ON b.host_id = h.id
       JOIN users u ON h.user_id = u.id
       ORDER BY b.created_at DESC`
    );

    return bkRes.rows.map((b) => ({
      id: b.id,
      hostId: b.host_id,
      hostName: b.host_name,
      ownerEmail: b.owner_email,
      name: b.name,
      status: b.status,
      sizeBytes: Number(b.size_bytes || 0),
      fileCount: b.file_count || 0,
      createdAt: b.created_at,
    }));
  }

  // ============================================================================
  // AUDIT LOGS & SYSTEM SETTINGS
  // ============================================================================

  public static async listActivityLogs(qInput: ActivityQuery) {
    const page = qInput.page || 1;
    const limit = qInput.limit || 20;
    const offset = (page - 1) * limit;

    const countRes = await query(
      'SELECT COUNT(*) FROM audit_logs',
      qInput.search
        ? [`%${qInput.search}%`]
        : qInput.action
        ? [qInput.action]
        : qInput.targetType
        ? [qInput.targetType]
        : []
    );
    const total = parseInt(countRes.rows[0]?.count || '0', 10);

    const logsRes = await query(
      `SELECT * FROM audit_logs
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    let logs = logsRes.rows;
    if (qInput.search) {
      const term = qInput.search.toLowerCase();
      logs = logs.filter(
        (l) =>
          l.action.toLowerCase().includes(term) ||
          l.actor_email.toLowerCase().includes(term) ||
          l.target_type.toLowerCase().includes(term)
      );
    }
    if (qInput.action) {
      logs = logs.filter((l) => l.action === qInput.action);
    }
    if (qInput.targetType) {
      logs = logs.filter((l) => l.target_type === qInput.targetType);
    }

    return {
      activities: logs.map((l) => ({
        id: l.id,
        actorId: l.actor_id,
        actorEmail: l.actor_email,
        action: l.action,
        targetType: l.target_type,
        targetId: l.target_id,
        details: typeof l.details === 'string' ? JSON.parse(l.details) : l.details,
        ipAddress: l.ip_address,
        createdAt: l.created_at,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  public static async getSystemSettings() {
    const settingsRes = await query('SELECT key, value, description FROM system_settings');
    const settingsMap: Record<string, string> = {};
    settingsRes.rows.forEach((s) => {
      settingsMap[s.key] = s.value;
    });

    return {
      platformName: settingsMap.platform_name || 'Aston Cloud Platform',
      supportEmail: settingsMap.support_email || 'support@astoncloud.vn',
      defaultRegion: settingsMap.default_region || 'Singapore',
      maintenanceMode: settingsMap.maintenance_mode === 'true',
      allowedRuntimes: settingsMap.allowed_runtimes
        ? JSON.parse(settingsMap.allowed_runtimes)
        : ['nodejs', 'bun', 'python'],
      maxFreeHostsPerUser: parseInt(settingsMap.max_free_hosts_per_user || '1', 10),
    };
  }

  public static async updateSystemSettings(
    input: UpdateSettingsInput,
    adminUser: { id: string; email: string },
    ip?: string
  ) {
    if (input.platformName !== undefined) {
      await query('UPDATE system_settings SET value = $1 WHERE key = $2', [
        input.platformName,
        'platform_name',
      ]);
    }
    if (input.supportEmail !== undefined) {
      await query('UPDATE system_settings SET value = $1 WHERE key = $2', [
        input.supportEmail,
        'support_email',
      ]);
    }
    if (input.defaultRegion !== undefined) {
      await query('UPDATE system_settings SET value = $1 WHERE key = $2', [
        input.defaultRegion,
        'default_region',
      ]);
    }
    if (input.maintenanceMode !== undefined) {
      await query('UPDATE system_settings SET value = $1 WHERE key = $2', [
        String(input.maintenanceMode),
        'maintenance_mode',
      ]);
    }
    if (input.allowedRuntimes !== undefined) {
      await query('UPDATE system_settings SET value = $1 WHERE key = $2', [
        JSON.stringify(input.allowedRuntimes),
        'allowed_runtimes',
      ]);
    }
    if (input.maxFreeHostsPerUser !== undefined) {
      await query('UPDATE system_settings SET value = $1 WHERE key = $2', [
        String(input.maxFreeHostsPerUser),
        'max_free_hosts_per_user',
      ]);
    }

    await this.recordAuditLog({
      actorId: adminUser.id,
      actorEmail: adminUser.email,
      action: 'ADMIN_SETTINGS_UPDATED',
      targetType: 'SYSTEM',
      targetId: 'settings',
      details: input,
      ipAddress: ip,
    });

    return this.getSystemSettings();
  }
}
