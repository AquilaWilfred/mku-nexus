-- ================================================================
-- MKU NEXUS v7 — POLLS & VOTING MIGRATION
-- Run in Supabase SQL Editor
-- ================================================================

-- Polls table
CREATE TABLE IF NOT EXISTS polls (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id     UUID REFERENCES units(id) ON DELETE CASCADE NOT NULL,
  created_by  UUID REFERENCES users(id),
  question    TEXT NOT NULL,
  poll_type   VARCHAR(20) DEFAULT 'vote' CHECK (poll_type IN ('vote','research','feedback','quiz')),
  is_active   BOOLEAN DEFAULT true,
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Poll options
CREATE TABLE IF NOT EXISTS poll_options (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poll_id     UUID REFERENCES polls(id) ON DELETE CASCADE NOT NULL,
  option_text TEXT NOT NULL,
  votes_count INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Poll votes (one per student per poll)
CREATE TABLE IF NOT EXISTS poll_votes (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poll_id   UUID REFERENCES polls(id) ON DELETE CASCADE NOT NULL,
  option_id UUID REFERENCES poll_options(id) ON DELETE CASCADE NOT NULL,
  user_id   UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  voted_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(poll_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_polls_unit    ON polls(unit_id);
CREATE INDEX IF NOT EXISTS idx_polls_active  ON polls(is_active);
CREATE INDEX IF NOT EXISTS idx_poll_opts_poll ON poll_options(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll ON poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_user ON poll_votes(user_id);

-- RLS
ALTER TABLE polls       ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes   ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'polls_all'        AND tablename = 'polls')        THEN CREATE POLICY "polls_all"        ON polls        FOR ALL USING (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'poll_options_all' AND tablename = 'poll_options') THEN CREATE POLICY "poll_options_all" ON poll_options FOR ALL USING (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'poll_votes_all'   AND tablename = 'poll_votes')   THEN CREATE POLICY "poll_votes_all"   ON poll_votes   FOR ALL USING (true); END IF;
END $$;

-- Function to safely increment vote count
CREATE OR REPLACE FUNCTION increment_poll_option_votes(option_id_param UUID)
RETURNS void AS $$
BEGIN
  UPDATE poll_options SET votes_count = votes_count + 1 WHERE id = option_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- DONE — Run this then restart your Next.js server
-- ================================================================
