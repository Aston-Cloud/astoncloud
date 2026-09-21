import Docker from 'dockerode';
import { logger } from '../utils/logger.js';
import { NotFoundError, ConflictError, DockerOperationError } from '../utils/errors.js';

export interface DockerEngineInfo {
  available: boolean;
  version: string;
  driver: 'dockerode' | 'mock';
  operatingSystem: string;
  architecture: string;
  containersRunning: number;
  containersTotal: number;
}

export interface DockerCreateOptions {
  name: string;
  image: string;
  cmd?: string[];
  workingDir?: string;
  env: Record<string, string>;
  labels: Record<string, string>;
  port: number;
  resources: {
    cpuLimit: number; // in vCPU
    memoryLimitMb: number; // in MB
    diskLimitMb: number; // in MB
    pidsLimit: number;
  };
  storagePath: string;
}

export interface DockerContainerDetail {
  id: string;
  name: string;
  status: 'created' | 'running' | 'restarting' | 'stopped' | 'error';
  image: string;
  created: Date;
  startedAt?: Date;
  finishedAt?: Date;
  port: number;
  labels: Record<string, string>;
  resources: {
    cpuLimit: number;
    memoryLimitMb: number;
    diskLimitMb: number;
    pidsLimit: number;
  };
  mounts: Array<{ source: string; destination: string; mode: string }>;
}

export interface DockerContainerStats {
  id: string;
  timestamp: string;
  cpuPercentage: number;
  memoryUsageMb: number;
  memoryLimitMb: number;
  networkRxBytes: number;
  networkTxBytes: number;
  pidsCurrent: number;
}

export interface IDockerDriver {
  ping(): Promise<boolean>;
  getInfo(): Promise<DockerEngineInfo>;
  createContainer(options: DockerCreateOptions): Promise<DockerContainerDetail>;
  getContainer(idOrName: string): Promise<DockerContainerDetail | null>;
  startContainer(idOrName: string): Promise<void>;
  stopContainer(idOrName: string, timeoutSeconds?: number): Promise<void>;
  restartContainer(idOrName: string, timeoutSeconds?: number): Promise<void>;
  removeContainer(idOrName: string, force?: boolean): Promise<void>;
  getContainerLogs(idOrName: string, options?: { tail?: number; since?: number }): Promise<string>;
  getContainerStats(idOrName: string): Promise<DockerContainerStats>;
}

/**
 * Mock Docker Driver for development, testing, and environments without active Docker Engine.
 * Fully supports lifecycle, stats, and logs in memory.
 */
export class MockDockerDriver implements IDockerDriver {
  private containers: Map<string, DockerContainerDetail> = new Map();
  private logsStore: Map<string, string[]> = new Map();

  async ping(): Promise<boolean> {
    return true;
  }

  async getInfo(): Promise<DockerEngineInfo> {
    const running = Array.from(this.containers.values()).filter((c) => c.status === 'running').length;
    return {
      available: true,
      version: '27.3.1-mock',
      driver: 'mock',
      operatingSystem: process.platform === 'win32' ? 'Windows Mock Engine' : 'Linux Mock Engine',
      architecture: process.arch,
      containersRunning: running,
      containersTotal: this.containers.size,
    };
  }

  async createContainer(options: DockerCreateOptions): Promise<DockerContainerDetail> {
    // Check name collision
    for (const c of this.containers.values()) {
      if (c.name === options.name) {
        throw new ConflictError(`Container với tên "${options.name}" đã tồn tại trên node`);
      }
    }

    const id = `mock-${Math.random().toString(16).substring(2, 14)}`;
    const container: DockerContainerDetail = {
      id,
      name: options.name,
      status: 'created',
      image: options.image,
      created: new Date(),
      port: options.port,
      labels: options.labels,
      resources: options.resources,
      mounts: [
        {
          source: options.storagePath,
          destination: options.workingDir || '/app',
          mode: 'rw',
        },
      ],
    };

    this.containers.set(id, container);
    this.logsStore.set(id, [
      `[Aston Node Agent] Container created: ${options.name} (${options.image})`,
      `[Aston Node Agent] Resource allocation: ${options.resources.cpuLimit} vCPU, ${options.resources.memoryLimitMb} MB RAM, PIDs limit: ${options.resources.pidsLimit}`,
      `[Aston Node Agent] Port binding: ${options.port}`,
    ]);

    return container;
  }

