export interface NodeContext {
  id: string;
  name: string;
  region: string;
  ipAddress: string;
  agentUrl?: string;
  agentKey?: string;
}

export interface CreateContainerOptions {
  hostId: string;
  runtime: 'nodejs' | 'bun' | 'python';
  version: string;
  port: number;
  resources: {
    cpuLimit: number;
    memoryLimitMb: number;
    diskLimitMb: number;
    pidsLimit?: number;
  };
  env?: Record<string, string>;
}

export interface ContainerResult {
  containerId: string;
  hostId: string;
  name: string;
  status: 'created' | 'running' | 'stopped' | 'exited' | 'error';
  image: string;
  port: number;
  created?: string;
  resources: {
    cpuLimit: number;
    memoryLimitMb: number;
    diskLimitMb: number;
  };
}

export interface ContainerActionResult {
  id: string;
  status: string;
}

export interface ContainerDeleteResult {
  id: string;
  deleted: boolean;
}

export interface ContainerStatsResult {
  id: string;
  hostId?: string;
  cpuPercent: number;
  memoryUsageMb: number;
  memoryLimitMb: number;
  pids: number;
  timestamp: string;
}

export interface LogEntryItem {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
}

export interface ContainerLogsResult {
  id: string;
  lines: string[];
  total: number;
  entries?: LogEntryItem[];
}

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

export interface WriteFileOptions {
  path: string;
  content: string;
  encoding?: 'utf-8' | 'base64';
}

export interface UploadFileOptions {
  destinationPath: string;
  filename: string;
  content: string | Buffer;
  encoding?: 'utf-8' | 'base64';
}

export interface FileDownloadStream {
  stream: NodeJS.ReadableStream;
  filename: string;
  size: number;
  mimeType?: string;
}

export interface INodeAgentClient {
  createContainer(node: NodeContext, options: CreateContainerOptions): Promise<ContainerResult>;
  startContainer(node: NodeContext, containerId: string): Promise<ContainerActionResult>;
  stopContainer(node: NodeContext, containerId: string, timeout?: number): Promise<ContainerActionResult>;
  restartContainer(node: NodeContext, containerId: string, timeout?: number): Promise<ContainerActionResult>;
  deleteContainer(node: NodeContext, containerId: string, force?: boolean): Promise<ContainerDeleteResult>;
  getContainerStatus(node: NodeContext, containerId: string): Promise<ContainerResult | null>;
  getContainerStats(node: NodeContext, containerId: string): Promise<ContainerStatsResult>;
  getContainerLogs(
    node: NodeContext,
    containerId: string,
    options?: { tail?: number; since?: number; level?: string; search?: string }
  ): Promise<ContainerLogsResult>;

  // Host Filesystem Management Endpoints
  listFiles(node: NodeContext, hostId: string, dirPath?: string): Promise<ListFilesResult>;
  readFile(node: NodeContext, hostId: string, filePath: string, maxSizeBytes?: number): Promise<ReadFileResult>;
  writeFile(node: NodeContext, hostId: string, options: WriteFileOptions): Promise<{ path: string; size: number }>;
  createDirectory(node: NodeContext, hostId: string, dirPath: string): Promise<{ path: string }>;
  deleteFile(node: NodeContext, hostId: string, targetPath: string): Promise<{ path: string; deleted: boolean }>;
  renameFile(node: NodeContext, hostId: string, fromPath: string, toPath: string): Promise<{ from: string; to: string }>;
  uploadFile(node: NodeContext, hostId: string, options: UploadFileOptions): Promise<{ path: string; size: number }>;
  downloadFile(node: NodeContext, hostId: string, filePath: string): Promise<FileDownloadStream>;
}
