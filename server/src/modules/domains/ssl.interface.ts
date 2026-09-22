/**
 * SSL Management Abstraction Interface
 * Prepares architecture for automated Let's Encrypt / ACME / Reverse Proxy SSL
 */

export type SslStatus = 'NOT_REQUESTED' | 'PENDING' | 'ACTIVE' | 'ERROR' | 'EXPIRED';

export interface CertificateResult {
  success: boolean;
  status: SslStatus;
  message: string;
  isMock: boolean;
  issuer?: string;
  expiresAt?: Date | null;
}

export interface CertificateStatus {
  status: SslStatus;
  isMock: boolean;
  issuer?: string;
  issuedAt?: Date | null;
  expiresAt?: Date | null;
  autoRenew: boolean;
}

export interface ISslService {
  /**
   * Requests SSL certificate provisioning for a verified domain
   */
  requestCertificate(hostname: string): Promise<CertificateResult>;

  /**
   * Checks current certificate status
   */
  getCertificateStatus(hostname: string): Promise<CertificateStatus>;

  /**
   * Renews existing certificate
   */
  renewCertificate(hostname: string): Promise<CertificateResult>;

  /**
   * Revokes or deletes certificate configuration
   */
  removeCertificate(hostname: string): Promise<void>;
}
