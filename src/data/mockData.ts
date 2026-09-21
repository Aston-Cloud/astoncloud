import { Host, HostingPlan, FileItem, EnvVariable, DomainRecord, BackupItem, LogEntry, Invoice, SupportTicket, UserProfile, NotificationItem } from '../types';

export const INITIAL_PLANS: HostingPlan[] = [
  {
    id: 'plan-starter',
    name: 'Gói Starter Đám mây',
    price: 6,
    cpu: '1 vCPU (3.4 GHz)',
    ram: '1 GB DDR5',
    disk: '15 GB NVMe SSD',
    bandwidth: '1 TB / tháng',
  },
  {
    id: 'plan-pro',
    name: 'Gói Pro Hiệu năng cao',
    price: 16,
    cpu: '2 vCPU (3.8 GHz)',
    ram: '4 GB DDR5',
    disk: '40 GB NVMe SSD',
    bandwidth: '3 TB / tháng',
    recommended: true,
  },
  {
    id: 'plan-ultra',
    name: 'Gói Ultra Tính toán',
    price: 32,
    cpu: '4 vCPU (4.2 GHz)',
    ram: '8 GB DDR5',
    disk: '80 GB NVMe SSD',
    bandwidth: '6 TB / tháng',
  },
  {
    id: 'plan-extreme',
    name: 'Gói Cụm máy chủ Extreme',
    price: 64,
    cpu: '8 vCPU (4.5 GHz)',
    ram: '16 GB DDR5',
    disk: '160 GB NVMe SSD',
    bandwidth: '12 TB / tháng',
  },
];

export const INITIAL_HOSTS: Host[] = [
  {
    id: 'host-1',
    name: 'ecommerce-api-prod',
    slug: 'ecommerce-api-prod',
    runtime: 'nodejs',
    version: 'Node.js 20 LTS',
    status: 'online',
    plan: INITIAL_PLANS[1],
    region: 'Singapore (ap-southeast-1)',
    regionFlag: '🇸🇬',
    ipAddress: '128.199.204.81',
    port: 3000,
    uptime: '18 ngày 14 giờ',
    uptimeSeconds: 1607062,
    cpuUsage: 38,
    ramUsage: 1420,
    ramTotal: 4096,
    diskUsage: 12.4,
    diskTotal: 40,
    createdAt: '2026-08-04T10:15:00Z',
    repoUrl: 'https://github.com/aston-cloud/ecommerce-api.git',
    autoRestart: true,
  },
  {
    id: 'host-2',
    name: 'realtime-chat-bun',
    slug: 'realtime-chat-bun',
    runtime: 'bun',
    version: 'Bun 1.2.2',
    status: 'online',
    plan: INITIAL_PLANS[0],
    region: 'Tokyo (ap-northeast-1)',
    regionFlag: '🇯🇵',
    ipAddress: '139.59.215.112',
    port: 8080,
    uptime: '34 ngày 6 giờ',
    uptimeSeconds: 2959871,
    cpuUsage: 14,
    ramUsage: 340,
    ramTotal: 1024,
    diskUsage: 3.8,
    diskTotal: 15,
    createdAt: '2026-07-12T08:30:00Z',
    repoUrl: 'https://github.com/aston-cloud/bun-chat-gateway.git',
    autoRestart: true,
  },
  {
    id: 'host-3',
    name: 'ai-inference-worker',
    slug: 'ai-inference-worker',
    runtime: 'python',
    version: 'Python 3.12 (FastAPI)',
    status: 'online',
    plan: INITIAL_PLANS[2],
    region: 'Frankfurt (eu-central-1)',
    regionFlag: '🇩🇪',
    ipAddress: '159.65.120.44',
    port: 8000,
    uptime: '4 ngày 2 giờ',
    uptimeSeconds: 355800,
    cpuUsage: 72,
    ramUsage: 5920,
    ramTotal: 8192,
    diskUsage: 38.6,
    diskTotal: 80,
    createdAt: '2026-09-14T14:00:00Z',
    repoUrl: 'https://github.com/aston-cloud/ai-embeddings.git',
    autoRestart: true,
  },
  {
    id: 'host-4',
    name: 'analytics-aggregator',
    slug: 'analytics-aggregator',
    runtime: 'python',
    version: 'Python 3.11',
    status: 'offline',
    plan: INITIAL_PLANS[0],
    region: 'San Jose (us-west-1)',
    regionFlag: '🇺🇸',
    ipAddress: '143.198.62.90',
    port: 5000,
    uptime: '0 phút (Đã tắt)',
    uptimeSeconds: 0,
    cpuUsage: 0,
    ramUsage: 0,
    ramTotal: 1024,
    diskUsage: 2.1,
    diskTotal: 15,
    createdAt: '2026-08-20T09:12:00Z',
    repoUrl: 'https://github.com/aston-cloud/py-analytics.git',
    autoRestart: false,
  },
  {
    id: 'host-5',
    name: 'payment-webhook-service',
    slug: 'payment-webhook-service',
    runtime: 'nodejs',
    version: 'Node.js 22 Current',
    status: 'online',
    plan: INITIAL_PLANS[1],
    region: 'Singapore (ap-southeast-1)',
    regionFlag: '🇸🇬',
    ipAddress: '128.199.208.15',
    port: 4000,
    uptime: '9 ngày 19 giờ',
    uptimeSeconds: 848700,
    cpuUsage: 22,
    ramUsage: 890,
    ramTotal: 4096,
    diskUsage: 7.2,
    diskTotal: 40,
    createdAt: '2026-08-28T16:20:00Z',
    repoUrl: 'https://github.com/aston-cloud/payment-engine.git',
    autoRestart: true,
  },
];

