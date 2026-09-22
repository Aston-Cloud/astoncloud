import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { getMockClient } from '../src/modules/node-agent/index.js';
import { LocalMockNodeAgentClient } from '../src/modules/node-agent/mock.client.js';
import { encryptEnvValue, decryptEnvValue } from '../src/utils/encryption.js';
import { query } from '../src/db/index.js';
import type { Express } from 'express';

describe('Milestone 9: Host Environment Variables Test Suite', () => {
  let app: Express;
  let userToken: string;
  let userBToken: string;
  let adminToken: string;
  let mockClient: LocalMockNodeAgentClient;
  let hostAId: string;
  let hostBId: string;
  let createdVarId: string;

  beforeAll(async () => {
    app = createApp();
    mockClient = getMockClient();

    // 1. Authenticate User A
    const userRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ login: 'alex.dang@astoncloud.vn', password: 'Password@123' });
    expect(userRes.status).toBe(200);
    userToken = userRes.body.data.token;

    // 2. Register/Login User B
    const userBRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'user.env.b@astoncloud.vn',
        username: 'user_env_b',
        password: 'Password@123',
        displayName: 'User Env B',
      });
    userBToken = userBRes.status === 201 ? userBRes.body.data.token : '';
    if (!userBToken) {
      const loginB = await request(app)
        .post('/api/v1/auth/login')
        .send({ login: 'user.env.b@astoncloud.vn', password: 'Password@123' });
      userBToken = loginB.body.data.token;
    }
    expect(userBToken).toBeTruthy();

    // 3. Authenticate Admin
    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ login: 'admin@astoncloud.vn', password: 'AdminPassword@123' });
    expect(adminRes.status).toBe(200);
    adminToken = adminRes.body.data.token;

    // 4. Create Host A for User A
    const hostARes = await request(app)
      .post('/api/v1/hosts')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'host-env-test-a',
        runtimeId: 'nodejs',
        runtimeVersion: '20',
        planId: 'starter',
      });
    expect(hostARes.status).toBe(201);
    hostAId = hostARes.body.data.host.id;

    // 5. Create Host B for User B
    const hostBRes = await request(app)
      .post('/api/v1/hosts')
      .set('Authorization', `Bearer ${userBToken}`)
      .send({
        name: 'host-env-test-b',
        runtimeId: 'nodejs',
        runtimeVersion: '20',
        planId: 'starter',
      });
    expect(hostBRes.status).toBe(201);
    hostBId = hostBRes.body.data.host.id;
  });

  afterAll(async () => {
    await mockClient.reset();
  });

  // =================================================================
  // 1. Encryption & Decryption Cryptographic Verification
  // =================================================================
  describe('Cryptographic Authenticated Encryption (AES-256-GCM)', () => {
    it('encrypts plaintext into iv:authTag:ciphertext format', () => {
      const secret = 'super-secret-api-key-12345';
      const encrypted = encryptEnvValue(secret);

      expect(encrypted).toBeTruthy();
      const parts = encrypted.split(':');
      expect(parts.length).toBe(3);
      // IV is 12 bytes = 24 hex chars
      expect(parts[0].length).toBe(24);
      // Auth Tag is 16 bytes = 32 hex chars
      expect(parts[1].length).toBe(32);
      // Ciphertext should not contain the plaintext
      expect(encrypted).not.toContain(secret);
    });

    it('decrypts encrypted payload back to the exact plaintext', () => {
      const original = 'postgres://dbuser:ComplexP@ssw0rd!@10.0.0.5:5432/proddb';
      const encrypted = encryptEnvValue(original);
      const decrypted = decryptEnvValue(encrypted);

      expect(decrypted).toBe(original);
    });

    it('detects tampering and refuses to decrypt corrupted ciphertext', () => {
      const original = 'sensitive-token-999';
      const encrypted = encryptEnvValue(original);
      const parts = encrypted.split(':');

      // Tamper with the ciphertext
      const corruptedCiphertext = parts[2].slice(0, -2) + (parts[2].endsWith('a') ? 'b' : 'a');
      const tampered = `${parts[0]}:${parts[1]}:${corruptedCiphertext}`;

      expect(() => decryptEnvValue(tampered)).toThrow();
    });

    it('refuses to decrypt when authentication tag is invalid', () => {
      const original = 'sensitive-token-888';
      const encrypted = encryptEnvValue(original);
      const parts = encrypted.split(':');

      // Tamper with auth tag
      const fakeTag = '0'.repeat(32);
      const tampered = `${parts[0]}:${fakeTag}:${parts[2]}`;

      expect(() => decryptEnvValue(tampered)).toThrow();
    });
  });

  // =================================================================
  // 2. Authentication & IDOR Protection Tests
  // =================================================================
  describe('Authentication & IDOR Protection', () => {
    it('rejects unauthenticated requests to list variables with 401', async () => {
      const res = await request(app).get(`/api/v1/hosts/${hostAId}/variables`);
      expect(res.status).toBe(401);
    });

    it('rejects unauthenticated requests to create variable with 401', async () => {
      const res = await request(app)
        .post(`/api/v1/hosts/${hostAId}/variables`)
        .send({ key: 'TEST_VAR', value: 'secret' });
      expect(res.status).toBe(401);
    });

    it('prevents User B from listing User A host variables (IDOR protection)', async () => {
      const res = await request(app)
        .get(`/api/v1/hosts/${hostAId}/variables`)
        .set('Authorization', `Bearer ${userBToken}`);
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('prevents User B from creating variables on User A host', async () => {
      const res = await request(app)
        .post(`/api/v1/hosts/${hostAId}/variables`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ key: 'HACKED_KEY', value: 'malicious' });
      expect(res.status).toBe(404);
    });
  });

  // =================================================================
  // 3. Validation & Business Logic Tests
  // =================================================================
  describe('Validation & Reserved Variables', () => {
    it('rejects invalid key names (special chars, spaces, lowercase)', async () => {
      const invalidKeys = ['my key', 'my-key', '123_VAR', 'MY.KEY', ''];

      for (const key of invalidKeys) {
        const res = await request(app)
          .post(`/api/v1/hosts/${hostAId}/variables`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({ key, value: 'test' });
        expect(res.status).toBe(400);
      }
    });

    it('rejects attempts to create or override reserved PORT variable', async () => {
      const res = await request(app)
        .post(`/api/v1/hosts/${hostAId}/variables`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ key: 'PORT', value: '8080' });
      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body.error)).toContain('PORT');
    });

    it('rejects oversized values exceeding configured limit (> 32KB)', async () => {
      const hugeValue = 'A'.repeat(33000); // Exceeds 32,768 bytes
      const res = await request(app)
        .post(`/api/v1/hosts/${hostAId}/variables`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ key: 'BIG_PAYLOAD', value: hugeValue });
      expect(res.status).toBe(400);
    });
  });

  // =================================================================
  // 4. CRUD Operations & Response Masking Tests
  // =================================================================
  describe('CRUD Operations & Secret Masking', () => {
    it('successfully creates an encrypted variable and returns masked value', async () => {
      const secretValue = 'my-super-secret-database-password-2026';
      const res = await request(app)
        .post(`/api/v1/hosts/${hostAId}/variables`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ key: 'DB_PASSWORD', value: secretValue });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.variable.key).toBe('DB_PASSWORD');
      expect(res.body.data.variable.hasValue).toBe(true);
      expect(res.body.data.variable.maskedValue).toBe('••••••••');
      // Plaintext value MUST NOT be returned in API response!
      expect(res.body.data.variable.value).toBeUndefined();
      expect(res.body.data.requiresRestart).toBe(true);

      createdVarId = res.body.data.variable.id;

      // Verify that database does NOT store plaintext secret!
      const { rows } = await query<any>(
        `SELECT * FROM host_env_variables WHERE id = $1`,
        [createdVarId]
      );
      expect(rows.length).toBe(1);
      expect(rows[0].encrypted_value).not.toBe(secretValue);
      expect(rows[0].encrypted_value).toContain(':'); // IV:tag:cipher format
      // Verify we can decrypt it correctly
      expect(decryptEnvValue(rows[0].encrypted_value)).toBe(secretValue);
    });

    it('rejects duplicate variable key on the same host with 409 Conflict', async () => {
      const res = await request(app)
        .post(`/api/v1/hosts/${hostAId}/variables`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ key: 'DB_PASSWORD', value: 'different-password' });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('lists variables with masked values by default (no plaintext secrets exposed)', async () => {
      // Add another variable
      await request(app)
        .post(`/api/v1/hosts/${hostAId}/variables`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ key: 'API_SECRET_KEY', value: 'secret-token-xyz' });

      const res = await request(app)
        .get(`/api/v1/hosts/${hostAId}/variables`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);

      for (const item of res.body.data) {
        expect(item.key).toBeTruthy();
        expect(item.hasValue).toBe(true);
        expect(item.maskedValue).toBe('••••••••');
        // CRITICAL SECURITY ASSERTION: value must NEVER be returned in listing
        expect(item.value).toBeUndefined();
      }
    });

    it('updates an existing variable value and retains masking', async () => {
      const newSecret = 'updated-replacement-secret-key-999';
      const res = await request(app)
        .patch(`/api/v1/hosts/${hostAId}/variables/${createdVarId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ value: newSecret });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.variable.maskedValue).toBe('••••••••');
      expect(res.body.data.variable.value).toBeUndefined();
      expect(res.body.data.requiresRestart).toBe(true);

      // Verify database updated with new encrypted value
      const { rows } = await query<any>(
        `SELECT * FROM host_env_variables WHERE id = $1`,
        [createdVarId]
      );
      expect(decryptEnvValue(rows[0].encrypted_value)).toBe(newSecret);
    });

    it('updates variable key name and rejects duplicate names', async () => {
      // Rename DB_PASSWORD to DATABASE_PASSWORD
      const res = await request(app)
        .patch(`/api/v1/hosts/${hostAId}/variables/${createdVarId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ key: 'DATABASE_PASSWORD' });

      expect(res.status).toBe(200);
      expect(res.body.data.variable.key).toBe('DATABASE_PASSWORD');

      // Attempt to rename to an already existing key (API_SECRET_KEY)
      const dupRes = await request(app)
        .patch(`/api/v1/hosts/${hostAId}/variables/${createdVarId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ key: 'API_SECRET_KEY' });

      expect(dupRes.status).toBe(409);
    });

    it('prevents User B from updating User A variable (IDOR protection)', async () => {
      const res = await request(app)
        .patch(`/api/v1/hosts/${hostAId}/variables/${createdVarId}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ value: 'attacker-value' });

      expect(res.status).toBe(404);
    });

    it('prevents updating a variable using a mismatched hostId', async () => {
      // Trying to access createdVarId (belongs to hostA) via hostB's URL
      const res = await request(app)
        .patch(`/api/v1/hosts/${hostBId}/variables/${createdVarId}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ value: 'attacker-value' });

      expect(res.status).toBe(404);
    });

    it('deletes an environment variable successfully', async () => {
      const res = await request(app)
        .delete(`/api/v1/hosts/${hostAId}/variables/${createdVarId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.requiresRestart).toBe(true);

      // Verify deletion from database
      const { rows } = await query<any>(
        `SELECT * FROM host_env_variables WHERE id = $1`,
        [createdVarId]
      );
      expect(rows.length).toBe(0);
    });

    it('prevents User B from deleting User A variable (IDOR protection)', async () => {
      // Create fresh variable on Host A
      const createRes = await request(app)
        .post(`/api/v1/hosts/${hostAId}/variables`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ key: 'SECRET_TOKEN_A', value: 'token-a' });
      const varId = createRes.body.data.variable.id;

      const res = await request(app)
        .delete(`/api/v1/hosts/${hostAId}/variables/${varId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(404);
    });
  });

  // =================================================================
  // 5. Mock Container Environment & Multi-Host Isolation
  // =================================================================
  describe('Node Agent Container Environment & Host Isolation', () => {
    it('sets decrypted environment variables in Host A container state', async () => {
      await request(app)
        .post(`/api/v1/hosts/${hostAId}/variables`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ key: 'CUSTOM_HOST_A_KEY', value: 'host-a-secret-value' });

      const envA = mockClient.getContainerEnvironment(hostAId);
      expect(envA.CUSTOM_HOST_A_KEY).toBe('host-a-secret-value');
      expect(envA.PORT).toBeDefined();
    });

    it('strictly isolates Host A and Host B container environments', async () => {
      // Create variable for Host B
      await request(app)
        .post(`/api/v1/hosts/${hostBId}/variables`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ key: 'CUSTOM_HOST_B_KEY', value: 'host-b-secret-value' });

      const envA = mockClient.getContainerEnvironment(hostAId);
      const envB = mockClient.getContainerEnvironment(hostBId);

      // Host A must have its own key, and NOT Host B's key
      expect(envA.CUSTOM_HOST_A_KEY).toBe('host-a-secret-value');
      expect(envA.CUSTOM_HOST_B_KEY).toBeUndefined();

      // Host B must have its own key, and NOT Host A's key
      expect(envB.CUSTOM_HOST_B_KEY).toBe('host-b-secret-value');
      expect(envB.CUSTOM_HOST_A_KEY).toBeUndefined();
    });

    it('survives host restart and reapplies decrypted environment variables', async () => {
      // Restart Host A
      const restartRes = await request(app)
        .post(`/api/v1/hosts/${hostAId}/actions`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ action: 'restart' });

      expect(restartRes.status).toBe(200);

      const envA = mockClient.getContainerEnvironment(hostAId);
      expect(envA.CUSTOM_HOST_A_KEY).toBe('host-a-secret-value');
      expect(envA.PORT).toBeDefined();
      expect(envA.NODE_ENV).toBe('production');
    });

    it('removes variable from mock container when deleted', async () => {
      // List to get the variable id
      const listRes = await request(app)
        .get(`/api/v1/hosts/${hostAId}/variables`)
        .set('Authorization', `Bearer ${userToken}`);

      const targetVar = listRes.body.data.find((v: any) => v.key === 'CUSTOM_HOST_A_KEY');
      expect(targetVar).toBeDefined();

      // Delete the variable
      await request(app)
        .delete(`/api/v1/hosts/${hostAId}/variables/${targetVar.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      const envA = mockClient.getContainerEnvironment(hostAId);
      expect(envA.CUSTOM_HOST_A_KEY).toBeUndefined();
    });
  });
});
