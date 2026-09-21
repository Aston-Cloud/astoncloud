import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../../db/index.js';
import { getRedisClient } from '../../redis/index.js';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import {
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  NotFoundError,
  AppError,
} from '../../utils/errors.js';
import type { RegisterInput, LoginInput } from './auth.schema.js';

export type UserRole = 'USER' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'DISABLED';

export interface UserRow {
  id: string;
  email: string;
  username: string;
  display_name: string;
  password_hash: string;
  role: UserRole;
  status: UserStatus;
  avatar_url: string | null;
  created_at: Date;
  updated_at: Date;
  last_login_at: Date | null;
}

export interface UserSanitized {
  id: string;
  email: string;
  username: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

export interface JwtPayload {
  sub: string;
  role: UserRole;
  sid: string;
  iat?: number;
  exp?: number;
}

export interface AuthSessionData {
  userId: string;
  role: UserRole;
  status: UserStatus;
}

export function sanitizeUser(row: UserRow): UserSanitized {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    displayName: row.display_name,
    role: row.role,
    status: row.status,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    lastLoginAt: row.last_login_at ? row.last_login_at.toISOString() : null,
  };
}

// Track brute-force attempts per IP + Login identifier
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 900; // 15 minutes

async function checkBruteForce(ip: string, loginKey: string): Promise<void> {
  try {
    const redis = getRedisClient();
    const key = `brute:${ip}:${loginKey.toLowerCase()}`;
    const attempts = await redis.get(key);
    if (attempts && parseInt(attempts, 10) >= MAX_FAILED_ATTEMPTS) {
      throw new AppError(
        'Quá nhiều lần thử đăng nhập thất bại. Vui lòng thử lại sau 15 phút.',
        429,
        undefined,
        true
      );
    }
  } catch (err) {
    if (err instanceof AppError && err.statusCode === 429) throw err;
    // Redis might be disconnected in offline/standalone dev mode
    logger.debug({ err }, 'Brute-force check skipped (Redis unreachable)');
  }
}

async function recordFailedAttempt(ip: string, loginKey: string): Promise<void> {
  try {
    const redis = getRedisClient();
    const key = `brute:${ip}:${loginKey.toLowerCase()}`;
    const current = await redis.incr(key);
    if (current === 1) {
      await redis.expire(key, LOCKOUT_SECONDS);
    }
  } catch (err) {
    logger.debug({ err }, 'Record failed attempt skipped (Redis unreachable)');
  }
}

async function clearFailedAttempts(ip: string, loginKey: string): Promise<void> {
  try {
    const redis = getRedisClient();
    const key = `brute:${ip}:${loginKey.toLowerCase()}`;
    await redis.del(key);
  } catch (err) {
    logger.debug({ err }, 'Clear failed attempt skipped (Redis unreachable)');
  }
}

