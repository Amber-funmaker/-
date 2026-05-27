-- Supabase SQL Updates for 那得赚一笔
-- Run this in Supabase SQL Editor to add all new columns

-- =====================
-- activities table updates
-- =====================

ALTER TABLE activities ADD COLUMN IF NOT EXISTS start_date TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS end_date TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS time_slots JSONB;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS require_checkin BOOLEAN DEFAULT false;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS signup_deadline TEXT;

-- =====================
-- apps table updates
-- =====================

ALTER TABLE apps ADD COLUMN IF NOT EXISTS selected_date TEXT;
ALTER TABLE apps ADD COLUMN IF NOT EXISTS selected_slot TEXT;
ALTER TABLE apps ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;
ALTER TABLE apps ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE apps ADD COLUMN IF NOT EXISTS salary_apply_note TEXT;
ALTER TABLE apps ADD COLUMN IF NOT EXISTS confirmed_salary NUMERIC(10,2);
ALTER TABLE apps ADD COLUMN IF NOT EXISTS confirmed_points INTEGER DEFAULT 0;
ALTER TABLE apps ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
ALTER TABLE apps ADD COLUMN IF NOT EXISTS salary_screenshot TEXT;

-- =====================
-- users table updates
-- =====================

ALTER TABLE users ADD COLUMN IF NOT EXISTS total_points INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_salary NUMERIC(10,2) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS completed_count INTEGER DEFAULT 0;

-- =====================
-- rewards table (new)
-- =====================

CREATE TABLE IF NOT EXISTS rewards (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  points_cost INTEGER NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- Indexes for performance
-- =====================

CREATE INDEX IF NOT EXISTS idx_activities_status ON activities(status);
CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_apps_userid ON apps(userid);
CREATE INDEX IF NOT EXISTS idx_apps_taskid ON apps(taskid);
CREATE INDEX IF NOT EXISTS idx_apps_status ON apps(status);
CREATE INDEX IF NOT EXISTS idx_rewards_status ON rewards(status);

-- =====================
-- Migrate legacy data
-- =====================

-- Copy activities.date to activities.start_date where start_date is null
UPDATE activities SET start_date = date WHERE start_date IS NULL AND date IS NOT NULL;
UPDATE activities SET end_date = date WHERE end_date IS NULL AND date IS NOT NULL;

-- Copy activities.points to apps.taskpay where taskpay is null
UPDATE apps SET taskpay = (
  SELECT points FROM activities WHERE activities.id = apps.taskid LIMIT 1
) WHERE taskpay IS NULL OR taskpay = 0;

-- Initialize users.total_points from users.points for existing users
UPDATE users SET total_points = COALESCE(points, 0) WHERE total_points = 0 OR total_points IS NULL;