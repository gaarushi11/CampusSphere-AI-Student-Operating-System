-- ============================================================
-- CampusFlow — Complete Supabase Database Setup
-- Run this entire file in the Supabase SQL Editor (in order)
-- ============================================================

-- STEP 1: Enable pgvector extension (REQUIRED for embeddings)
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- STEP 2: TABLES
-- ============================================================

-- profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT,
  email       TEXT,
  roll_number TEXT,
  major       TEXT    DEFAULT 'B.Tech CSE',
  semester    INT     DEFAULT 1,
  cgpa        FLOAT   DEFAULT 0.0,
  hostel_room TEXT    DEFAULT 'TBD',
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- classes (per-user timetable)
CREATE TABLE IF NOT EXISTS public.classes (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title                 TEXT NOT NULL,
  short_code            TEXT,
  type                  TEXT DEFAULT 'Lecture' CHECK (type IN ('Lecture', 'Lab', 'Tutorial')),
  room                  TEXT,
  instructor            TEXT,
  day_of_week           TEXT DEFAULT 'Monday',
  start_hour            INT  NOT NULL,
  start_minute          INT  DEFAULT 0,
  end_hour              INT  NOT NULL,
  end_minute            INT  DEFAULT 0,
  attendance_percentage INT  DEFAULT 100,
  color                 TEXT DEFAULT 'bg-cyan-500',
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- tasks (per-user)
CREATE TABLE IF NOT EXISTS public.tasks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  course       TEXT,
  priority     TEXT DEFAULT 'Medium' CHECK (priority IN ('High', 'Medium', 'Low')),
  due_date     TIMESTAMPTZ,
  is_completed BOOL DEFAULT FALSE,
  source       TEXT DEFAULT 'Manual',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- notices (campus-wide, admin-created)
CREATE TABLE IF NOT EXISTS public.notices (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT,
  category    TEXT DEFAULT 'Academic' CHECK (category IN ('Academic', 'Hostel', 'Placement', 'Urgent')),
  sender      TEXT DEFAULT 'Admin',
  is_read     BOOL DEFAULT FALSE,
  timestamp   TIMESTAMPTZ DEFAULT NOW()
);

-- documents (per-user, metadata for uploaded files)
CREATE TABLE IF NOT EXISTS public.documents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  type        TEXT DEFAULT 'PDF' CHECK (type IN ('PDF', 'PPTX', 'DOCX')),
  size        TEXT,
  subject     TEXT,
  file_path   TEXT,          -- path inside Supabase storage bucket 'vault_files'
  is_indexed  BOOL DEFAULT FALSE,
  page_count  INT  DEFAULT 1,
  chunk_count INT  DEFAULT 0, -- how many chunks were created
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- document_chunks (the actual RAG vector store)
-- Each row = one text chunk + its 1536-dim embedding from Amazon Titan
CREATE TABLE IF NOT EXISTS public.document_chunks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id   UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  content       TEXT NOT NULL,
  chunk_index   INT  DEFAULT 0,
  embedding     vector(1536),  -- Amazon Titan Embed Text v1 = 1536 dims
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- STEP 3: PERFORMANCE INDEXES
-- ============================================================

-- Vector similarity index (HNSW for cosine distance)
-- This makes semantic search fast over large corpora and avoids memory issues
CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx
  ON public.document_chunks
  USING hnsw (embedding vector_cosine_ops);

-- Regular indexes
CREATE INDEX IF NOT EXISTS document_chunks_document_id_idx ON public.document_chunks (document_id);
CREATE INDEX IF NOT EXISTS documents_user_id_idx ON public.documents (user_id);
CREATE INDEX IF NOT EXISTS tasks_user_id_due_idx ON public.tasks (user_id, due_date);
CREATE INDEX IF NOT EXISTS classes_user_id_idx ON public.classes (user_id);

-- ============================================================
-- STEP 4: ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notices        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

-- Profiles: each user owns their own row
CREATE POLICY "profiles_self_access" ON public.profiles
  FOR ALL USING (auth.uid() = id);

-- Classes: per-user CRUD
CREATE POLICY "classes_owner_access" ON public.classes
  FOR ALL USING (auth.uid() = user_id);

-- Tasks: per-user CRUD
CREATE POLICY "tasks_owner_access" ON public.tasks
  FOR ALL USING (auth.uid() = user_id);

-- Notices: everyone can read (campus-wide board)
CREATE POLICY "notices_public_read" ON public.notices
  FOR SELECT USING (true);

-- Documents: per-user CRUD
CREATE POLICY "documents_owner_access" ON public.documents
  FOR ALL USING (auth.uid() = user_id);

-- Document chunks: users can only access chunks from their own documents
-- The server API route uses SERVICE ROLE KEY which bypasses RLS — this is fine.
-- This policy secures direct client access.
CREATE POLICY "chunks_owner_access" ON public.document_chunks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = document_chunks.document_id
        AND d.user_id = auth.uid()
    )
  );

