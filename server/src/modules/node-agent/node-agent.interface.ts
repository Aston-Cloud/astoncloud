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

export interface ContainerLogsResult {
  id: string;
  lines: string[];
  total: number;
}

export interface INodeAgentClient {
  createContainer(node: NodeContext, options: CreateContainerOptions): Promise<ContainerResult>;
  startContainer(node: NodeContext, containerId: string): Promise<ContainerActionResult>;
  stopContainer(node: NodeContext, containerId: string, timeout?: number): Promise<ContainerActionResult>;
  restartContainer(node: NodeContext, containerId: string, timeout?: number): Promise<ContainerActionResult>;
  deleteContainer(node: NodeContext, containerId: string, force?: boolean): Promise<ContainerDeleteResult>;
  getContainerStatus(node: NodeContext, containerId: string): Promise<ContainerResult | null>;
  getContainerStats(node: NodeContext, containerId: string): Promise<ContainerStatsResult>;
  getContainerLogs(node: NodeContext, containerId: string, options?: { tail?: number; since?: number }): Promise<ContainerLogsResult>;
}