  async getContainer(idOrName: string): Promise<DockerContainerDetail | null> {
    for (const [id, c] of this.containers.entries()) {
      if (id === idOrName || c.name === idOrName) {
        return { ...c };
      }
    }
    return null;
  }

  async startContainer(idOrName: string): Promise<void> {
    const container = await this.getContainer(idOrName);
    if (!container) {
      throw new NotFoundError(`Container "${idOrName}" không tồn tại`);
    }

    container.status = 'running';
    container.startedAt = new Date();
    this.containers.set(container.id, container);

    const logs = this.logsStore.get(container.id) || [];
    logs.push(`[${new Date().toISOString()}] Container started successfully`);
    logs.push(`[App] Service listening on port ${container.port}`);
    this.logsStore.set(container.id, logs);
  }

  async stopContainer(idOrName: string, _timeoutSeconds: number = 10): Promise<void> {
    const container = await this.getContainer(idOrName);
    if (!container) {
      throw new NotFoundError(`Container "${idOrName}" không tồn tại`);
    }

    container.status = 'stopped';
    container.finishedAt = new Date();
    this.containers.set(container.id, container);

    const logs = this.logsStore.get(container.id) || [];
    logs.push(`[${new Date().toISOString()}] Container stopped gracefully (SIGTERM)`);
    this.logsStore.set(container.id, logs);
  }

  async restartContainer(idOrName: string, timeoutSeconds: number = 10): Promise<void> {
    await this.stopContainer(idOrName, timeoutSeconds);
    await this.startContainer(idOrName);
  }

  async removeContainer(idOrName: string, force: boolean = false): Promise<void> {
    const container = await this.getContainer(idOrName);
    if (!container) {
      throw new NotFoundError(`Container "${idOrName}" không tồn tại`);
    }

    if (container.status === 'running' && !force) {
      throw new ConflictError(`Không thể xóa container đang chạy. Vui lòng dừng container trước hoặc dùng cờ force`);
    }

    this.containers.delete(container.id);
    this.logsStore.delete(container.id);
  }

  async getContainerLogs(idOrName: string, options?: { tail?: number; since?: number }): Promise<string> {
    const container = await this.getContainer(idOrName);
    if (!container) {
      throw new NotFoundError(`Container "${idOrName}" không tồn tại`);
    }

    const logs = this.logsStore.get(container.id) || [];
    const tailCount = options?.tail && options.tail > 0 ? options.tail : 100;
    return logs.slice(-tailCount).join('\n');
  }

  async getContainerStats(idOrName: string): Promise<DockerContainerStats> {
    const container = await this.getContainer(idOrName);
    if (!container) {
      throw new NotFoundError(`Container "${idOrName}" không tồn tại`);
    }

    const isRunning = container.status === 'running';
    return {
      id: container.id,
      timestamp: new Date().toISOString(),
      cpuPercentage: isRunning ? Math.round((Math.random() * 8 + 2) * 10) / 10 : 0,
      memoryUsageMb: isRunning ? Math.round(container.resources.memoryLimitMb * 0.25) : 0,
      memoryLimitMb: container.resources.memoryLimitMb,
      networkRxBytes: isRunning ? Math.floor(Math.random() * 2048 + 1024) : 0,
      networkTxBytes: isRunning ? Math.floor(Math.random() * 4096 + 2048) : 0,
      pidsCurrent: isRunning ? 5 : 0,
    };
  }
}

/**
 * Real Dockerode Driver for interacting with live Docker daemon.
 */
export class DockerodeDriver implements IDockerDriver {
  private docker: Docker;

  constructor(socketPath?: string) {
    if (socketPath) {
      this.docker = new Docker({ socketPath });
    } else if (process.platform === 'win32') {
      this.docker = new Docker({ socketPath: '//./pipe/docker_engine' });
    } else {
      this.docker = new Docker({ socketPath: '/var/run/docker.sock' });
    }
  }

