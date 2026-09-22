/**
 * Domain Verification Abstraction Interface
 */

export interface VerificationResult {
  verified: boolean;
  message: string;
  isMock?: boolean;
  recordsFound?: string[];
}

export interface DnsInstructionRecord {
  type: 'TXT' | 'CNAME';
  name: string;
  value: string;
  instruction: string;
}

export interface IDomainVerificationService {
  /**
   * Generates DNS verification instructions for a domain
   */
  getVerificationInstructions(
    hostname: string,
    token: string,
    method?: 'DNS_TXT' | 'DNS_CNAME'
  ): DnsInstructionRecord[];

  /**
   * Verifies domain ownership via DNS (simulated or real)
   */
  verifyDomain(
    hostname: string,
    token: string,
    method?: 'DNS_TXT' | 'DNS_CNAME'
  ): Promise<VerificationResult>;
}