export const INITIAL_FILES: Record<string, FileItem[]> = {
  'host-1': [
    {
      id: 'f-1',
      name: 'src',
      path: '/app/src',
      isDirectory: true,
      updatedAt: '18/09/2026 14:32',
    },
    {
      id: 'f-2',
      name: 'config',
      path: '/app/config',
      isDirectory: true,
      updatedAt: '15/09/2026 09:10',
    },
    {
      id: 'f-3',
      name: 'server.js',
      path: '/app/server.js',
      isDirectory: false,
      size: '2.4 KB',
      updatedAt: '20/09/2026 18:22',
      content: `const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    runtime: 'Node.js ' + process.version
  });
});

app.get('/api/products', (req, res) => {
  res.json([
    { id: 1, name: 'Cloud Instance Starter', price: 6 },
    { id: 2, name: 'Cloud Instance Pro', price: 16 },
    { id: 3, name: 'Cloud Instance Ultra', price: 32 }
  ]);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(\`🚀 Máy chủ đang chạy tại cổng \${PORT} [PID \${process.pid}]\`);
});`,
    },
    {
      id: 'f-4',
      name: 'package.json',
      path: '/app/package.json',
      isDirectory: false,
      size: '1.1 KB',
      updatedAt: '18/09/2026 11:05',
      content: `{
  "name": "ecommerce-api",
  "version": "2.4.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.21.1",
    "helmet": "^8.0.0",
    "pg": "^8.13.0"
  }
}`,
    },
    {
      id: 'f-5',
      name: '.env',
      path: '/app/.env',
      isDirectory: false,
      size: '420 B',
      updatedAt: '19/09/2026 08:00',
      content: `NODE_ENV=production
PORT=3000
DATABASE_URL=postgres://aston_usr:secure_secret@10.0.4.12:5432/ecom_db
JWT_SECRET=super_secret_jwt_sign_key_9921
REDIS_HOST=10.0.4.15
LOG_LEVEL=info`,
    },
    {
      id: 'f-6',
      name: 'README.md',
      path: '/app/README.md',
      isDirectory: false,
      size: '890 B',
      updatedAt: '04/08/2026 10:20',
      content: `# E-commerce Production API\nREST API hiệu năng cao triển khai trên nền tảng Aston Cloud (Node.js 20 LTS).`,
    },
  ],
};

