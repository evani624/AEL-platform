import { supabase } from './supabaseClient'
import { createBracketStructure } from '../utils/bracketUtils'
import { generateDoubleElim, nextMatchTarget } from '../utils/doubleElim'

const ROUND_NAMES = {
  4: ['Semi Finals', 'Final'],
  8: ['Round of 8', 'Semi Finals', 'Final'],
  16: ['Round of 16', 'Quarter Finals', 'Semi Finals', 'Final'],
  32: ['Round of 32', 'Round of 16', 'Quarter Finals', 'Semi Finals', 'Final'],
  64: ['Round of 64', 'Round of 32', 'Round of 16', 'Quarter Finals', 'Semi Finals', 'Final'],
}

/**
 * Defensive: never let an unknown teamSize crash buildTournamentFromDb.
 * If ROUND_NAMES has no entry, fall back to generated names (R1..Rn-1,
 * Final). fetchTournaments runs buildTournamentFromDb for every row — one
 * throw historically took down the whole tournament list on local + prod
 * until the bad row was manually deleted from the DB. Hardening here means
 * a future schema mismatch shows up as ugly labels, not a white screen.
 */
function singleElimRoundNames(teamSize) {
  const named = ROUND_NAMES[teamSize]
  if (named) return named
  const n = Math.log2(teamSize)
  if (!Number.isInteger(n) || n < 1) return ['Final']
  return Array.from({ length: n }, (_, i) => (i === n - 1 ? 'Final' : `R${i + 1}`))
}

/**
 * Build app tournament structure from DB rows.
 *
 * Branches on tournament_type:
 *   - 'single' → returns the legacy { ..., rounds[] } shape (byte-identical
 *     to prior behavior for existing tournaments).
 *   - 'double' → returns { ..., winnerRounds, loserRounds, grandFinal,
 *     grandFinalReset } — the bucketed shape consumed by the
 *     DoubleEliminationBracket renderer.
 *   - 'leaderboard' → returns { ..., isFinal, entries } — entries from the
 *     leaderboard_entries table. UI sorts by computeRanks() on display.
 *
 * All shapes carry the additive `tournamentType` field at the top level.
 * Match-shapes also carry `_bracketSide` on every match object for routing.
 */