export class AuthService {
  /**
   * Create a new session in DB & Cache in Redis
   */
  public static async createSession(
    user: UserRow,
    ip?: string,
    userAgent?: string
  ): Promise<{ token: string; sessionId: string }> {
    const sessionId = crypto.randomUUID();
    const tokenHash = crypto.createHash('sha256').update(sessionId).digest('hex');

    // 7 days expiration
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Save session in PostgreSQL
    await query(
      `INSERT INTO user_sessions (id, user_id, token_hash, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [sessionId, user.id, tokenHash, ip || null, userAgent || null, expiresAt]
    );

    // Cache session in Redis
    try {
      const redis = getRedisClient();
      const sessionPayload: AuthSessionData = {
        userId: user.id,
        role: user.role,
        status: user.status,
      };
      await redis.setex(`session:${sessionId}`, 7 * 24 * 60 * 60, JSON.stringify(sessionPayload));
    } catch (err) {
      logger.debug({ err }, 'Failed to cache session in Redis');
    }

    // Sign JWT
    const token = jwt.sign(
      {
        sub: user.id,
        role: user.role,
        sid: sessionId,
      } as JwtPayload,
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN as any }
    );

    return { token, sessionId };
  }

  /**
   * Register a new user
   */
  public static async register(
    input: RegisterInput,
    ip?: string,
    userAgent?: string
  ): Promise<{ user: UserSanitized; token: string }> {
    const email = input.email.toLowerCase().trim();
    const username = input.username.toLowerCase().trim();
    const displayName = input.displayName?.trim() || username;

    // Check duplicate email
    const existingEmail = await query('SELECT 1 FROM users WHERE email = $1', [email]);
    if (existingEmail.rowCount && existingEmail.rowCount > 0) {
      throw new ConflictError('Địa chỉ email đã được sử dụng trên hệ thống');
    }

    // Check duplicate username
    const existingUsername = await query('SELECT 1 FROM users WHERE username = $1', [username]);
    if (existingUsername.rowCount && existingUsername.rowCount > 0) {
      throw new ConflictError('Tên người dùng đã tồn tại. Vui lòng chọn tên khác');
    }

    // Hash password with bcrypt
    const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_SALT_ROUNDS);

    // Insert user with strict 'USER' role and 'ACTIVE' status (privilege escalation defense)
    const { rows } = await query<UserRow>(
      `INSERT INTO users (
        email, username, display_name, full_name, password_hash, role, status, avatar_url, created_at, updated_at
      ) VALUES ($1, $2, $3, $3, $4, 'USER', 'ACTIVE', $5, NOW(), NOW())
      RETURNING *`,
      [
        email,
        username,
        displayName,
        passwordHash,
        `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`,
      ]
    );

    const newUser = rows[0];
    const { token } = await this.createSession(newUser, ip, userAgent);

    return {
      user: sanitizeUser(newUser),
      token,
    };
  }

  /**
   * Login user with email or username
   */
  public static async login(
    input: LoginInput,
    ip = '127.0.0.1',
    userAgent?: string
  ): Promise<{ user: UserSanitized; token: string }> {
    const loginKey = input.login.toLowerCase().trim();

    // 1. Check brute force lockout
    await checkBruteForce(ip, loginKey);

    // 2. Query user by email or username
    const { rows } = await query<UserRow>(
      `SELECT * FROM users WHERE email = $1 OR username = $1 LIMIT 1`,
      [loginKey]
    );

    const user = rows[0];

    // Constant-time protection against user enumeration
    if (!user) {
      await bcrypt.hash(input.password, 10); // dummy hash calculation to mimic comparison timing
      await recordFailedAttempt(ip, loginKey);
      throw new UnauthorizedError('Email hoặc mật khẩu không chính xác');
    }

    // Check user account status
    if (user.status === 'SUSPENDED' || user.status === 'DISABLED') {
      throw new ForbiddenError(
        'Tài khoản đã bị tạm khóa hoặc vô hiệu hóa. Vui lòng liên hệ bộ phận hỗ trợ.'
      );
    }

    // Compare password hash
    const isValidPassword = await bcrypt.compare(input.password, user.password_hash);
    if (!isValidPassword) {
      await recordFailedAttempt(ip, loginKey);
      throw new UnauthorizedError('Email hoặc mật khẩu không chính xác');
    }

    // Clear failed attempts upon successful authentication
    await clearFailedAttempts(ip, loginKey);

    // Update last_login_at
    await query('UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1', [
      user.id,
    ]);

    user.last_login_at = new Date();

    const { token } = await this.createSession(user, ip, userAgent);

    return {
      user: sanitizeUser(user),
      token,
    };
  }

  /**
   * Logout user by invalidating session
   */
  public static async logout(sessionId: string): Promise<void> {
    // Delete from Redis
    try {
      const redis = getRedisClient();
      await redis.del(`session:${sessionId}`);
    } catch (err) {
      logger.debug({ err }, 'Redis session removal skipped');
    }

    // Delete from PostgreSQL
    await query('DELETE FROM user_sessions WHERE id = $1', [sessionId]);
  }

  /**
   * Validate token and session, returning the active User
   */
  public static async validateToken(token: string): Promise<{ user: UserSanitized; sessionId: string }> {
    let payload: JwtPayload;

    try {
      payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    } catch {
      throw new UnauthorizedError('Phiên xác thực không hợp lệ hoặc đã hết hạn');
    }

    const { sub: userId, sid: sessionId } = payload;
    if (!userId || !sessionId) {
      throw new UnauthorizedError('Mã xác thực không hợp lệ');
    }

    // 1. Try Redis cache first
    let isSessionValid = false;
    try {
      const redis = getRedisClient();
      const cached = await redis.get(`session:${sessionId}`);
      if (cached) {
        isSessionValid = true;
      }
    } catch {
      // Fallback to PostgreSQL
    }

    // 2. If not found in Redis, check DB
    if (!isSessionValid) {
      const { rows: sessionRows } = await query(
        `SELECT id, user_id, expires_at FROM user_sessions WHERE id = $1 AND expires_at > NOW()`,
        [sessionId]
      );

      if (!sessionRows.length) {
        throw new UnauthorizedError('Phiên đăng nhập đã bị hủy hoặc hết hạn');
      }

      // Re-cache in Redis
      try {
        const redis = getRedisClient();
        await redis.setex(
          `session:${sessionId}`,
          7 * 24 * 60 * 60,
          JSON.stringify({ userId, role: payload.role, status: 'ACTIVE' })
        );
      } catch {
        // ignore
      }
    }

    // 3. Fetch fresh user data
    const { rows: userRows } = await query<UserRow>(
      `SELECT * FROM users WHERE id = $1 LIMIT 1`,
      [userId]
    );

    if (!userRows.length) {
      throw new UnauthorizedError('Không tìm thấy tài khoản người dùng');
    }

    const user = userRows[0];
    if (user.status !== 'ACTIVE') {
      throw new ForbiddenError('Tài khoản đã bị tạm khóa hoặc vô hiệu hóa');
    }

    return {
      user: sanitizeUser(user),
      sessionId,
    };
  }

  /**
   * Get user by ID
   */
  public static async getUserById(userId: string): Promise<UserSanitized> {
    const { rows } = await query<UserRow>('SELECT * FROM users WHERE id = $1 LIMIT 1', [userId]);
    if (!rows.length) {
      throw new NotFoundError('Không tìm thấy tài khoản người dùng');
    }
    return sanitizeUser(rows[0]);
  }
}
