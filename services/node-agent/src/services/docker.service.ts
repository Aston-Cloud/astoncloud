import path from 'path';
import fs from 'fs';
import { env } from '../config/env.js';
import { resolveApprovedImage, SupportedRuntime } from '../config/runtimes.js';
import { logger } from '../utils/logger.js';
import { ValidationError, ForbiddenError } from '../utils/errors.js';
import {
  IDockerDriver,
  DockerodeDriver,
  MockDockerDriver,
  DockerContainerDetail,
  DockerContainerStats,
  DockerEngineInfo,
} from './docker.driver.js';

export interface CreateHostContainerRequest {
  hostId: string;
  runtime: SupportedRuntime;
  version: string;
  port: number;
  resources: {
    cpuLimit: number; // 0.1 - 8.0 vCPU
    memoryLimitMb: number; // 128 - 16384 MB
    diskLimitMb: number; // 512 - 102400 MB
    pidsLimit?: number; // 50 - 500
  };
  env?: Record<string, string>;
}

export class DockerService {
  private driver: IDockerDriver;
  private isInitialized = false;

  constructor(driver?: IDockerDriver) {
    if (driver) {
      this.driver = driver;
      this.isInitialized = true;
    } else {
      // Default driver initialization with fallback detection
      this.driver = new MockDockerDriver();
    }
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    if (env.DOCKER_SIMULATION_MODE) {
      logger.info('[DockerService] DOCKER_SIMULATION_MODE is enabled. Using MockDockerDriver.');
      this.driver = new MockDockerDriver();
      this.isInitialized = true;
      return;
    }

    // Try real DockerodeDriver
    try {
      const liveDriver = new DockerodeDriver(env.DOCKER_SOCKET_PATH);
      const isAlive = await liveDriver.ping();
      if (isAlive) {
        logger.info('[DockerService] Connected successfully to Docker Engine daemon.');
        this.driver = liveDriver;
      } else {
        logger.warn('[DockerService] Docker Engine ping failed. Falling back to MockDockerDriver for safe execution.');
        this.driver = new MockDockerDriver();
      }
    } catch (err: any) {
      logger.warn({ err: err.message }, '[DockerService] Docker Engine unavailable. Using MockDockerDriver fallback.');
      this.driver = new MockDockerDriver();
    }

    this.isInitialized = true;
  }

  public async ping(): Promise<boolean> {
    await this.initialize();
    return this.driver.ping();
  }

  public async getEngineInfo(): Promise<DockerEngineInfo> {
    await this.initialize();
    return this.driver.getInfo();
  }

  public async createHostContainer(req: CreateHostContainerRequest): Promise<DockerContainerDetail> {
    await this.initialize();

    // 1. Strict Host ID Validation
    const hostIdRegex = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/;
    if (!hostIdRegex.test(req.hostId)) {
      throw new ValidationError(
        'hostId không hợp lệ: chỉ cho phép chữ thường không dấu, số, dấu gạch nối, độ dài từ 3 đến 63 ký tự'
      );
    }

    // 2. Runtime & Approved Image Verification
    const approved = resolveApprovedImage(req.runtime, req.version);
    if (!approved) {
      throw new ValidationError(
        `Môi trường runtime "${req.runtime}" với phiên bản "${req.version}" không nằm trong danh mục chứng nhận an toàn`
      );
    }

    // 3. Platform Resource Limits Verification
    if (req.resources.cpuLimit < 0.1 || req.resources.cpuLimit > 8.0) {
      throw new ValidationError('Định mức CPU phải nằm trong khoảng từ 0.1 đến 8.0 vCPU');
    }
    if (req.resources.memoryLimitMb < 128 || req.resources.memoryLimitMb > 16384) {
      throw new ValidationError('Định mức RAM phải nằm trong khoảng từ 128 MB đến 16,384 MB (16 GB)');
    }
    if (req.resources.diskLimitMb < 512 || req.resources.diskLimitMb > 102400) {
      throw new ValidationError('Định mức Disk phải nằm trong khoảng từ 512 MB đến 102,400 MB (100 GB)');
    }

    const pidsLimit = req.resources.pidsLimit ? Math.max(50, Math.min(500, req.resources.pidsLimit)) : 200;

    // 4. Safe Deterministic Container Name
    const containerName = `cloud-host-${req.hostId}`;

    // 5. Filesystem Isolation - Isolated Host Storage Path
    const storagePath = path.join(env.DATA_ROOT_PATH, req.hostId, 'app');

    // Prevent any directory traversal
    const normalizedStorage = path.resolve(storagePath);
    const normalizedRoot = path.resolve(env.DATA_ROOT_PATH);
    if (!normalizedStorage.startsWith(normalizedRoot)) {
      throw new ForbiddenError('Đường dẫn lưu trữ vi phạm chính sách bảo mật hệ thống tệp');
    }

    // Ensure directory exists
    try {
      if (!fs.existsSync(normalizedStorage)) {
        fs.mkdirSync(normalizedStorage, { recursive: true });
      }
    } catch (err: any) {
      logger.warn({ path: normalizedStorage, err: err.message }, 'Failed to create storage directory, proceeding with mock');
    }

    // 6. Safe Environment Variables
    const sanitizedEnv: Record<string, string> = {
      PORT: `${req.port}`,
      NODE_ENV: 'production',
      ASTON_HOST_ID: req.hostId,
    };

    if (req.env) {
      for (const [key, val] of Object.entries(req.env)) {
        const cleanKey = key.trim();
        if (/^[A-Z_][A-Z0-9_]{0,127}$/.test(cleanKey)) {
          sanitizedEnv[cleanKey] = String(val);
        }
      }
    }

    // 7. Controlled Execution via Driver
    return this.driver.createContainer({
      name: containerName,
      image: approved.image,
      cmd: approved.defaultCmd,
      workingDir: approved.workingDir,
      env: sanitizedEnv,
      labels: {
        'aston.managed': 'true',
        'aston.host_id': req.hostId,
        'aston.runtime': req.runtime,
        'aston.version': req.version,
        'aston.node_id': env.NODE_ID,
      },
      port: req.port,
      resources: {
        cpuLimit: req.resources.cpuLimit,
        memoryLimitMb: req.resources.memoryLimitMb,
        diskLimitMb: req.resources.diskLimitMb,
        pidsLimit,
      },
      storagePath: normalizedStorage,
    });
  }

