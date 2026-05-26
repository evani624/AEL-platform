import { CATEGORIES } from '../constants/games'

/**
 * Generate bracket structure for a given team size (8, 16, 32, or 64).
 * Returns rounds array: each round has { name, matches: [{ id, team1, team2, winnerId, nextMatchId }] }
 */
export function createBracketStructure(teamSize) {
  const validSizes = [8, 16, 32, 64]
  if (!validSizes.includes(teamSize)) {
    throw new Error(`Team size must be one of ${validSizes.join(', ')}`)
  }

  const roundNames = {
    8: ['Round of 8', 'Semi Finals', 'Final'],
    16: ['Round of 16', 'Quarter Finals', 'Semi Finals', 'Final'],
    32: ['Round of 32', 'Round of 16', 'Quarter Finals', 'Semi Finals', 'Final'],
    64: ['Round of 64', 'Round of 32', 'Round of 16', 'Quarter Finals', 'Semi Finals', 'Final'],
  }

  const numRounds = Math.log2(teamSize)
  const rounds = []
  let matchIdCounter = 0

  for (let r = 0; r < numRounds; r++) {
    const matchesInRound = teamSize / Math.pow(2, r + 1)
    const roundMatches = []

    for (let m = 0; m < matchesInRound; m++) {
      roundMatches.push({
        id: `m-${matchIdCounter++}`,
        team1: null,
        team2: null,
        winnerId: null,
        nextMatchId: null,
      })
    }

    rounds.push({
      name: roundNames[teamSize][r],
      matches: roundMatches,
    })
  }

  for (let r = 0; r < numRounds - 1; r++) {
    const round = rounds[r]
    const nextRound = rounds[r + 1]
    round.matches.forEach((match, matchIdx) => {
      const nextMatchIdx = Math.floor(matchIdx / 2)
      match.nextMatchId = nextRound.matches[nextMatchIdx].id
    })
  }

  return rounds
}

export function generateTournament(id, name, teamSize = 16, game = '') {
  return {
    id,
    name,
    game,
    teamSize,
    rounds: createBracketStructure(teamSize),
  }
}

/**
 * Find a match by ID in the tournament
 */
export function findMatch(tournament, matchId) {
  for (const round of tournament.rounds) {
    const match = round.matches.find((m) => m.id === matchId)
    if (match) return { round, match }
  }
  return null
}

/**
 * Count completed (has winner) and upcoming (no winner) matches
 */
export function getMatchCounts(tournament) {
  if (!tournament?.rounds?.length) return { completed: 0, upcoming: 0 }
  let completed = 0
  let upcoming = 0
  for (const round of tournament.rounds) {
    const matches = round?.matches ?? []
    for (const match of matches) {
      if (match?.winnerId) completed++
      else upcoming++
    }
  }
  return { completed, upcoming }
}

/**
 * Get display name for tournament (name | game or name)
 */
export function getTournamentDisplayName(tournament) {
  if (!tournament) return ''
  const name = tournament?.name ?? ''
  const game = tournament?.game ?? ''
  return game ? `${name} | ${game}` : name
}

/* ============================================================
 * Redesign adapters — derive the visual layer from existing data.
 * No stored fields change; these are pure read helpers.
 * ============================================================ */

export function categoryLabel(id) {
  return (CATEGORIES.find((c) => c.id === id) || CATEGORIES[0]).label
}

/**
 * Visual match state mapped from the admin-set status:
 *   final / has-winner -> 'done', in_progress -> 'live', else 'upcoming'.
 * A match never auto-flips to 'live' just because both slots are filled — the
 * admin controls the state.
 */
export function getMatchState(match) {
  if (!match) return 'upcoming'
  if (match.status === 'final' || match.winnerId) return 'done'
  if (match.status === 'in_progress') return 'live'
  return 'upcoming'
}

/** Tournament-level status pill: 'soon' | 'live' | 'done' (follows match states). */
export function getTournamentStatus(tournament) {
  const rounds = tournament?.rounds ?? []
  let total = 0
  let done = 0
  let started = 0
  for (const round of rounds) {
    for (const m of round.matches ?? []) {
      total++
      const st = getMatchState(m)
      if (st === 'done') {
        done++
        started++
      } else if (st === 'live') {
        started++
      }
    }
  }
  if (total === 0 || started === 0) return 'soon'
  if (done === total) return 'done'
  return 'live'
}

/** Which side won this match: 'A' (team1) | 'B' (team2) | null. */
export function getWinnerSide(match) {
  if (!match?.winnerId) return null
  if (match.winnerId === match.team1?.id) return 'A'
  if (match.winnerId === match.team2?.id) return 'B'
  return null
}

/**
 * If the final is decided, return { name, pathIds } where pathIds is the set of
 * match ids the champion won (matched by team name, which carries across rounds
 * even though a team gets a fresh id each round). Otherwise null.
 */
export function getChampionInfo(tournament) {
  const rounds = tournament?.rounds
  if (!rounds?.length) return null
  const finalMatch = rounds[rounds.length - 1]?.matches?.[0]
  if (!finalMatch?.winnerId) return null
  const side = getWinnerSide(finalMatch)
  const champTeam = side === 'A' ? finalMatch.team1 : side === 'B' ? finalMatch.team2 : null
  if (!champTeam) return null
  const name = champTeam.name
  const pathIds = new Set()
  for (const round of rounds) {
    for (const m of round.matches ?? []) {
      const s = getWinnerSide(m)
      if (!s) continue
      const winTeam = s === 'A' ? m.team1 : m.team2
      if (winTeam?.name === name) pathIds.add(m.id)
    }
  }
  return { name, pathIds }
}

