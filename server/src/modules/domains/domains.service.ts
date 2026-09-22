import crypto from 'node:crypto';
import { query } from '../../db/index.js';
import { HostsService } from '../hosts/hosts.service.js';
import { NodesService } from '../nodes/nodes.service.js';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
} from '../../utils/errors.js';
import {
  IDomainVerificationService,
  DnsInstructionRecord,
} from './domain-verification.interface.js';
import { MockDomainVerificationService } from './mock-domain-verification.service.js';
import { DnsDomainVerificationService } from './dns-domain-verification.service.js';
import { IDomainRoutingService } from './domain-routing.interface.js';
import { MockDomainRoutingService } from './mock-domain-routing.service.js';
import { ISslService, SslStatus } from './ssl.interface.js';
import { MockSslService } from './mock-ssl.service.js';
import { CreateDomainInput, UpdateDomainInput } from './domains.schema.js';

export interface HostDomainRow {
  id: string;
  host_id: string;
  user_id: string | null;
  domain: string;
  status: 'PENDING' | 'VERIFYING' | 'ACTIVE' | 'ERROR' | 'REMOVING';
  ssl_status: SslStatus;
  verification_method: 'DNS_TXT' | 'DNS_CNAME';
  verification_token: string;
  target_port: number;
  error_message: string | null;
  verified_at: string | Date | null;
  created_at: string | Date;
  updated_at: string | Date;
}

export interface FormattedHostDomain {
  id: string;
  hostId: string;
  userId?: string | null;
  domain: string;
  status: 'PENDING' | 'VERIFYING' | 'ACTIVE' | 'ERROR' | 'REMOVING';
  sslStatus: SslStatus;
  verificationMethod: 'DNS_TXT' | 'DNS_CNAME';
  verificationToken: string;
  targetPort: number;
  errorMessage: string | null;
  verifiedAt: string | null;
  dnsRecords: DnsInstructionRecord[];
  isMock: boolean;
  createdAt: string;
  updatedAt: string;
}

export class DomainsService {
  private static verificationService: IDomainVerificationService =
    env.DOMAIN_VERIFICATION_MODE === 'dns'
      ? new DnsDomainVerificationService()
      : new MockDomainVerificationService();

  private static routingService: IDomainRoutingService = new MockDomainRoutingService();
  private static sslService: ISslService = new MockSslService();

  /**
   * Helper to format database domain row for API responses
   */
  private static formatDomain(row: HostDomainRow): FormattedHostDomain {
    const dnsRecords = this.verificationService.getVerificationInstructions(
      row.domain,
      row.verification_token,
      row.verification_method
    );

    return {
      id: row.id,
      hostId: row.host_id,
      userId: row.user_id,
      domain: row.domain,
      status: row.status,
      sslStatus: row.ssl_status,
      verificationMethod: row.verification_method,
      verificationToken: row.verification_token,
      targetPort: row.target_port,
      errorMessage: row.error_message,
      verifiedAt: row.verified_at
        ? row.verified_at instanceof Date
          ? row.verified_at.toISOString()
          : String(row.verified_at)
        : null,
      dnsRecords,
      isMock: true,
      createdAt:
        row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
      updatedAt:
        row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
    };
  }

  /**
   * List all domains attached to a specific host
   */
  public static async listHostDomains(
    hostId: string,
    userId: string,
    role: string
  ): Promise<FormattedHostDomain[]> {
    // 1. Ownership & IDOR check
    await HostsService.getHostById(hostId, userId, role);

    // 2. Query host domains
    const { rows } = await query<HostDomainRow>(
      `SELECT * FROM host_domains WHERE host_id = $1 ORDER BY created_at DESC`,
      [hostId]
    );

    return rows.map((r) => this.formatDomain(r));
  }