function buildTournamentFromDb(tournamentRow, matchesRows, leaderboardRows = []) {
  const { id, name, game_name, size, category, display_order, tournament_type, is_final } = tournamentRow
  const teamSize = size
  const tournamentType =
    tournament_type === 'double'
      ? 'double'
      : tournament_type === 'leaderboard'
        ? 'leaderboard'
        : 'single'

  // Per-row → app match-object converter. Shared by both shapes so the
  // per-match fields are byte-identical regardless of bracket section.
  function rowToMatch(row, bracketSide, roundNumber, matchIndex) {
    const team1 = row.team_1_name
      ? { id: `${row.id}-team1`, name: row.team_1_name, color: row.team_1_color || '#00F5FF' }
      : null
    const team2 = row.team_2_name
      ? { id: `${row.id}-team2`, name: row.team_2_name, color: row.team_2_color || '#00F5FF' }
      : null

    let winnerId = null
    if (row.winner_id === 'team1' && team1) winnerId = team1.id
    else if (row.winner_id === 'team2' && team2) winnerId = team2.id

    // Persisted match state. A decided match (has winner) is always Final;
    // otherwise default to 'upcoming' (we never auto-flip to in_progress).
    const rawStatus = row.status
    const status = winnerId
      ? 'final'
      : rawStatus === 'in_progress' || rawStatus === 'final' || rawStatus === 'upcoming'
        ? rawStatus
        : 'upcoming'

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
      nextMatchId: null,
      _bracketSide: bracketSide,
      _roundNumber: roundNumber,
      _matchIndex: matchIndex,
    }
  }

  const myMatches = (matchesRows ?? []).filter((m) => m.tournament_id === id)
  const common = {
    id,
    name,
    game: game_name || '',
    category: category || 'mixed',
    teamSize,
    displayOrder: display_order ?? 0,
    tournamentType,
  }

  // ----- Leaderboard shape -----
  if (tournamentType === 'leaderboard') {
    const myEntries = (leaderboardRows ?? [])
      .filter((e) => e.tournament_id === id)
      .map((row) => ({
        id: row.id,
        name: row.team_name,
        color: row.team_color || '#00F5FF',
        points: row.points ?? 0,
        createdAt: row.created_at,
      }))
    return {
      ...common,
      isFinal: !!is_final,
      entries: myEntries,
    }
  }

  // ----- Double-elim shape -----
  if (tournamentType === 'double') {
    const wCount = Math.log2(teamSize)
    const lCount = 2 * wCount - 2
    const winnerRounds = []
    for (let r = 0; r < wCount; r++) {
      winnerRounds.push({
        name: r === wCount - 1 ? "Winner's Final" : `WR${r + 1}`,
        matches: [],
      })
    }
    const loserRounds = []
    for (let r = 0; r < lCount; r++) {
      loserRounds.push({
        name: r === lCount - 1 ? "Loser's Final" : `LR${r + 1}`,
        matches: [],
      })
    }
    const grandFinal = { name: 'Grand Final', matches: [] }
    const grandFinalReset = { name: 'Grand Final Reset', matches: [] }

    const sorted = [...myMatches].sort(
      (a, b) => a.round_number - b.round_number || a.match_index - b.match_index
    )
    for (const row of sorted) {
      const m = rowToMatch(row, row.bracket_side, row.round_number, row.match_index)
      if (row.bracket_side === 'winner' && winnerRounds[row.round_number]) {
        winnerRounds[row.round_number].matches.push(m)
      } else if (row.bracket_side === 'loser' && loserRounds[row.round_number]) {
        loserRounds[row.round_number].matches.push(m)
      } else if (row.bracket_side === 'grand_final') {
        grandFinal.matches.push(m)
      } else if (row.bracket_side === 'grand_final_reset') {
        grandFinalReset.matches.push(m)
      }
    }

    return { ...common, winnerRounds, loserRounds, grandFinal, grandFinalReset }
  }

  // ----- Single-elim shape — produces IDENTICAL rounds[] output to prior impl -----
  const rounds = singleElimRoundNames(teamSize).map((roundName) => ({
    name: roundName,
    matches: [],
  }))

  // Filter to winner-side rows only. Legacy rows (pre-bracket_side column)
  // are treated as 'winner' (the DEFAULT covers them post-migration too).
  const winnerSideOnly = myMatches.filter(
    (m) => m.bracket_side === 'winner' || m.bracket_side == null
  )

  const matchesByRound = {}
  winnerSideOnly
    .sort((a, b) => a.round_number - b.round_number || a.match_index - b.match_index)
    .forEach((row) => {
      if (!matchesByRound[row.round_number]) matchesByRound[row.round_number] = []
      matchesByRound[row.round_number].push(row)
    })

  for (let r = 0; r < rounds.length; r++) {
    const rowsForRound = matchesByRound[r] || []
    rounds[r].matches = rowsForRound.map((row, matchIdx) =>
      rowToMatch(row, 'winner', r, matchIdx)
    )
  }

  for (let r = 0; r < rounds.length - 1; r++) {
    rounds[r].matches.forEach((match, matchIdx) => {
      const nextMatchIdx = Math.floor(matchIdx / 2)
      match.nextMatchId = rounds[r + 1].matches[nextMatchIdx]?.id ?? null
    })
  }

  return { ...common, rounds }
}

/**
 * Fetch a single tournament by ID with its matches (and leaderboard
 * entries if the type is 'leaderboard').
 */