export const INITIAL_ENV_VARS: Record<string, EnvVariable[]> = {
  'host-1': [
    { id: 'env-1', key: 'NODE_ENV', value: 'production', isSecret: false, updatedAt: '18/09/2026' },
    { id: 'env-2', key: 'PORT', value: '3000', isSecret: false, updatedAt: '18/09/2026' },
    { id: 'env-3', key: 'DATABASE_URL', value: 'postgres://aston_usr:enc_pass_88219@db.prod.internal:5432/ecom', isSecret: true, updatedAt: '15/09/2026' },
    { id: 'env-4', key: 'JWT_SECRET', value: 'k9_x882_a10_aston_production_sec_key_token', isSecret: true, updatedAt: '12/09/2026' },
    { id: 'env-5', key: 'REDIS_CACHE_URL', value: 'redis://cache-cluster-sg.internal:6379/0', isSecret: false, updatedAt: '10/09/2026' },
    { id: 'env-6', key: 'STRIPE_SECRET_KEY', value: 'sk_live_51Mv92K810_prod_AstonKey92147', isSecret: true, updatedAt: '02/09/2026' },
  ],
  'host-2': [
    { id: 'env-201', key: 'BUN_ENV', value: 'production', isSecret: false, updatedAt: '12/09/2026' },
    { id: 'env-202', key: 'PORT', value: '8080', isSecret: false, updatedAt: '12/09/2026' },
    { id: 'env-203', key: 'WS_SECRET', value: 'ws_auth_live_tok_bun993', isSecret: true, updatedAt: '12/09/2026' },
  ],
  'host-3': [
    { id: 'env-301', key: 'PYTHONUNBUFFERED', value: '1', isSecret: false, updatedAt: '14/09/2026' },
    { id: 'env-302', key: 'PORT', value: '8000', isSecret: false, updatedAt: '14/09/2026' },
    { id: 'env-303', key: 'MODEL_CACHE_DIR', value: '/app/cache/models', isSecret: false, updatedAt: '14/09/2026' },
    { id: 'env-304', key: 'OPENAI_API_KEY', value: 'sk-proj-78394827492817498274_aston', isSecret: true, updatedAt: '14/09/2026' },
  ],
};

export const INITIAL_DOMAINS: DomainRecord[] = [
  {
    id: 'dom-1',
    domain: 'api.storeaston.com',
    hostId: 'host-1',
    hostName: 'ecommerce-api-prod',
    status: 'active',
    sslStatus: 'active',
    targetPort: 3000,
    createdAt: '2026-08-05T12:00:00Z',
    dnsRecords: [
      { type: 'A', name: '@', value: '128.199.204.81', status: 'configured' },
      { type: 'CNAME', name: 'api', value: 'cname.astoncloud.app', status: 'configured' },
      { type: 'TXT', name: '_aston-challenge', value: 'aston-verify=f88a29b8c0', status: 'configured' },
    ],
  },
  {
    id: 'dom-2',
    domain: 'chat.astoncloud.io',
    hostId: 'host-2',
    hostName: 'realtime-chat-bun',
    status: 'active',
    sslStatus: 'active',
    targetPort: 8080,
    createdAt: '2026-08-10T15:20:00Z',
    dnsRecords: [
      { type: 'CNAME', name: 'chat', value: 'cname.astoncloud.app', status: 'configured' },
      { type: 'TXT', name: '_aston-challenge', value: 'aston-verify=319cc8e1', status: 'configured' },
    ],
  },
  {
    id: 'dom-3',
    domain: 'ai.aston-research.org',
    hostId: 'host-3',
    hostName: 'ai-inference-worker',
    status: 'active',
    sslStatus: 'active',
    targetPort: 8000,
    createdAt: '2026-09-15T08:00:00Z',
    dnsRecords: [
      { type: 'A', name: 'ai', value: '159.65.120.44', status: 'configured' },
      { type: 'TXT', name: '_aston-challenge', value: 'aston-verify=90ab771d', status: 'configured' },
    ],
  },
  {
    id: 'dom-4',
    domain: 'metrics.storeaston.com',
    hostId: 'host-4',
    hostName: 'analytics-aggregator',
    status: 'dns_pending',
    sslStatus: 'provisioning',
    targetPort: 5000,
    createdAt: '2026-09-20T11:45:00Z',
    dnsRecords: [
      { type: 'CNAME', name: 'metrics', value: 'cname.astoncloud.app', status: 'pending' },
      { type: 'TXT', name: '_aston-challenge', value: 'aston-verify=117dcf4', status: 'pending' },
    ],
  },
];

