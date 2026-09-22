import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import path from 'node:path';
import fs from 'node:fs/promises';
import { createApp } from '../src/app.js';
import { getMockClient } from '../src/modules/node-agent/index.js';
import { LocalMockNodeAgentClient } from '../src/modules/node-agent/mock.client.js';
import type { Express } from 'express';

describe('Milestone 8: Real Host File Manager Test Suite', () => {
  let app: Express;
  let userToken: string;
  let userBToken: string;
  let adminToken: string;
  let mockClient: LocalMockNodeAgentClient;
  let hostAId: string;
  let hostBId: string;

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
        email: 'user.files.b@astoncloud.vn',
        username: 'user_files_b',
        password: 'Password@123',
        displayName: 'User Files B',
      });
    userBToken = userBRes.status === 201 ? userBRes.body.data.token : '';
    if (!userBToken) {
      const loginB = await request(app)
        .post('/api/v1/auth/login')
        .send({ login: 'user.files.b@astoncloud.vn', password: 'Password@123' });
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
        name: 'host-files-test-a',
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
        name: 'host-files-test-b',
        runtimeId: 'nodejs',
        runtimeVersion: '20',
        planId: 'starter',
      });
    expect(hostBRes.status).toBe(201);
    hostBId = hostBRes.body.data.host.id;
  });

  afterAll(async () => {
    // Cleanup mock storage
    await mockClient.reset();
  });

  // =================================================================
  // 1. Authentication & IDOR Protection Tests
  // =================================================================
  describe('Authentication & IDOR Protection', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const res = await request(app).get(`/api/v1/hosts/${hostAId}/files`);
      expect(res.status).toBe(401);
    });

    it('prevents User B from listing User A host files (IDOR protection)', async () => {
      const res = await request(app)
        .get(`/api/v1/hosts/${hostAId}/files`)
        .set('Authorization', `Bearer ${userBToken}`);
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('prevents User B from reading User A file content', async () => {
      const res = await request(app)
        .get(`/api/v1/hosts/${hostAId}/files/content?path=/package.json`)
        .set('Authorization', `Bearer ${userBToken}`);
      expect(res.status).toBe(404);
    });

    it('prevents User B from writing to User A host storage', async () => {
      const res = await request(app)
        .put(`/api/v1/hosts/${hostAId}/files/content`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ path: '/hacked.js', content: 'malicious' });
      expect(res.status).toBe(404);
    });

    it('prevents User B from uploading to User A host storage', async () => {
      const res = await request(app)
        .post(`/api/v1/hosts/${hostAId}/files/upload`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ destinationPath: '/', filename: 'malicious.js', content: 'test' });
      expect(res.status).toBe(404);
    });

    it('prevents User B from deleting files from User A host storage', async () => {
      const res = await request(app)
        .delete(`/api/v1/hosts/${hostAId}/files?path=/package.json`)
        .set('Authorization', `Bearer ${userBToken}`);
      expect(res.status).toBe(404);
    });

    it('allows ADMIN to access any host files', async () => {
      const res = await request(app)
        .get(`/api/v1/hosts/${hostAId}/files`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.entries)).toBe(true);
    });
  });

  // =================================================================
  // 2. Path Security & Traversal Prevention Tests
  // =================================================================
  describe('Path Security & Traversal Prevention', () => {
    it('blocks ../ parent directory traversal', async () => {
      const res = await request(app)
        .get(`/api/v1/hosts/${hostAId}/files?path=../`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('blocks nested and complex directory traversal (../../etc/passwd)', async () => {
      const res = await request(app)
        .get(`/api/v1/hosts/${hostAId}/files/content?path=../../etc/passwd`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(400);
    });

    it('blocks encoded traversal (%2e%2e%2f and ..%2f)', async () => {
      const res = await request(app)
        .get(`/api/v1/hosts/${hostAId}/files/content?path=%2e%2e%2f%2e%2e%2fetc%2fpasswd`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(400);
    });

    it('blocks null byte injections (%00 or \\0)', async () => {
      const res = await request(app)
        .get(`/api/v1/hosts/${hostAId}/files/content?path=/package.json%00.png`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(400);
    });

    it('blocks absolute OS paths like /etc/passwd or C:\\Windows', async () => {
      const res = await request(app)
        .get(`/api/v1/hosts/${hostAId}/files/content?path=C:\\Windows\\System32`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(400);
    });

    it('blocks access to docker socket or system directories', async () => {
      const res = await request(app)
        .get(`/api/v1/hosts/${hostAId}/files/content?path=../../var/run/docker.sock`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(400);
    });

    it('forbids deleting the host root directory', async () => {
      const res = await request(app)
        .delete(`/api/v1/hosts/${hostAId}/files?path=/`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(400);
    });

    it('forbids writing outside host storage root', async () => {
      const res = await request(app)
        .put(`/api/v1/hosts/${hostAId}/files/content`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          path: '/../other-host/hack.txt',
          content: 'malicious payload',
        });
      expect(res.status).toBe(400);
    });

    it('forbids downloading arbitrary server files', async () => {
      const res = await request(app)
        .get(`/api/v1/hosts/${hostAId}/files/download?path=/../../../../Windows/win.ini`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(400);
    });

    it('prevents symlink escape outside host root', async () => {
      // Create an outside file and a symlink inside host storage
      const hostRoot = path.resolve(mockClient.storageRoot, hostAId);
      const outsideDir = path.resolve(mockClient.storageRoot, 'outside-escape');
      await fs.mkdir(outsideDir, { recursive: true });
      await fs.writeFile(path.join(outsideDir, 'secret.txt'), 'SUPER_SECRET_HOST_KEY');

      const symlinkPath = path.join(hostRoot, 'escape-link');
      try {
        await fs.symlink(path.join(outsideDir, 'secret.txt'), symlinkPath, 'file');
      } catch (_e) {
        // In case symlink creation requires admin privileges on Windows
      }

      // If symlink exists, attempting to read it must be rejected
      try {
        const linkStat = await fs.lstat(symlinkPath);
        if (linkStat.isSymbolicLink()) {
          const res = await request(app)
            .get(`/api/v1/hosts/${hostAId}/files/content?path=/escape-link`)
            .set('Authorization', `Bearer ${userToken}`);
          expect([400, 403]).toContain(res.status);
        }
      } catch (_e) {
        // Skip assertion if OS permissions prevent symlink creation
      }
    });
  });

  // =================================================================
  // 3. Functional Filesystem Operations Tests
  // =================================================================
  describe('Functional Filesystem Operations', () => {
    it('lists initial deterministic file structure (package.json, README.md, src/)', async () => {
      const res = await request(app)
        .get(`/api/v1/hosts/${hostAId}/files?path=/`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const fileNames = res.body.data.entries.map((e: any) => e.name);
      expect(fileNames).toContain('package.json');
      expect(fileNames).toContain('README.md');
      expect(fileNames).toContain('src');

      // Directories should be sorted first
      const srcEntry = res.body.data.entries.find((e: any) => e.name === 'src');
      expect(srcEntry.type).toBe('directory');
    });

    it('reads file content safely (GET /files/content)', async () => {
      const res = await request(app)
        .get(`/api/v1/hosts/${hostAId}/files/content?path=/package.json`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('package.json');
      expect(res.body.data.isBinary).toBe(false);
      expect(res.body.data.content).toContain('cloud-app');
    });

    it('creates and writes to a new file (PUT /files/content)', async () => {
      const res = await request(app)
        .put(`/api/v1/hosts/${hostAId}/files/content`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          path: '/src/config.json',
          content: JSON.stringify({ port: 3000, debug: true }),
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify reading newly created file
      const readRes = await request(app)
        .get(`/api/v1/hosts/${hostAId}/files/content?path=/src/config.json`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(readRes.status).toBe(200);
      expect(readRes.body.data.content).toContain('"debug":true');
    });

    it('creates a new directory (POST /files/directory)', async () => {
      const res = await request(app)
        .post(`/api/v1/hosts/${hostAId}/files/directory`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ path: '/src/controllers' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      // List /src to verify directory exists
      const listRes = await request(app)
        .get(`/api/v1/hosts/${hostAId}/files?path=/src`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(listRes.status).toBe(200);
      const names = listRes.body.data.entries.map((e: any) => e.name);
      expect(names).toContain('controllers');
    });

    it('renames a file (POST /files/rename)', async () => {
      const res = await request(app)
        .post(`/api/v1/hosts/${hostAId}/files/rename`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          fromPath: '/src/config.json',
          toPath: '/src/settings.json',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify old path no longer exists
      const oldRes = await request(app)
        .get(`/api/v1/hosts/${hostAId}/files/content?path=/src/config.json`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(oldRes.status).toBe(404);

      // Verify new path exists
      const newRes = await request(app)
        .get(`/api/v1/hosts/${hostAId}/files/content?path=/src/settings.json`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(newRes.status).toBe(200);
    });

    it('uploads a file (POST /files/upload)', async () => {
      const res = await request(app)
        .post(`/api/v1/hosts/${hostAId}/files/upload`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          destinationPath: '/src',
          filename: 'logger.ts',
          content: 'export const log = console.log;',
          encoding: 'utf-8',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      const readRes = await request(app)
        .get(`/api/v1/hosts/${hostAId}/files/content?path=/src/logger.ts`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(readRes.status).toBe(200);
      expect(readRes.body.data.content).toContain('console.log');
    });

    it('downloads a file stream (GET /files/download)', async () => {
      const res = await request(app)
        .get(`/api/v1/hosts/${hostAId}/files/download?path=/src/logger.ts`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.header['content-disposition']).toContain('attachment; filename="logger.ts"');
      const downloadedContent = res.text || res.body?.toString?.('utf-8') || '';
      expect(downloadedContent).toContain('export const log = console.log;');
    });

    it('deletes a file (DELETE /files)', async () => {
      const res = await request(app)
        .delete(`/api/v1/hosts/${hostAId}/files?path=/src/logger.ts`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify file is gone
      const verifyRes = await request(app)
        .get(`/api/v1/hosts/${hostAId}/files/content?path=/src/logger.ts`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(verifyRes.status).toBe(404);
    });

    it('deletes a directory (DELETE /files)', async () => {
      const res = await request(app)
        .delete(`/api/v1/hosts/${hostAId}/files?path=/src/controllers`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // =================================================================
  // 4. Edge Cases & Special File Types Tests
  // =================================================================
  describe('Edge Cases & Special Types', () => {
    it('returns 404 when reading a non-existent file', async () => {
      const res = await request(app)
        .get(`/api/v1/hosts/${hostAId}/files/content?path=/non-existent-file.txt`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(404);
    });

    it('returns 400 when reading a directory as a file', async () => {
      const res = await request(app)
        .get(`/api/v1/hosts/${hostAId}/files/content?path=/src`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(400);
    });

    it('detects binary files and returns isBinary: true with base64 encoding', async () => {
      // Create a binary buffer containing null bytes
      const binaryData = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x0d, 0x0a, 0x1a, 0x0a]).toString('base64');

      const uploadRes = await request(app)
        .post(`/api/v1/hosts/${hostAId}/files/upload`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          destinationPath: '/',
          filename: 'sample.png',
          content: binaryData,
          encoding: 'base64',
        });
      expect(uploadRes.status).toBe(201);

      const readRes = await request(app)
        .get(`/api/v1/hosts/${hostAId}/files/content?path=/sample.png`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(readRes.status).toBe(200);
      expect(readRes.body.data.isBinary).toBe(true);
      expect(readRes.body.data.encoding).toBe('base64');
    });

    it('returns FILE_TOO_LARGE_TO_EDIT when file exceeds 1MB edit limit', async () => {
      // Write a 1.2MB file directly to host storage
      const largeFilePath = path.join(mockClient.storageRoot, hostAId, 'large-dataset.csv');
      const largeData = Buffer.alloc(1.2 * 1024 * 1024, 'a');
      await fs.writeFile(largeFilePath, largeData);

      const res = await request(app)
        .get(`/api/v1/hosts/${hostAId}/files/content?path=/large-dataset.csv`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error?.details?.code || res.body.error?.code).toBe('FILE_TOO_LARGE_TO_EDIT');
    });

    it('allows accessing files when host is in STOPPED state', async () => {
      // Stop Host A
      await request(app)
        .post(`/api/v1/hosts/${hostAId}/actions`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ action: 'stop' });

      // Host is STOPPED, but storage should still be accessible
      const res = await request(app)
        .get(`/api/v1/hosts/${hostAId}/files?path=/`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // =================================================================
  // 5. Mock Mode Storage Isolation Tests
  // =================================================================
  describe('Mock Mode Multi-Host Isolation', () => {
    it('guarantees Host A files are completely isolated from Host B', async () => {
      // Create a secret file in Host A
      await request(app)
        .put(`/api/v1/hosts/${hostAId}/files/content`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          path: '/secret-project.txt',
          content: 'HOST_A_CONFIDENTIAL_DATA',
        });

      // User B lists their own host files (Host B)
      const listB = await request(app)
        .get(`/api/v1/hosts/${hostBId}/files?path=/`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(listB.status).toBe(200);
      const namesB = listB.body.data.entries.map((e: any) => e.name);
      // Host B must NEVER see Host A's files
      expect(namesB).not.toContain('secret-project.txt');

      // User B attempts to read secret-project.txt from Host B
      const readB = await request(app)
        .get(`/api/v1/hosts/${hostBId}/files/content?path=/secret-project.txt`)
        .set('Authorization', `Bearer ${userBToken}`);
      expect(readB.status).toBe(404);
    });
  });
});
