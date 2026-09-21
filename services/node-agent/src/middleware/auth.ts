import { FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';
import { env } from '../config/env.js';
import { UnauthorizedError } from '../utils/errors.js';

export async function verifyAgentAuth(request: FastifyRequest, _reply: FastifyReply) {
  // Extract token from header 'x-agent-key' or 'Authorization: Bearer <token>'
  const headerKey = request.headers['x-agent-key'];
  const authHeader = request.headers.authorization;

  let providedToken: string | undefined;

  if (typeof headerKey === 'string' && headerKey.trim().length > 0) {
    providedToken = headerKey.trim();
  } else if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    providedToken = authHeader.substring(7).trim();
  }

  if (!providedToken) {
    throw new UnauthorizedError('Thiếu thông tin xác thực Machine-to-Machine (x-agent-key hoặc Bearer token)');
  }

  const expectedToken = env.AGENT_SECRET_KEY;

  // Constant-time comparison to prevent timing attacks
  const providedBuffer = Buffer.from(providedToken);
  const expectedBuffer = Buffer.from(expectedToken);

  if (providedBuffer.length !== expectedBuffer.length) {
    throw new UnauthorizedError('Thông tin xác thực Agent không hợp lệ');
  }

  const isValid = crypto.timingSafeEqual(providedBuffer, expectedBuffer);
  if (!isValid) {
    throw new UnauthorizedError('Thông tin xác thực Agent không hợp lệ');
  }
}
