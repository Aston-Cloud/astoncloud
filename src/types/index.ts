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

export interface HostLiveStats {
  status: string;
  available?: boolean;
  cpu: {
    usage: number;
    limit: number;
  };
  memory: {
    usage: number;
    limit: number;
  };
  disk: {
    usage: number;
    limit: number;
  };
  network: {
    rx: number;
    tx: number;
  };
  uptime: number;
  uptimeFormatted?: string;
  timestamp: string;
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

export interface HostEnvVariable {
  id: string;
  hostId: string;
  key: string;
  hasValue: boolean;
  maskedValue: string;
  createdAt: string;
  updatedAt: string;
}

export interface DnsRecordInstruction {
  type: 'A' | 'CNAME' | 'TXT';
  name: string;
  value: string;
  instruction?: string;
  status?: 'configured' | 'pending';
}

export interface HostDomain {
  id: string;
  hostId: string;
  hostName?: string;
  domain: string;
  status: 'PENDING' | 'VERIFYING' | 'ACTIVE' | 'ERROR' | 'REMOVING' | 'active' | 'verifying' | 'dns_pending' | 'failed';
  sslStatus: 'NOT_REQUESTED' | 'PENDING' | 'ACTIVE' | 'ERROR' | 'EXPIRED' | 'active' | 'provisioning' | 'expired';
  verificationMethod?: 'DNS_TXT' | 'DNS_CNAME';
  verificationToken?: string;
  targetPort: number;
  errorMessage?: string | null;
  verifiedAt?: string | null;
  dnsRecords: DnsRecordInstruction[];
  isMock?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export type DomainRecord = HostDomain;

export interface HostBackup {
  id: string;
  name: string;
  hostId: string;
  hostName?: string;
  userId?: string;
  size?: string;
  sizeBytes?: number;
  sizeFormatted?: string;
  status:
    | 'PENDING'
    | 'CREATING'
    | 'COMPLETED'
    | 'FAILED'
    | 'RESTORING'
    | 'RESTORED'
    | 'DELETING'
    | 'DELETED'
    | 'ready'
    | 'creating'
    | 'restoring'
    | 'failed';
  backupType?: 'manual' | 'automatic';
  isAutomatic?: boolean;
  errorMessage?: string | null;
  metadata?: Record<string, any>;
  createdAt: string;
  completedAt?: string | null;
  expiresAt?: string | null;
}

export type BackupItem = HostBackup;

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  source: 'system' | 'runtime' | 'build';
  message: string;
}

export interface Invoice {
  id: string;
  invoiceNumber?: string;
  date: string;
  dueDate?: string;
  paidAt?: string | null;
  description: string;
  amount: number;
  currency?: string;
  status: 'paid' | 'pending' | 'failed' | 'DRAFT' | 'OPEN' | 'PAID' | 'VOID' | 'FAILED';
  pdfUrl?: string;
}

export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  planName: string;
  status: 'PENDING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'EXPIRED' | 'SUSPENDED' | string;
  billingInterval: 'MONTHLY' | 'YEARLY';
  price: number;
  currency: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
  plan?: {
    id: string;
    name: string;
    cpu: string;
    ram: string;
    disk: string;
    priceMonthly: number;
    priceYearly: number;
  };
}

export interface InvoiceDetail {
  id: string;
  userId: string;
  subscriptionId?: string | null;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: 'DRAFT' | 'OPEN' | 'PAID' | 'VOID' | 'FAILED' | string;
  description: string;
  invoiceDate: string;
  dueDate: string;
  paidAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CheckoutResponse {
  checkoutId: string;
  checkoutUrl: string;
  provider: string;
  providerPaymentId: string;
  amount: number;
  currency: string;
  invoiceId: string;
  invoiceNumber: string;
  expiresAt: string;
  isMock: boolean;
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
  id?: string;
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

// Milestone 14: Admin Panel Types
export interface AdminDashboardStats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  totalHosts: number;
  runningHosts: number;
  stoppedHosts: number;
  errorHosts: number;
  totalNodes: number;
  healthyNodes: number;
  activeSubscriptions: number;
  totalRevenue: number;
  pendingInvoices: number;
  totalBackups: number;
  totalDomains: number;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN' | string;
  status: 'ACTIVE' | 'SUSPENDED' | 'DISABLED' | string;
  createdAt: string;
  updatedAt: string;
  hostCount?: number;
  subscriptionStatus?: string;
  hosts?: any[];
  subscriptions?: any[];
}

export interface AdminNode {
  id: string;
  name: string;
  ipAddress: string;
  region: string;
  status: 'ONLINE' | 'OFFLINE' | 'MAINTENANCE' | 'DRAINING' | string;
  cpuTotalCores: number;
  cpuUsedCores: number;
  ramTotalMb: number;
  ramUsedMb: number;
  diskTotalGb: number;
  diskUsedGb: number;
  hostCount: number;
  isMock: boolean;
  agentVersion: string;
  lastHeartbeatAt: string;
}

export interface AdminAuditLog {
  id: string;
  actorId: string;
  actorEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  details: Record<string, any>;
  ipAddress: string;
  createdAt: string;
}

export interface AdminSystemSettings {
  maintenanceMode: boolean;
  registrationEnabled: boolean;
  maxHostsPerUser: number;
  mockAgentMode: boolean;
  defaultPlanId: string;
  notificationBanner: string;
}