export async function fetchTournamentById(id) {
  const { data: tournament, error: tError } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .single()

  if (tError || !tournament) return null

  const matches = await fetchMatchesForTournament(id)
  const leaderboardEntries =
    tournament.tournament_type === 'leaderboard'
      ? await fetchLeaderboardEntries(id)
      : []
  return buildTournamentFromDb(tournament, matches, leaderboardEntries)
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

  // Only query leaderboard_entries if at least one loaded tournament is of
  // type 'leaderboard' — saves an empty round-trip for the common case.
  const leaderboardTournamentIds = tournaments
    .filter((t) => t.tournament_type === 'leaderboard')
    .map((t) => t.id)
  let leaderboardEntries = []
  if (leaderboardTournamentIds.length > 0) {
    const { data: leRows, error: leError } = await supabase
      .from('leaderboard_entries')
      .select('*')
      .in('tournament_id', leaderboardTournamentIds)
      .order('created_at', { ascending: true })
    if (leError) throw leError
    leaderboardEntries = leRows || []
  }

  return tournaments.map((t) =>
    buildTournamentFromDb(t, matches || [], leaderboardEntries)
  )
}

/**
 * Create tournament + initial empty matches.
 *
 * tournamentType: 'single' (default) | 'double'. For 'double', uses
 * generateDoubleElim() from src/utils/doubleElim.js (whose drop schedule
 * sources brackets-manager.js — see that file's header for citation).
 *
 * Bulk-insert OPTIONAL retry: if `tournament_type` or `bracket_side` columns
 * aren't migrated yet, the inserts strip those fields and retry — the
 * legacy single-elim path keeps working through the deploy gap.
 */
