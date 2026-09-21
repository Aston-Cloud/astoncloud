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
    };

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
    options?: { tail?: number; since?: number }
  ): Promise<ContainerLogsResult> {
    const record = this.containers.get(containerIdOrHostId);
    if (!record) {
      throw new NotFoundError(`Container "${containerIdOrHostId}" không tồn tại trên mock node`);
    }

    const tail = options?.tail || 50;
    const sampleLogs = [
      `[Aston Cloud] Initializing container runtime (${record.image})...`,
      `[Aston Cloud] Working directory /app mounted securely from /var/lib/cloud-hosting/${record.hostId}/app`,
      `[Aston Cloud] Resource quotas enforced: ${record.resources.cpuLimit} vCPU, ${record.resources.memoryLimitMb} MB RAM, ${record.resources.pidsLimit} PIDs`,
      `[Aston Cloud] Port ${record.port} successfully bound to internal application`,
      `[${new Date().toISOString()}] Server listening at http://0.0.0.0:${record.port}`,
      `[${new Date().toISOString()}] Health check endpoint /health responding with HTTP 200`,
      `[${new Date().toISOString()}] Host application is fully operational and ready for requests`,
    ];

    const lines = sampleLogs.slice(-tail);
    return {
      id: record.id,
      lines,
      total: lines.length,
    };
  }
}
