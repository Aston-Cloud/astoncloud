import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import {
  INodeAgentClient,
  NodeContext,
  CreateContainerOptions,
  ContainerResult,
  ContainerActionResult,
  ContainerDeleteResult,
  ContainerStatsResult,
  ContainerLogsResult,
  LogEntryItem,
  FileEntryItem,
  ListFilesResult,
  ReadFileResult,
  WriteFileOptions,
  UploadFileOptions,
  FileDownloadStream,
} from './node-agent.interface.js';
import { AppError, NotFoundError, BadRequestError } from '../../utils/errors.js';
import { resolveAndValidateHostPath } from '../../utils/path-security.js';
import { logger } from '../../utils/logger.js';

interface MockContainerState {
  id: string;
  hostId: string;
  name: string;
  runtime: string;
  version: string;
  image: string;
  port: number;
  status: 'created' | 'running' | 'stopped' | 'exited' | 'error';
  resources: {
    cpuLimit: number;
    memoryLimitMb: number;
    diskLimitMb: number;
    pidsLimit: number;
  };
  env: Record<string, string>;
  createdAt: Date;
  startedAt?: Date;
  stoppedAt?: Date;
  logs: LogEntryItem[];
}

function isBinaryBuffer(buf: Buffer): boolean {
  const checkLen = Math.min(buf.length, 512);
  for (let i = 0; i < checkLen; i++) {
    if (buf[i] === 0) return true;
  }
  return false;
}

export class LocalMockNodeAgentClient implements INodeAgentClient {
  private containers: Map<string, MockContainerState> = new Map();
  public readonly storageRoot: string;

  constructor(customStorageRoot?: string) {
    this.storageRoot = customStorageRoot || process.env.MOCK_STORAGE_DIR || path.resolve(process.cwd(), 'mock-storage');
  }

  // Fault injection settings for automated tests
  public failNextCreate: boolean = false;
  public failNextStart: boolean = false;
  public createErrorMessage: string = 'Mô phỏng lỗi khởi tạo container trên Node Agent';
  public startErrorMessage: string = 'Mô phỏng lỗi start container trên Node Agent';

  public async reset(): Promise<void> {
    this.containers.clear();
    this.failNextCreate = false;
    this.failNextStart = false;
    try {
      await fs.rm(this.storageRoot, { recursive: true, force: true });
    } catch (_err) {
      // Ignore if directory doesn't exist
    }
  }

  private resolveImage(runtime: string, version: string): string {
    switch (runtime.toLowerCase()) {
      case 'nodejs':
      case 'node':
        return `node:${version}-alpine`;
      case 'bun':
        return version === 'stable' ? 'oven/bun:1.2-alpine' : 'oven/bun:latest';
      case 'python':
        return `python:${version}-slim`;
      default:
        return `${runtime}:${version}`;
    }
  }

  private appendLog(
    record: MockContainerState,
    level: 'info' | 'warn' | 'error' | 'debug',
    message: string,
    timestamp?: string
  ): void {
    const ts = timestamp || new Date().toISOString();
    record.logs.push({
      timestamp: ts,
      level,
      message,
    });
  }

  public async createContainer(
    node: NodeContext,
    options: CreateContainerOptions
  ): Promise<ContainerResult> {
    logger.info(
      { nodeId: node.id, hostId: options.hostId, runtime: options.runtime },
      '[LocalMockNodeAgentClient] Creating simulated container'
    );

    if (this.failNextCreate) {
      this.failNextCreate = false;
      throw new AppError(this.createErrorMessage, 500);
    }

    const containerId = `mock-c${crypto.randomBytes(6).toString('hex')}`;
    const name = `cloud-host-${options.hostId}`;
    const image = this.resolveImage(options.runtime, options.version);

    const record: MockContainerState = {
      id: containerId,
      hostId: options.hostId,
      name,
      runtime: options.runtime,
      version: options.version,
      image,
      port: options.port,
      status: 'created',
      resources: {
        cpuLimit: options.resources.cpuLimit,
        memoryLimitMb: options.resources.memoryLimitMb,
        diskLimitMb: options.resources.diskLimitMb,
        pidsLimit: options.resources.pidsLimit || 200,
      },
      env: options.env || {},
      createdAt: new Date(),
      logs: [],
    };

    const now = record.createdAt;
    this.appendLog(record, 'info', `Container created (${name}, image: ${image})`, now.toISOString());
    this.appendLog(
      record,
      'info',
      `Working directory /app mounted securely from /var/lib/cloud-hosting/${options.hostId}/app`,
      new Date(now.getTime() + 10).toISOString()
    );
    this.appendLog(
      record,
      'info',
      `Resource quotas enforced: ${record.resources.cpuLimit} vCPU, ${record.resources.memoryLimitMb} MB RAM, ${record.resources.pidsLimit} PIDs`,
      new Date(now.getTime() + 20).toISOString()
    );
    this.appendLog(
      record,
      'info',
      `Network port ${options.port} allocated for host ingress`,
      new Date(now.getTime() + 30).toISOString()
    );

    this.containers.set(containerId, record);
    // Also index by hostId for easy lookup
    this.containers.set(options.hostId, record);

    // Initialize isolated storage directory with deterministic seed files
    await this.ensureHostStorage(options.hostId, options.runtime);

    return {
      containerId,
      hostId: options.hostId,
      name,
      status: 'created',
      image,
      port: options.port,
      created: record.createdAt.toISOString(),
      resources: {
        cpuLimit: record.resources.cpuLimit,
        memoryLimitMb: record.resources.memoryLimitMb,
        diskLimitMb: record.resources.diskLimitMb,
      },
    };
  }

