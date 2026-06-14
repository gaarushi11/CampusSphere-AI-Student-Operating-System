-- ============================================================
-- CampusFlow — Migration V5: PocketBuddy + Campus Events
-- Run this in Supabase SQL Editor AFTER SUPABASE_SETUP.sql
-- ============================================================

-- ============================================================
-- 1. EXPENSES TABLE (per-user financial tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.expenses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount      NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  category    TEXT NOT NULL DEFAULT 'Other'
              CHECK (category IN ('Food','Transport','Entertainment','Academic','Shopping','Health','Other')),
  description TEXT,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS expenses_user_date_idx ON public.expenses (user_id, date DESC);
CREATE INDEX IF NOT EXISTS expenses_user_category_idx ON public.expenses (user_id, category);

-- ============================================================
-- 2. BUDGET GOALS TABLE (monthly limits per category)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.budget_goals (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category       TEXT NOT NULL CHECK (category IN ('Food','Transport','Entertainment','Academic','Shopping','Health','Other')),
  monthly_limit  NUMERIC(10,2) NOT NULL CHECK (monthly_limit >= 0),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, category)  -- one goal per category per user
);

CREATE INDEX IF NOT EXISTS budget_goals_user_idx ON public.budget_goals (user_id);

-- ============================================================
-- 3. WELLNESS LOGS TABLE (daily mood/sleep/stress tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.wellness_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date         DATE NOT NULL DEFAULT CURRENT_DATE,
  mood         INT NOT NULL CHECK (mood BETWEEN 1 AND 5),         -- 1=terrible, 5=great
  sleep_hours  NUMERIC(3,1) CHECK (sleep_hours BETWEEN 0 AND 24),
  stress_level INT NOT NULL CHECK (stress_level BETWEEN 1 AND 5), -- 1=relaxed, 5=overwhelmed
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)  -- one log per day per user
);

CREATE INDEX IF NOT EXISTS wellness_user_date_idx ON public.wellness_logs (user_id, date DESC);

-- ============================================================
-- 4. CAMPUS EVENTS TABLE (user-created, campus-wide visible)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.campus_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  event_date      TIMESTAMPTZ NOT NULL,
  location        TEXT DEFAULT 'TBD',
  category        TEXT NOT NULL DEFAULT 'Academic'
                  CHECK (category IN ('Academic','Club','Placement','Social','Sports','Hackathon','Workshop')),
  created_by_name TEXT,  -- denormalized for fast reads
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS campus_events_date_idx ON public.campus_events (event_date DESC);

-- ============================================================
-- 5. ADD settings JSONB COLUMN TO profiles
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{
    "notifications_assignments": true,
    "notifications_attendance": true,
    "notifications_placement": true,
    "notifications_hostel": false,
    "appearance_dark_mode": true,
    "appearance_compact": false,
    "appearance_animations": true,
    "ai_auto_summarize": true,
    "ai_deadline_alerts": true,
    "ai_whatsapp_extraction": true,
    "privacy_share_analytics": false,
    "privacy_2fa": true
  }'::jsonb;

-- ============================================================
-- 6. ADD index_error and category COLUMNS TO documents (if missing)
-- ============================================================
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS index_error TEXT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Other';

-- ============================================================
-- 7. ROW LEVEL SECURITY
-- ============================================================

-- Expenses: per-user CRUD
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expenses_owner_access" ON public.expenses
  FOR ALL USING (auth.uid() = user_id);

-- Budget Goals: per-user CRUD
ALTER TABLE public.budget_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "budget_goals_owner_access" ON public.budget_goals
  FOR ALL USING (auth.uid() = user_id);

-- Wellness Logs: per-user CRUD
ALTER TABLE public.wellness_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wellness_owner_access" ON public.wellness_logs
  FOR ALL USING (auth.uid() = user_id);

-- Campus Events: anyone can READ, only creator can INSERT/UPDATE/DELETE
ALTER TABLE public.campus_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campus_events_public_read" ON public.campus_events
  FOR SELECT USING (true);
CREATE POLICY "campus_events_owner_write" ON public.campus_events
  FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "campus_events_owner_update" ON public.campus_events
  FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "campus_events_owner_delete" ON public.campus_events
  FOR DELETE USING (auth.uid() = created_by);

-- ============================================================
-- 8. ATTENDANCE LOGS TABLE (if not already created)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.attendance_logs (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id  UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  date      DATE NOT NULL,
  status    TEXT NOT NULL CHECK (status IN ('Present', 'Absent', 'Cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_id, date)
);

ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'attendance_logs' AND policyname = 'attendance_owner_access'
  ) THEN
    CREATE POLICY "attendance_owner_access" ON public.attendance_logs
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS attendance_logs_user_idx ON public.attendance_logs (user_id);

-- ============================================================
-- DONE! All tables created with RLS.
-- ============================================================
