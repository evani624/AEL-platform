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
  size INT NOT NULL CONSTRAINT tournaments_size_check CHECK (size IN (4, 8, 16, 32, 64)),
  -- Tournament format: 'single', 'double', or 'leaderboard'.
  -- A future 'round_robin' would be added by dropping & re-adding this
  -- CHECK with the new value (see ALTER block below).
  tournament_type TEXT NOT NULL DEFAULT 'single' CHECK (tournament_type IN ('single', 'double', 'leaderboard')),
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

-- Relax the size CHECK to allow 4 (added with Double Elimination). NAME-
-- INDEPENDENT: find any CHECK on `tournaments` whose only referenced column
-- is `size` (matched via pg_constraint.conkey, NOT by name) and drop it,
-- then add the named constraint. Catches legacy auto-named checks no matter
-- what Postgres called them. Category / tournament_type checks reference
-- different columns (different conkey) and are untouched. Re-runs are
-- no-op: the loop drops the just-added named constraint and re-adds it.
DO $$
DECLARE
  c_name TEXT;
  size_attnum SMALLINT;
BEGIN
  SELECT attnum INTO size_attnum
  FROM pg_attribute
  WHERE attrelid = 'tournaments'::regclass
    AND attname = 'size'
    AND NOT attisdropped;

  FOR c_name IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'tournaments'::regclass
      AND contype = 'c'
      AND conkey = ARRAY[size_attnum]::SMALLINT[]
  LOOP
    EXECUTE format('ALTER TABLE tournaments DROP CONSTRAINT %I', c_name);
  END LOOP;

  EXECUTE 'ALTER TABLE tournaments ADD CONSTRAINT tournaments_size_check CHECK (size IN (4, 8, 16, 32, 64))';
END $$;

-- Tournament format (single / double / leaderboard). DEFAULT 'single' so
-- existing rows backfill automatically without an UPDATE.
ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS tournament_type TEXT NOT NULL DEFAULT 'single'
  CHECK (tournament_type IN ('single', 'double', 'leaderboard'));
-- Future round-robin: DROP + re-ADD the CHECK with the new value (same
-- name-independent swap pattern as the block immediately below).

-- Widen the tournament_type CHECK to include 'leaderboard' for existing
-- tables. NAME-INDEPENDENT: drop any CHECK on `tournaments` whose only
-- conkey is the tournament_type column, then re-add the named constraint.
-- Mirrors the size-CHECK swap above. Re-runs are no-op (the loop drops
-- the just-added named constraint and re-adds it).
DO $$
DECLARE
  c_name TEXT;
  type_attnum SMALLINT;
BEGIN
  SELECT attnum INTO type_attnum
  FROM pg_attribute
  WHERE attrelid = 'tournaments'::regclass
    AND attname = 'tournament_type'
    AND NOT attisdropped;

  FOR c_name IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'tournaments'::regclass
      AND contype = 'c'
      AND conkey = ARRAY[type_attnum]::SMALLINT[]
  LOOP
    EXECUTE format('ALTER TABLE tournaments DROP CONSTRAINT %I', c_name);
  END LOOP;

  EXECUTE 'ALTER TABLE tournaments ADD CONSTRAINT tournaments_type_check CHECK (tournament_type IN (''single'', ''double'', ''leaderboard''))';
END $$;

-- is_final flag on tournaments. Used by leaderboard's admin-marked DONE
-- state. Single/double tournaments derive their done state from matches
-- (getTournamentStatus reads match.status) and leave this column FALSE.
-- DEFAULT FALSE covers every existing row — no UPDATE backfill needed.
ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS is_final BOOLEAN NOT NULL DEFAULT FALSE;

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
  -- Which bracket section this match belongs to. Single-elim tournaments use
  -- 'winner' for every match (the default). Double-elim adds 'loser',
  -- 'grand_final', and 'grand_final_reset'. (round_number, match_index) is
  -- unique WITHIN a side (the UNIQUE below).
  bracket_side TEXT NOT NULL DEFAULT 'winner' CHECK (bracket_side IN ('winner', 'loser', 'grand_final', 'grand_final_reset')),
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
  CONSTRAINT matches_unique_per_side UNIQUE (tournament_id, bracket_side, round_number, match_index)
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

-- Bracket section (winner / loser / grand_final / grand_final_reset).
-- Existing single-elim rows are 'winner' via DEFAULT — no UPDATE backfill
-- needed. The application treats missing/legacy values as 'winner' too.
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS bracket_side TEXT NOT NULL DEFAULT 'winner'
  CHECK (bracket_side IN ('winner', 'loser', 'grand_final', 'grand_final_reset'));

