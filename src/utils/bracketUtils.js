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

