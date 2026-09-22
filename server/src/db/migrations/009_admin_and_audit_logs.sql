-- Migration 009: Admin Panel and Audit Logging System
-- Supports comprehensive audit trails, platform configuration, and administrative controls

-- 1. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id VARCHAR(255) NOT NULL,
  actor_email VARCHAR(255) NOT NULL,
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50) NOT NULL,
  target_id VARCHAR(255),
  details JSONB DEFAULT '{}'::jsonb,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_type ON audit_logs(target_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- 2. System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  is_secret BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default safe system settings
INSERT INTO system_settings (key, value, description, is_secret)
VALUES
  ('platform_name', 'Aston Cloud Platform', 'Tên nền tảng hiển thị', false),
  ('support_email', 'support@astoncloud.vn', 'Email tiếp nhận yêu cầu hỗ trợ', false),
  ('default_region', 'Singapore', 'Vùng mặc định cho máy chủ mới', false),
  ('maintenance_mode', 'false', 'Kích hoạt chế độ bảo trì toàn hệ thống', false),
  ('allowed_runtimes', '["nodejs","bun","python"]', 'Danh sách môi trường thực thi được phép', false),
  ('max_free_hosts_per_user', '1', 'Số lượng máy chủ miễn phí tối đa cho tài khoản chưa có gói', false)
ON CONFLICT (key) DO NOTHING;
