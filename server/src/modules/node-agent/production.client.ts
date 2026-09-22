import {
  INodeAgentClient,
  NodeContext,
  CreateContainerOptions,
  ContainerResult,
  ContainerActionResult,
  ContainerDeleteResult,
  ContainerStatsResult,
  ContainerLogsResult,
  ListFilesResult,
  ReadFileResult,
  WriteFileOptions,
  UploadFileOptions,
  FileDownloadStream,
} from './node-agent.interface.js';
import { env } from '../../config/env.js';
import { AppError, NotFoundError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

export class ProductionNodeAgentClient implements INodeAgentClient {
  private timeoutMs: number;

  constructor(timeoutMs?: number) {
    this.timeoutMs = timeoutMs || env.NODE_AGENT_TIMEOUT_MS;
  }

  private getBaseUrl(node: NodeContext): string {
    return node.agentUrl || env.NODE_AGENT_URL;
  }

  private getSecretKey(node: NodeContext): string {
    return node.agentKey || env.NODE_AGENT_KEY;
  }

  private async request<T>(
    node: NodeContext,
    endpoint: string,
    options: {
      method: string;
      body?: unknown;
      timeout?: number;
    }
  ): Promise<T> {
    const baseUrl = this.getBaseUrl(node);
    const secretKey = this.getSecretKey(node);
    const url = `${baseUrl.replace(/\/$/, '')}${endpoint}`;
    const timeout = options.timeout || this.timeoutMs;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const headers: Record<string, string> = {
        'x-agent-key': secretKey,
        'Content-Type': 'application/json',
      };

      const res = await fetch(url, {
        method: options.method,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      const data = (await res.json().catch(() => null)) as any;

      if (!res.ok) {
        const errorMsg = data?.error?.message || `Node Agent error (HTTP ${res.status})`;
        const errorCode = data?.error?.code || 'NodeAgentError';

        logger.error(
          { nodeId: node.id, endpoint, status: res.status, errorCode },
          `[ProductionNodeAgentClient] Request failed: ${errorMsg}`
        );

        if (res.status === 404) {
          throw new NotFoundError(errorMsg);
        }

        throw new AppError(errorMsg, res.status >= 400 && res.status < 500 ? res.status : 502);
      }

      return data?.data as T;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        logger.error(
          { nodeId: node.id, endpoint, timeout },
          '[ProductionNodeAgentClient] Request timed out'
        );
        throw new AppError(`Kết nối tới Node Agent tại node ${node.name} bị quá thời gian (${timeout}ms)`, 504);
      }

      if (err instanceof AppError) {
        throw err;
      }

      logger.error(
        { nodeId: node.id, endpoint, err: err.message },
        '[ProductionNodeAgentClient] Network error connecting to Node Agent'
      );
      throw new AppError(`Không thể kết nối tới Node Agent (${node.name}): ${err.message}`, 502);
    } finally {
      clearTimeout(timer);
    }
  }

  public async createContainer(
    node: NodeContext,
    options: CreateContainerOptions
  ): Promise<ContainerResult> {
    return this.request<ContainerResult>(node, '/containers', {
      method: 'POST',
      body: options,
    });
  }

  public async startContainer(
    node: NodeContext,
    containerId: string
  ): Promise<ContainerActionResult> {
    return this.request<ContainerActionResult>(node, `/containers/${containerId}/start`, {
      method: 'POST',
    });
  }

  public async stopContainer(
    node: NodeContext,
    containerId: string,
    timeout?: number
  ): Promise<ContainerActionResult> {
    const query = timeout ? `?timeout=${timeout}` : '';
    return this.request<ContainerActionResult>(node, `/containers/${containerId}/stop${query}`, {
      method: 'POST',
    });
  }

  public async restartContainer(
    node: NodeContext,
    containerId: string,
    timeout?: number
  ): Promise<ContainerActionResult> {
    const query = timeout ? `?timeout=${timeout}` : '';
    return this.request<ContainerActionResult>(node, `/containers/${containerId}/restart${query}`, {
      method: 'POST',
    });
  }

  public async deleteContainer(
    node: NodeContext,
    containerId: string,
    force?: boolean
  ): Promise<ContainerDeleteResult> {
    const query = force ? `?force=true` : '';
    return this.request<ContainerDeleteResult>(node, `/containers/${containerId}${query}`, {
      method: 'DELETE',
    });
  }

  public async getContainerStatus(
    node: NodeContext,
    containerId: string
  ): Promise<ContainerResult | null> {
    try {
      return await this.request<ContainerResult>(node, `/containers/${containerId}`, {
        method: 'GET',
      });
    } catch (err) {
      if (err instanceof NotFoundError) {
        return null;
      }
      throw err;
    }
  }

  public async getContainerStats(
    node: NodeContext,
    containerId: string
  ): Promise<ContainerStatsResult> {
    return this.request<ContainerStatsResult>(node, `/containers/${containerId}/stats`, {
      method: 'GET',
    });
  }

  public async getContainerLogs(
    node: NodeContext,
    containerId: string,
    options?: { tail?: number; since?: number; level?: string; search?: string }
  ): Promise<ContainerLogsResult> {
    const params = new URLSearchParams();
    if (options?.tail) params.set('tail', String(options.tail));
    if (options?.since) params.set('since', String(options.since));
    if (options?.level && options.level !== 'all') params.set('level', options.level);
    if (options?.search) params.set('search', options.search);

    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<ContainerLogsResult>(node, `/containers/${containerId}/logs${query}`, {
      method: 'GET',
    });
  }

  // ==========================================
  // HOST FILESYSTEM API IMPLEMENTATION
  // ==========================================

  public async listFiles(
    node: NodeContext,
    hostId: string,
    dirPath: string = '/'
  ): Promise<ListFilesResult> {
    const encoded = encodeURIComponent(dirPath);
    return this.request<ListFilesResult>(node, `/hosts/${hostId}/files?path=${encoded}`, {
      method: 'GET',
    });
  }

  public async readFile(
    node: NodeContext,
    hostId: string,
    filePath: string,
    _maxSizeBytes?: number
  ): Promise<ReadFileResult> {
    const encoded = encodeURIComponent(filePath);
    return this.request<ReadFileResult>(node, `/hosts/${hostId}/files/content?path=${encoded}`, {
      method: 'GET',
    });
  }

  public async writeFile(
    node: NodeContext,
    hostId: string,
    options: WriteFileOptions
  ): Promise<{ path: string; size: number }> {
    return this.request<{ path: string; size: number }>(node, `/hosts/${hostId}/files/content`, {
      method: 'PUT',
      body: options,
    });
  }

  public async createDirectory(
    node: NodeContext,
    hostId: string,
    dirPath: string
  ): Promise<{ path: string }> {
    return this.request<{ path: string }>(node, `/hosts/${hostId}/files/directory`, {
      method: 'POST',
      body: { path: dirPath },
    });
  }

  public async deleteFile(
    node: NodeContext,
    hostId: string,
    targetPath: string
  ): Promise<{ path: string; deleted: boolean }> {
    const encoded = encodeURIComponent(targetPath);
    return this.request<{ path: string; deleted: boolean }>(node, `/hosts/${hostId}/files?path=${encoded}`, {
      method: 'DELETE',
    });
  }

  public async renameFile(
    node: NodeContext,
    hostId: string,
    fromPath: string,
    toPath: string
  ): Promise<{ from: string; to: string }> {
    return this.request<{ from: string; to: string }>(node, `/hosts/${hostId}/files/rename`, {
      method: 'POST',
      body: { fromPath, toPath },
    });
  }

  public async uploadFile(
    node: NodeContext,
    hostId: string,
    options: UploadFileOptions
  ): Promise<{ path: string; size: number }> {
    return this.request<{ path: string; size: number }>(node, `/hosts/${hostId}/files/upload`, {
      method: 'POST',
      body: options,
    });
  }

  public async downloadFile(
    node: NodeContext,
    hostId: string,
    filePath: string
  ): Promise<FileDownloadStream> {
    const baseUrl = this.getBaseUrl(node);
    const secretKey = this.getSecretKey(node);
    const encoded = encodeURIComponent(filePath);
    const url = `${baseUrl.replace(/\/$/, '')}/hosts/${hostId}/files/download?path=${encoded}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'x-agent-key': secretKey,
      },
    });

    if (!res.ok) {
      const errJson = (await res.json().catch(() => null)) as any;
      throw new AppError(errJson?.error?.message || 'Lỗi tải tệp tin từ Node Agent', res.status);
    }

    const disposition = res.headers.get('content-disposition');
    let filename = filePath.split('/').pop() || 'download';
    if (disposition) {
      const match = disposition.match(/filename="?([^";]+)"?/);
      if (match) filename = match[1];
    }

    const contentLength = parseInt(res.headers.get('content-length') || '0', 10);
    // Convert Web ReadableStream to Node.js Readable stream
    const { Readable } = await import('node:stream');
    const nodeStream = (Readable as any).fromWeb
      ? (Readable as any).fromWeb(res.body)
      : (res.body as any);

    return {
      stream: nodeStream,
      filename,
      size: contentLength,
      mimeType: res.headers.get('content-type') || 'application/octet-stream',
    };
  }
}
