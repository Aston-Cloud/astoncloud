import dns from 'node:dns/promises';
import {
  IDomainVerificationService,
  VerificationResult,
  DnsInstructionRecord,
} from './domain-verification.interface.js';
import { logger } from '../../utils/logger.js';

/**
 * DnsDomainVerificationService
 * Real DNS resolver for production environments using node:dns/promises.
 */
export class DnsDomainVerificationService implements IDomainVerificationService {
  public getVerificationInstructions(
    hostname: string,
    token: string,
    _method: 'DNS_TXT' | 'DNS_CNAME' = 'DNS_TXT'
  ): DnsInstructionRecord[] {
    return [
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
  }

  public async verifyDomain(
    hostname: string,
    token: string,
    _method: 'DNS_TXT' | 'DNS_CNAME' = 'DNS_TXT'
  ): Promise<VerificationResult> {
    const recordName = `_aston-verify.${hostname}`;
    logger.info({ recordName, token }, '[DnsDomainVerification] Querying real DNS TXT records');

    try {
      const records = await dns.resolveTxt(recordName);
      // Flatten chunks in TXT records
      const flatRecords = records.map((chunks) => chunks.join(''));
      const matches = flatRecords.some((r) => r.trim() === token.trim());

      if (matches) {
        return {
          verified: true,
          message: `Xác thực bản ghi DNS TXT cho "${hostname}" thành công qua hệ thống phân giải tên miền.`,
          isMock: false,
          recordsFound: flatRecords,
        };
      }

      return {
        verified: false,
        message: `Bản ghi TXT cho "${recordName}" đã được tìm thấy nhưng không khớp với mã xác thực yêu cầu.`,
        isMock: false,
        recordsFound: flatRecords,
      };
    } catch (err: any) {
      logger.warn({ recordName, err: err.message }, '[DnsDomainVerification] DNS lookup error');
      return {
        verified: false,
        message: `Chưa tìm thấy bản ghi DNS TXT cho "${recordName}". Bản ghi DNS có thể cần thời gian lan truyền (tối đa 15-30 phút).`,
        isMock: false,
        recordsFound: [],
      };
    }
  }
}