-- ============================================================
-- STEP 5: MATCH_DOCUMENT_CHUNKS FUNCTION
-- This is the core RAG retrieval function.
-- It finds the top-N most semantically similar chunks
-- for a given user, using cosine similarity.
-- ============================================================
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
  similarity    float
)
LANGUAGE plpgsql
SECURITY DEFINER  -- runs as table owner, bypasses RLS
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    dc.content,
    (1 - (dc.embedding <=> query_embedding))::float AS similarity
  FROM public.document_chunks dc
  INNER JOIN public.documents d ON d.id = dc.document_id
  WHERE
    d.user_id = p_user_id          -- only this user's documents
    AND d.is_indexed = true         -- only fully indexed docs
    AND (1 - (dc.embedding <=> query_embedding)) > match_threshold
  ORDER BY dc.embedding <=> query_embedding  -- ascending = most similar first
  LIMIT match_count;
END;
$$;

-- ============================================================
-- STEP 5B: HYBRID_DOCUMENT_SEARCH FUNCTION (RRF)
-- Combines Vector Similarity with Postgres Full-Text Search
-- using Reciprocal Rank Fusion for maximum accuracy.
-- ============================================================
CREATE OR REPLACE FUNCTION public.hybrid_document_search(
  query_text       text,
  query_embedding  vector(1536),
  match_count      int,
  p_user_id        uuid
)
RETURNS TABLE (
  id            uuid,
  document_id   uuid,
  content       text,
  similarity    float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH vector_search AS (
    SELECT
      dc.id,
      dc.document_id,
      dc.content,
      RANK() OVER (ORDER BY dc.embedding <=> query_embedding) AS vector_rank
    FROM public.document_chunks dc
    INNER JOIN public.documents d ON d.id = dc.document_id
    WHERE d.user_id = p_user_id AND d.is_indexed = true
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count * 2
  ),
  fts_search AS (
    SELECT
      dc.id,
      dc.document_id,
      dc.content,
      RANK() OVER (ORDER BY ts_rank(to_tsvector('english', dc.content), websearch_to_tsquery('english', query_text)) DESC) AS fts_rank
    FROM public.document_chunks dc
    INNER JOIN public.documents d ON d.id = dc.document_id
    WHERE d.user_id = p_user_id AND d.is_indexed = true
      AND to_tsvector('english', dc.content) @@ websearch_to_tsquery('english', query_text)
    ORDER BY ts_rank(to_tsvector('english', dc.content), websearch_to_tsquery('english', query_text)) DESC
    LIMIT match_count * 2
  )
  SELECT
    COALESCE(vs.id, fs.id) AS id,
    COALESCE(vs.document_id, fs.document_id) AS document_id,
    COALESCE(vs.content, fs.content) AS content,
    (
      COALESCE(1.0 / (60 + vs.vector_rank), 0.0) +
      COALESCE(1.0 / (60 + fs.fts_rank), 0.0)
    )::float AS similarity
  FROM vector_search vs
  FULL OUTER JOIN fts_search fs ON vs.id = fs.id
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- ============================================================
-- STEP 6: AUTO-CREATE PROFILE ON SIGN-UP TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Drop old trigger if exists, recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- STEP 7: SEED SAMPLE CAMPUS NOTICES
-- ============================================================
INSERT INTO public.notices (title, description, category, sender, is_read, timestamp)
VALUES
  (
    'Amazon SDE Placement Drive — Pre-Talk Registration Open',
    'Amazon is visiting campus on June 28. Eligible branches: CSE, IT, ECE. Min CGPA: 7.0. Register via the T&P portal by tonight 11:59 PM. Bring your updated resume.',
    'Placement', 'T&P Cell', false, NOW() - INTERVAL '2 hours'
  ),
  (
    'Mid-Semester Examination Schedule Released',
    'Mid-sem exams are scheduled from June 24–28. The complete date sheet is available on the Academic Portal. Hall tickets must be collected from the Examination Branch before June 22.',
    'Academic', 'Examination Branch', false, NOW() - INTERVAL '5 hours'
  ),
  (
    'Hostel Mess Menu — Week of June 16',
    'Updated weekly menu is now live. Special Sunday dinner: Paneer Butter Masala + Dal Makhani + Gulab Jamun. Please submit feedback via the Hostel Portal.',
    'Hostel', 'Hostel Management', true, NOW() - INTERVAL '18 hours'
  ),
  (
    'Campus Internet Maintenance — Tonight 11 PM to 2 AM',
    'NKN internet connectivity will be unavailable tonight from 11 PM to 2 AM due to scheduled fiber maintenance. Plan your submissions accordingly.',
    'Urgent', 'IT Services', false, NOW() - INTERVAL '1 hour'
  ),
  (
    'Cloud Computing Assignment Deadline Extended',
    'Due to server issues on AWS Academy, the CS401 assignment deadline has been extended by 48 hours. New deadline: June 17, 11:59 PM. No further extensions.',
    'Academic', 'Dr. Ankit Mehta', true, NOW() - INTERVAL '30 hours'
  )
ON CONFLICT DO NOTHING;

-- ============================================================
-- STEP 8: STORAGE — Create 'vault_files' bucket
-- Run this in Supabase Dashboard → Storage → New Bucket
-- OR use the Supabase JS client at startup.
-- The SQL approach uses the storage schema:
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vault_files',
  'vault_files',
  false,         -- private bucket (authenticated users only)
  52428800,      -- 50 MB max per file
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.presentationml.presentation']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: authenticated users can upload and read their own folder
CREATE POLICY "vault_files_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'vault_files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "vault_files_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'vault_files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "vault_files_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'vault_files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
