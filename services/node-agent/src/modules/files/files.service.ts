import path from 'node:path';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import { env } from '../../config/env.js';
import { resolveAndValidateHostPath } from '../../utils/path-security.js';
import { NotFoundError, ValidationError, AppError } from '../../utils/errors.js';

export interface FileEntryItem {
  name: string;
  type: 'file' | 'directory';
  size: number;
  modifiedAt: string;
}

export interface ListFilesResult {
  path: string;
  entries: FileEntryItem[];
}

export interface ReadFileResult {
  path: string;
  name: string;
  content: string;
  size: number;
  isBinary: boolean;
  encoding: 'utf-8' | 'base64';
}

function isBinaryBuffer(buf: Buffer): boolean {
  const checkLen = Math.min(buf.length, 512);
  for (let i = 0; i < checkLen; i++) {
    if (buf[i] === 0) return true;
  }
  return false;
}

export class FilesService {
  private static get storageRoot(): string {
    return env.DATA_ROOT_PATH;
  }

  public static async listFiles(hostId: string, dirPath: string = '/'): Promise<ListFilesResult> {
    const valid = await resolveAndValidateHostPath(this.storageRoot, hostId, dirPath, { allowRoot: true });

    let stat;
    try {
      stat = await fs.stat(valid.resolvedPath);
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        throw new NotFoundError(`Thư mục "${valid.relativePath}" không tồn tại trên node`);
      }
      throw err;
    }

    if (!stat.isDirectory()) {
      throw new ValidationError(`Đường dẫn "${valid.relativePath}" là tệp tin, không phải thư mục`);
    }

    const dirEntries = await fs.readdir(valid.resolvedPath, { withFileTypes: true });
    const entries: FileEntryItem[] = [];

    for (const item of dirEntries) {
      const itemFullPath = path.join(valid.resolvedPath, item.name);
      try {
        const itemStat = await fs.stat(itemFullPath);
        entries.push({
          name: item.name,
          type: item.isDirectory() ? 'directory' : 'file',
          size: item.isDirectory() ? 0 : itemStat.size,
          modifiedAt: itemStat.mtime.toISOString(),
        });
      } catch (_e) {
        // Skip broken/inaccessible entries
      }
    }

    entries.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

