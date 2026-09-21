export type RuntimeType = 'nodejs' | 'bun' | 'python';

export type HostStatus =
  | 'PENDING'
  | 'PROVISIONING'
  | 'RUNNING'
  | 'STOPPED'
  | 'SUSPENDED'
  | 'ERROR'
  | 'DELETING'
  | 'online'
  | 'offline'
  | 'starting'
  | 'restarting'
  | 'error';

export interface HostingPlan {
  id: string;
  name: string;
  price: number; // monthly in VND or display unit
  cpu: string; // e.g. "2 vCPU"
  ram: string; // e.g. "2 GB"
  disk: string; // e.g. "25 GB NVMe"
  bandwidth: string; // e.g. "2 TB"
  recommended?: boolean;
  cpuCores?: number;
  ramMb?: number;
  diskMb?: number;
  priceMonthly?: number;
}

export interface Host {
  id: string;
  numericId?: number;
  name: string;
  slug: string;
  runtime: RuntimeType;
  runtimeId?: string;
  version: string;
  runtimeVersion?: string;
  status: HostStatus;
  plan: HostingPlan;
  planId?: string;
  nodeId?: string | null;
  userId?: string;
  region: string;
  regionFlag: string;
  ipAddress: string;
  port: number;
  uptime: string;
  uptimeSeconds: number;
  cpuUsage: number; // percentage 0-100 or 0 when pending
  ramUsage: number; // MB or percentage or 0 when pending
  ramTotal: number; // MB
  diskUsage: number; // GB or 0 when pending
  diskTotal: number; // GB
  cpuLimit?: number;
  memoryLimit?: number;
  diskLimit?: number;
  createdAt: string;
  updatedAt?: string;
  repoUrl?: string;
  autoRestart: boolean;
}

export interface FileItem {
  id: string;
  name: string;
  path: string;
  isDirectory: boolean;
  size?: string;
  updatedAt: string;
  content?: string;
}

export interface EnvVariable {
  id: string;
  key: string;
  value: string;
  isSecret: boolean;
  updatedAt: string;
}

export interface DomainRecord {
  id: string;
  domain: string;
  hostId: string;
  hostName: string;
  status: 'active' | 'verifying' | 'dns_pending' | 'failed';
  sslStatus: 'active' | 'provisioning' | 'expired';
  targetPort: number;
  dnsRecords: {
    type: 'A' | 'CNAME' | 'TXT';
    name: string;
    value: string;
    status: 'configured' | 'pending';
  }[];
  createdAt: string;
}

export interface BackupItem {
  id: string;
  name: string;
  hostId: string;
  hostName: string;
  size: string;
  createdAt: string;
  status: 'ready' | 'creating' | 'restoring' | 'failed';
  isAutomatic: boolean;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  source: 'system' | 'runtime' | 'build';
  message: string;
}

export interface Invoice {
  id: string;
  date: string;
  description: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  pdfUrl: string;
}

export interface SupportTicketMessage {
  id: string;
  sender: 'user' | 'agent';
  senderName: string;
  avatar?: string;
  content: string;
  timestamp: string;
}

export interface SupportTicket {
  id: string;
  subject: string;
  department: 'technical' | 'billing' | 'general';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  createdAt: string;
  updatedAt: string;
  messages: SupportTicketMessage[];
}

export interface UserProfile {
  name: string;
  email: string;
  username: string;
  avatar: string;
  balance: number;
  currency: string;
  role: string;
  company: string;
  twoFactorEnabled: boolean;
  notificationEmail: boolean;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'info' | 'success' | 'warning' | 'alert';
  link?: string;
}
