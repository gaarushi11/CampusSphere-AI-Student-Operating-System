-- ============================================================
-- CampusFlow — V2 Migration
-- Run this in Supabase SQL Editor AFTER the initial SUPABASE_SETUP.sql
-- Safe to run multiple times (all operations use IF NOT EXISTS / IF EXISTS checks)
-- ============================================================

-- 1. Add missing columns to documents table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'category') THEN
    ALTER TABLE public.documents ADD COLUMN category TEXT DEFAULT 'Other' CHECK (category IN ('Syllabus', 'Timetable', 'Notes', 'Other'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'index_error') THEN
    ALTER TABLE public.documents ADD COLUMN index_error TEXT DEFAULT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'chunk_count') THEN
    ALTER TABLE public.documents ADD COLUMN chunk_count INT DEFAULT 0;
  END IF;
END $$;

-- 2. Ensure day_of_week column exists on classes table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'classes' AND column_name = 'day_of_week') THEN
    ALTER TABLE public.classes ADD COLUMN day_of_week TEXT DEFAULT 'Monday';
  END IF;
END $$;

-- 3. Ensure color column exists on classes table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'classes' AND column_name = 'color') THEN
    ALTER TABLE public.classes ADD COLUMN color TEXT DEFAULT 'bg-cyan-500';
  END IF;
END $$;

-- 4. Recreate the match_document_chunks function with p_user_id parameter
CREATE OR REPLACE FUNCTION public.match_document_chunks(
  query_embedding  vector(1536),
  match_threshold  float,
  match_count      int,
  p_user_id        uuid
)
RETURNS TABLE (
  id            uuid,
  document_id   uuid,
  content       text,
  chunk_index   int,
  similarity    float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    dc.content,
    dc.chunk_index,
    (1 - (dc.embedding <=> query_embedding))::float AS similarity
  FROM public.document_chunks dc
  INNER JOIN public.documents d ON d.id = dc.document_id
  WHERE
    d.user_id = p_user_id
    AND d.is_indexed = true
    AND (1 - (dc.embedding <=> query_embedding)) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 5. Create HNSW vector index if not exists (avoids OOM on free tier)
CREATE INDEX IF NOT EXISTS document_chunks_embedding_hnsw_idx
  ON public.document_chunks
  USING hnsw (embedding vector_cosine_ops);

-- Done! All V2 columns and functions are now in place.