  public async startContainer(
    node: NodeContext,
    containerIdOrHostId: string
  ): Promise<ContainerActionResult> {
    logger.info(
      { nodeId: node.id, target: containerIdOrHostId },
      '[LocalMockNodeAgentClient] Starting simulated container'
    );

    if (this.failNextStart) {
      this.failNextStart = false;
      throw new AppError(this.startErrorMessage, 500);
    }

    const record = this.containers.get(containerIdOrHostId);
    if (!record) {
      throw new NotFoundError(`Container hoặc host "${containerIdOrHostId}" không tồn tại trên mock node`);
    }

    record.status = 'running';
    record.startedAt = new Date();

    const now = record.startedAt;
    this.appendLog(record, 'info', 'Container starting', now.toISOString());
    this.appendLog(
      record,
      'info',
      `Runtime initialized (${record.runtime} ${record.version})`,
      new Date(now.getTime() + 50).toISOString()
    );
    this.appendLog(record, 'info', 'Application starting', new Date(now.getTime() + 100).toISOString());
    this.appendLog(record, 'info', `Listening on port ${record.port}`, new Date(now.getTime() + 150).toISOString());
    this.appendLog(record, 'info', 'Application ready', new Date(now.getTime() + 200).toISOString());

    return {
      id: record.id,
      status: 'running',
    };
  }

  public async stopContainer(
    node: NodeContext,
    containerIdOrHostId: string,
    _timeout?: number
  ): Promise<ContainerActionResult> {
    logger.info(
      { nodeId: node.id, target: containerIdOrHostId },
      '[LocalMockNodeAgentClient] Stopping simulated container'
    );

    const record = this.containers.get(containerIdOrHostId);
    if (!record) {
      throw new NotFoundError(`Container hoặc host "${containerIdOrHostId}" không tồn tại trên mock node`);
    }

    record.status = 'exited';
    record.stoppedAt = new Date();

    const now = record.stoppedAt;
    this.appendLog(record, 'warn', 'SIGTERM signal received, graceful shutdown initiated', now.toISOString());
    this.appendLog(record, 'info', 'Application stopping', new Date(now.getTime() + 50).toISOString());
    this.appendLog(record, 'info', 'HTTP listeners closed', new Date(now.getTime() + 100).toISOString());
    this.appendLog(record, 'info', 'Container stopped', new Date(now.getTime() + 150).toISOString());

    return {
      id: record.id,
      status: 'exited',
    };
  }

  public async restartContainer(
    node: NodeContext,
    containerIdOrHostId: string,
    _timeout?: number
  ): Promise<ContainerActionResult> {
    logger.info(
      { nodeId: node.id, target: containerIdOrHostId },
      '[LocalMockNodeAgentClient] Restarting simulated container'
    );

    const record = this.containers.get(containerIdOrHostId);
    if (!record) {
      throw new NotFoundError(`Container hoặc host "${containerIdOrHostId}" không tồn tại trên mock node`);
    }

    record.status = 'running';
    record.startedAt = new Date();

    const now = record.startedAt;
    this.appendLog(record, 'info', 'Container restarting', now.toISOString());
    this.appendLog(record, 'info', 'Application stopping', new Date(now.getTime() + 50).toISOString());
    this.appendLog(record, 'info', 'Application stopped', new Date(now.getTime() + 100).toISOString());
    this.appendLog(
      record,
      'info',
      `Runtime initialized (${record.runtime} ${record.version})`,
      new Date(now.getTime() + 150).toISOString()
    );
    this.appendLog(record, 'info', 'Application starting', new Date(now.getTime() + 200).toISOString());
    this.appendLog(record, 'info', `Listening on port ${record.port}`, new Date(now.getTime() + 250).toISOString());
    this.appendLog(record, 'info', 'Application started', new Date(now.getTime() + 300).toISOString());

    return {
      id: record.id,
      status: 'running',
    };
  }