    return {
      path: valid.relativePath,
      entries,
    };
  }

  public static async readFile(
    hostId: string,
    filePath: string,
    maxSizeBytes: number = 1048576
  ): Promise<ReadFileResult> {
    const valid = await resolveAndValidateHostPath(this.storageRoot, hostId, filePath, { allowRoot: false });

    let stat;
    try {
      stat = await fs.stat(valid.resolvedPath);
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        throw new NotFoundError(`Tệp tin "${valid.relativePath}" không tồn tại trên node`);
      }
      throw err;
    }

    if (stat.isDirectory()) {
      throw new ValidationError(`Đường dẫn "${valid.relativePath}" là thư mục, không phải tệp tin`);
    }

    if (stat.size > maxSizeBytes) {
      throw new AppError('Tệp tin quá lớn để mở trong trình duyệt', 400, 'FILE_TOO_LARGE_TO_EDIT', {
        size: stat.size,
        limit: maxSizeBytes,
      });
    }

    const buffer = await fs.readFile(valid.resolvedPath);
    const isBinary = isBinaryBuffer(buffer);

    return {
      path: valid.relativePath,
      name: path.basename(valid.resolvedPath),
      content: isBinary ? buffer.toString('base64') : buffer.toString('utf-8'),
      size: stat.size,
      isBinary,
      encoding: isBinary ? 'base64' : 'utf-8',
    };
  }

  public static async writeFile(
    hostId: string,
    filePath: string,
    content: string,
    encoding: 'utf-8' | 'base64' = 'utf-8'
  ): Promise<{ path: string; size: number }> {
    const valid = await resolveAndValidateHostPath(this.storageRoot, hostId, filePath, { allowRoot: false });

    const buffer = Buffer.from(content, encoding);
    if (buffer.length > 2 * 1024 * 1024) {
      throw new ValidationError('Kích thước tệp tin vượt quá giới hạn 2MB');
    }

    await fs.mkdir(path.dirname(valid.resolvedPath), { recursive: true });
    await fs.writeFile(valid.resolvedPath, buffer);

    return {
      path: valid.relativePath,
      size: buffer.length,
    };
  }

  public static async createDirectory(hostId: string, dirPath: string): Promise<{ path: string }> {
    const valid = await resolveAndValidateHostPath(this.storageRoot, hostId, dirPath, { allowRoot: false });
    await fs.mkdir(valid.resolvedPath, { recursive: true });

    return {
      path: valid.relativePath,
    };
  }

  public static async deleteFile(hostId: string, targetPath: string): Promise<{ path: string; deleted: boolean }> {
    const valid = await resolveAndValidateHostPath(this.storageRoot, hostId, targetPath, { allowRoot: false });

    try {
      await fs.stat(valid.resolvedPath);
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        throw new NotFoundError(`Tệp hoặc thư mục "${valid.relativePath}" không tồn tại trên node`);
      }
      throw err;
    }

    await fs.rm(valid.resolvedPath, { recursive: true, force: true });

    return {
      path: valid.relativePath,
      deleted: true,
    };
  }

  public static async renameFile(
    hostId: string,
    fromPath: string,
    toPath: string
  ): Promise<{ from: string; to: string }> {
    const validFrom = await resolveAndValidateHostPath(this.storageRoot, hostId, fromPath, { allowRoot: false });
    const validTo = await resolveAndValidateHostPath(this.storageRoot, hostId, toPath, { allowRoot: false });

    try {
      await fs.stat(validFrom.resolvedPath);
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        throw new NotFoundError(`Tệp nguồn "${validFrom.relativePath}" không tồn tại trên node`);
      }
      throw err;
    }

    await fs.mkdir(path.dirname(validTo.resolvedPath), { recursive: true });
    await fs.rename(validFrom.resolvedPath, validTo.resolvedPath);

    return {
      from: validFrom.relativePath,
      to: validTo.relativePath,
    };
  }

  public static async uploadFile(
    hostId: string,
    destinationPath: string,
    filename: string,
    content: string,
    encoding: 'utf-8' | 'base64' = 'utf-8'
  ): Promise<{ path: string; size: number }> {
    const validDest = await resolveAndValidateHostPath(this.storageRoot, hostId, destinationPath || '/', {
      allowRoot: true,
    });

    const cleanFilename = path.basename(filename).replace(/[\/\\]/g, '').trim();
    if (!cleanFilename || cleanFilename === '.' || cleanFilename === '..') {
      throw new ValidationError('Tên tệp tải lên không hợp lệ');
    }

    const targetSubPath = path.posix.join(validDest.relativePath, cleanFilename);
    const validTarget = await resolveAndValidateHostPath(this.storageRoot, hostId, targetSubPath, {
      allowRoot: false,
    });

    const buffer = Buffer.from(content, encoding);
    if (buffer.length > 10 * 1024 * 1024) {
      throw new ValidationError('Kích thước tệp tải lên vượt quá giới hạn 10MB');
    }

    await fs.mkdir(path.dirname(validTarget.resolvedPath), { recursive: true });
    await fs.writeFile(validTarget.resolvedPath, buffer);

    return {
      path: validTarget.relativePath,
      size: buffer.length,
    };
  }

  public static async downloadFile(
    hostId: string,
    filePath: string
  ): Promise<{ stream: fsSync.ReadStream; filename: string; size: number }> {
    const valid = await resolveAndValidateHostPath(this.storageRoot, hostId, filePath, { allowRoot: false });

    let stat;
    try {
      stat = await fs.stat(valid.resolvedPath);
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        throw new NotFoundError(`Tệp tin "${valid.relativePath}" không tồn tại trên node`);
      }
      throw err;
    }

    if (stat.isDirectory()) {
      throw new ValidationError(`Không thể tải xuống thư mục "${valid.relativePath}" trực tiếp`);
    }

    const stream = fsSync.createReadStream(valid.resolvedPath);
    return {
      stream,
      filename: path.basename(valid.resolvedPath),
      size: stat.size,
    };
  }
}
