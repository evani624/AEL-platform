import { supabase } from './supabaseClient'
import { createBracketStructure } from '../utils/bracketUtils'

const ROUND_NAMES = {
  8: ['Round of 8', 'Semi Finals', 'Final'],
  16: ['Round of 16', 'Quarter Finals', 'Semi Finals', 'Final'],
  32: ['Round of 32', 'Round of 16', 'Quarter Finals', 'Semi Finals', 'Final'],
  64: ['Round of 64', 'Round of 32', 'Round of 16', 'Quarter Finals', 'Semi Finals', 'Final'],
}

/**
 * Build app tournament structure from DB rows
 */
function buildTournamentFromDb(tournamentRow, matchesRows) {
  const { id, name, game_name, size, category, display_order } = tournamentRow
  const teamSize = size
  const rounds = ROUND_NAMES[teamSize].map((roundName) => ({
    name: roundName,
    matches: [],
  }))

  const matchesByRound = {}
  matchesRows
    .filter((m) => m.tournament_id === id)
    .sort((a, b) => a.round_number - b.round_number || a.match_index - b.match_index)
    .forEach((row) => {
      if (!matchesByRound[row.round_number]) matchesByRound[row.round_number] = []
      matchesByRound[row.round_number].push(row)
    })

  for (let r = 0; r < rounds.length; r++) {
    const rows = matchesByRound[r] || []
    const nextRound = rounds[r + 1]
    rounds[r].matches = rows.map((row, matchIdx) => {
      const team1 = row.team_1_name
        ? { id: `${row.id}-team1`, name: row.team_1_name, color: row.team_1_color || '#00F5FF' }
        : null
      const team2 = row.team_2_name
        ? { id: `${row.id}-team2`, name: row.team_2_name, color: row.team_2_color || '#00F5FF' }
        : null

      let winnerId = null
      if (row.winner_id === 'team1' && team1) winnerId = team1.id
      else if (row.winner_id === 'team2' && team2) winnerId = team2.id

      // Persisted match state. Falls back gracefully if the `status` column
      // hasn't been migrated yet: a decided match (has winner) is always Final;
      // otherwise default to 'upcoming' (we never auto-flip to in_progress).
      const rawStatus = row.status
      const status = winnerId
        ? 'final'
        : rawStatus === 'in_progress' || rawStatus === 'final' || rawStatus === 'upcoming'
          ? rawStatus
          : 'upcoming'

      const nextMatchIdx = nextRound ? Math.floor(matchIdx / 2) : null
      const nextMatchId = nextRound?.matches[nextMatchIdx]?.id ?? null

      return {
        id: row.id,
        team1,
        team2,
        team1Score: row.team_1_score ?? null,
        team2Score: row.team_2_score ?? null,
        winnerId,
        status,
        matchDate: row.match_date ?? null,
        matchTime: row.match_time ?? null,
        nextMatchId: nextMatchId || null,
        _roundNumber: r,
        _matchIndex: matchIdx,
      }
    })
  }

  for (let r = 0; r < rounds.length - 1; r++) {
    rounds[r].matches.forEach((match, matchIdx) => {
      const nextMatchIdx = Math.floor(matchIdx / 2)
      match.nextMatchId = rounds[r + 1].matches[nextMatchIdx]?.id ?? null
    })
  }

  return {
    id,
    name,
    game: game_name || '',
    category: category || 'mixed',
    teamSize,
    rounds,
    displayOrder: display_order ?? 0,
  }
}

/**
 * Fetch a single tournament by ID with its matches
 */
export async function fetchTournamentById(id) {
  const { data: tournament, error: tError } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .single()

  if (tError || !tournament) return null

  const matches = await fetchMatchesForTournament(id)
  return buildTournamentFromDb(tournament, matches)
}

/**
 * Fetch all tournaments with their matches
 */
export async function fetchTournaments() {
  // Primary: admin-set display_order, with created_at DESC as a stable tie-breaker.
  let { data: tournaments, error: tError } = await supabase
    .from('tournaments')
    .select('*')
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false })

  // Graceful fallback if display_order column hasn't been migrated yet.
  if (tError && isMissingColumn(tError)) {
    ;({ data: tournaments, error: tError } = await supabase
      .from('tournaments')
      .select('*')
      .order('created_at', { ascending: false }))
  }

  if (tError) throw tError
  if (!tournaments?.length) return []

  const { data: matches, error: mError } = await supabase
    .from('matches')
    .select('*')
    .in('tournament_id', tournaments.map((t) => t.id))

  if (mError) throw mError

  return tournaments.map((t) =>
    buildTournamentFromDb(t, matches || [])
  )
}

/**
 * Create tournament + initial empty matches
 */
export async function createTournament({ name, game, category, teamSize }) {
  const { data: tournament, error: tError } = await supabase
    .from('tournaments')
    .insert({ name, game_name: game || '', category: category || 'mixed', size: teamSize })
    .select()
    .single()

  if (tError) throw tError

  const rounds = createBracketStructure(teamSize)
  const matchRows = rounds.flatMap((round, roundIndex) =>
    round.matches.map((_, matchIndex) => ({
      tournament_id: tournament.id,
      round_number: roundIndex,
      match_index: matchIndex,
    }))
  )

  const { error: mError } = await supabase.from('matches').insert(matchRows)
  if (mError) throw mError

  const matches = await fetchMatchesForTournament(tournament.id)
  return buildTournamentFromDb(tournament, matches)
}