  public async deleteContainer(
    node: NodeContext,
    containerIdOrHostId: string,
    _force?: boolean
  ): Promise<ContainerDeleteResult> {
    logger.info(
      { nodeId: node.id, target: containerIdOrHostId },
      '[LocalMockNodeAgentClient] Deleting simulated container'
    );

    const record = this.containers.get(containerIdOrHostId);
    if (record) {
      this.appendLog(record, 'info', 'Container removed');
      this.containers.delete(record.id);
      this.containers.delete(record.hostId);
    }

    return {
      id: containerIdOrHostId,
      deleted: true,
    };
  }

  public async getContainerStatus(
    _node: NodeContext,
    containerIdOrHostId: string
  ): Promise<ContainerResult | null> {
    const record = this.containers.get(containerIdOrHostId);
    if (!record) return null;

    return {
      containerId: record.id,
      hostId: record.hostId,
      name: record.name,
      status: record.status,
      image: record.image,
      port: record.port,
      created: record.createdAt.toISOString(),
      resources: {
        cpuLimit: record.resources.cpuLimit,
        memoryLimitMb: record.resources.memoryLimitMb,
        diskLimitMb: record.resources.diskLimitMb,
      },
    };
  }

  public async getContainerStats(
    _node: NodeContext,
    containerIdOrHostId: string
  ): Promise<ContainerStatsResult> {
    const record = this.containers.get(containerIdOrHostId);
    if (!record) {
      throw new NotFoundError(`Container "${containerIdOrHostId}" không tồn tại trên mock node`);
    }

    const isRunning = record.status === 'running';
    return {
      id: record.id,
      hostId: record.hostId,
      cpuPercent: isRunning ? Number((Math.random() * 5 + 1.2).toFixed(1)) : 0,
      memoryUsageMb: isRunning ? Math.round(record.resources.memoryLimitMb * 0.25) : 0,
      memoryLimitMb: record.resources.memoryLimitMb,
      pids: isRunning ? 3 : 0,
      timestamp: new Date().toISOString(),
    };
  }

  public async getContainerLogs(
    _node: NodeContext,
    containerIdOrHostId: string,
    options?: { tail?: number; since?: number; level?: string; search?: string }
  ): Promise<ContainerLogsResult> {
    const record = this.containers.get(containerIdOrHostId);
    if (!record) {
      throw new NotFoundError(`Container "${containerIdOrHostId}" không tồn tại trên mock node`);
    }

    let filtered = [...record.logs];

    if (options?.since) {
      const sinceTime = options.since;
      filtered = filtered.filter((l) => new Date(l.timestamp).getTime() >= sinceTime);
    }

    if (options?.level && options.level.toLowerCase() !== 'all') {
      const lvl = options.level.toLowerCase();
      filtered = filtered.filter((l) => l.level.toLowerCase() === lvl);
    }

    if (options?.search) {
      const query = options.search.toLowerCase();
      filtered = filtered.filter(
        (l) => l.message.toLowerCase().includes(query) || l.level.toLowerCase().includes(query)
      );
    }

    const tail = options?.tail ? Math.max(1, options.tail) : 100;
    const sliced = filtered.slice(-tail);

    const lines = sliced.map(
      (entry) => `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}`
    );

    return {
      id: record.id,
      lines,
      total: filtered.length,
      entries: sliced,
    };
  }

  // ==========================================
  // HOST FILESYSTEM IMPLEMENTATION
  // ==========================================

