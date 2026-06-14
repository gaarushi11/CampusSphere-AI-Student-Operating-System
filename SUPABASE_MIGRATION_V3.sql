-- ============================================================
-- CampusFlow — V3 Migration (Hotfix)
-- Run this in Supabase SQL Editor AFTER V2
-- Fixes missing file_path column and clears out buggy documents
-- ============================================================

-- 1. Add file_path to documents table so deletion and indexing works properly
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'file_path') THEN
    ALTER TABLE public.documents ADD COLUMN file_path TEXT DEFAULT NULL;
  END IF;
END $$;

-- 2. Delete any old stuck/failed documents to give you a clean slate
DELETE FROM public.documents WHERE is_indexed = false OR file_path IS NULL;