export async function fetchMatchesForTournament(tournamentId) {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('round_number')
    .order('match_index')

  if (error) throw error
  return data || []
}

/**
 * Update tournament details (name, game, category). Bracket size is fixed at
 * creation, so it is intentionally not editable here.
 */
export async function updateTournament(id, { name, game, category }) {
  const updates = {}
  if (name !== undefined) updates.name = name.trim()
  if (game !== undefined) updates.game_name = game.trim()
  if (category !== undefined) updates.category = category

  const { data, error } = await supabase
    .from('tournaments')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Delete tournament (cascades to matches via FK)
 */
export async function deleteTournament(id) {
  const { error } = await supabase.from('tournaments').delete().eq('id', id)
  if (error) throw error
}

// True when a write/select failed because a column hasn't been migrated yet.
// PGRST204 = PostgREST schema-cache miss; 42703 = Postgres undefined_column.
function isMissingColumn(error) {
  if (!error) return false
  return error.code === 'PGRST204' || error.code === '42703'
}

/**
 * Upsert match - update team, score, winner, and/or status
 */
export async function upsertMatch(tournamentId, matchId, updates) {
  const { data: match, error } = await supabase
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .eq('tournament_id', tournamentId)
    .single()

  if (error) throw error
  if (!match) return null

  const dbUpdates = {}
  if (updates.team1 !== undefined) {
    dbUpdates.team_1_name = updates.team1?.name ?? null
    dbUpdates.team_1_color = updates.team1?.color ?? null
  }
  if (updates.team2 !== undefined) {
    dbUpdates.team_2_name = updates.team2?.name ?? null
    dbUpdates.team_2_color = updates.team2?.color ?? null
  }
  if (updates.team1Score !== undefined) dbUpdates.team_1_score = updates.team1Score
  if (updates.team2Score !== undefined) dbUpdates.team_2_score = updates.team2Score
  if (updates.winnerId !== undefined) {
    dbUpdates.winner_id =
      updates.winnerId === null
        ? null
        : String(updates.winnerId).endsWith('-team1')
          ? 'team1'
          : 'team2'
  }
  if (updates.status !== undefined) dbUpdates.status = updates.status
  if (updates.matchDate !== undefined) dbUpdates.match_date = updates.matchDate || null
  if (updates.matchTime !== undefined) dbUpdates.match_time = updates.matchTime || null

  let { error: updateError } = await supabase
    .from('matches')
    .update(dbUpdates)
    .eq('id', matchId)

  // Graceful fallback: if any of the optional columns (status / match_date /
  // match_time) haven't been migrated yet, drop them and retry so the rest
  // (winner, scores, teams) still persists.
  const OPTIONAL = ['status', 'match_date', 'match_time']
  const hasOptional = OPTIONAL.some((k) => k in dbUpdates)
  if (updateError && hasOptional && isMissingColumn(updateError)) {
    const rest = { ...dbUpdates }
    for (const k of OPTIONAL) delete rest[k]
    ;({ error: updateError } = await supabase.from('matches').update(rest).eq('id', matchId))
  }

  if (updateError) throw updateError
  return match
}

/**
 * Persist the new tournament order from drag-and-drop. One UPDATE per row
 * (small N — admins manage a handful); silently no-ops if display_order
 * isn't migrated yet so the UI stays usable.
 */
export async function updateTournamentsOrder(orderedIds) {
  if (!orderedIds?.length) return
  const results = await Promise.all(
    orderedIds.map((id, i) =>
      supabase.from('tournaments').update({ display_order: i }).eq('id', id)
    )
  )
  const firstErr = results.find((r) => r.error)?.error
  if (firstErr) {
    if (isMissingColumn(firstErr)) {
      console.warn('[reorder] display_order column not migrated yet — order not persisted.')
      return
    }
    throw firstErr
  }
}

/**
 * Get next match by round_number and match_index
 */
export async function getNextMatch(tournamentId, roundNumber, matchIndex) {
  const nextRound = roundNumber + 1
  const nextMatchIndex = Math.floor(matchIndex / 2)

  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .eq('tournament_id', tournamentId)
    .eq('round_number', nextRound)
    .eq('match_index', nextMatchIndex)
    .single()

  if (error || !data) return null
  return data
}

/**
 * Update next match with advancing winner
 */
export async function updateNextMatchWithWinner(tournamentId, roundNumber, matchIndex, winner) {
  const nextMatch = await getNextMatch(tournamentId, roundNumber, matchIndex)
  if (!nextMatch) return

  const slot = matchIndex % 2 === 0 ? 'team1' : 'team2'
  const updates = {
    [slot === 'team1' ? 'team1' : 'team2']: {
      name: winner.name,
      color: winner.color,
    },
  }

  await upsertMatch(tournamentId, nextMatch.id, updates)
}