-- Swap the matches UNIQUE constraint so (tournament_id, round_number,
-- match_index) is scoped per bracket_side. NAME-INDEPENDENT: drop EVERY
-- contype='u' constraint on `matches` whose name is not
-- 'matches_unique_per_side'. The PK on id is contype='p' (not 'u'), so it
-- is untouched. CRITICAL: if the legacy UNIQUE on (tournament_id,
-- round_number, match_index) survives, every double-elim insert FAILS —
-- N=4 alone has 4 rows sharing (round_number=0, match_index=0) across
-- bracket_sides winner/loser/grand_final/grand_final_reset, which the
-- legacy unique rejects as duplicates.
DO $$
DECLARE
  c_name TEXT;
BEGIN
  FOR c_name IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'matches'::regclass
      AND contype = 'u'
      AND conname <> 'matches_unique_per_side'
  LOOP
    EXECUTE format('ALTER TABLE matches DROP CONSTRAINT %I', c_name);
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'matches'::regclass
      AND conname = 'matches_unique_per_side'
  ) THEN
    EXECUTE 'ALTER TABLE matches ADD CONSTRAINT matches_unique_per_side UNIQUE (tournament_id, bracket_side, round_number, match_index)';
  END IF;
END $$;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_matches_tournament_id ON matches(tournament_id);

-- ============================================================
-- Leaderboard entries — separate table from matches. Team data lives here
-- for tournament_type='leaderboard'. Single/double tournaments don't use
-- this table at all. CASCADE delete with the tournament. UNIQUE
-- (tournament_id, team_name) prevents the admin from accidentally creating
-- two rows for the same team (case-sensitive — 'Team A' and 'team a' are
-- distinct; accepted limitation). Points have no CHECK (free integer);
-- UI enforces integer >= 0 at the input layer.
-- ============================================================
CREATE TABLE IF NOT EXISTS leaderboard_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  team_name TEXT NOT NULL,
  team_color TEXT,
  points INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT leaderboard_entries_unique_name UNIQUE (tournament_id, team_name)
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_tournament_id
  ON leaderboard_entries(tournament_id);

-- ============================================================
-- ROW LEVEL SECURITY — the real protection.
-- Public can READ (the read-only public view works logged out).
-- Only an authenticated session can INSERT / UPDATE / DELETE.
-- Hiding the admin UI is NOT security; these policies are.
-- ============================================================
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches     ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_entries ENABLE ROW LEVEL SECURITY;

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
DROP POLICY IF EXISTS "leaderboard_entries_read"   ON leaderboard_entries;
DROP POLICY IF EXISTS "leaderboard_entries_insert" ON leaderboard_entries;
DROP POLICY IF EXISTS "leaderboard_entries_update" ON leaderboard_entries;
DROP POLICY IF EXISTS "leaderboard_entries_delete" ON leaderboard_entries;

-- Public read (anon + authenticated)
CREATE POLICY "tournaments_read"        ON tournaments        FOR SELECT USING (true);
CREATE POLICY "matches_read"            ON matches            FOR SELECT USING (true);
CREATE POLICY "leaderboard_entries_read" ON leaderboard_entries FOR SELECT USING (true);

-- Authenticated-only writes
CREATE POLICY "tournaments_insert" ON tournaments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "tournaments_update" ON tournaments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "tournaments_delete" ON tournaments FOR DELETE TO authenticated USING (true);

CREATE POLICY "matches_insert" ON matches FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "matches_update" ON matches FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "matches_delete" ON matches FOR DELETE TO authenticated USING (true);

CREATE POLICY "leaderboard_entries_insert" ON leaderboard_entries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "leaderboard_entries_update" ON leaderboard_entries FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "leaderboard_entries_delete" ON leaderboard_entries FOR DELETE TO authenticated USING (true);

-- ============================================================
-- SELF-VERIFICATION: abort the whole migration (transaction rolls back) if
-- the end state is wrong. Turns the silent-no-op landmine — where a
-- hardcoded DROP CONSTRAINT IF EXISTS misses the actual legacy name and
-- leaves the wrong constraint in place — into an immediate, loud failure
-- with a clear message. RAISE EXCEPTION inside SQL Editor's implicit
-- transaction rolls back every preceding statement in this script.
--
-- Six assertion groups:
--   1. matches has no stray UNIQUE constraints (only matches_unique_per_side)
--   2. matches_unique_per_side exists
--   3. tournaments_size_check exists AND permits size=4
--   4. tournaments_type_check exists AND includes 'leaderboard'         (NEW)
--   5. tournaments.is_final exists with NOT NULL DEFAULT FALSE          (NEW)
--   6. leaderboard_entries exists with expected columns                 (NEW)
--      + has RLS enabled + 4 policies                                   (NEW)
-- ============================================================
DO $$
DECLARE
  stray_unique_count INT;
  has_named_unique BOOLEAN;
  size_check_def TEXT;
  type_check_def TEXT;
  is_final_default TEXT;
  is_final_notnull BOOLEAN;
  le_col_count INT;
  le_rls_enabled BOOLEAN;
  le_policy_count INT;
