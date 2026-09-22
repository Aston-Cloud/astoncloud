import {
  IDomainVerificationService,
  VerificationResult,
  DnsInstructionRecord,
} from './domain-verification.interface.js';
import { logger } from '../../utils/logger.js';

/**
 * MockDomainVerificationService
 * Provides deterministic, simulated DNS verification for local development & automated testing.
 * Does not require a real VPS or public DNS registry.
 */
export class MockDomainVerificationService implements IDomainVerificationService {
  public getVerificationInstructions(
    hostname: string,
    token: string,
    method: 'DNS_TXT' | 'DNS_CNAME' = 'DNS_TXT'
  ): DnsInstructionRecord[] {
    const records: DnsInstructionRecord[] = [
      {
        type: 'TXT',
        name: `_aston-verify.${hostname}`,
        value: token,
        instruction: `Tạo bản ghi TXT với tên host "_aston-verify.${hostname}" và giá trị "${token}" tại nhà quản lý DNS.`,
      },
      {
        type: 'CNAME',
        name: hostname,
        value: 'cname.astoncloud.vn',
        instruction: `Trỏ bản ghi CNAME của "${hostname}" về "cname.astoncloud.vn" để định tuyến lưu lượng vào mạng biên.`,
      },
    ];

    return records;
  }

  public async verifyDomain(
    hostname: string,
    token: string,
    _method: 'DNS_TXT' | 'DNS_CNAME' = 'DNS_TXT'
  ): Promise<VerificationResult> {
    logger.info(
      { hostname, token, isMock: true },
      '[MockDomainVerification] Executing simulated DNS verification'
    );

    const normalized = hostname.toLowerCase();

    // Deterministic simulation:
    // Domains containing 'fail' or 'unverified' will simulate DNS lookup failure
    if (normalized.includes('fail') || normalized.includes('unverified')) {
      return {
        verified: false,
        message: `Mô phỏng: Không tìm thấy bản ghi DNS TXT "_aston-verify.${hostname}" với giá trị "${token}". Vui lòng kiểm tra lại cấu hình DNS.`,
        isMock: true,
        recordsFound: [],
      };
    }

    // Default simulation succeeds
    return {
      verified: true,
      message: `Mô phỏng: Xác thực bản ghi DNS TXT cho "${hostname}" thành công (Môi trường phát triển cục bộ).`,
      isMock: true,
      recordsFound: [token],
    };
  }
}
