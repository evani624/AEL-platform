/**
 * Leaderboard ranking + tie-detection + champion derivation.
 *
 * Standard competition ranking (1, 2, 2, 4 — NOT 1, 2, 2, 3): tied entries
 * share a rank, and the next rank skips ahead by the count of ties. This
 * matches the user spec. Reference:
 *   https://en.wikipedia.org/wiki/Ranking#Standard_competition_ranking_(%221224%22_ranking)
 *
 * Alphabetical tiebreak applies to DISPLAY ORDER only — two entries on the
 * same points show as "(2) Alpha / (2) Bravo" not the reverse. The rank
 * numbers themselves are still equal; only the visual sort settles the tie.
 *
 * Top-tie detection (`topTieDetected`) gates the "Mark Tournament Final"
 * action: if the highest points value is shared by two or more entries,
 * the admin must adjust points before they can finalize. Ties at any LOWER
 * rank are fine and never block.
 */

/**
 * Add a `rank` field to each entry, sorted by points DESC + name ASC.
 * Pure function; does not mutate the input array.
 */
export function computeRanks(entries) {
  if (!entries?.length) return []
  const sorted = [...entries].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    return (a.name || '').localeCompare(b.name || '')
  })
  const ranked = []
  let lastPoints = null
  let lastRank = 0
  for (let i = 0; i < sorted.length; i++) {
    const e = sorted[i]
    const rank =
      lastPoints !== null && e.points === lastPoints ? lastRank : i + 1
    ranked.push({ ...e, rank })
    lastPoints = e.points
    lastRank = rank
  }
  return ranked
}

/**
 * True iff at least two entries share the highest points value.
 * < 2 entries → false (no tie possible).
 */
export function topTieDetected(entries) {
  if ((entries?.length ?? 0) < 2) return false
  const ranked = computeRanks(entries)
  return ranked[0].rank === ranked[1].rank
}

/**
 * Return { name, pathIds } for the champion of a leaderboard tournament,
 * or null if undecided. The forward-block on `isFinal` (admin can only
 * finalize when no top-tie exists) makes the top unique by construction
 * here, so we just return ranked[0]. `pathIds` is an empty Set — there's
 * no match-path to highlight on a leaderboard. The shape matches
 * getChampionInfo/getDoubleElimChampionInfo so callers can treat all three
 * uniformly.
 */
export function getLeaderboardChampionInfo(tournament) {
  if (!tournament?.isFinal) return null
  const entries = tournament?.entries ?? []
  if (entries.length === 0) return null
  const ranked = computeRanks(entries)
  const top = ranked[0]
  return { name: top.name, pathIds: new Set() }
}
