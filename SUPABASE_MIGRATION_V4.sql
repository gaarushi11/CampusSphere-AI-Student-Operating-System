-- ============================================================
-- CampusFlow — V4 Migration
-- Adds dynamic attendance tracking table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.attendance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT CHECK (status IN ('Present', 'Absent', 'Cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_id, date)
);

ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attendance_owner_access" ON public.attendance_logs
  FOR ALL USING (auth.uid() = user_id);
