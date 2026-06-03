// Game is FREE TEXT — admins type any game name. These are datalist suggestions only.
export const GAME_SUGGESTIONS = [
  'Valorant', 'Tekken 8', 'Rocket League', 'PUBG',
  'Overwatch', 'Call of Duty', 'FIFA 23', 'EA FC 25',
  'Brawlhalla', 'Minecraft', 'Rainbow Six', 'Counter-Strike 2',
]

export const CATEGORIES = [
  { id: 'mixed', label: 'Mixed' },
  { id: 'male', label: 'Male' },
  { id: 'female', label: 'Female' },
]

export const DEFAULT_CATEGORY = 'mixed'

// Tournament format options. The id values match the DB CHECK
// (tournament_type IN ('single','double')) and the JS branch in
// buildTournamentFromDb. A future leaderboard / round_robin slot is a
// third entry here plus a DB CHECK widening (documented in schema).
export const TOURNAMENT_TYPES = [
  { id: 'single', label: 'Single Elimination' },
  { id: 'double', label: 'Double Elimination' },
]

// Bracket-size choices per type. Single supports 4..64; Double caps at 32
// because 64 alongside a Losers bracket (5 W cols + 10 L cols + Grand
// Final) doesn't render usefully. The DB size CHECK permits 4/8/16/32/64;
// the cap is a UI-only constraint, codified in DOUBLE_ELIM_SIZES in
// src/utils/doubleElim.js.
export const BRACKET_SIZE_OPTIONS_BY_TYPE = {
  single: [
    { value: 4, label: '4 Teams' },
    { value: 8, label: '8 Teams' },
    { value: 16, label: '16 Teams' },
    { value: 32, label: '32 Teams' },
    { value: 64, label: '64 Teams' },
  ],
  double: [
    { value: 4, label: '4 Teams' },
    { value: 8, label: '8 Teams' },
    { value: 16, label: '16 Teams' },
    { value: 32, label: '32 Teams' },
  ],
}
