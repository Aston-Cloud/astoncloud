import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Host,
  FileItem,
  EnvVariable,
  DomainRecord,
  BackupItem,
  LogEntry,
  Invoice,
  SupportTicket,
  UserProfile,
  NotificationItem,
  RuntimeType,
} from '../types';
import {
  INITIAL_HOSTS,
  INITIAL_FILES,
  INITIAL_ENV_VARS,
  INITIAL_DOMAINS,
  INITIAL_BACKUPS,
  INITIAL_LOGS,
  INITIAL_INVOICES,
  INITIAL_TICKETS,
  INITIAL_USER,
  INITIAL_NOTIFICATIONS,
} from '../data/mockData';
import { useToast } from './ToastContext';

interface AppStateContextType {
  hosts: Host[];
  currentHostId: string;
  setCurrentHostId: (id: string) => void;
  getHost: (id?: string) => Host | undefined;
  startHost: (id: string) => void;
  stopHost: (id: string) => void;
  restartHost: (id: string) => void;
  createHost: (newHostData: Omit<Host, 'id' | 'createdAt' | 'uptime' | 'uptimeSeconds' | 'cpuUsage' | 'ramUsage' | 'diskUsage'>) => Promise<Host> | Host;
  deleteHost: (id: string) => Promise<void> | void;
  refreshHosts: () => Promise<void>;

  // Files
  files: Record<string, FileItem[]>;
  saveFileContent: (hostId: string, fileId: string, content: string) => void;
  createFile: (hostId: string, name: string, isDirectory: boolean, content?: string) => void;
  deleteFile: (hostId: string, fileId: string) => void;

  // Env Variables
  envVars: Record<string, EnvVariable[]>;
  addEnvVar: (hostId: string, key: string, value: string, isSecret: boolean) => void;
  updateEnvVar: (hostId: string, varId: string, key: string, value: string, isSecret: boolean) => void;
  deleteEnvVar: (hostId: string, varId: string) => void;

  // Domains
  domains: DomainRecord[];
  addDomain: (hostId: string, domainName: string, targetPort?: number) => void;
  deleteDomain: (id: string) => void;

  // Backups
  backups: BackupItem[];
  createBackup: (hostId: string, name: string) => void;
  restoreBackup: (id: string) => void;
  deleteBackup: (id: string) => void;

  // Logs
  logs: Record<string, LogEntry[]>;
  clearLogs: (hostId: string) => void;

  // Billing & Invoices
  invoices: Invoice[];
  userProfile: UserProfile;
  updateUserProfile: (profile: Partial<UserProfile>) => void;
  addBalance: (amount: number) => void;

  // Authentication & Auth Modal
  authToken: string | null;
  isAuthenticated: boolean;
  login: (token: string, user?: any) => void;
  logout: () => void;
  isAuthModalOpen: boolean;
  openAuthModal: (tab?: 'login' | 'register') => void;
  closeAuthModal: () => void;
  authModalTab: 'login' | 'register';

  // Support Tickets
  tickets: SupportTicket[];
  createTicket: (subject: string, department: SupportTicket['department'], priority: SupportTicket['priority'], initialMessage: string) => void;
  replyToTicket: (ticketId: string, content: string) => void;

