import { ISslService, CertificateResult, CertificateStatus, SslStatus } from './ssl.interface.js';
import { logger } from '../../utils/logger.js';

/**
 * MockSslService
 * Simulates automated SSL certificate lifecycle for local development and testing.
 * Does not issue real certificates or store private keys.
 */
export class MockSslService implements ISslService {
  private certificates: Map<
    string,
    {
      status: SslStatus;
      issuer: string;
      issuedAt: Date;
      expiresAt: Date;
    }
  > = new Map();

  public async requestCertificate(hostname: string): Promise<CertificateResult> {
    const normalized = hostname.toLowerCase();
    logger.info({ hostname: normalized, isMock: true }, '[MockSslService] Requesting simulated certificate');

    // Deterministic simulation:
    // Hostnames containing 'ssl-fail' or 'cert-error' will simulate ACME challenge failure
    if (normalized.includes('ssl-fail') || normalized.includes('cert-error')) {
      this.certificates.set(normalized, {
        status: 'ERROR',
        issuer: 'Aston Cloud Simulated CA',
        issuedAt: new Date(),
        expiresAt: new Date(),
      });

      return {
        success: false,
        status: 'ERROR',
        message: 'Mô phỏng: Cấp phát chứng chỉ SSL thất bại (Lỗi thử thách ACME HTTP-01/DNS-01).',
        isMock: true,
      };
    }

    const now = new Date();
    const expires = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days validity

    this.certificates.set(normalized, {
      status: 'ACTIVE',
      issuer: "Aston Cloud Simulated Let's Encrypt Wildcard CA",
      issuedAt: now,
      expiresAt: expires,
    });

    return {
      success: true,
      status: 'ACTIVE',
      message: 'Mô phỏng: Chứng chỉ SSL đã được cấp phát thành công (HTTPS sẵn sàng).',
      isMock: true,
      issuer: "Aston Cloud Simulated Let's Encrypt Wildcard CA",
      expiresAt: expires,
    };
  }

  public async getCertificateStatus(hostname: string): Promise<CertificateStatus> {
    const normalized = hostname.toLowerCase();
    const cert = this.certificates.get(normalized);

    if (!cert) {
      return {
        status: 'NOT_REQUESTED',
        isMock: true,
        autoRenew: false,
      };
    }

    return {
      status: cert.status,
      isMock: true,
      issuer: cert.issuer,
      issuedAt: cert.issuedAt,
      expiresAt: cert.expiresAt,
      autoRenew: true,
    };
  }

  public async renewCertificate(hostname: string): Promise<CertificateResult> {
    return this.requestCertificate(hostname);
  }

  public async removeCertificate(hostname: string): Promise<void> {
    const normalized = hostname.toLowerCase();
    this.certificates.delete(normalized);
    logger.info({ hostname: normalized, isMock: true }, '[MockSslService] Removed simulated certificate');
  }

  /**
   * Helper for tests
   */
  public clear(): void {
    this.certificates.clear();
  }
}