  async ping(): Promise<boolean> {
    try {
      await this.docker.ping();
      return true;
    } catch {
      return false;
    }
  }

  async getInfo(): Promise<DockerEngineInfo> {
    try {
      const info = await this.docker.info();
      const version = await this.docker.version();
      return {
        available: true,
        version: version.Version || 'Unknown',
        driver: 'dockerode',
        operatingSystem: info.OperatingSystem || process.platform,
        architecture: info.Architecture || process.arch,
        containersRunning: info.ContainersRunning || 0,
        containersTotal: info.Containers || 0,
      };
    } catch (err: any) {
      return {
        available: false,
        version: 'Disconnected',
        driver: 'dockerode',
        operatingSystem: process.platform,
        architecture: process.arch,
        containersRunning: 0,
        containersTotal: 0,
      };
    }
  }

  async createContainer(options: DockerCreateOptions): Promise<DockerContainerDetail> {
    try {
      // Memory in bytes (memoryLimitMb * 1024 * 1024)
      const memoryBytes = options.resources.memoryLimitMb * 1024 * 1024;
      // NanoCPUs = cpuLimit * 1e9
      const nanoCpus = Math.round(options.resources.cpuLimit * 1e9);

      const envArray = Object.entries(options.env).map(([k, v]) => `${k}=${v}`);

      const container = (await this.docker.createContainer({
        name: options.name,
        Image: options.image,
        Cmd: options.cmd,
        WorkingDir: options.workingDir || '/app',
        Env: envArray,
        Labels: options.labels,
        ExposedPorts: {
          [`${options.port}/tcp`]: {},
        },
        HostConfig: {
          PortBindings: {
            [`${options.port}/tcp`]: [{ HostPort: `${options.port}` }],
          },
          Binds: [`${options.storagePath}:${options.workingDir || '/app'}:rw`],
          Memory: memoryBytes,
          NanoCpus: nanoCpus,
          PidsLimit: options.resources.pidsLimit,
          NetworkMode: 'bridge',
          RestartPolicy: {
            Name: 'on-failure',
            MaximumRetryCount: 5,
          },
        },
      })) as Docker.Container;

      const inspect = await container.inspect();
      return {
        id: inspect.Id,
        name: inspect.Name.replace(/^\//, ''),
        status: inspect.State.Running ? 'running' : 'created',
        image: inspect.Config.Image,
        created: new Date(inspect.Created),
        port: options.port,
        labels: inspect.Config.Labels || {},
        resources: options.resources,
        mounts: (inspect.Mounts || []).map((m: any) => ({
          source: m.Source,
          destination: m.Destination,
          mode: m.Mode,
        })),
      };
    } catch (err: any) {
      if (err.statusCode === 409) {
        throw new ConflictError(`Container với tên "${options.name}" đã tồn tại trên Docker Engine`);
      }
      throw new DockerOperationError(`Lỗi khi tạo container trên Docker Engine: ${err.message}`, err);
    }
  }

  async getContainer(idOrName: string): Promise<DockerContainerDetail | null> {
    try {
      const container = this.docker.getContainer(idOrName);
      const inspect = await container.inspect();
      const status = inspect.State.Running
        ? 'running'
        : inspect.State.Restarting
        ? 'restarting'
        : inspect.State.Status === 'created'
        ? 'created'
        : 'stopped';

      const hostCfg = inspect.HostConfig as any;

      return {
        id: inspect.Id,
        name: inspect.Name.replace(/^\//, ''),
        status,
        image: inspect.Config.Image,
        created: new Date(inspect.Created),
        startedAt: inspect.State.StartedAt ? new Date(inspect.State.StartedAt) : undefined,
        finishedAt: inspect.State.FinishedAt ? new Date(inspect.State.FinishedAt) : undefined,
        port: 3000,
        labels: inspect.Config.Labels || {},
        resources: {
          cpuLimit: (hostCfg?.NanoCpus || hostCfg?.NanoCPUs || 1e9) / 1e9,
          memoryLimitMb: Math.round((hostCfg?.Memory || 512 * 1024 * 1024) / (1024 * 1024)),
          diskLimitMb: 5120,
          pidsLimit: hostCfg?.PidsLimit || 200,
        },
        mounts: (inspect.Mounts || []).map((m: any) => ({
          source: m.Source,
          destination: m.Destination,
          mode: m.Mode,
        })),
      };
    } catch (err: any) {
      if (err.statusCode === 404) {
        return null;
      }
      throw new DockerOperationError(`Lỗi khi truy vấn container từ Docker Engine: ${err.message}`, err);
    }
  }

  async startContainer(idOrName: string): Promise<void> {
    try {
      const container = this.docker.getContainer(idOrName);
      await container.start();
    } catch (err: any) {
      if (err.statusCode === 404) {
        throw new NotFoundError(`Container "${idOrName}" không tồn tại trên Docker Engine`);
      }
      throw new DockerOperationError(`Lỗi khi khởi chạy container: ${err.message}`, err);
    }
  }

  async stopContainer(idOrName: string, timeoutSeconds: number = 10): Promise<void> {
    try {
      const container = this.docker.getContainer(idOrName);
      await container.stop({ t: timeoutSeconds });
    } catch (err: any) {
      if (err.statusCode === 404) {
        throw new NotFoundError(`Container "${idOrName}" không tồn tại`);
      }
      if (err.statusCode === 304) {
        // Container already stopped
        return;
      }
      throw new DockerOperationError(`Lỗi khi dừng container: ${err.message}`, err);
    }
  }

  async restartContainer(idOrName: string, timeoutSeconds: number = 10): Promise<void> {
    try {
      const container = this.docker.getContainer(idOrName);
      await container.restart({ t: timeoutSeconds });
    } catch (err: any) {
      if (err.statusCode === 404) {
        throw new NotFoundError(`Container "${idOrName}" không tồn tại`);
      }
      throw new DockerOperationError(`Lỗi khi khởi động lại container: ${err.message}`, err);
    }
  }

  async removeContainer(idOrName: string, force: boolean = false): Promise<void> {
    try {
      const container = this.docker.getContainer(idOrName);
      await container.remove({ force });
    } catch (err: any) {
      if (err.statusCode === 404) {
        throw new NotFoundError(`Container "${idOrName}" không tồn tại`);
      }
      throw new DockerOperationError(`Lỗi khi xóa container: ${err.message}`, err);
    }
  }

  async getContainerLogs(idOrName: string, options?: { tail?: number; since?: number }): Promise<string> {
    try {
      const container = this.docker.getContainer(idOrName);
      const logBuffer = (await container.logs({
        stdout: true,
        stderr: true,
        tail: options?.tail || 100,
        since: options?.since,
      })) as Buffer;

      return logBuffer.toString('utf-8');
    } catch (err: any) {
      if (err.statusCode === 404) {
        throw new NotFoundError(`Container "${idOrName}" không tồn tại`);
      }
      throw new DockerOperationError(`Lỗi khi đọc nhật ký container: ${err.message}`, err);
    }
  }

  async getContainerStats(idOrName: string): Promise<DockerContainerStats> {
    try {
      const container = this.docker.getContainer(idOrName);
      const stream = (await container.stats({ stream: false })) as any;

      const memoryUsage = stream.memory_stats?.usage || 0;
      const memoryLimit = stream.memory_stats?.limit || 1;

      return {
        id: idOrName,
        timestamp: new Date().toISOString(),
        cpuPercentage: 0,
        memoryUsageMb: Math.round(memoryUsage / (1024 * 1024)),
        memoryLimitMb: Math.round(memoryLimit / (1024 * 1024)),
        networkRxBytes: 0,
        networkTxBytes: 0,
        pidsCurrent: stream.pids_stats?.current || 0,
      };
    } catch (err: any) {
      if (err.statusCode === 404) {
        throw new NotFoundError(`Container "${idOrName}" không tồn tại`);
      }
      throw new DockerOperationError(`Lỗi khi lấy thông số container: ${err.message}`, err);
    }
  }
}
