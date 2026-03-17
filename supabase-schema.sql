-- Run this SQL in your Supabase SQL Editor to create the schema

-- Tournaments table
CREATE TABLE IF NOT EXISTS tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  game_name TEXT DEFAULT '',
  size INT NOT NULL CHECK (size IN (8, 16, 32, 64)),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Matches table (bracket state)
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
  UNIQUE(tournament_id, round_number, match_index)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_matches_tournament_id ON matches(tournament_id);

-- Enable RLS (Row Level Security) - optional, configure as needed
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read/write for development (customize for production)
CREATE POLICY "Allow all for tournaments" ON tournaments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for matches" ON matches FOR ALL USING (true) WITH CHECK (true);
