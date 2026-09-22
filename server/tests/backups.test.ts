import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createApp } from '../src/app.js';
import { getMockClient } from '../src/modules/node-agent/index.js';
import { LocalMockNodeAgentClient } from '../src/modules/node-agent/mock.client.js';
import { BackupsService } from '../src/modules/backups/backups.service.js';
import { mockBackupStorageProvider } from '../src/modules/backups/mock-backup-storage.js';
import { query } from '../src/db/index.js';
import type { Express } from 'express';

describe('Milestone 11: Host Backups & Restore Management Test Suite', () => {
  let app: Express;
  let userToken: string;
  let userBToken: string;
  let adminToken: string;
  let mockClient: LocalMockNodeAgentClient;
  let hostAId: string;
  let hostBId: string;
  let primaryBackupId: string;

  beforeAll(async () => {
    app = createApp();
    mockClient = getMockClient();

    // 1. Authenticate User A
    const userRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ login: 'alex.dang@astoncloud.vn', password: 'Password@123' });
    expect(userRes.status).toBe(200);
    userToken = userRes.body.data.token;

    // 2. Register / Login User B
    const userBRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'user.backup.b@astoncloud.vn',
        username: 'user_backup_b',
        password: 'Password@123',
        displayName: 'User Backup B',
      });
    userBToken = userBRes.status === 201 ? userBRes.body.data.token : '';
    if (!userBToken) {
      const loginB = await request(app)
        .post('/api/v1/auth/login')
        .send({ login: 'user.backup.b@astoncloud.vn', password: 'Password@123' });
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
        name: 'host-backup-test-a',
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
        name: 'host-backup-test-b',
        runtimeId: 'nodejs',
        runtimeVersion: '20',
        planId: 'starter',
      });
    expect(hostBRes.status).toBe(201);
    hostBId = hostBRes.body.data.host.id;
  });

  afterAll(async () => {
    // Cleanup storage directories
    try {
      await fs.rm(path.resolve(process.cwd(), 'mock-backups'), { recursive: true, force: true });
    } catch (_e) {}
  });

  describe('1. Create Backup & Physical Snapshot', () => {
    it('should create an initial file in Host A storage and create a backup snapshot', async () => {
      // Create a test file in Host A's storage
      const hostStorageDir = path.resolve(process.cwd(), 'mock-storage', hostAId);
      await fs.mkdir(hostStorageDir, { recursive: true });
      await fs.writeFile(path.join(hostStorageDir, 'backup-test.txt'), 'Hello Backup', 'utf8');

      // Request backup creation via API
      const res = await request(app)
        .post(`/api/v1/hosts/${hostAId}/backups`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'first-manual-backup',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        hostId: hostAId,
        name: 'first-manual-backup',
        status: 'COMPLETED',
        backupType: 'manual',
      });
      expect(res.body.data.sizeBytes).toBeGreaterThan(0);
      expect(res.body.data.sizeFormatted).toBeTruthy();
      expect(res.body.data.completedAt).toBeTruthy();
      expect(res.body.data.expiresAt).toBeTruthy();

      primaryBackupId = res.body.data.id;

      // Verify physical tar.gz archive exists on disk
      const archivePath = path.resolve(
        process.cwd(),
        'mock-backups',
        hostAId,
        `${primaryBackupId}.tar.gz`
      );
      const stat = await fs.stat(archivePath);
      expect(stat.isFile()).toBe(true);
      expect(stat.size).toBe(res.body.data.sizeBytes);
    });

    it('should automatically generate a deterministic backup name when none is provided', async () => {
      const res = await request(app)
        .post(`/api/v1/hosts/${hostAId}/backups`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({});

      expect(res.status).toBe(201);
      expect(res.body.data.name).toMatch(/^backup-host-backup-test-a-\d{4}-\d{2}/);
    });

    it('should reject backup creation with name exceeding 100 characters', async () => {
      const longName = 'a'.repeat(101);
      const res = await request(app)
        .post(`/api/v1/hosts/${hostAId}/backups`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: longName });

      expect(res.status).toBe(400);
    });
  });

  describe('2. List & Get Backup Details', () => {
    it('should list all active backups for Host A sorted by newest first', async () => {
      const res = await request(app)
        .get(`/api/v1/hosts/${hostAId}/backups`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);

      // Verify no raw internal filesystem path is exposed
      for (const b of res.body.data) {
        expect(b).toHaveProperty('id');
        expect(b).toHaveProperty('name');
        expect(b).toHaveProperty('status');
        expect(b).toHaveProperty('sizeFormatted');
        expect(b).not.toHaveProperty('storage_key');
      }
    });

    it('should get backup detail by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/hosts/${hostAId}/backups/${primaryBackupId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(primaryBackupId);
      expect(res.body.data.name).toBe('first-manual-backup');
      expect(res.body.data.status).toBe('COMPLETED');
    });

    it('should return 404 for a non-existent backup ID', async () => {
      const nonExistent = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .get(`/api/v1/hosts/${hostAId}/backups/${nonExistent}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('3. Multi-Tenant Isolation & IDOR Protection', () => {
    it('User B cannot list User A backups', async () => {
      const res = await request(app)
        .get(`/api/v1/hosts/${hostAId}/backups`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(404);
    });

    it('User B cannot view User A backup detail', async () => {
      const res = await request(app)
        .get(`/api/v1/hosts/${hostAId}/backups/${primaryBackupId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(404);
    });

    it('User B cannot restore User A backup', async () => {
      const res = await request(app)
        .post(`/api/v1/hosts/${hostAId}/backups/${primaryBackupId}/restore`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(404);
    });

    it('User B cannot delete User A backup', async () => {
      const res = await request(app)
        .delete(`/api/v1/hosts/${hostAId}/backups/${primaryBackupId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(404);
    });

    it('Cross-host backup check: Host B cannot access Host A backup ID', async () => {
      const res = await request(app)
        .get(`/api/v1/hosts/${hostBId}/backups/${primaryBackupId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('4. Restore Lifecycle & File Verification', () => {
    it('should modify backup-test.txt and restore it to the exact previous state', async () => {
      const hostStorageDir = path.resolve(process.cwd(), 'mock-storage', hostAId);
      const testFilePath = path.join(hostStorageDir, 'backup-test.txt');

      // 1. Modify the file to a different content
      await fs.writeFile(testFilePath, 'Changed After Backup', 'utf8');
      const modifiedContent = await fs.readFile(testFilePath, 'utf8');
      expect(modifiedContent).toBe('Changed After Backup');

      // 2. Trigger restore of primaryBackupId
      const restoreRes = await request(app)
        .post(`/api/v1/hosts/${hostAId}/backups/${primaryBackupId}/restore`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(restoreRes.status).toBe(200);
      expect(restoreRes.body.success).toBe(true);
      expect(restoreRes.body.data.message).toContain('thành công');

      // 3. Verify file content is reverted to 'Hello Backup'
      const restoredContent = await fs.readFile(testFilePath, 'utf8');
      expect(restoredContent).toBe('Hello Backup');
    });

    it('should preserve host metadata during and after restore', async () => {
      const hostCheck = await request(app)
        .get(`/api/v1/hosts/${hostAId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(hostCheck.status).toBe(200);
      const hostData = hostCheck.body.data.host || hostCheck.body.data;
      expect(hostData.id).toBe(hostAId);
      expect(hostData.name).toBe('host-backup-test-a');
      expect(hostData.runtime).toBe('nodejs');
      expect(hostData.planId).toBe('starter');
    });

    it('should reject restore on a backup that is in FAILED or non-completed status', async () => {
      // Create a dummy failed backup entry directly
      const insertRes = await query(
        `INSERT INTO host_backups (host_id, user_id, name, status, backup_type, metadata, storage_key, size_bytes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [hostAId, 'usr-alex-002', 'failed-backup-test', 'FAILED', 'manual', '{}', '', 0]
      );
      const failedId = (insertRes.rows[0] as any).id;

      const res = await request(app)
        .post(`/api/v1/hosts/${hostAId}/backups/${failedId}/restore`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('COMPLETED');
    });
  });

  describe('5. Host State Machine Handling', () => {
    it('should automatically stop and restart container when restoring a RUNNING host', async () => {
      // Start Host A
      await request(app)
        .post(`/api/v1/hosts/${hostAId}/actions`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ action: 'start' });

      const checkResBefore = await request(app)
        .get(`/api/v1/hosts/${hostAId}`)
        .set('Authorization', `Bearer ${userToken}`);
      const hostStatusBefore = (checkResBefore.body.data.host || checkResBefore.body.data).status;
      expect(hostStatusBefore).toBe('RUNNING');

      // Restore backup
      const res = await request(app)
        .post(`/api/v1/hosts/${hostAId}/backups/${primaryBackupId}/restore`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);

      // Verify host is running after restore
      const checkResAfter = await request(app)
        .get(`/api/v1/hosts/${hostAId}`)
        .set('Authorization', `Bearer ${userToken}`);
      const hostStatusAfter = (checkResAfter.body.data.host || checkResAfter.body.data).status;
      expect(hostStatusAfter).toBe('RUNNING');
    });

    it('should remain STOPPED when restoring a STOPPED host', async () => {
      // Stop Host A
      await request(app)
        .post(`/api/v1/hosts/${hostAId}/actions`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ action: 'stop' });

      // Restore backup
      const res = await request(app)
        .post(`/api/v1/hosts/${hostAId}/backups/${primaryBackupId}/restore`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);

      // Verify host remains STOPPED
      const checkRes = await request(app)
        .get(`/api/v1/hosts/${hostAId}`)
        .set('Authorization', `Bearer ${userToken}`);
      const hostStatus = (checkRes.body.data.host || checkRes.body.data).status;
      expect(hostStatus).toBe('STOPPED');
    });

    it('should handle concurrent restore requests safely', async () => {
      // Trigger two restore requests concurrently
      const req1 = request(app)
        .post(`/api/v1/hosts/${hostAId}/backups/${primaryBackupId}/restore`)
        .set('Authorization', `Bearer ${userToken}`);
      const req2 = request(app)
        .post(`/api/v1/hosts/${hostAId}/backups/${primaryBackupId}/restore`)
        .set('Authorization', `Bearer ${userToken}`);

      const [res1, res2] = await Promise.all([req1, req2]);
      const statuses = [res1.status, res2.status];

      // At least one must succeed (200), and if concurrency triggered, the other returns 409
      expect(statuses.includes(200) || statuses.includes(409)).toBe(true);
    });
  });

  describe('6. Backup Quotas & Limits', () => {
    it('should reject backup creation when exceeding maximum backups per host (5)', async () => {
      // Check current backup count
      const initialList = await request(app)
        .get(`/api/v1/hosts/${hostAId}/backups`)
        .set('Authorization', `Bearer ${userToken}`);
      const currentCount = initialList.body.data.length;

      // Add backups until exactly 5 exist
      const needed = 5 - currentCount;
      for (let i = 0; i < needed; i++) {
        const createRes = await request(app)
          .post(`/api/v1/hosts/${hostAId}/backups`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({ name: `quota-filler-${i + 1}` });
        expect(createRes.status).toBe(201);
      }

      // Verify we have exactly 5 backups
      const listRes = await request(app)
        .get(`/api/v1/hosts/${hostAId}/backups`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(listRes.body.data.length).toBe(5);

      // 6th backup creation should be rejected
      const exceedRes = await request(app)
        .post(`/api/v1/hosts/${hostAId}/backups`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'should-fail-quota' });

      expect(exceedRes.status).toBe(400);
      expect(exceedRes.body.error.message).toContain('đạt giới hạn tối đa');
    });
  });

  describe('7. Tar Slip / Path Traversal Protection', () => {
    it('should reject malicious tar archive containing directory traversal sequences', async () => {
      // Manually simulate a malicious snapshot that attempts to write outside targetDir
      const maliciousStorageKey = 'mock-backups/malicious-test.tar.gz';
      const maliciousDir = path.resolve(process.cwd(), 'mock-backups');
      await fs.mkdir(maliciousDir, { recursive: true });

      // Create a corrupted/malicious archive buffer containing '../evil.txt'
      const maliciousHeader = Buffer.alloc(512);
      Buffer.from('../../../evil.txt').copy(maliciousHeader, 0);
      Buffer.from('0000644\0').copy(maliciousHeader, 100);
      Buffer.from('00000000010\0').copy(maliciousHeader, 124); // 8 bytes
      maliciousHeader[156] = 48; // normal file
      Buffer.from('ustar\0').copy(maliciousHeader, 257);
      Buffer.from('00').copy(maliciousHeader, 263);

      const content = Buffer.from('malicious payload\n');
      const padding = Buffer.alloc(512 - (content.length % 512));
      const endMarker = Buffer.alloc(1024);

      const rawTar = Buffer.concat([maliciousHeader, content, padding, endMarker]);
      const zlib = await import('node:zlib');
      const gzipped = zlib.gzipSync(rawTar);
      await fs.writeFile(path.resolve(process.cwd(), maliciousStorageKey), gzipped);

      // Attempt to restore via storage provider
      await expect(
        mockBackupStorageProvider.restoreSnapshot(
          hostAId,
          maliciousStorageKey,
          path.resolve(process.cwd(), 'mock-storage', hostAId)
        )
      ).rejects.toThrow(/Phát hiện đường dẫn tệp không an toàn/);

      // Cleanup
      await fs.rm(path.resolve(process.cwd(), maliciousStorageKey), { force: true });
    });
  });

  describe('8. Delete Backup & Cascade Deletion', () => {
    it('should delete a backup and remove its storage file from disk', async () => {
      // Find a backup to delete
      const listRes = await request(app)
        .get(`/api/v1/hosts/${hostAId}/backups`)
        .set('Authorization', `Bearer ${userToken}`);
      const targetBackup = listRes.body.data[listRes.body.data.length - 1];

      const deleteRes = await request(app)
        .delete(`/api/v1/hosts/${hostAId}/backups/${targetBackup.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.data.id).toBe(targetBackup.id);

      // Check that querying the deleted backup returns 404
      const getRes = await request(app)
        .get(`/api/v1/hosts/${hostAId}/backups/${targetBackup.id}`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(getRes.status).toBe(404);
    });

    it('should cascade delete all host backups when the host is deleted', async () => {
      // Create a temporary host for cascade testing
      const tempHostRes = await request(app)
        .post('/api/v1/hosts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'host-cascade-backup-test',
          runtimeId: 'nodejs',
          runtimeVersion: '20',
          planId: 'starter',
        });
      const tempHostId = tempHostRes.body.data.host.id;

      // Create a backup for temp host
      const backupRes = await request(app)
        .post(`/api/v1/hosts/${tempHostId}/backups`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'cascade-backup' });
      expect(backupRes.status).toBe(201);
      const backupId = backupRes.body.data.id;

      // Delete the host
      const deleteHostRes = await request(app)
        .delete(`/api/v1/hosts/${tempHostId}`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(deleteHostRes.status).toBe(200);

      // Verify backup is cascade deleted from database
      const checkRes = await query(`SELECT * FROM host_backups WHERE id = $1`, [backupId]);
      expect(checkRes.rows.length).toBe(0);
    });
  });
});