  public async ensureHostStorage(hostId: string, runtime?: string): Promise<string> {
    const hostDir = path.resolve(this.storageRoot, hostId);
    try {
      await fs.mkdir(hostDir, { recursive: true });
    } catch (_e) {}

    const isNodeOrBun = !runtime || runtime.toLowerCase().includes('node') || runtime.toLowerCase().includes('bun');
    const primaryManifest = path.join(hostDir, isNodeOrBun ? 'package.json' : 'requirements.txt');
    try {
      await fs.access(primaryManifest);
      return hostDir;
    } catch (_e) {
      // File does not exist yet; populate deterministic seed files
    }

    const srcDir = path.join(hostDir, 'src');
    await fs.mkdir(srcDir, { recursive: true });

    if (isNodeOrBun) {
      await fs.writeFile(
        path.join(hostDir, 'package.json'),
        JSON.stringify(
          {
            name: `cloud-app-${hostId.slice(0, 8)}`,
            version: '1.0.0',
            main: 'src/index.js',
            scripts: {
              start: 'node src/index.js',
            },
            dependencies: {},
          },
          null,
          2
        ),
        'utf-8'
      );

      await fs.writeFile(
        path.join(srcDir, 'index.js'),
        `// Aston Cloud Application Entrypoint\nconst http = require('http');\nconst PORT = process.env.PORT || 3000;\n\nconst server = http.createServer((req, res) => {\n  res.writeHead(200, { 'Content-Type': 'application/json' });\n  res.end(JSON.stringify({ status: 'ok', message: 'Hello from Aston Cloud!' }));\n});\n\nserver.listen(PORT, () => {\n  console.log(\`Server running on port \${PORT}\`);\n});\n`,
        'utf-8'
      );
    } else {
      await fs.writeFile(
        path.join(hostDir, 'requirements.txt'),
        'fastapi>=0.100.0\nuvicorn>=0.22.0\n',
        'utf-8'
      );

      await fs.writeFile(
        path.join(srcDir, 'main.py'),
        `# Aston Cloud Python Entrypoint\nfrom fastapi import FastAPI\nimport os\n\napp = FastAPI()\n\n@app.get("/")\ndef read_root():\n    return {"status": "ok", "message": "Hello from Aston Cloud Python Host!"}\n`,
        'utf-8'
      );
    }

    await fs.writeFile(
      path.join(hostDir, 'README.md'),
      `# Aston Cloud Isolated Environment\n\nChào mừng bạn đến với môi trường container độc lập.\n- Mã nguồn ứng dụng đặt trong thư mục này.\n- Thư mục gốc: \`/\`\n- Tệp thực thi chính nằm tại: \`src/\`\n`,
      'utf-8'
    );

    return hostDir;
  }

  public async listFiles(
    _node: NodeContext,
    hostId: string,
    dirPath: string = '/'
  ): Promise<ListFilesResult> {
    await this.ensureHostStorage(hostId);
    const valid = await resolveAndValidateHostPath(this.storageRoot, hostId, dirPath, { allowRoot: true });

    let stat;
    try {
      stat = await fs.stat(valid.resolvedPath);
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        throw new NotFoundError(`Thư mục "${valid.relativePath}" không tồn tại`);
      }
      throw err;
    }

