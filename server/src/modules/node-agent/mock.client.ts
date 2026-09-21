import crypto from 'node:crypto';
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
} from './node-agent.interface.js';
import { AppError, NotFoundError } from '../../utils/errors.js';
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

export class LocalMockNodeAgentClient implements INodeAgentClient {
  private containers: Map<string, MockContainerState> = new Map();

  // Fault injection settings for automated tests
  public failNextCreate: boolean = false;
  public failNextStart: boolean = false;
  public createErrorMessage: string = 'Mô phỏng lỗi khởi tạo container trên Node Agent';
  public startErrorMessage: string = 'Mô phỏng lỗi start container trên Node Agent';

  public reset(): void {
    this.containers.clear();
    this.failNextCreate = false;
    this.failNextStart = false;
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
}
