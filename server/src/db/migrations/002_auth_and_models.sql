-- Migration 002: Authentication & Enhanced Relational Models
-- Enriches users with username, display_name, role (USER/ADMIN), status, and connects user ownership

-- 1. Upgrade users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- Backfill display_name from full_name if empty
UPDATE users SET display_name = full_name WHERE display_name IS NULL;
UPDATE users SET display_name = 'Người Dùng Aston' WHERE display_name IS NULL;
ALTER TABLE users ALTER COLUMN display_name SET NOT NULL;

-- Backfill username from email if empty
UPDATE users SET username = LOWER(SPLIT_PART(email, '@', 1)) WHERE username IS NULL;
UPDATE users SET username = 'user_' || SUBSTRING(id::text, 1, 8) WHERE username IS NULL;
ALTER TABLE users ALTER COLUMN username SET NOT NULL;

-- Ensure username is unique
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_users_username'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT uq_users_username UNIQUE (username);
  END IF;
END $$;

-- Update role constraint: default 'USER', check ('USER', 'ADMIN')
UPDATE users SET role = 'USER' WHERE role = 'customer' OR role IS NULL;
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'USER';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_users_role'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT chk_users_role CHECK (role IN ('USER', 'ADMIN'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_users_status'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT chk_users_status CHECK (status IN ('ACTIVE', 'SUSPENDED', 'DISABLED'));
  END IF;
END $$;

-- 2. Add direct user_id to host_domains for fast query & isolation
ALTER TABLE host_domains ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
UPDATE host_domains hd
SET user_id = h.user_id
FROM hosts h
WHERE hd.host_id = h.id AND hd.user_id IS NULL;

-- 3. Add direct user_id to host_backups for fast query & isolation
ALTER TABLE host_backups ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
UPDATE host_backups hb
SET user_id = h.user_id
FROM hosts h
WHERE hb.host_id = h.id AND hb.user_id IS NULL;

-- 4. Create Indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_host_domains_user_id ON host_domains(user_id);
CREATE INDEX IF NOT EXISTS idx_host_backups_user_id ON host_backups(user_id);

-- 5. Seed Default Admin & Sample User Accounts
INSERT INTO users (
  email,
  username,
  display_name,
  full_name,
  password_hash,
  role,
  status,
  avatar_url,
  created_at,
  updated_at
) VALUES (
  'admin@astoncloud.vn',
  'admin',
  'Aston Administrator',
  'Aston Administrator',
  '$2b$10$IynC0Nx3j4rxjOl8kUz43ek9R3yYNgf/P7ZNkLJQ.Dg4d7LvE4EHW', -- AdminPassword@123
  'ADMIN',
  'ACTIVE',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  role = 'ADMIN',
  status = 'ACTIVE',
  username = EXCLUDED.username,
  display_name = EXCLUDED.display_name;

INSERT INTO users (
  email,
  username,
  display_name,
  full_name,
  password_hash,
  role,
  status,
  avatar_url,
  created_at,
  updated_at
) VALUES (
  'alex.dang@astoncloud.vn',
  'alex_dang',
  'Alex Đặng',
  'Alex Đặng',
  '$2b$10$g2AxpJ4v9rQVD6O3E6SkMuXv1L7lCAAxwGLukYoZlbTyXjEODNeCq', -- Password@123
  'USER',
  'ACTIVE',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  role = 'USER',
  status = 'ACTIVE',
  username = EXCLUDED.username,
  display_name = EXCLUDED.display_name;