export const INITIAL_BACKUPS: BackupItem[] = [
  {
    id: 'bk-1',
    name: 'sao-luu-tu-dong-20260921',
    hostId: 'host-1',
    hostName: 'ecommerce-api-prod',
    size: '342 MB',
    createdAt: '2026-09-21T02:00:00Z',
    status: 'ready',
    isAutomatic: true,
  },
  {
    id: 'bk-2',
    name: 'sao-luu-thu-cong-v2.4',
    hostId: 'host-1',
    hostName: 'ecommerce-api-prod',
    size: '338 MB',
    createdAt: '2026-09-18T14:15:00Z',
    status: 'ready',
    isAutomatic: false,
  },
  {
    id: 'bk-3',
    name: 'sao-luu-tu-dong-20260920',
    hostId: 'host-2',
    hostName: 'realtime-chat-bun',
    size: '95 MB',
    createdAt: '2026-09-20T03:00:00Z',
    status: 'ready',
    isAutomatic: true,
  },
  {
    id: 'bk-4',
    name: 'fastapi-models-checkpoint',
    hostId: 'host-3',
    hostName: 'ai-inference-worker',
    size: '1.24 GB',
    createdAt: '2026-09-17T09:30:00Z',
    status: 'ready',
    isAutomatic: false,
  },
];

export const INITIAL_LOGS: Record<string, LogEntry[]> = {
  'host-1': [
    { id: 'l-1', timestamp: '16:00:12', level: 'info', source: 'system', message: 'Hệ thống khỏe mạnh: CPU 38%, RAM 1420MB/4096MB' },
    { id: 'l-2', timestamp: '16:00:25', level: 'info', source: 'runtime', message: 'GET /health 200 - 1.2ms [127.0.0.1]' },
    { id: 'l-3', timestamp: '16:01:04', level: 'info', source: 'runtime', message: 'POST /api/checkout 201 - 42.8ms [mã_kh: 8942]' },
    { id: 'l-4', timestamp: '16:01:45', level: 'warn', source: 'runtime', message: 'Phát hiện truy vấn chậm trên pg_stat_activity (thời gian: 312ms)' },
    { id: 'l-5', timestamp: '16:02:10', level: 'info', source: 'runtime', message: 'GET /api/products?category=electronics 200 - 8.4ms' },
    { id: 'l-6', timestamp: '16:02:50', level: 'info', source: 'system', message: 'Kiểm tra xác thực chứng chỉ SSL tự động thành công (Let\'s Encrypt)' },
    { id: 'l-7', timestamp: '16:03:15', level: 'debug', source: 'runtime', message: 'Trúng bộ nhớ đệm cho khóa: catalog:page:1 (Redis)' },
    { id: 'l-8', timestamp: '16:04:02', level: 'info', source: 'runtime', message: 'Nhận webhook đến từ cổng thanh toán: evt_39148' },
  ],
  'host-2': [
    { id: 'l-201', timestamp: '16:01:00', level: 'info', source: 'system', message: 'Runtime Bun đang hoạt động (PID 1804). 4,280 kết nối WebSocket trực tuyến.' },
    { id: 'l-202', timestamp: '16:02:30', level: 'info', source: 'runtime', message: 'Khách hàng WS đã kết nối: ip=118.69.182.25 session=s_77a' },
    { id: 'l-203', timestamp: '16:03:10', level: 'debug', source: 'runtime', message: 'Phát sóng tới phòng #general: 4,281 người đăng ký, phân phát 0.4ms' },
  ],
  'host-3': [
    { id: 'l-301', timestamp: '16:00:00', level: 'info', source: 'system', message: 'Uvicorn đang chạy tại http://0.0.0.0:8000' },
    { id: 'l-302', timestamp: '16:01:14', level: 'info', source: 'runtime', message: 'INFO: 10.0.0.2:48922 - "POST /v1/embeddings HTTP/1.1" 200 OK' },
    { id: 'l-303', timestamp: '16:02:40', level: 'info', source: 'runtime', message: 'Xử lý lô embedding: 128 vector trong 184ms' },
  ],
};

export const INITIAL_INVOICES: Invoice[] = [
  { id: 'INV-2026-09', date: '01/09/2026', description: 'Dịch vụ Đám mây - 4 Máy chủ Hoạt động (Tháng 9/2026)', amount: 70.00, status: 'paid', pdfUrl: '#' },
  { id: 'INV-2026-08', date: '01/08/2026', description: 'Dịch vụ Đám mây - 3 Máy chủ Hoạt động (Tháng 8/2026)', amount: 54.00, status: 'paid', pdfUrl: '#' },
  { id: 'INV-2026-07', date: '01/07/2026', description: 'Dịch vụ Đám mây - 2 Máy chủ Hoạt động (Tháng 7/2026)', amount: 38.00, status: 'paid', pdfUrl: '#' },
  { id: 'INV-2026-06', date: '01/06/2026', description: 'Tặng thưởng tín dụng dùng thử Aston Cloud', amount: 0.00, status: 'paid', pdfUrl: '#' },
];