export async function createTournament({ name, game, category, teamSize, tournamentType = 'single' }) {
  // Leaderboard stores size=4 as a placeholder — the field is never
  // UI-displayed for this type (BracketHeader subtitle reads entries.length).
  // Zero schema change to the size CHECK (still permits 4); the meaningful
  // count comes from leaderboard_entries.
  const sizeToStore = tournamentType === 'leaderboard' ? 4 : teamSize

  // Insert the tournament row (with tournament_type if the column exists).
  let { data: tournament, error: tError } = await supabase
    .from('tournaments')
    .insert({
      name,
      game_name: game || '',
      category: category || 'mixed',
      size: sizeToStore,
      tournament_type: tournamentType,
    })
    .select()
    .single()

  if (tError && isMissingColumn(tError)) {
    // tournament_type column not migrated yet — retry without it (DB will
    // default to 'single', which is fine because pre-migration there's no
    // double-elim or leaderboard UI anyway).
    ;({ data: tournament, error: tError } = await supabase
      .from('tournaments')
      .insert({
        name,
        game_name: game || '',
        category: category || 'mixed',
        size: sizeToStore,
      })
      .select()
      .single())
  }
  if (tError) throw tError

  // Leaderboard: no matches, no seeded entries. Admin adds teams later
  // via the LeaderboardScreen.
  if (tournamentType === 'leaderboard') {
    return buildTournamentFromDb(tournament, [], [])
  }

  // Build the match rows for either single or double-elim.
  const matchRows = []
  if (tournamentType === 'double') {
    const { winnerRounds, loserRounds } = generateDoubleElim(teamSize)
    winnerRounds.forEach((round, ri) =>
      round.matches.forEach((_m, mi) => {
        matchRows.push({
          tournament_id: tournament.id,
          bracket_side: 'winner',
          round_number: ri,
          match_index: mi,
        })
      })
    )
    loserRounds.forEach((round, ri) =>
      round.matches.forEach((_m, mi) => {
        matchRows.push({
          tournament_id: tournament.id,
          bracket_side: 'loser',
          round_number: ri,
          match_index: mi,
        })
      })
    )
    matchRows.push({
      tournament_id: tournament.id,
      bracket_side: 'grand_final',
      round_number: 0,
      match_index: 0,
    })
    matchRows.push({
      tournament_id: tournament.id,
      bracket_side: 'grand_final_reset',
      round_number: 0,
      match_index: 0,
    })
  } else {
    const rounds = createBracketStructure(teamSize)
    rounds.forEach((round, roundIndex) =>
      round.matches.forEach((_m, matchIndex) => {
        matchRows.push({
          tournament_id: tournament.id,
          bracket_side: 'winner',
          round_number: roundIndex,
          match_index: matchIndex,
        })
      })
    )
  }

  // Bulk insert, with the missing-column retry pattern: if `bracket_side`
  // hasn't been migrated yet, drop it from every row and retry.
  let { error: mError } = await supabase.from('matches').insert(matchRows)
  if (mError && isMissingColumn(mError)) {
    const fallbackRows = matchRows.map(({ bracket_side, ...rest }) => {
      void bracket_side // intentional: column missing; drop the field
      return rest
    })
    ;({ error: mError } = await supabase.from('matches').insert(fallbackRows))
  }
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

/**
 * Find a match by its (bracket_side, round, matchIdx) coords in the
 * double-elim tournament shape. Returns the match object or null.
 */
function findBySectionCoords(tournament, bracketSide, roundIdx, matchIdx) {
  if (bracketSide === 'winner') {
    return tournament.winnerRounds?.[roundIdx]?.matches?.[matchIdx] ?? null
  }
  if (bracketSide === 'loser') {
    return tournament.loserRounds?.[roundIdx]?.matches?.[matchIdx] ?? null
  }
  if (bracketSide === 'grand_final') {
    return tournament.grandFinal?.matches?.[matchIdx] ?? null
  }
  if (bracketSide === 'grand_final_reset') {
    return tournament.grandFinalReset?.matches?.[matchIdx] ?? null
  }
  return null
}

/**
 * Propagate a final match result. Single entry point that AdminView calls
 * regardless of tournament type.
 *
 * SINGLE-ELIM: delegates to updateNextMatchWithWinner — same call signature
 * as before, so the wire format is byte-identical to the legacy path.
 *
 * DOUBLE-ELIM: uses nextMatchTarget() from doubleElim.js. Writes the winner
 * to its W- or L-bracket target slot AND (for W matches) the loser to its
 * L-bracket drop target. Grand Final special case: if L-champ (team2) wins
 * GF, populates the Reset match's two slots with the GF teams (W=team1,
 * L=team2 per plan); W-champ winning GF decides the tournament outright.
 *
 * Returns { winnerTarget, loserTarget, championDecided } for callers that
 * want to optimistically patch state; AdminView in chunk (a) refetches
 * instead so the targets are advisory.
 */
export async function advanceWinnerAndLoser(tournament, completedMatch, winningTeam, losingTeam) {
  if (tournament.tournamentType !== 'double') {
    const roundIndex = completedMatch._roundNumber
    const matchIndex = completedMatch._matchIndex
    await updateNextMatchWithWinner(tournament.id, roundIndex, matchIndex, winningTeam)
    return { winnerTarget: null, loserTarget: null, championDecided: false }
  }

  const side = completedMatch._bracketSide
  const round = completedMatch._roundNumber
  const matchIdx = completedMatch._matchIndex
  const winnerSlot = winningTeam?.id === completedMatch.team1?.id ? 'team1' : 'team2'

  if (side === 'grand_final') {
    if (winnerSlot === 'team2') {
      // L-champ won GF → activate Reset by populating both slots.
      const reset = tournament.grandFinalReset?.matches?.[0]
      if (reset && completedMatch.team1 && completedMatch.team2) {
        await upsertMatch(tournament.id, reset.id, {
          team1: {
            name: completedMatch.team1.name,
            color: completedMatch.team1.color || '#00F5FF',
          },
          team2: {
            name: completedMatch.team2.name,
            color: completedMatch.team2.color || '#00F5FF',
          },
        })
      }
      return { winnerTarget: null, loserTarget: null, championDecided: false }
    }
    // W-champ won GF outright — tournament decided.
    return { winnerTarget: null, loserTarget: null, championDecided: true }
  }

  if (side === 'grand_final_reset') {
    return { winnerTarget: null, loserTarget: null, championDecided: true }
  }

  const { winnerTarget, loserTarget } = nextMatchTarget(
    side,
    round,
    matchIdx,
    winnerSlot,
    tournament.teamSize
  )

  if (winnerTarget && winningTeam) {
    const targetMatch = findBySectionCoords(
      tournament,
      winnerTarget.bracketSide,
      winnerTarget.roundIdx,
      winnerTarget.matchIdx
    )
    if (targetMatch) {
      await upsertMatch(tournament.id, targetMatch.id, {
        [winnerTarget.slot]: { name: winningTeam.name, color: winningTeam.color },
      })
    }
  }

  if (loserTarget && losingTeam) {
    const targetMatch = findBySectionCoords(
      tournament,
      loserTarget.bracketSide,
      loserTarget.roundIdx,
      loserTarget.matchIdx
    )
    if (targetMatch) {
      await upsertMatch(tournament.id, targetMatch.id, {
        [loserTarget.slot]: { name: losingTeam.name, color: losingTeam.color },
      })
    }
  }

  return { winnerTarget, loserTarget, championDecided: false }
}

// ============================================================
// Leaderboard CRUD — separate from matches; reads/writes leaderboard_entries.
//
// Unique violation handling: the (tournament_id, team_name) UNIQUE
// constraint can fire on INSERT (addLeaderboardEntry) AND UPDATE
// (updateLeaderboardEntry when team_name changes). Postgres reports
// error.code === '23505' for unique_violation. We rethrow as a typed
// Error (code='DUPLICATE_TEAM_NAME') that AdminView catches and maps to
// a friendly toast — never an unhandled error to the screen banner.
// ============================================================

function isUniqueViolation(error) {
  return error?.code === '23505'
}

function duplicateTeamNameError(name) {
  const err = new Error(`A team named "${name}" is already in this leaderboard.`)
  err.code = 'DUPLICATE_TEAM_NAME'
  return err
}

/**
 * Fetch all leaderboard entries for a tournament, ordered by created_at
 * (the UI re-sorts by points DESC + name ASC via computeRanks for display).
 */
export async function fetchLeaderboardEntries(tournamentId) {
  const { data, error } = await supabase
    .from('leaderboard_entries')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data || []
}

/**
 * Add a leaderboard entry. Trims the name before insert. Maps Postgres
 * 23505 (unique_violation) to a DUPLICATE_TEAM_NAME error for the caller.
 */
export async function addLeaderboardEntry(tournamentId, { name, color, points = 0 }) {
  const trimmed = (name ?? '').trim()
  const { error } = await supabase.from('leaderboard_entries').insert({
    tournament_id: tournamentId,
    team_name: trimmed,
    team_color: color || null,
    points,
  })
  if (isUniqueViolation(error)) throw duplicateTeamNameError(trimmed)
  if (error) throw error
}

/**
 * Update a leaderboard entry. Any subset of { name, color, points } may be
 * provided. Renames trigger the same 23505 → DUPLICATE_TEAM_NAME mapping.
 *
 * NOTE (Phase 3b): only `points` updates fire from the LeaderboardScreen UI
 * today — the inline editor in the row doesn't expose name/color edits.
 * The rename branch of the 23505 → DUPLICATE_TEAM_NAME mapping is therefore
 * unexercised in 3b; it will fire when a rename UI is added in v1.2.
 * Keeping the mapping in place means no new wiring is needed then.
 */
export async function updateLeaderboardEntry(entryId, { name, color, points }) {
  const updates = {}
  if (name !== undefined) updates.team_name = (name ?? '').trim()
  if (color !== undefined) updates.team_color = color || null
  if (points !== undefined) updates.points = points
  if (Object.keys(updates).length === 0) return

  const { error } = await supabase
    .from('leaderboard_entries')
    .update(updates)
    .eq('id', entryId)

  if (isUniqueViolation(error)) {
    throw duplicateTeamNameError(updates.team_name ?? '')
  }
  if (error) throw error
}

/**
 * Delete a single leaderboard entry. No cascading effects.
 */
export async function deleteLeaderboardEntry(entryId) {
  const { error } = await supabase
    .from('leaderboard_entries')
    .delete()
    .eq('id', entryId)
  if (error) throw error
}

/**
 * Flip the tournament's is_final flag. Used by leaderboard's
 * "Mark Tournament Final" / "Un-mark Final" buttons. The caller is
 * responsible for the no-top-tie gate (forward block at the UI layer);
 * this function just writes the flag. Auto-revert on top-tie creation is
 * also a client-side concern — it calls this with isFinal=false.
 */
export async function setTournamentFinal(tournamentId, isFinal) {
  const { error } = await supabase
    .from('tournaments')
    .update({ is_final: !!isFinal })
    .eq('id', tournamentId)
  if (error) throw error
}
