import { z } from 'zod';

/**
 * Normalizes a domain name: trim, lowercase, remove trailing dot
 */
export function normalizeDomain(raw: string): string {
  let d = raw.trim().toLowerCase();
  if (d.endsWith('.')) {
    d = d.slice(0, -1);
  }
  return d;
}

/**
 * Validates domain string against RFC 1035 / RFC 1123 rules and security policies
 */
export function validateDomainString(domain: string): { valid: boolean; reason?: string } {
  const d = normalizeDomain(domain);

  if (!d) {
    return { valid: false, reason: 'Tên miền không được để trống' };
  }

  // Reject schemes/URLs
  if (d.includes('://') || d.startsWith('//')) {
    return { valid: false, reason: 'Tên miền không được chứa tiền tố giao thức (http:// hoặc https://)' };
  }

  // Reject paths
  if (d.includes('/') || d.includes('\\')) {
    return { valid: false, reason: 'Tên miền không được chứa đường dẫn URL' };
  }

  // Reject ports
  if (d.includes(':')) {
    return { valid: false, reason: 'Tên miền không được chứa cổng kết nối (port)' };
  }

  // Reject whitespace
  if (/\s/.test(d)) {
    return { valid: false, reason: 'Tên miền không được chứa khoảng trắng' };
  }

  // Reject localhost
  if (d === 'localhost' || d.endsWith('.localhost')) {
    return { valid: false, reason: 'Không thể sử dụng localhost làm tên miền' };
  }

  // Reject IPv4 addresses (loopback, private, public)
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(d)) {
    return { valid: false, reason: 'Địa chỉ IP không thể được sử dụng làm tên miền tùy chỉnh' };
  }

  // Reject IPv6 / bracketed IPs
  if (d.includes('[') || d.includes(']') || d.includes('%')) {
    return { valid: false, reason: 'Định dạng tên miền không hợp lệ' };
  }

  // Total length must be between 3 and 253 characters
  if (d.length < 3 || d.length > 253) {
    return { valid: false, reason: 'Độ dài tên miền phải từ 3 đến 253 ký tự' };
  }

  // RFC 1035 / RFC 1123 domain regex:
  // Must contain at least one dot (e.g. example.com, app.test)
  // Each label between dots must be 1-63 chars, start/end with alphanumeric, hyphens allowed in middle
  // TLD must be at least 2 chars
  const domainRegex = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))*\.[a-z0-9-]{2,}$/i;
  if (!domainRegex.test(d)) {
    return { valid: false, reason: 'Định dạng tên miền không hợp lệ (Ví dụ: mydomain.com, api.mydomain.com)' };
  }

  return { valid: true };
}

export const createDomainSchema = z.object({
  domain: z
    .string()
    .min(3, 'Tên miền phải có ít nhất 3 ký tự')
    .max(253, 'Tên miền không vượt quá 253 ký tự')
    .transform(normalizeDomain)
    .superRefine((val, ctx) => {
      const check = validateDomainString(val);
      if (!check.valid) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: check.reason || 'Định dạng tên miền không hợp lệ',
        });
      }
    }),
  targetPort: z
    .number()
    .int('Cổng phải là số nguyên')
    .min(1, 'Cổng tối thiểu là 1')
    .max(65535, 'Cổng tối đa là 65535')
    .optional()
    .default(80),
});

export const updateDomainSchema = z.object({
  targetPort: z
    .number()
    .int('Cổng phải là số nguyên')
    .min(1, 'Cổng tối thiểu là 1')
    .max(65535, 'Cổng tối đa là 65535')
    .optional(),
});

export const domainParamsSchema = z.object({
  id: z.string().min(1, 'ID máy chủ không được để trống'),
  domainId: z.string().min(1, 'ID tên miền không được để trống'),
});

export type CreateDomainInput = z.infer<typeof createDomainSchema>;
export type UpdateDomainInput = z.infer<typeof updateDomainSchema>;
