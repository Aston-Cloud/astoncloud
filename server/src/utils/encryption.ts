import crypto from 'node:crypto';
import { env } from '../config/env.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 12 bytes standard for GCM
const AUTH_TAG_LENGTH = 16; // 16 bytes auth tag

/**
 * Derives a deterministic 32-byte key from the configured ENV_ENCRYPTION_KEY.
 */
function getDerivedKey(): Buffer {
  return crypto.createHash('sha256').update(env.ENV_ENCRYPTION_KEY).digest();
}

/**
 * Encrypts a plaintext environment variable value using AES-256-GCM.
 * Output format: `<iv_hex>:<auth_tag_hex>:<ciphertext_hex>`
 */
export function encryptEnvValue(plaintext: string): string {
  const key = getDerivedKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');
  const ivHex = iv.toString('hex');

  return `${ivHex}:${authTag}:${encrypted}`;
}

/**
 * Decrypts an AES-256-GCM encrypted environment variable payload.
 * Throws an error if authentication fails (tampering or corrupted ciphertext).
 */
export function decryptEnvValue(encryptedPayload: string): string {
  const parts = encryptedPayload.split(':');
  if (parts.length !== 3) {
    throw new Error('Dữ liệu mã hóa biến môi trường không đúng định dạng');
  }

  const [ivHex, tagHex, ciphertextHex] = parts;
  if (!ivHex || !tagHex || ivHex.length !== IV_LENGTH * 2 || tagHex.length !== AUTH_TAG_LENGTH * 2) {
    throw new Error('Tham số mã hóa (IV hoặc AuthTag) không hợp lệ');
  }

  const key = getDerivedKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(tagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Safely masks secret values for API responses and logs.
 */
export function maskEnvValue(_value?: string): string {
  return '••••••••';
}