BEGIN
  -- 1. matches: no stray UNIQUE constraints other than matches_unique_per_side.
  SELECT COUNT(*) INTO stray_unique_count
  FROM pg_constraint
  WHERE conrelid = 'matches'::regclass
    AND contype = 'u'
    AND conname <> 'matches_unique_per_side';
  IF stray_unique_count > 0 THEN
    RAISE EXCEPTION 'Migration verification FAILED: % stray UNIQUE constraint(s) on matches (expected only matches_unique_per_side)', stray_unique_count;
  END IF;

  -- 2. matches_unique_per_side exists.
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'matches'::regclass
      AND contype = 'u'
      AND conname = 'matches_unique_per_side'
  ) INTO has_named_unique;
  IF NOT has_named_unique THEN
    RAISE EXCEPTION 'Migration verification FAILED: matches_unique_per_side is missing';
  END IF;

  -- 3. tournaments_size_check exists AND permits size=4.
  SELECT pg_get_constraintdef(oid) INTO size_check_def
  FROM pg_constraint
  WHERE conrelid = 'tournaments'::regclass
    AND conname = 'tournaments_size_check';
  IF size_check_def IS NULL THEN
    RAISE EXCEPTION 'Migration verification FAILED: tournaments_size_check is missing';
  END IF;
  IF size_check_def !~ '\m4\M' THEN
    RAISE EXCEPTION 'Migration verification FAILED: tournaments_size_check does not permit size=4 (def: %)', size_check_def;
  END IF;

  -- 4. tournaments_type_check exists AND includes 'leaderboard'.
  SELECT pg_get_constraintdef(oid) INTO type_check_def
  FROM pg_constraint
  WHERE conrelid = 'tournaments'::regclass
    AND conname = 'tournaments_type_check';
  IF type_check_def IS NULL THEN
    RAISE EXCEPTION 'Migration verification FAILED: tournaments_type_check is missing';
  END IF;
  IF type_check_def !~ '\mleaderboard\M' THEN
    RAISE EXCEPTION 'Migration verification FAILED: tournaments_type_check does not include leaderboard (def: %)', type_check_def;
  END IF;

  -- 5. tournaments.is_final exists with NOT NULL DEFAULT FALSE.
  SELECT pg_get_expr(d.adbin, d.adrelid), a.attnotnull
    INTO is_final_default, is_final_notnull
  FROM pg_attribute a
  LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
  WHERE a.attrelid = 'tournaments'::regclass
    AND a.attname = 'is_final'
    AND NOT a.attisdropped;
  IF is_final_default IS NULL THEN
    RAISE EXCEPTION 'Migration verification FAILED: tournaments.is_final is missing or has no default';
  END IF;
  -- Postgres normalizes BOOLEAN defaults to lowercase 'false'. Match
  -- case-insensitively just in case.
  IF is_final_default !~* 'false' THEN
    RAISE EXCEPTION 'Migration verification FAILED: tournaments.is_final DEFAULT is not FALSE (def: %)', is_final_default;
  END IF;
  IF NOT COALESCE(is_final_notnull, false) THEN
    RAISE EXCEPTION 'Migration verification FAILED: tournaments.is_final is not NOT NULL';
  END IF;

  -- 6. leaderboard_entries table exists with expected columns + RLS + 4 policies.
  SELECT COUNT(*) INTO le_col_count
  FROM pg_attribute
  WHERE attrelid = 'leaderboard_entries'::regclass
    AND attname IN ('id', 'tournament_id', 'team_name', 'team_color', 'points', 'created_at')
    AND NOT attisdropped;
  IF le_col_count <> 6 THEN
    RAISE EXCEPTION 'Migration verification FAILED: leaderboard_entries missing expected columns (found %/6)', le_col_count;
  END IF;

  SELECT relrowsecurity INTO le_rls_enabled
  FROM pg_class
  WHERE oid = 'leaderboard_entries'::regclass;
  IF NOT COALESCE(le_rls_enabled, false) THEN
    RAISE EXCEPTION 'Migration verification FAILED: leaderboard_entries RLS is not enabled';
  END IF;

  SELECT COUNT(*) INTO le_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'leaderboard_entries'
    AND policyname IN (
      'leaderboard_entries_read',
      'leaderboard_entries_insert',
      'leaderboard_entries_update',
      'leaderboard_entries_delete'
    );
  IF le_policy_count <> 4 THEN
    RAISE EXCEPTION 'Migration verification FAILED: leaderboard_entries policies missing (found %/4)', le_policy_count;
  END IF;
END $$;