    if (!stat.isDirectory()) {
      throw new BadRequestError(`Đường dẫn "${valid.relativePath}" là tệp tin, không phải thư mục`);
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
        // Skip inaccessible entries
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

  public async readFile(
    _node: NodeContext,
    hostId: string,
    filePath: string,
    maxSizeBytes: number = 1048576
  ): Promise<ReadFileResult> {
    await this.ensureHostStorage(hostId);
    const valid = await resolveAndValidateHostPath(this.storageRoot, hostId, filePath, { allowRoot: false });

    let stat;
    try {
      stat = await fs.stat(valid.resolvedPath);
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        throw new NotFoundError(`Tệp tin "${valid.relativePath}" không tồn tại`);
      }
      throw err;
    }

    if (stat.isDirectory()) {
      throw new BadRequestError(`Đường dẫn "${valid.relativePath}" là thư mục, không phải tệp tin`);
    }

    if (stat.size > maxSizeBytes) {
      throw new AppError(
        'Tệp tin quá lớn để mở trong trình duyệt',
        400,
        { code: 'FILE_TOO_LARGE_TO_EDIT', size: stat.size, limit: maxSizeBytes }
      );
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

  public async writeFile(
    _node: NodeContext,
    hostId: string,
    options: WriteFileOptions
  ): Promise<{ path: string; size: number }> {
    await this.ensureHostStorage(hostId);
    const valid = await resolveAndValidateHostPath(this.storageRoot, hostId, options.path, { allowRoot: false });

    const encoding = options.encoding === 'base64' ? 'base64' : 'utf-8';
    const buffer = Buffer.from(options.content, encoding);

    if (buffer.length > 2 * 1024 * 1024) {
      throw new BadRequestError('Kích thước tệp tin vượt quá giới hạn tối đa 2MB');
    }

    await fs.mkdir(path.dirname(valid.resolvedPath), { recursive: true });
    await fs.writeFile(valid.resolvedPath, buffer);

    return {
      path: valid.relativePath,
      size: buffer.length,
    };
  }

  public async createDirectory(
    _node: NodeContext,
    hostId: string,
    dirPath: string
  ): Promise<{ path: string }> {
    await this.ensureHostStorage(hostId);
    const valid = await resolveAndValidateHostPath(this.storageRoot, hostId, dirPath, { allowRoot: false });

    await fs.mkdir(valid.resolvedPath, { recursive: true });

    return {
      path: valid.relativePath,
    };
  }

  public async deleteFile(
    _node: NodeContext,
    hostId: string,
    targetPath: string
  ): Promise<{ path: string; deleted: boolean }> {
    await this.ensureHostStorage(hostId);
    const valid = await resolveAndValidateHostPath(this.storageRoot, hostId, targetPath, { allowRoot: false });

    try {
      await fs.stat(valid.resolvedPath);
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        throw new NotFoundError(`Tệp hoặc thư mục "${valid.relativePath}" không tồn tại`);
      }
      throw err;
    }

    await fs.rm(valid.resolvedPath, { recursive: true, force: true });

    return {
      path: valid.relativePath,
      deleted: true,
    };
  }

  public async renameFile(
    _node: NodeContext,
    hostId: string,
    fromPath: string,
    toPath: string
  ): Promise<{ from: string; to: string }> {
    await this.ensureHostStorage(hostId);
    const validFrom = await resolveAndValidateHostPath(this.storageRoot, hostId, fromPath, { allowRoot: false });
    const validTo = await resolveAndValidateHostPath(this.storageRoot, hostId, toPath, { allowRoot: false });

    try {
      await fs.stat(validFrom.resolvedPath);
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        throw new NotFoundError(`Tệp nguồn "${validFrom.relativePath}" không tồn tại`);
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

  public async uploadFile(
    _node: NodeContext,
    hostId: string,
    options: UploadFileOptions
  ): Promise<{ path: string; size: number }> {
    await this.ensureHostStorage(hostId);
    const validDest = await resolveAndValidateHostPath(this.storageRoot, hostId, options.destinationPath || '/', {
      allowRoot: true,
    });

    const cleanFilename = path.basename(options.filename).replace(/[\/\\]/g, '').trim();
    if (!cleanFilename || cleanFilename === '.' || cleanFilename === '..') {
      throw new BadRequestError('Tên tệp tải lên không hợp lệ');
    }

    const targetSubPath = path.posix.join(validDest.relativePath, cleanFilename);
    const validTarget = await resolveAndValidateHostPath(this.storageRoot, hostId, targetSubPath, {
      allowRoot: false,
    });

    const encoding = options.encoding === 'base64' ? 'base64' : 'utf-8';
    const buffer = Buffer.isBuffer(options.content)
      ? options.content
      : Buffer.from(options.content, encoding);

    if (buffer.length > 10 * 1024 * 1024) {
      throw new BadRequestError('Kích thước tệp tải lên vượt quá giới hạn 10MB');
    }

    await fs.mkdir(path.dirname(validTarget.resolvedPath), { recursive: true });
    await fs.writeFile(validTarget.resolvedPath, buffer);

    return {
      path: validTarget.relativePath,
      size: buffer.length,
    };
  }

  public async downloadFile(
    _node: NodeContext,
    hostId: string,
    filePath: string
  ): Promise<FileDownloadStream> {
    await this.ensureHostStorage(hostId);
    const valid = await resolveAndValidateHostPath(this.storageRoot, hostId, filePath, { allowRoot: false });

    let stat;
    try {
      stat = await fs.stat(valid.resolvedPath);
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        throw new NotFoundError(`Tệp tin "${valid.relativePath}" không tồn tại`);
      }
      throw err;
    }

    if (stat.isDirectory()) {
      throw new BadRequestError(`Không thể tải xuống thư mục "${valid.relativePath}" trực tiếp`);
    }

    const stream = fsSync.createReadStream(valid.resolvedPath);
    return {
      stream,
      filename: path.basename(valid.resolvedPath),
      size: stat.size,
    };
  }
}