  // Notifications
  notifications: NotificationItem[];
  markNotificationAsRead: (id: string) => void;
  clearNotifications: () => void;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showToast } = useToast();

  const [hosts, setHosts] = useState<Host[]>(() => {
    const saved = localStorage.getItem('aston_hosts');
    return saved ? JSON.parse(saved) : INITIAL_HOSTS;
  });

  const [currentHostId, setCurrentHostId] = useState<string>('host-1');

  const [files, setFiles] = useState<Record<string, FileItem[]>>(() => {
    const saved = localStorage.getItem('aston_files');
    return saved ? JSON.parse(saved) : INITIAL_FILES;
  });

  const [envVars, setEnvVars] = useState<Record<string, EnvVariable[]>>(() => {
    const saved = localStorage.getItem('aston_env_vars');
    return saved ? JSON.parse(saved) : INITIAL_ENV_VARS;
  });

  const [domains, setDomains] = useState<DomainRecord[]>(() => {
    const saved = localStorage.getItem('aston_domains');
    return saved ? JSON.parse(saved) : INITIAL_DOMAINS;
  });

  const [backups, setBackups] = useState<BackupItem[]>(() => {
    const saved = localStorage.getItem('aston_backups');
    return saved ? JSON.parse(saved) : INITIAL_BACKUPS;
  });

  const [logs, setLogs] = useState<Record<string, LogEntry[]>>(() => {
    const saved = localStorage.getItem('aston_logs');
    return saved ? JSON.parse(saved) : INITIAL_LOGS;
  });

  const [invoices] = useState<Invoice[]>(INITIAL_INVOICES);
  const [userProfile, setUserProfile] = useState<UserProfile>(INITIAL_USER);
  const [tickets, setTickets] = useState<SupportTicket[]>(INITIAL_TICKETS);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);

  // Real Auth State
  const [authToken, setAuthToken] = useState<string | null>(() => {
    return localStorage.getItem('aston_auth_token');
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return !!localStorage.getItem('aston_auth_token');
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register'>('login');

  // Refresh backend hosts
  const fetchBackendHosts = async (token: string) => {
    try {
      const res = await fetch('/api/v1/hosts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data?.hosts)) {
        const mapped: Host[] = data.data.hosts.map((h: any) => {
          const planRamMb = h.memoryLimit || h.ramLimitMb || (h.planId === 'developer' ? 2048 : h.planId === 'pro' ? 4096 : 512);
          const planDiskGb = (h.diskLimit ? Math.round(h.diskLimit / 1024) : 0) || h.diskLimitGb || (h.planId === 'developer' ? 15 : h.planId === 'pro' ? 30 : 5);
          const planCpu = h.cpuLimit ? `${h.cpuLimit} vCPU` : (h.plan?.cpu || (h.planId === 'developer' ? '2 vCPU' : h.planId === 'pro' ? '4 vCPU' : '1 vCPU'));
          const nodeName = h.node?.name || h.nodeName;
          const nodeRegion = h.node?.region || h.nodeRegion;
          const regionStr = h.region || (nodeRegion ? `${nodeRegion} (${nodeName})` : 'Singapore (ap-southeast-1)');
          return {
            id: `host-${h.id}`,
            numericId: h.id,
            name: h.name,
            slug: h.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
            runtime: (h.runtimeId || 'nodejs') as RuntimeType,
            runtimeId: h.runtimeId,
            version: `${h.runtimeId === 'python' ? 'Python' : h.runtimeId === 'bun' ? 'Bun' : 'Node.js'} ${h.runtimeVersion}`,
            runtimeVersion: h.runtimeVersion,
            status: h.status,
            plan: {
              id: h.planId,
              name: h.plan?.name || h.planName || (h.planId === 'developer' ? 'Developer Cloud' : h.planId === 'pro' ? 'Pro Scale' : 'Starter Cloud'),
              price: h.plan?.price || (h.planId === 'developer' ? 129000 : h.planId === 'pro' ? 259000 : 49000),
              cpu: planCpu,
              ram: `${Math.round(planRamMb / 1024)} GB`,
              disk: `${planDiskGb} GB NVMe`,
              bandwidth: '1 TB',
              cpuCores: h.cpuLimit,
              ramMb: planRamMb,
              diskMb: planDiskGb * 1024,
            },
            planId: h.planId,
            nodeId: h.nodeId,
            userId: h.userId,
            region: regionStr,
            regionFlag: (regionStr.includes('Tokyo')) ? '🇯🇵' : (regionStr.includes('Vietnam')) ? '🇻🇳' : '🇸🇬',
            ipAddress: h.nodeIp || '128.199.204.15',
            port: h.port || (h.runtimeId === 'python' ? 8000 : h.runtimeId === 'bun' ? 8080 : 3000),
            uptime: h.status === 'PENDING' ? 'Chưa khả dụng (Pending)' : h.status === 'RUNNING' ? '1 phút' : '0 phút',
            uptimeSeconds: 0,
            cpuUsage: 0,
            ramUsage: 0,
            ramTotal: planRamMb,
            diskUsage: 0,
            diskTotal: planDiskGb,
            cpuLimit: h.cpuLimit,
            memoryLimit: planRamMb,
            diskLimit: planDiskGb,
            createdAt: h.createdAt,
            updatedAt: h.updatedAt,
            primaryDomain: `${h.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.astoncloud.vn`,
            autoRestart: true,
          };
        });
        setHosts(mapped);
        if (mapped.length > 0) {
          setCurrentHostId((prev) => {
            const exists = mapped.some((m) => m.id === prev);
            return exists ? prev : mapped[0].id;
          });
        }
      }
    } catch (err) {
      console.warn('Could not fetch backend hosts:', err);
    }
  };

  const refreshHosts = async () => {
    if (authToken) {
      await fetchBackendHosts(authToken);
    }
  };

  // Verify real backend session on mount or token change
  useEffect(() => {
    if (!authToken) {
      setIsAuthenticated(false);
      return;
    }

    fetch('/api/v1/auth/me', {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data?.user) {
          const u = data.data.user;
          setIsAuthenticated(true);
          setUserProfile((prev) => ({
            ...prev,
            id: u.id,
            name: u.displayName || u.username,
            email: u.email,
            role: u.role,
            avatar: u.avatarUrl || prev.avatar,
          }));
          fetchBackendHosts(authToken);
        } else {
          localStorage.removeItem('aston_auth_token');
          setAuthToken(null);
          setIsAuthenticated(false);
        }
      })
      .catch(() => {
        // Backend offline or unreachable, keep offline state
      });
  }, [authToken]);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('aston_hosts', JSON.stringify(hosts));
  }, [hosts]);

  useEffect(() => {
    localStorage.setItem('aston_files', JSON.stringify(files));
  }, [files]);

  useEffect(() => {
    localStorage.setItem('aston_env_vars', JSON.stringify(envVars));
  }, [envVars]);

  useEffect(() => {
    localStorage.setItem('aston_domains', JSON.stringify(domains));
  }, [domains]);

  useEffect(() => {
    localStorage.setItem('aston_backups', JSON.stringify(backups));
  }, [backups]);

  const getHost = (id?: string) => {
    const targetId = id || currentHostId;
    return hosts.find((h) => h.id === targetId) || hosts[0];
  };

  const startHost = (id: string) => {
    const target = hosts.find((h) => h.id === id);
    if (target?.status === 'PENDING') {
      showToast({
        title: 'Hạ tầng đang chuẩn bị',
        message: 'Máy chủ đang ở trạng thái Chờ cấp phát (Pending). Container chưa được triển khai trên node. Tính năng điều khiển container sẽ khả dụng khi kết nối Node Agent.',
        type: 'info',
      });
      return;
    }

    setHosts((prev) =>
      prev.map((h) => {
        if (h.id === id) {
          return {
            ...h,
            status: 'online',
            uptime: '1 phút (Vừa khởi động)',
            uptimeSeconds: 60,
            cpuUsage: Math.floor(Math.random() * 20) + 15,
            ramUsage: Math.floor(h.ramTotal * 0.35),
          };
        }
        return h;
      })
    );
    showToast({
      title: 'Đã bật máy chủ',
      message: `Container máy chủ đã được khởi chạy thành công.`,
      type: 'success',
    });
  };

  const stopHost = (id: string) => {
    const target = hosts.find((h) => h.id === id);
    if (target?.status === 'PENDING') {
      showToast({
        title: 'Chưa khởi chạy container',
        message: 'Máy chủ đang ở trạng thái Chờ cấp phát (Pending). Không có tiến trình container nào đang hoạt động.',
        type: 'info',
      });
      return;
    }

    setHosts((prev) =>
      prev.map((h) => {
        if (h.id === id) {
          return {
            ...h,
            status: 'offline',
            uptime: '0 phút (Đã tắt)',
            uptimeSeconds: 0,
            cpuUsage: 0,
            ramUsage: 0,
          };
        }
        return h;
      })
    );
    showToast({
      title: 'Đã tắt máy chủ',
      message: `Container máy chủ đã dừng hoạt động an toàn.`,
      type: 'warning',
    });
  };

  const restartHost = (id: string) => {
    const target = hosts.find((h) => h.id === id);
    if (target?.status === 'PENDING') {
      showToast({
        title: 'Hạ tầng đang chuẩn bị',
        message: 'Máy chủ đang ở trạng thái Chờ cấp phát (Pending). Tính năng khởi động lại sẽ khả dụng sau khi hoàn thành cấp phát container.',
        type: 'info',
      });
      return;
    }

    setHosts((prev) =>
      prev.map((h) => {
        if (h.id === id) {
          return {
            ...h,
            status: 'restarting',
          };
        }
        return h;
      })
    );
    showToast({
      title: 'Đang khởi động lại',
      message: `Đang tiến hành chu trình tái khởi động...`,
      type: 'info',
    });

    setTimeout(() => {
      setHosts((prev) =>
        prev.map((h) => {
          if (h.id === id) {
            return {
              ...h,
              status: 'online',
              uptime: '1 phút (Vừa khởi động lại)',
              uptimeSeconds: 60,
              cpuUsage: Math.floor(Math.random() * 15) + 20,
              ramUsage: Math.floor(h.ramTotal * 0.38),
            };
          }
          return h;
        })
      );
      showToast({
        title: 'Máy chủ trực tuyến',
        message: `Máy chủ đã hoàn tất khởi động lại và sẵn sàng nhận kết nối.`,
        type: 'success',
      });
    }, 1500);
  };

  const initHostDefaults = (newId: string, host: Host) => {
    const defaultFiles: FileItem[] = [
      {
        id: `f-${Date.now()}-1`,
        name: 'src',
        path: '/app/src',
        isDirectory: true,
        updatedAt: 'Vừa xong',
      },
      {
        id: `f-${Date.now()}-2`,
        name: host.runtime === 'python' ? 'main.py' : host.runtime === 'bun' ? 'index.ts' : 'index.js',
        path: `/app/${host.runtime === 'python' ? 'main.py' : host.runtime === 'bun' ? 'index.ts' : 'index.js'}`,
        isDirectory: false,
        size: '512 B',
        updatedAt: 'Vừa xong',
        content: host.runtime === 'python'
          ? `from fastapi import FastAPI\n\napp = FastAPI()\n\n@app.get("/")\ndef read_root():\n    return {"message": "Xin chào từ Aston Cloud Python!"}\n`
          : host.runtime === 'bun'
          ? `export default {\n  port: 8080,\n  fetch(req) {\n    return new Response("Xin chào từ Aston Cloud Bun Server!");\n  },\n};\n`
          : `const http = require('http');\nconst server = http.createServer((req, res) => {\n  res.writeHead(200, {'Content-Type': 'application/json'});\n  res.end(JSON.stringify({ message: 'Xin chào từ Aston Cloud Node.js!' }));\n});\nserver.listen(process.env.PORT || 3000);\n`,
      },
      {
        id: `f-${Date.now()}-3`,
        name: '.env',
        path: '/app/.env',
        isDirectory: false,
        size: '120 B',
        updatedAt: 'Vừa xong',
        content: `PORT=${host.port}\nNODE_ENV=production\n`,
      },
    ];

    setFiles((prev) => ({ ...prev, [newId]: defaultFiles }));
    setEnvVars((prev) => ({
      ...prev,
      [newId]: [
        { id: `env-${Date.now()}-1`, key: 'PORT', value: `${host.port}`, isSecret: false, updatedAt: 'Vừa xong' },
        { id: `env-${Date.now()}-2`, key: 'ENV', value: 'production', isSecret: false, updatedAt: 'Vừa xong' },
      ],
    }));
    setLogs((prev) => ({
      ...prev,
      [newId]: [
        { id: `l-${Date.now()}-1`, timestamp: new Date().toLocaleTimeString(), level: 'info', source: 'system', message: `Máy chủ ${host.name} đã được ghi nhận trong cơ sở dữ liệu với trạng thái PENDING.` },
        { id: `l-${Date.now()}-2`, timestamp: new Date().toLocaleTimeString(), level: 'info', source: 'runtime', message: `Đang chờ Node Agent cấp phát container thực tế tại cổng ${host.port}` },
      ],
    }));
  };

  const createHost = async (newHostData: Omit<Host, 'id' | 'createdAt' | 'uptime' | 'uptimeSeconds' | 'cpuUsage' | 'ramUsage' | 'diskUsage'>): Promise<Host> => {
    // If authenticated, persist to real backend API
    if (authToken) {
      try {
        const payload = {
          name: newHostData.name,
          runtimeId: newHostData.runtimeId || newHostData.runtime,
          runtimeVersion: newHostData.runtimeVersion || (newHostData.version ? newHostData.version.split(' ')[1] : '20'),
          planId: newHostData.planId || newHostData.plan.id,
          region: newHostData.region,
        };

        const res = await fetch('/api/v1/hosts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(payload),
        });

        const json = await res.json();
        if (json.success && json.data?.host) {
          const h = json.data.host;
          const planRamMb = h.ramLimitMb || newHostData.ramTotal;
          const planDiskGb = h.diskLimitGb || newHostData.diskTotal;
          const planCpu = h.cpuLimit ? `${h.cpuLimit} vCPU` : (newHostData.plan?.cpu || '1 vCPU');

          const newHost: Host = {
            ...newHostData,
            id: `host-${h.id}`,
            numericId: h.id,
            status: 'PENDING',
            plan: {
              ...newHostData.plan,
              cpu: planCpu,
              ram: `${Math.round(planRamMb / 1024)} GB`,
              disk: `${planDiskGb} GB NVMe`,
              cpuCores: h.cpuLimit,
              ramMb: planRamMb,
              diskMb: planDiskGb * 1024,
            },
            nodeId: h.nodeId,
            userId: h.userId,
            createdAt: h.createdAt,
            uptime: 'Chưa khả dụng (Pending)',
            uptimeSeconds: 0,
            cpuUsage: 0,
            ramUsage: 0,
            diskUsage: 0,
            ramTotal: planRamMb,
            diskTotal: planDiskGb,
            cpuLimit: h.cpuLimit,
            memoryLimit: planRamMb,
            diskLimit: planDiskGb,
          };

          setHosts((prev) => [newHost, ...prev]);
          initHostDefaults(newHost.id, newHost);

          showToast({
            title: 'Đã khởi tạo máy chủ',
            message: `Máy chủ "${newHost.name}" đã được ghi nhận với trạng thái Chờ cấp phát (Pending).`,
            type: 'success',
          });

          return newHost;
        } else {
          throw new Error(json.error?.message || 'Không thể tạo máy chủ trên hệ thống');
        }
      } catch (err: any) {
        showToast({
          title: 'Lỗi tạo máy chủ',
          message: err.message || 'Lỗi kết nối tới máy chủ',
          type: 'error',
        });
        throw err;
      }
    }

    // Fallback local mode (offline or unauthenticated)
    const newId = `host-${Date.now()}`;
    const newHost: Host = {
      ...newHostData,
      id: newId,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      uptime: 'Chưa khả dụng (Pending)',
      uptimeSeconds: 0,
      cpuUsage: 0,
      ramUsage: 0,
      diskUsage: 0,
    };

    setHosts((prev) => [newHost, ...prev]);
    initHostDefaults(newId, newHost);

    showToast({
      title: 'Đã khởi tạo máy chủ',
      message: `Máy chủ "${newHost.name}" đã được ghi nhận với trạng thái Chờ cấp phát (Pending).`,
      type: 'success',
    });

    return newHost;
  };

  const deleteHost = async (id: string): Promise<void> => {
    const target = hosts.find((h) => h.id === id);
    const numId = (target as any)?.numericId || id.replace('host-', '');

    if (authToken && numId && !isNaN(Number(numId))) {
      try {
        const res = await fetch(`/api/v1/hosts/${numId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${authToken}` },
        });
        const json = await res.json();
        if (!json.success) {
          throw new Error(json.error?.message || 'Không thể xóa máy chủ trên hệ thống');
        }
      } catch (err: any) {
        showToast({
          title: 'Lỗi xóa máy chủ',
          message: err.message || 'Lỗi kết nối API',
          type: 'error',
        });
        return;
      }
    }

    setHosts((prev) => prev.filter((h) => h.id !== id));
    showToast({
      title: 'Đã xóa máy chủ',
      message: `Máy chủ "${target?.name || id}" đã được gỡ bỏ khỏi hệ thống.`,
      type: 'warning',
    });
  };

  // Files
  const saveFileContent = (hostId: string, fileId: string, content: string) => {
    setFiles((prev) => {
      const hostFiles = prev[hostId] || [];
      const updated = hostFiles.map((f) => (f.id === fileId ? { ...f, content, updatedAt: 'Vừa xong' } : f));
      return { ...prev, [hostId]: updated };
    });
    showToast({
      title: 'Đã lưu tệp tin',
      message: 'Thay đổi đã được lưu thành công vào bộ nhớ.',
      type: 'success',
    });
  };

  const createFile = (hostId: string, name: string, isDirectory: boolean, content?: string) => {
    const newFile: FileItem = {
      id: `f-${Date.now()}`,
      name,
      path: `/app/${name}`,
      isDirectory,
      size: isDirectory ? undefined : '0 B',
      updatedAt: 'Vừa xong',
      content: content || '',
    };
    setFiles((prev) => {
      const hostFiles = prev[hostId] || [];
      return { ...prev, [hostId]: [...hostFiles, newFile] };
    });
    showToast({
      title: isDirectory ? 'Đã tạo thư mục' : 'Đã tạo tệp tin',
      message: `Đã tạo "${name}".`,
      type: 'success',
    });
  };

  const deleteFile = (hostId: string, fileId: string) => {
    setFiles((prev) => {
      const hostFiles = prev[hostId] || [];
      return { ...prev, [hostId]: hostFiles.filter((f) => f.id !== fileId) };
    });
    showToast({
      title: 'Đã xóa tệp tin',
      message: 'Mục đã được xóa khỏi hệ thống tệp.',
      type: 'info',
    });
  };

  // Env Vars
  const addEnvVar = (hostId: string, key: string, value: string, isSecret: boolean) => {
    const newVar: EnvVariable = {
      id: `env-${Date.now()}`,
      key: key.trim().toUpperCase(),
      value: value.trim(),
      isSecret,
      updatedAt: 'Vừa xong',
    };
    setEnvVars((prev) => {
      const current = prev[hostId] || [];
      return { ...prev, [hostId]: [...current, newVar] };
    });
    showToast({
      title: 'Đã thêm biến môi trường',
      message: `Biến môi trường "${newVar.key}" đã được thêm.`,
      type: 'success',
    });
  };

  const updateEnvVar = (hostId: string, varId: string, key: string, value: string, isSecret: boolean) => {
    setEnvVars((prev) => {
      const current = prev[hostId] || [];
      return {
        ...prev,
        [hostId]: current.map((v) => (v.id === varId ? { ...v, key: key.trim().toUpperCase(), value: value.trim(), isSecret, updatedAt: 'Vừa xong' } : v)),
      };
    });
    showToast({
      title: 'Đã cập nhật biến',
      message: `Đã lưu thay đổi cho "${key}".`,
      type: 'success',
    });
  };

  const deleteEnvVar = (hostId: string, varId: string) => {
    setEnvVars((prev) => {
      const current = prev[hostId] || [];
      return { ...prev, [hostId]: current.filter((v) => v.id !== varId) };
    });
    showToast({
      title: 'Đã xóa biến',
      message: 'Biến môi trường đã được gỡ bỏ.',
      type: 'info',
    });
  };

  // Domains
  const addDomain = (hostId: string, domainName: string, targetPort: number = 3000) => {
    const host = hosts.find((h) => h.id === hostId);
    const newRecord: DomainRecord = {
      id: `dom-${Date.now()}`,
      domain: domainName.toLowerCase().trim(),
      hostId,
      hostName: host?.name || 'Máy chủ',
      status: 'verifying',
      sslStatus: 'provisioning',
      targetPort,
      createdAt: new Date().toISOString(),
      dnsRecords: [
        { type: 'A', name: '@', value: host?.ipAddress || '128.199.204.81', status: 'pending' },
        { type: 'CNAME', name: 'www', value: 'cname.astoncloud.app', status: 'pending' },
        { type: 'TXT', name: '_aston-challenge', value: `aston-verify=${Math.random().toString(36).substring(2, 10)}`, status: 'pending' },
      ],
    };
    setDomains((prev) => [newRecord, ...prev]);
    showToast({
      title: 'Đã thêm tên miền',
      message: `Tên miền ${newRecord.domain} đã được cấu hình. Vui lòng trỏ DNS theo hướng dẫn.`,
      type: 'success',
    });
  };

  const deleteDomain = (id: string) => {
    setDomains((prev) => prev.filter((d) => d.id !== id));
    showToast({
      title: 'Đã gỡ tên miền',
      message: 'Cấu hình tên miền và chứng chỉ SSL đã được hủy bỏ.',
      type: 'info',
    });
  };

  // Backups
  const createBackup = (hostId: string, name: string) => {
    const host = hosts.find((h) => h.id === hostId);
    const newBackup: BackupItem = {
      id: `bk-${Date.now()}`,
      name: name.trim() || `snapshot-${Date.now()}`,
      hostId,
      hostName: host?.name || 'Máy chủ',
      size: `${(Math.random() * 200 + 150).toFixed(0)} MB`,
      createdAt: new Date().toISOString(),
      status: 'ready',
      isAutomatic: false,
    };
    setBackups((prev) => [newBackup, ...prev]);
    showToast({
      title: 'Đã tạo bản sao lưu',
      message: `Bản sao lưu "${newBackup.name}" đã được lưu an toàn vào kho lưu trữ đám mây.`,
      type: 'success',
    });
  };

  const restoreBackup = (id: string) => {
    const bk = backups.find((b) => b.id === id);
    showToast({
      title: 'Đang khôi phục',
      message: `Đang khôi phục dữ liệu từ bản "${bk?.name}" vào máy chủ...`,
      type: 'info',
    });
    setTimeout(() => {
      showToast({
        title: 'Khôi phục hoàn tất',
        message: `Bản sao lưu "${bk?.name}" đã được khôi phục thành công.`,
        type: 'success',
      });
    }, 2000);
  };

  const deleteBackup = (id: string) => {
    setBackups((prev) => prev.filter((b) => b.id !== id));
    showToast({
      title: 'Đã xóa bản sao lưu',
      message: 'Bản sao lưu đã được xóa vĩnh viễn.',
      type: 'info',
    });
  };

  // Logs
  const clearLogs = (hostId: string) => {
    setLogs((prev) => ({ ...prev, [hostId]: [] }));
    showToast({
      title: 'Đã xóa nhật ký',
      message: 'Bộ nhớ đệm nhật ký của máy chủ này đã được làm sạch.',
      type: 'info',
    });
  };

  // Profile & Real Backend Sync
  const updateUserProfile = (profileUpdate: Partial<UserProfile>) => {
    setUserProfile((prev) => ({ ...prev, ...profileUpdate }));

    if (authToken && profileUpdate.name) {
      fetch('/api/v1/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          displayName: profileUpdate.name,
          avatarUrl: profileUpdate.avatar,
        }),
      }).catch(() => {});
    }

    showToast({
      title: 'Đã cập nhật hồ sơ',
      message: 'Cài đặt tài khoản của bạn đã được lưu.',
      type: 'success',
    });
  };

  const login = (token: string, user?: any) => {
    localStorage.setItem('aston_auth_token', token);
    setAuthToken(token);
    setIsAuthenticated(true);
    fetchBackendHosts(token);
    if (user) {
      setUserProfile((prev) => ({
        ...prev,
        id: user.id,
        name: user.displayName || user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatarUrl || prev.avatar,
      }));
    }
  };

  const logout = () => {
    if (authToken) {
      fetch('/api/v1/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      }).catch(() => {});
    }
    localStorage.removeItem('aston_auth_token');
    setAuthToken(null);
    setIsAuthenticated(false);
    showToast({
      title: 'Đã đăng xuất',
      message: 'Bạn đã đăng xuất khỏi phiên làm việc an toàn.',
      type: 'info',
    });
  };

  const openAuthModal = (tab: 'login' | 'register' = 'login') => {
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const addBalance = (amount: number) => {
    setUserProfile((prev) => ({ ...prev, balance: prev.balance + amount }));
    showToast({
      title: 'Nạp tiền thành công',
      message: `Đã cộng thêm $${amount.toFixed(2)} USD vào số dư tài khoản.`,
      type: 'success',
    });
  };

  // Support
  const createTicket = (
    subject: string,
    department: SupportTicket['department'],
    priority: SupportTicket['priority'],
    initialMessage: string
  ) => {
    const newId = `TCK-${Math.floor(1000 + Math.random() * 9000)}`;
    const newTicket: SupportTicket = {
      id: newId,
      subject,
      department,
      priority,
      status: 'open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [
        {
          id: `msg-${Date.now()}`,
          sender: 'user',
          senderName: userProfile.name,
          content: initialMessage,
          timestamp: 'Vừa xong',
        },
      ],
    };
    setTickets((prev) => [newTicket, ...prev]);
    showToast({
      title: 'Đã gửi yêu cầu',
      message: `Yêu cầu hỗ trợ #${newId} đã được tạo. Chuyên viên sẽ phản hồi sớm nhất.`,
      type: 'success',
    });
  };

  const replyToTicket = (ticketId: string, content: string) => {
    const userMsg = {
      id: `msg-${Date.now()}`,
      sender: 'user' as const,
      senderName: userProfile.name,
      content,
      timestamp: 'Vừa xong',
    };

    setTickets((prev) =>
      prev.map((t) => {
        if (t.id === ticketId) {
          return {
            ...t,
            updatedAt: new Date().toISOString(),
            status: 'in_progress',
            messages: [...t.messages, userMsg],
          };
        }
        return t;
      })
    );

    // Simulated automated assistant reply after 2 seconds
    setTimeout(() => {
      const agentMsg = {
        id: `msg-${Date.now() + 1}`,
        sender: 'agent' as const,
        senderName: 'Aston Support Agent',
        content: `Cảm ơn bạn đã phản hồi! Đội ngũ kỹ thuật Aston Cloud đã tiếp nhận thông tin và đang kiểm tra chẩn đoán hệ thống cho bạn.`,
        timestamp: 'Vừa xong',
      };
      setTickets((prev) =>
        prev.map((t) => {
          if (t.id === ticketId) {
            return {
              ...t,
              messages: [...t.messages, agentMsg],
            };
          }
          return t;
        })
      );
      showToast({
        title: 'Có phản hồi mới',
        message: `Chuyên viên Aston Cloud vừa trả lời yêu cầu #${ticketId}`,
        type: 'info',
      });
    }, 2500);
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const clearNotifications = () => {
    setNotifications([]);
    showToast({
      title: 'Đã xóa thông báo',
      message: 'Tất cả thông báo đã được dọn sạch.',
      type: 'info',
    });
  };

  return (
    <AppStateContext.Provider
      value={{
        hosts,
        currentHostId,
        setCurrentHostId,
        getHost,
        startHost,
        stopHost,
        restartHost,
        createHost,
        deleteHost,
        refreshHosts,
        files,
        saveFileContent,
        createFile,
        deleteFile,
        envVars,
        addEnvVar,
        updateEnvVar,
        deleteEnvVar,
        domains,
        addDomain,
        deleteDomain,
        backups,
        createBackup,
        restoreBackup,
        deleteBackup,
        logs,
        clearLogs,
        invoices,
        userProfile,
        updateUserProfile,
        addBalance,
        authToken,
        isAuthenticated,
        login,
        logout,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
        authModalTab,
        tickets,
        createTicket,
        replyToTicket,
        notifications,
        markNotificationAsRead,
        clearNotifications,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
};

export const useAppState = () => {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
};