  public async getContainer(containerIdOrHostId: string): Promise<DockerContainerDetail | null> {
    await this.initialize();
    const targetName = containerIdOrHostId.startsWith('cloud-host-')
      ? containerIdOrHostId
      : `cloud-host-${containerIdOrHostId}`;

    const byName = await this.driver.getContainer(targetName);
    if (byName) return byName;

    return this.driver.getContainer(containerIdOrHostId);
  }

  public async startContainer(containerIdOrHostId: string): Promise<void> {
    await this.initialize();
    const container = await this.getContainer(containerIdOrHostId);
    if (!container) {
      throw new ValidationError(`Không tìm thấy container "${containerIdOrHostId}"`);
    }
    return this.driver.startContainer(container.id);
  }

  public async stopContainer(containerIdOrHostId: string, timeoutSeconds: number = 10): Promise<void> {
    await this.initialize();
    const container = await this.getContainer(containerIdOrHostId);
    if (!container) {
      throw new ValidationError(`Không tìm thấy container "${containerIdOrHostId}"`);
    }
    return this.driver.stopContainer(container.id, timeoutSeconds);
  }

  public async restartContainer(containerIdOrHostId: string, timeoutSeconds: number = 10): Promise<void> {
    await this.initialize();
    const container = await this.getContainer(containerIdOrHostId);
    if (!container) {
      throw new ValidationError(`Không tìm thấy container "${containerIdOrHostId}"`);
    }
    return this.driver.restartContainer(container.id, timeoutSeconds);
  }

  public async removeContainer(containerIdOrHostId: string, force: boolean = false): Promise<void> {
    await this.initialize();
    const container = await this.getContainer(containerIdOrHostId);
    if (!container) {
      throw new ValidationError(`Không tìm thấy container "${containerIdOrHostId}"`);
    }
    return this.driver.removeContainer(container.id, force);
  }

  public async getContainerLogs(
    containerIdOrHostId: string,
    options?: { tail?: number; since?: number }
  ): Promise<string> {
    await this.initialize();
    const container = await this.getContainer(containerIdOrHostId);
    if (!container) {
      throw new ValidationError(`Không tìm thấy container "${containerIdOrHostId}"`);
    }
    return this.driver.getContainerLogs(container.id, options);
  }

  public async getContainerStats(containerIdOrHostId: string): Promise<DockerContainerStats> {
    await this.initialize();
    const container = await this.getContainer(containerIdOrHostId);
    if (!container) {
      throw new ValidationError(`Không tìm thấy container "${containerIdOrHostId}"`);
    }
    return this.driver.getContainerStats(container.id);
  }
}

export const dockerService = new DockerService();
