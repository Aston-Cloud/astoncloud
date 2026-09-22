import path from 'node:path';
import fs from 'node:fs/promises';
import { BadRequestError, ForbiddenError } from './errors.js';

export interface ValidatedPath {
  hostRoot: string;
  resolvedPath: string;
  relativePath: string;
  isRoot: boolean;
}

export interface PathSecurityOptions {
  allowRoot?: boolean;
  checkSymlink?: boolean;
}

/**
 * Validate and safely resolve a user-supplied path within a host's isolated storage root.
 * Guarantees that:
 * 1. Path is safely decoded and contains no null bytes.
 * 2. Path cannot escape host root via ../, encoded traversal, or absolute host paths.
 * 3. Symlinks cannot point outside the host root.
 * 4. Root directory is protected when allowRoot is false.
 */
export async function resolveAndValidateHostPath(
  storageRoot: string,
  hostId: string,
  userPath: string = '/',
  options: PathSecurityOptions = {}
): Promise<ValidatedPath> {
  if (!hostId || typeof hostId !== 'string' || hostId.includes('/') || hostId.includes('\\') || hostId.includes('..')) {
    throw new BadRequestError('hostId không hợp lệ');
  }

  const { allowRoot = true, checkSymlink = true } = options;

  let raw = String(userPath || '/').trim();

  // 1. Detect and reject null bytes
  if (raw.includes('\0') || raw.includes('%00')) {
    throw new BadRequestError('Đường dẫn không hợp lệ: chứa ký tự null byte');
  }

  // 2. Decode URI components safely
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch (_err) {
    throw new BadRequestError('Đường dẫn không hợp lệ: mã hóa URI không đúng định dạng');
  }

  // Re-check null bytes after decoding
  if (decoded.includes('\0')) {
    throw new BadRequestError('Đường dẫn không hợp lệ: chứa ký tự null byte sau khi giải mã');
  }

  // 3. Reject Windows drive letters and UNC paths
  if (/^[a-zA-Z]:/.test(decoded) || decoded.startsWith('\\\\') || decoded.startsWith('//')) {
    throw new BadRequestError('Đường dẫn tuyệt đối của hệ điều hành bị từ chối');
  }

  // 4. Reject explicit parent traversal tokens
  const rawSegments = decoded.split(/[/\\]+/);
  if (rawSegments.includes('..')) {
    throw new BadRequestError('Thao tác bị từ chối: phát hiện hành vi duyệt ngược thư mục (path traversal)');
  }

  // 5. Build canonical host root
  const hostRoot = path.resolve(storageRoot, hostId);

  // 6. Normalize relative path
  // Strip leading slashes to force relative resolution against hostRoot
  const cleanRelative = decoded.replace(/^[/\\]+/, '');
  const normalizedPosix = path.posix.normalize('/' + cleanRelative.replace(/\\/g, '/'));

  if (normalizedPosix === '/..' || normalizedPosix.startsWith('/../')) {
    throw new BadRequestError('Thao tác bị từ chối: đường dẫn vượt ra ngoài thư mục gốc của host');
  }

  // 7. Resolve against host root
  const relFromHost = normalizedPosix.replace(/^\//, '');
  const resolvedPath = path.resolve(hostRoot, '.' + path.sep + relFromHost.replace(/\//g, path.sep));

  // 8. Strict prefix check against host root
  const hostRootPrefix = hostRoot.endsWith(path.sep) ? hostRoot : hostRoot + path.sep;
  const isRoot = resolvedPath === hostRoot;

  if (!isRoot && !resolvedPath.startsWith(hostRootPrefix)) {
    throw new BadRequestError('Thao tác bị từ chối: đường dẫn vượt quá phạm vi lưu trữ máy chủ');
  }

  if (isRoot && !allowRoot) {
    throw new BadRequestError('Không thể thực hiện thao tác này trên thư mục gốc của máy chủ');
  }

  // 9. Symlink escape check
  if (checkSymlink) {
    try {
      const stats = await fs.lstat(resolvedPath);
      if (stats.isSymbolicLink()) {
        const realTargetPath = await fs.realpath(resolvedPath);
        const realHostRoot = await fs.realpath(hostRoot).catch(() => hostRoot);
        const realPrefix = realHostRoot.endsWith(path.sep) ? realHostRoot : realHostRoot + path.sep;

        if (realTargetPath !== realHostRoot && !realTargetPath.startsWith(realPrefix)) {
          throw new ForbiddenError('Thao tác bị từ chối: liên kết tượng trưng trỏ ra ngoài phạm vi lưu trữ máy chủ');
        }
      }
    } catch (err: any) {
      // If file does not exist yet (e.g. creating new file), check existing parent directory
      if (err.code === 'ENOENT') {
        let currentParent = path.dirname(resolvedPath);
        while (currentParent.startsWith(hostRoot)) {
          try {
            const parentStats = await fs.lstat(currentParent);
            if (parentStats.isSymbolicLink()) {
              const realParent = await fs.realpath(currentParent);
              const realHostRoot = await fs.realpath(hostRoot).catch(() => hostRoot);
              const realPrefix = realHostRoot.endsWith(path.sep) ? realHostRoot : realHostRoot + path.sep;
              if (realParent !== realHostRoot && !realParent.startsWith(realPrefix)) {
                throw new ForbiddenError('Thao tác bị từ chối: thư mục cha trỏ ra ngoài phạm vi lưu trữ máy chủ');
              }
            }
            break;
          } catch (parentErr: any) {
            if (parentErr.code === 'ENOENT') {
              currentParent = path.dirname(currentParent);
            } else {
              break;
            }
          }
        }
      } else if (err instanceof ForbiddenError || err instanceof BadRequestError) {
        throw err;
      }
    }
  }

  return {
    hostRoot,
    resolvedPath,
    relativePath: normalizedPosix,
    isRoot,
  };
}
