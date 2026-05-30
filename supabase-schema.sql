-- ============================================================
-- ARENA ELEAGUE — Supabase schema
-- Run this in your Supabase SQL Editor. Safe to re-run (idempotent).
-- ============================================================

-- Tournaments table
-- NOTE: game_name is free TEXT (admins type any game name — not an enum).
CREATE TABLE IF NOT EXISTS tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  game_name TEXT DEFAULT '',
  category TEXT NOT NULL DEFAULT 'mixed' CHECK (category IN ('mixed', 'male', 'female')),
  size INT NOT NULL CHECK (size IN (8, 16, 32, 64)),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- For databases created before `category` existed:
ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'mixed'
  CHECK (category IN ('mixed', 'male', 'female'));

-- Per-tournament admin-controlled sort order (drag-and-drop in the sidebar).
ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;

-- One-time backfill: if every row is still at the default 0, seed the order
-- by created_at DESC so the newest sits on top (matches the previous list
-- ordering). Subsequent runs no-op once an admin has reordered anything.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM tournaments WHERE display_order <> 0) THEN
    WITH ranked AS (
      SELECT id, (ROW_NUMBER() OVER (ORDER BY created_at DESC) - 1)::int AS rn
      FROM tournaments
    )
    UPDATE tournaments t
       SET display_order = ranked.rn
      FROM ranked
     WHERE t.id = ranked.id;
  END IF;
END $$;

-- Matches table (bracket state). Team data lives here (no separate teams table),
-- so the match policies below also protect team names/colors/scores.
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  round_number INT NOT NULL,
  match_index INT NOT NULL,
  team_1_name TEXT,
  team_1_color TEXT,
  team_2_name TEXT,
  team_2_color TEXT,
  team_1_score INT DEFAULT 0,
  team_2_score INT DEFAULT 0,
  winner_id TEXT,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'in_progress', 'final')),
  match_date DATE NULL,
  match_time TIME NULL,
  UNIQUE(tournament_id, round_number, match_index)
);

-- For databases created before `status` existed (admin manually sets the
-- per-match state: Upcoming / In progress / Final).
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'upcoming'
  CHECK (status IN ('upcoming', 'in_progress', 'final'));

-- Backfill: any already-decided match (has a winner) is Final.
UPDATE matches SET status = 'final' WHERE winner_id IS NOT NULL AND status <> 'final';

-- Optional per-match scheduled date and time (independent, either can be NULL).
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS match_date DATE NULL,
  ADD COLUMN IF NOT EXISTS match_time TIME NULL;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_matches_tournament_id ON matches(tournament_id);

-- ============================================================
-- ROW LEVEL SECURITY — the real protection.
-- Public can READ (the read-only public view works logged out).
-- Only an authenticated session can INSERT / UPDATE / DELETE.
-- Hiding the admin UI is NOT security; these policies are.
-- ============================================================
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches     ENABLE ROW LEVEL SECURITY;

-- Remove the old wide-open development policies if present
DROP POLICY IF EXISTS "Allow all for tournaments" ON tournaments;
DROP POLICY IF EXISTS "Allow all for matches"     ON matches;

-- Also drop the new policy names first so this script is re-runnable
DROP POLICY IF EXISTS "tournaments_read"   ON tournaments;
DROP POLICY IF EXISTS "tournaments_insert" ON tournaments;
DROP POLICY IF EXISTS "tournaments_update" ON tournaments;
DROP POLICY IF EXISTS "tournaments_delete" ON tournaments;
DROP POLICY IF EXISTS "matches_read"   ON matches;
DROP POLICY IF EXISTS "matches_insert" ON matches;
DROP POLICY IF EXISTS "matches_update" ON matches;
DROP POLICY IF EXISTS "matches_delete" ON matches;

-- Public read (anon + authenticated)
CREATE POLICY "tournaments_read" ON tournaments FOR SELECT USING (true);
CREATE POLICY "matches_read"     ON matches     FOR SELECT USING (true);

-- Authenticated-only writes
CREATE POLICY "tournaments_insert" ON tournaments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "tournaments_update" ON tournaments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "tournaments_delete" ON tournaments FOR DELETE TO authenticated USING (true);

CREATE POLICY "matches_insert" ON matches FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "matches_update" ON matches FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "matches_delete" ON matches FOR DELETE TO authenticated USING (true);