  /**
   * Add a new custom domain to a host
   */
  public static async addHostDomain(
    hostId: string,
    input: CreateDomainInput,
    userId: string,
    role: string
  ): Promise<FormattedHostDomain> {
    // 1. Ownership & IDOR check
    const host = await HostsService.getHostById(hostId, userId, role);

    const normalizedDomain = input.domain.toLowerCase().trim();
    const targetPort = input.targetPort || host.port || 80;

    // 2. Enforce platform/plan domain limits
    const { rows: countRows } = await query<{ count: string | number }>(
      `SELECT COUNT(*) as count FROM host_domains WHERE host_id = $1`,
      [hostId]
    );
    const currentCount = parseInt(String(countRows[0]?.count || '0'), 10);
    const maxDomains = env.MAX_DOMAINS_PER_HOST;

    if (currentCount >= maxDomains) {
      throw new BadRequestError(
        `Máy chủ đã đạt giới hạn tối đa ${maxDomains} tên miền tùy chỉnh. Vui lòng nâng cấp gói hoặc xóa bớt tên miền không sử dụng.`
      );
    }

    // 3. Check duplicate domain across the entire platform
    const { rows: existingRows } = await query<HostDomainRow>(
      `SELECT * FROM host_domains WHERE domain = $1 LIMIT 1`,
      [normalizedDomain]
    );

    if (existingRows.length > 0) {
      throw new ConflictError(
        `Tên miền "${normalizedDomain}" đã được liên kết với một máy chủ khác trên hệ thống.`
      );
    }

    // 4. Securely generate verification token
    const token = `aston-verify-${crypto.randomBytes(16).toString('hex')}`;

    // 5. Insert domain record
    const { rows: newRows } = await query<HostDomainRow>(
      `INSERT INTO host_domains (
        host_id, user_id, domain, status, ssl_status, verification_method, verification_token, target_port
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [hostId, userId, normalizedDomain, 'PENDING', 'NOT_REQUESTED', 'DNS_TXT', token, targetPort]
    );

    const created = newRows[0];

    logger.info(
      { hostId, userId, domain: normalizedDomain, token },
      '[DomainsService] Added custom domain to host'
    );

    return this.formatDomain(created);
  }

  /**
   * Get detail for a specific domain
   */
  public static async getHostDomain(
    hostId: string,
    domainId: string,
    userId: string,
    role: string
  ): Promise<FormattedHostDomain> {
    // 1. Ownership & IDOR check
    await HostsService.getHostById(hostId, userId, role);

    const { rows } = await query<HostDomainRow>(
      `SELECT * FROM host_domains WHERE id = $1 AND host_id = $2 LIMIT 1`,
      [domainId, hostId]
    );

    const domain = rows[0];
    if (!domain) {
      throw new NotFoundError('Không tìm thấy tên miền được yêu cầu');
    }

    return this.formatDomain(domain);
  }

  /**
   * Trigger domain DNS ownership verification
   */
  public static async verifyHostDomain(
    hostId: string,
    domainId: string,
    userId: string,
    role: string
  ): Promise<{ domain: FormattedHostDomain; verification: { verified: boolean; message: string } }> {
    // 1. Ownership & IDOR check
    const host = await HostsService.getHostById(hostId, userId, role);

    const { rows } = await query<HostDomainRow>(
      `SELECT * FROM host_domains WHERE id = $1 AND host_id = $2 LIMIT 1`,
      [domainId, hostId]
    );

    const domain = rows[0];
    if (!domain) {
      throw new NotFoundError('Không tìm thấy tên miền để xác thực');
    }

    // 2. Perform verification via abstraction
    const result = await this.verificationService.verifyDomain(
      domain.domain,
      domain.verification_token,
      domain.verification_method
    );

    let updatedRow: HostDomainRow;

    if (result.verified) {
      const { rows: updatedRows } = await query<HostDomainRow>(
        `UPDATE host_domains
         SET status = $1, verified_at = $2, error_message = $3, updated_at = NOW()
         WHERE id = $4 AND host_id = $5
         RETURNING *`,
        ['ACTIVE', new Date().toISOString(), null, domainId, hostId]
      );
      updatedRow = updatedRows[0];

      // 3. Configure routing rule in reverse proxy layer
      let targetIp = '127.0.0.1';
      if (host.nodeId) {
        try {
          const node = await NodesService.getNodeById(host.nodeId);
          if (node?.ip_address) {
            targetIp = node.ip_address;
          }
        } catch {
          // fallback to default
        }
      }

      await this.routingService.addDomainRoute(
        domain.domain,
        targetIp,
        domain.target_port
      );

      logger.info(
        { hostId, domain: domain.domain },
        '[DomainsService] Domain verified and routed successfully'
      );
    } else {
      const { rows: updatedRows } = await query<HostDomainRow>(
        `UPDATE host_domains
         SET status = $1, error_message = $2, updated_at = NOW()
         WHERE id = $3 AND host_id = $4
         RETURNING *`,
        ['ERROR', result.message, domainId, hostId]
      );
      updatedRow = updatedRows[0];

      logger.warn(
        { hostId, domain: domain.domain, message: result.message },
        '[DomainsService] Domain verification failed'
      );
    }

    return {
      domain: this.formatDomain(updatedRow),
      verification: {
        verified: result.verified,
        message: result.message,
      },
    };
  }

  /**
   * Request / Enable SSL certificate for a verified domain
   */
  public static async requestHostDomainSsl(
    hostId: string,
    domainId: string,
    userId: string,
    role: string
  ): Promise<{ domain: FormattedHostDomain; sslResult: any }> {
    // 1. Ownership & IDOR check
    await HostsService.getHostById(hostId, userId, role);

    const { rows } = await query<HostDomainRow>(
      `SELECT * FROM host_domains WHERE id = $1 AND host_id = $2 LIMIT 1`,
      [domainId, hostId]
    );

    const domain = rows[0];
    if (!domain) {
      throw new NotFoundError('Không tìm thấy tên miền để kích hoạt SSL');
    }

    // Must be verified before SSL can be issued
    if (domain.status !== 'ACTIVE') {
      throw new BadRequestError(
        'Tên miền phải được xác thực quyền sở hữu (ACTIVE) trước khi kích hoạt chứng chỉ SSL.'
      );
    }

    // Call SSL abstraction service
    const sslResult = await this.sslService.requestCertificate(domain.domain);

    const newSslStatus: SslStatus = sslResult.success ? 'ACTIVE' : 'ERROR';

    const { rows: updatedRows } = await query<HostDomainRow>(
      `UPDATE host_domains
       SET ssl_status = $1, updated_at = NOW()
       WHERE id = $2 AND host_id = $3
       RETURNING *`,
      [newSslStatus, domainId, hostId]
    );

    logger.info(
      { hostId, domain: domain.domain, sslStatus: newSslStatus },
      '[DomainsService] SSL certificate request processed'
    );

    return {
      domain: this.formatDomain(updatedRows[0]),
      sslResult,
    };
  }

  /**
   * Disable SSL certificate for a domain
   */
  public static async disableHostDomainSsl(
    hostId: string,
    domainId: string,
    userId: string,
    role: string
  ): Promise<{ domain: FormattedHostDomain; message: string }> {
    // 1. Ownership & IDOR check
    await HostsService.getHostById(hostId, userId, role);

    const { rows } = await query<HostDomainRow>(
      `SELECT * FROM host_domains WHERE id = $1 AND host_id = $2 LIMIT 1`,
      [domainId, hostId]
    );

    const domain = rows[0];
    if (!domain) {
      throw new NotFoundError('Không tìm thấy tên miền để hủy SSL');
    }

    await this.sslService.removeCertificate(domain.domain);

    const { rows: updatedRows } = await query<HostDomainRow>(
      `UPDATE host_domains
       SET ssl_status = $1, updated_at = NOW()
       WHERE id = $2 AND host_id = $3
       RETURNING *`,
      ['NOT_REQUESTED', domainId, hostId]
    );

    return {
      domain: this.formatDomain(updatedRows[0]),
      message: `Đã hủy chứng chỉ SSL cho tên miền "${domain.domain}".`,
    };
  }

  /**
   * Delete a custom domain from host
   */
  public static async deleteHostDomain(
    hostId: string,
    domainId: string,
    userId: string,
    role: string
  ): Promise<{ success: boolean; message: string }> {
    // 1. Ownership & IDOR check
    await HostsService.getHostById(hostId, userId, role);

    const { rows } = await query<HostDomainRow>(
      `SELECT * FROM host_domains WHERE id = $1 AND host_id = $2 LIMIT 1`,
      [domainId, hostId]
    );

    const domain = rows[0];
    if (!domain) {
      throw new NotFoundError('Không tìm thấy tên miền để xóa');
    }

    // 2. Clean up reverse proxy route
    await this.routingService.removeDomainRoute(domain.domain);

    // 3. Clean up SSL certificate
    await this.sslService.removeCertificate(domain.domain);

    // 4. Delete from database
    await query(`DELETE FROM host_domains WHERE id = $1 AND host_id = $2`, [domainId, hostId]);

    logger.info(
      { hostId, userId, domain: domain.domain },
      '[DomainsService] Deleted custom domain'
    );

    return {
      success: true,
      message: `Tên miền "${domain.domain}" đã được xóa thành công.`,
    };
  }

  /**
   * List all domains owned by a user across all their hosts
   */
  public static async listUserAllDomains(
    userId: string,
    _role: string
  ): Promise<FormattedHostDomain[]> {
    const { rows } = await query<HostDomainRow>(
      `SELECT * FROM host_domains WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );

    return rows.map((r) => this.formatDomain(r));
  }

  /**
   * Testing hook to get routing service
   */
  public static getRoutingService(): IDomainRoutingService {
    return this.routingService;
  }

  /**
   * Testing hook to get SSL service
   */
  public static getSslService(): ISslService {
    return this.sslService;
  }
}
