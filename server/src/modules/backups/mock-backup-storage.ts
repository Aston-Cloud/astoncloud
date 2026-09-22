import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { env } from '../../config/env.js';
import { AppError, NotFoundError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';
import type {
  IBackupStorageProvider,
  CreateSnapshotResult,
  RestoreSnapshotResult,
} from './backup.interface.js';

interface TarEntry {
  name: string;
  type: 'file' | 'directory';
  data?: Buffer;
  mode?: number;
  mtime?: number;
}

/**
 * Creates a standard POSIX UStar 512-byte tar header block
 */
function createTarHeader(name: string, size: number, type: 'file' | 'directory'): Buffer {
  const header = Buffer.alloc(512);

  // 1. File name (0-99)
  const nameBuf = Buffer.from(name.replace(/\\/g, '/'), 'utf8');
  if (nameBuf.length > 99) {
    nameBuf.copy(header, 0, 0, 99);
  } else {
    nameBuf.copy(header, 0);
  }

  // 2. File mode (100-107): 0644 for file, 0755 for directory (octal)
  const modeStr = (type === 'directory' ? '0000755' : '0000644').padStart(7, '0') + '\0';
  Buffer.from(modeStr).copy(header, 100);

  // 3. Owner UID (108-115)
  Buffer.from('0000000\0').copy(header, 108);

  // 4. Group GID (116-123)
  Buffer.from('0000000\0').copy(header, 116);

  // 5. Size in bytes (124-135): octal string with trailing space or null
  const sizeOctal = size.toString(8).padStart(11, '0') + '\0';
  Buffer.from(sizeOctal).copy(header, 124);

  // 6. Modification time (136-147)
  const mtimeOctal = Math.floor(Date.now() / 1000).toString(8).padStart(11, '0') + '\0';
  Buffer.from(mtimeOctal).copy(header, 136);

  // 7. Checksum (148-155) - temporary fill with spaces for calculation
  Buffer.from('        ').copy(header, 148);

  // 8. Type flag (156): '0' = normal file, '5' = directory
  header[156] = type === 'directory' ? 53 : 48; // '5' or '0'

  // 9. Magic string "ustar" (257-262) & Version "00" (263-264)
  Buffer.from('ustar\0').copy(header, 257);
  Buffer.from('00').copy(header, 263);

  // Calculate checksum: unsigned sum of all bytes in header with checksum field treated as spaces
  let checksum = 0;
  for (let i = 0; i < 512; i++) {
    checksum += header[i];
  }
  const checksumOctal = checksum.toString(8).padStart(6, '0') + '\0 ';
  Buffer.from(checksumOctal).copy(header, 148);

  return header;
}

/**
 * Packs multiple entries into an uncompressed tar Buffer
 */
function packTar(entries: TarEntry[]): Buffer {
  const buffers: Buffer[] = [];

  for (const entry of entries) {
    const data = entry.data || Buffer.alloc(0);
    const header = createTarHeader(entry.name, data.length, entry.type);
    buffers.push(header);

    if (data.length > 0) {
      buffers.push(data);
      // Pad to 512-byte boundary
      const remainder = data.length % 512;
      if (remainder !== 0) {
        buffers.push(Buffer.alloc(512 - remainder));
      }
    }
  }

  // End of archive marker: two 512-byte zero blocks
  buffers.push(Buffer.alloc(1024));

  return Buffer.concat(buffers);
}

/**
 * Unpacks an uncompressed tar Buffer with strict Tar Slip / Path Traversal validation
 */
function unpackTar(tarBuf: Buffer, targetDir: string): { name: string; type: 'file' | 'directory'; data?: Buffer }[] {
  const entries: { name: string; type: 'file' | 'directory'; data?: Buffer }[] = [];
  const normalizedTargetDir = path.resolve(targetDir);
  let offset = 0;

  while (offset + 512 <= tarBuf.length) {
    const header = tarBuf.subarray(offset, offset + 512);

    // End of archive marker (512 bytes of zeros)
    let isZero = true;
    for (let i = 0; i < 512; i++) {
      if (header[i] !== 0) {
        isZero = false;
        break;
      }
    }
    if (isZero) break;

    // Read file name (null-terminated string)
    let endName = 0;
    while (endName < 100 && header[endName] !== 0) endName++;
    const rawName = header.subarray(0, endName).toString('utf8').trim();

    if (!rawName) {
      offset += 512;
      continue;
    }

    // Read size (octal)
    let endSize = 124;
    while (endSize < 136 && header[endSize] !== 0 && header[endSize] !== 32) endSize++;
    const sizeStr = header.subarray(124, endSize).toString('utf8').trim();
    const size = parseInt(sizeStr, 8) || 0;

    // Type flag
    const typeFlag = header[156];
    const isDir = typeFlag === 53 || rawName.endsWith('/'); // '5' or trailing slash

    offset += 512;

    // Strict Tar Slip / Path Traversal Security Checks:
    // 1. Must not contain directory traversal sequences
    if (rawName.includes('..') || rawName.includes('/../') || rawName.includes('\\..\\')) {
      throw new AppError(
        `Phát hiện đường dẫn tệp không an toàn trong bản sao lưu (chứa ".."): "${rawName}"`,
        400,
        { code: 'PATH_TRAVERSAL_DETECTED', path: rawName }
      );
    }

    // 2. Must not start with absolute path indicators or drive letters
    if (path.isAbsolute(rawName) || rawName.startsWith('/') || rawName.startsWith('\\') || /^[a-zA-Z]:/.test(rawName)) {
      throw new AppError(
        `Phát hiện đường dẫn tệp tuyệt đối trong bản sao lưu: "${rawName}"`,
        400,
        { code: 'ABSOLUTE_PATH_DETECTED', path: rawName }
      );
    }

    // 3. Resolve destination path and verify it stays inside targetDir
    const resolvedPath = path.resolve(normalizedTargetDir, rawName);
    if (!resolvedPath.startsWith(normalizedTargetDir + path.sep) && resolvedPath !== normalizedTargetDir) {
      throw new AppError(
        `Đường dẫn tệp vượt ra ngoài thư mục lưu trữ của máy chủ: "${rawName}"`,
        400,
        { code: 'PATH_ESCAPE_DETECTED', path: rawName }
      );
    }

    let fileData: Buffer | undefined;
    if (!isDir && size > 0) {
      if (offset + size > tarBuf.length) {
        throw new AppError('Tệp sao lưu bị hỏng hoặc kết thúc bất thường', 400);
      }
      fileData = Buffer.from(tarBuf.subarray(offset, offset + size));
      // Advance offset to next 512-byte boundary
      const padding = size % 512 === 0 ? 0 : 512 - (size % 512);
      offset += size + padding;
    }

    entries.push({
      name: rawName,
      type: isDir ? 'directory' : 'file',
      data: fileData,
    });
  }

  return entries;
}

export class MockBackupStorageProvider implements IBackupStorageProvider {
  private readonly storageRoot: string;

  constructor(customStorageRoot?: string) {
    this.storageRoot = customStorageRoot || path.resolve(process.cwd(), env.BACKUP_STORAGE_DIR);
  }

  public getHostBackupDir(hostId: string): string {
    return path.join(this.storageRoot, hostId);
  }

  public resolveStoragePath(storageKey: string): string {
    if (path.isAbsolute(storageKey)) {
      return storageKey;
    }
    return path.resolve(process.cwd(), storageKey);
  }

  /**
   * Creates an isolated tar.gz snapshot of all files inside sourceDir
   */
  public async createSnapshot(
    hostId: string,
    backupId: string,
    sourceDir: string
  ): Promise<CreateSnapshotResult> {
    const hostBackupDir = this.getHostBackupDir(hostId);
    await fs.mkdir(hostBackupDir, { recursive: true });

    const archiveFileName = `${backupId}.tar.gz`;
    const targetFilePath = path.join(hostBackupDir, archiveFileName);
    const storageKey = path.relative(process.cwd(), targetFilePath).replace(/\\/g, '/');

    // Recursively read source files
    const entries: TarEntry[] = [];
    let fileCount = 0;

    const scanDirectory = async (currentDir: string, relativePrefix: string = '') => {
      let items;
      try {
        items = await fs.readdir(currentDir, { withFileTypes: true });
      } catch (err: any) {
        if (err.code === 'ENOENT') {
          return; // Empty directory or non-existent source
        }
        throw err;
      }

      for (const item of items) {
        const fullPath = path.join(currentDir, item.name);
        const relPath = relativePrefix ? `${relativePrefix}/${item.name}` : item.name;

        if (item.isDirectory()) {
          entries.push({ name: `${relPath}/`, type: 'directory' });
          await scanDirectory(fullPath, relPath);
        } else if (item.isFile()) {
          const content = await fs.readFile(fullPath);
          entries.push({ name: relPath, type: 'file', data: content });
          fileCount++;
        }
      }
    };

    await scanDirectory(sourceDir);

    // Pack into tar then gzip
    const tarBuffer = packTar(entries);
    const gzippedBuffer = zlib.gzipSync(tarBuffer);

    // Write to isolated host backup storage
    await fs.writeFile(targetFilePath, gzippedBuffer);

    // Compute checksum
    const checksum = crypto.createHash('sha256').update(gzippedBuffer).digest('hex');

    logger.info(
      { hostId, backupId, fileCount, sizeBytes: gzippedBuffer.length, targetFilePath },
      '[MockBackupStorageProvider] Backup snapshot created successfully'
    );

    return {
      storageKey,
      sizeBytes: gzippedBuffer.length,
      fileCount,
      checksum,
      format: 'tar.gz',
    };
  }

  /**
   * Restores files from storageKey into targetDir with full path protection
   */
  public async restoreSnapshot(
    hostId: string,
    storageKey: string,
    targetDir: string
  ): Promise<RestoreSnapshotResult> {
    const resolvedArchive = this.resolveStoragePath(storageKey);

    let gzippedBuffer: Buffer;
    try {
      gzippedBuffer = await fs.readFile(resolvedArchive);
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        throw new NotFoundError(`Tệp lưu trữ bản sao lưu không tồn tại trên hệ thống`);
      }
      throw err;
    }

    let tarBuffer: Buffer;
    try {
      tarBuffer = zlib.gunzipSync(gzippedBuffer);
    } catch (err: any) {
      throw new AppError(`Tệp sao lưu bị lỗi định dạng nén gzip: ${err.message}`, 400);
    }

    // Unpack with strict security validation
    const entries = unpackTar(tarBuffer, targetDir);

    // Ensure targetDir exists
    await fs.mkdir(targetDir, { recursive: true });

    // Clean existing files inside targetDir to perform a clean state restore
    try {
      const existingItems = await fs.readdir(targetDir);
      for (const item of existingItems) {
        await fs.rm(path.join(targetDir, item), { recursive: true, force: true });
      }
    } catch (_err) {
      // Ignore directory cleanup error if freshly created
    }

    let restoredFiles = 0;
    let totalBytes = 0;

    for (const entry of entries) {
      const destPath = path.resolve(targetDir, entry.name);

      if (entry.type === 'directory') {
        await fs.mkdir(destPath, { recursive: true });
      } else if (entry.type === 'file' && entry.data) {
        // Ensure parent directory exists
        await fs.mkdir(path.dirname(destPath), { recursive: true });
        await fs.writeFile(destPath, entry.data);
        restoredFiles++;
        totalBytes += entry.data.length;
      }
    }

    logger.info(
      { hostId, storageKey, targetDir, restoredFiles, totalBytes },
      '[MockBackupStorageProvider] Backup restored successfully'
    );

    return {
      restoredFiles,
      sizeBytes: totalBytes,
      restoredAt: new Date(),
    };
  }

  /**
   * Deletes a backup snapshot file
   */
  public async deleteSnapshot(storageKey: string): Promise<boolean> {
    const resolvedPath = this.resolveStoragePath(storageKey);
    try {
      await fs.rm(resolvedPath, { force: true });
      return true;
    } catch (err: any) {
      logger.warn({ storageKey, err: err.message }, '[MockBackupStorageProvider] Failed to delete backup file');
      return false;
    }
  }

  /**
   * Checks existence and size of a snapshot in storage
   */
  public async getSnapshotStats(
    storageKey: string
  ): Promise<{ exists: boolean; sizeBytes: number } | null> {
    const resolvedPath = this.resolveStoragePath(storageKey);
    try {
      const stat = await fs.stat(resolvedPath);
      return {
        exists: true,
        sizeBytes: stat.size,
      };
    } catch (_e) {
      return null;
    }
  }
}

export const mockBackupStorageProvider = new MockBackupStorageProvider();
