import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';

// In-memory data store for testing
interface TestUser {
  id: string;
  email: string;
  username: string;
  display_name: string;
  full_name: string;
  password_hash: string;
  role: 'USER' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED' | 'DISABLED';
  avatar_url: string | null;
  created_at: Date;
  updated_at: Date;
  last_login_at: Date | null;
}

interface TestSession {
  id: string;
  user_id: string;
  token_hash: string;
  ip_address: string | null;
  user_agent: string | null;
  expires_at: Date;
  created_at: Date;
}

const usersDb: TestUser[] = [];
const sessionsDb: TestSession[] = [];

// Mock db/index.js
vi.mock('../src/db/index.js', () => ({
  query: vi.fn(async (text: string, params: unknown[] = []) => {
    const trimmed = text.trim();

    // 1. SELECT 1 FROM users WHERE email = $1
    if (trimmed.includes('SELECT 1 FROM users WHERE email = $1')) {
      const email = params[0] as string;
      const found = usersDb.some((u) => u.email.toLowerCase() === email.toLowerCase());
      return { rows: found ? [{ '?column?': 1 }] : [], rowCount: found ? 1 : 0 };
    }

    // 2. SELECT 1 FROM users WHERE username = $1
    if (trimmed.includes('SELECT 1 FROM users WHERE username = $1')) {
      const username = params[0] as string;
      const found = usersDb.some((u) => u.username.toLowerCase() === username.toLowerCase());
      return { rows: found ? [{ '?column?': 1 }] : [], rowCount: found ? 1 : 0 };
    }

    // 3. INSERT INTO users (...) VALUES (...) RETURNING *
    if (trimmed.startsWith('INSERT INTO users')) {
      const id = `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date();
      const newUser: TestUser = {
        id,
        email: params[0] as string,
        username: params[1] as string,
        display_name: params[2] as string,
        full_name: params[2] as string,
        password_hash: params[3] as string,
        role: 'USER',
        status: 'ACTIVE',
        avatar_url: params[4] as string,
        created_at: now,
        updated_at: now,
        last_login_at: null,
      };
      usersDb.push(newUser);
      return { rows: [newUser], rowCount: 1 };
    }

    // 4. SELECT * FROM users WHERE email = $1 OR username = $1 LIMIT 1
    if (trimmed.includes('SELECT * FROM users WHERE email = $1 OR username = $1')) {
      const key = (params[0] as string).toLowerCase();
      const user = usersDb.find(
        (u) => u.email.toLowerCase() === key || u.username.toLowerCase() === key
      );
      return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
    }

    // 5. SELECT * FROM users WHERE id = $1 LIMIT 1
    if (trimmed.includes('SELECT * FROM users WHERE id = $1')) {
      const id = params[0] as string;
      const user = usersDb.find((u) => u.id === id);
      return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
    }

    // 6. UPDATE users SET last_login_at = NOW()
    if (trimmed.includes('UPDATE users SET last_login_at = NOW()')) {
      const id = params[0] as string;
      const user = usersDb.find((u) => u.id === id);
      if (user) {
        user.last_login_at = new Date();
        user.updated_at = new Date();
      }
      return { rows: [], rowCount: user ? 1 : 0 };
    }

    // 7. INSERT INTO user_sessions
    if (trimmed.startsWith('INSERT INTO user_sessions')) {
      const session: TestSession = {
        id: params[0] as string,
        user_id: params[1] as string,
        token_hash: params[2] as string,
        ip_address: (params[3] as string) || null,
        user_agent: (params[4] as string) || null,
        expires_at: params[5] as Date,
        created_at: new Date(),
      };
      sessionsDb.push(session);
      return { rows: [session], rowCount: 1 };
    }

    // 8. SELECT id, user_id, expires_at FROM user_sessions
    if (trimmed.startsWith('SELECT') && trimmed.includes('FROM user_sessions WHERE id = $1')) {
      const id = params[0] as string;
      const session = sessionsDb.find((s) => s.id === id && s.expires_at > new Date());
      return { rows: session ? [session] : [], rowCount: session ? 1 : 0 };
    }

    // 9. DELETE FROM user_sessions WHERE id = $1
    if (trimmed.startsWith('DELETE FROM user_sessions')) {
      const id = params[0] as string;
      const idx = sessionsDb.findIndex((s) => s.id === id);
      if (idx !== -1) {
        sessionsDb.splice(idx, 1);
        return { rows: [], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }

    // 10. UPDATE users SET display_name = $1 ... WHERE id = $4 RETURNING *
    if (trimmed.includes('UPDATE users') && trimmed.includes('display_name = $1')) {
      const id = params[3] as string;
      const user = usersDb.find((u) => u.id === id);
      if (user) {
        user.display_name = params[0] as string;
        user.full_name = params[0] as string;
        user.avatar_url = (params[1] as string) || user.avatar_url;
        user.password_hash = (params[2] as string) || user.password_hash;
        user.updated_at = new Date();
        return { rows: [user], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }

    return { rows: [], rowCount: 0 };
  }),
  getDatabasePool: vi.fn(),
  checkDatabaseHealth: vi.fn(async () => ({ status: 'healthy', latencyMs: 2 })),
  closeDatabasePool: vi.fn(async () => {}),
}));

// Mock redis/index.js in-memory
const redisMockStore = new Map<string, string>();
vi.mock('../src/redis/index.js', () => ({
  getRedisClient: vi.fn(() => ({
    status: 'ready',
    get: vi.fn(async (k: string) => redisMockStore.get(k) || null),
    setex: vi.fn(async (k: string, _ttl: number, val: string) => {
      redisMockStore.set(k, val);
      return 'OK';
    }),
    del: vi.fn(async (k: string) => {
      redisMockStore.delete(k);
      return 1;
    }),
    incr: vi.fn(async (k: string) => {
      const v = (parseInt(redisMockStore.get(k) || '0', 10) + 1).toString();
      redisMockStore.set(k, v);
      return parseInt(v, 10);
    }),
    expire: vi.fn(async () => 1),
    ping: vi.fn(async () => 'PONG'),
    disconnect: vi.fn(),
  })),
  checkRedisHealth: vi.fn(async () => ({ status: 'healthy', latencyMs: 1 })),
  closeRedisClient: vi.fn(async () => {}),
}));

// Import app after mocks
import { createApp } from '../src/app.js';

describe('Authentication & User Isolation Test Suite', () => {
  const app = createApp();

  let userToken: string;
  let adminToken: string;
  const testPassword = 'SecurePassword@123';

  beforeAll(async () => {
    // Seed an initial ADMIN user for testing admin authorization
    const adminPasswordHash = await bcrypt.hash('AdminSecret@123', 8);
    const adminUser: TestUser = {
      id: 'admin-uuid-001',
      email: 'admin@astoncloud.vn',
      username: 'admin',
      display_name: 'Aston Admin',
      full_name: 'Aston Admin',
      password_hash: adminPasswordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
      avatar_url: 'https://images.unsplash.com/admin.png',
      created_at: new Date(),
      updated_at: new Date(),
      last_login_at: null,
    };
    usersDb.push(adminUser);

    // Seed a SUSPENDED user for testing account status check
    const suspendedPasswordHash = await bcrypt.hash('SuspendedPass@123', 8);
    const suspendedUser: TestUser = {
      id: 'suspended-uuid-002',
      email: 'suspended@astoncloud.vn',
      username: 'suspended_user',
      display_name: 'Suspended User',
      full_name: 'Suspended User',
      password_hash: suspendedPasswordHash,
      role: 'USER',
      status: 'SUSPENDED',
      avatar_url: null,
      created_at: new Date(),
      updated_at: new Date(),
      last_login_at: null,
    };
    usersDb.push(suspendedUser);
  });

  afterAll(() => {
    vi.clearAllMocks();
  });

  // 1. Registration tests
  it('POST /api/v1/auth/register should create a new user and return token', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'alex.dang@astoncloud.vn',
      username: 'alex_dang',
      password: testPassword,
      displayName: 'Alex Đặng',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data).toHaveProperty('user');
    expect(res.body.data.user.email).toBe('alex.dang@astoncloud.vn');
    expect(res.body.data.user.username).toBe('alex_dang');
    expect(res.body.data.user.role).toBe('USER');
    expect(res.body.data.user.status).toBe('ACTIVE');

    // CRITICAL: password_hash must NEVER be exposed
    expect(res.body.data.user).not.toHaveProperty('password_hash');
    expect(res.body.data.user).not.toHaveProperty('passwordHash');

    userToken = res.body.data.token;
  });

  // 2. Duplicate email
  it('POST /api/v1/auth/register should reject duplicate email with 409', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'alex.dang@astoncloud.vn',
      username: 'different_user',
      password: testPassword,
    });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('email');
  });

  // 3. Duplicate username
  it('POST /api/v1/auth/register should reject duplicate username with 409', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'another.email@astoncloud.vn',
      username: 'alex_dang',
      password: testPassword,
    });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('Tên người dùng');
  });

  // 4. Input validation: weak password & invalid email
  it('POST /api/v1/auth/register should reject invalid email and weak password with 400', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'invalid-email-format',
      username: 'valid_user',
      password: '123', // too short (<8) and missing letters
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toHaveProperty('details');
  });

  // 5. Login success with email
  it('POST /api/v1/auth/login should authenticate with email and return token', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      login: 'alex.dang@astoncloud.vn',
      password: testPassword,
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data.user.email).toBe('alex.dang@astoncloud.vn');
    expect(res.body.data.user).not.toHaveProperty('password_hash');
  });

  // 6. Login success with username
  it('POST /api/v1/auth/login should authenticate with username', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      login: 'alex_dang',
      password: testPassword,
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.username).toBe('alex_dang');
  });

  // 7. Login failure: wrong password (user enumeration defense)
  it('POST /api/v1/auth/login should return 401 on wrong password', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      login: 'alex_dang',
      password: 'WrongPassword@999',
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toBe('Email hoặc mật khẩu không chính xác');
  });

  // 8. Login failure: non-existent user (identical error message)
  it('POST /api/v1/auth/login should return 401 on non-existent user', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      login: 'nonexistent_user',
      password: 'AnyPassword@123',
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toBe('Email hoặc mật khẩu không chính xác');
  });

  // 9. Login failure: suspended user account
  it('POST /api/v1/auth/login should reject SUSPENDED user with 403', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      login: 'suspended_user',
      password: 'SuspendedPass@123',
    });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('tạm khóa');
  });

  // 10. Admin login
  it('POST /api/v1/auth/login should authenticate ADMIN account', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      login: 'admin',
      password: 'AdminSecret@123',
    });

    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe('ADMIN');
    adminToken = res.body.data.token;
  });

  // 11. Protected route: GET /api/v1/auth/me
  it('GET /api/v1/auth/me should return current user profile with valid token', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.username).toBe('alex_dang');
    expect(res.body.data.user).not.toHaveProperty('password_hash');
  });

  // 12. Unauthorized access without token
  it('GET /api/v1/auth/me should return 401 without token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  // 13. Unauthorized access with tampered token
  it('GET /api/v1/auth/me should return 401 with invalid token', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer invalid.tampered.token');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  // 14. User Profile endpoints: GET & PATCH /api/v1/users/me
  it('GET /api/v1/users/me should return user details', async () => {
    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('alex.dang@astoncloud.vn');
  });

  it('PATCH /api/v1/users/me should update display name', async () => {
    const res = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        displayName: 'Alex Đặng Senior Cloud',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.user.displayName).toBe('Alex Đặng Senior Cloud');
  });

  // 15. User Isolation & Admin Authorization
  it('GET /api/v1/admin/stats should block normal USER with 403 Forbidden', async () => {
    const res = await request(app)
      .get('/api/v1/admin/stats')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('quyền');
  });

  it('GET /api/v1/admin/stats should grant access to ADMIN', async () => {
    const res = await request(app)
      .get('/api/v1/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.authorizedRole).toBe('ADMIN');
  });

  // 16. Logout & Session Revocation
  it('POST /api/v1/auth/logout should revoke the current session', async () => {
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('GET /api/v1/auth/me should reject revoked session after logout with 401', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