export const INITIAL_TICKETS: SupportTicket[] = [
  {
    id: 'TCK-8921',
    subject: 'Yêu cầu cấp địa chỉ IPv4 tĩnh chuyên dụng cho cụm Python Frankfurt',
    department: 'technical',
    priority: 'medium',
    status: 'in_progress',
    createdAt: '2026-09-20T10:14:00Z',
    updatedAt: '2026-09-21T09:20:00Z',
    messages: [
      {
        id: 'msg-1',
        sender: 'user',
        senderName: 'Alex Rivers',
        content: 'Chào đội ngũ Aston Cloud, máy chủ xử lý AI của chúng tôi tại Frankfurt cần một địa chỉ IPv4 tĩnh để thêm vào danh sách trắng với nhà cung cấp cơ sở dữ liệu vector. Đội ngũ có thể cấp giúp được không?',
        timestamp: '20/09/2026 10:14',
      },
      {
        id: 'msg-2',
        sender: 'agent',
        senderName: 'Sophia (Chuyên viên Hỗ trợ Cloud)',
        content: 'Chào Alex! Chúng tôi đã giữ riêng một IP tĩnh (159.65.120.44) cho máy chủ `ai-inference-worker` của bạn. Bản ghi rDNS PTR đang được cập nhật và sẽ có hiệu lực toàn diện sau khoảng 2 giờ.',
        timestamp: '20/09/2026 11:30',
      },
      {
        id: 'msg-3',
        sender: 'user',
        senderName: 'Alex Rivers',
        content: 'Cảm ơn Sophia nhiều nhé! Kết nối hiện tại đã chạy rất ổn định.',
        timestamp: '21/09/2026 09:20',
      },
    ],
  },
  {
    id: 'TCK-8740',
    subject: 'Hỏi về thời hạn lưu trữ của các bản chụp sao lưu tự động hàng ngày',
    department: 'billing',
    priority: 'low',
    status: 'resolved',
    createdAt: '2026-09-12T14:05:00Z',
    updatedAt: '2026-09-13T08:15:00Z',
    messages: [
      {
        id: 'msg-101',
        sender: 'user',
        senderName: 'Alex Rivers',
        content: 'Cho mình hỏi gói Pro Performance của bên mình lưu trữ bản sao lưu tự động hàng ngày trong vòng 7 ngày hay 30 ngày vậy?',
        timestamp: '12/09/2026 14:05',
      },
      {
        id: 'msg-102',
        sender: 'agent',
        senderName: 'Marcus (Bộ phận Kế toán Aston Cloud)',
        content: 'Chào Alex! Gói Pro Performance bao gồm 14 ngày lưu trữ bản sao lưu tự động luân phiên. Bạn cũng có thể xuất các bản snapshot về bucket AWS S3 hoặc Cloudflare R2 cá nhân mà không tốn thêm phụ phí nào.',
        timestamp: '13/09/2026 08:15',
      },
    ],
  },
];

export const INITIAL_USER: UserProfile = {
  name: 'Alex Rivers',
  email: 'alex.rivers@aston-enterprise.io',
  username: 'alexrivers',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  balance: 248.50,
  currency: 'USD',
  role: 'Trưởng nhóm Hạ tầng',
  company: 'Tập đoàn Công nghệ Rivers',
  twoFactorEnabled: true,
  notificationEmail: true,
};

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'Sao lưu thành công',
    message: 'Bản sao lưu auto-daily-snapshot-20260921 đã được tạo cho ecommerce-api-prod',
    timestamp: '15 phút trước',
    read: false,
    type: 'success',
  },
  {
    id: 'notif-2',
    title: 'Mức sử dụng CPU cao',
    message: 'Máy chủ ai-inference-worker đã đạt ngưỡng 78% mức sử dụng CPU.',
    timestamp: '1 giờ trước',
    read: false,
    type: 'warning',
  },
  {
    id: 'notif-3',
    title: 'Chứng chỉ SSL đã gia hạn',
    message: 'Chứng chỉ SSL Let\'s Encrypt Wildcard đã tự động gia hạn thành công cho *.storeaston.com',
    timestamp: '4 giờ trước',
    read: true,
    type: 'info',
  },
];
