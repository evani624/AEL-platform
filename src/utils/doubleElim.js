/**
 * Double-elimination bracket generation + propagation helpers.
 *
 * SOURCE OF TRUTH for the W→L drop schedule:
 *   brackets-manager.js (MIT licensed) — the same library used by start.gg and
 *   referenced by Challonge's bracket maker.
 *     - https://github.com/Drarig29/brackets-manager.js (master branch)
 *     - src/ordering.ts          → `defaultMinorOrdering` (per-size LB ordering)
 *     - src/ordering.ts          → `ordering` (the natural/reverse/half_shift /
 *                                  reverse_half_shift functions)
 *     - src/base/stage/creator.ts → `createLowerBracket` (consumes those)
 *     - src/helpers.ts            → `transitionToMinor` (places the WR loser
 *                                   as team1 / slot A and the LB winner as
 *                                   team2 / slot B in each merge round)
 *
 * The MINOR_ORDERINGS table below is COPIED VERBATIM from
 * `defaultMinorOrdering` in brackets-manager's ordering.ts. The DROP_SCHEDULE
 * table is hand-derived from that source and the transitionToMinor placement
 * rule (WR loser = team1). The verification script in doubleElim.test.js
 * asserts that loserDropTarget()'s output equals every entry in DROP_SCHEDULE
 * for sizes 4, 8, 16, 32.
 *
 * --------------------------------------------------------------------
 * Slot convention in MERGE rounds (LB rounds that receive WR losers):
 *   team1 = the newly-dropped WR loser
 *   team2 = the LB-bracket winner from the previous LB round
 *
 * Slot convention in the INITIAL LR0 (consolidation of WR0 losers):
 *   team1 = lower-index WR0 loser of the pair
 *   team2 = higher-index WR0 loser of the pair
 *
 * Slot convention in CONSOLIDATION rounds (LR0 advance excluded — see above):
 *   team1 = winner of the even-indexed prior LB match
 *   team2 = winner of the odd-indexed prior LB match
 * --------------------------------------------------------------------
 */

// ============================================================
// MINOR_ORDERINGS — copied verbatim from
// brackets-manager.js / src/ordering.ts  (defaultMinorOrdering)
// Indexed by participant count N. The 0th entry is the ordering for the
// initial LR0 (WR0 losers). The k-th entry (k >= 1) is the ordering for the
// LB merge round that receives WR_k losers. The last entry corresponds to a
// merge round with only one loser (the W-Final loser), so its ordering is
// effectively a no-op; the brackets-manager code returns `undefined` for
// it and falls back to 'natural'.
// ============================================================
export const MINOR_ORDERINGS = {
  4:  ['natural', 'reverse'],
  8:  ['natural', 'reverse', 'natural'],
  16: ['natural', 'reverse_half_shift', 'reverse', 'natural'],
  32: ['natural', 'reverse', 'half_shift', 'natural', 'natural'],
  // 64 listed for parity with the source but not exposed in
  // BRACKET_SIZE_OPTIONS_BY_TYPE.double — the UI caps double-elim at 32.
  64: ['natural', 'reverse', 'half_shift', 'reverse', 'natural', 'natural'],
}

// ============================================================
// ORDERING fns — copied verbatim from brackets-manager.js / src/ordering.ts
// Each returns where index `k` (in an array of length `n`) lands after the
// ordering is applied. Equivalent to ordering[name](array)[k] without
// allocating the array.
// ============================================================
const ORDERINGS = {
  natural: (n, k) => k,
  reverse: (n, k) => n - 1 - k,
  // Each half is reversed independently, then concatenated.
  reverse_half_shift: (n, k) => {
    const half = n / 2
    return k < half ? half - 1 - k : (3 * half - 1) - k
  },
  // Second half moves to the front; first half to the back.
  half_shift: (n, k) => {
    const half = n / 2
    return k < half ? k + half : k - half
  },
}

// ============================================================
// DROP_SCHEDULE — hand-derived reference table. Each entry:
//   [winnerRound, winnerMatch, loserRound, loserMatch, slot]
// is what the algorithm above produces. The Phase-2b verification script
// asserts loserDropTarget()'s output equals every entry here.
//
// (winnerRound, winnerMatch) is 0-indexed within the WINNER bracket.
// (loserRound, loserMatch)   is 0-indexed within the LOSER  bracket.
// slot is 'team1' or 'team2'.
// ============================================================
export const DROP_SCHEDULE = {
  4: [
    // WR0 → LR0 (natural)
    [0, 0, 0, 0, 'team1'],
    [0, 1, 0, 0, 'team2'],
    // WR1 (W-Final) → LR1 (last minor; natural)
    [1, 0, 1, 0, 'team1'],
  ],
  8: [
    // WR0 → LR0 (natural)
    [0, 0, 0, 0, 'team1'],
    [0, 1, 0, 0, 'team2'],
    [0, 2, 0, 1, 'team1'],
    [0, 3, 0, 1, 'team2'],
    // WR1 → LR1 (reverse)
    [1, 0, 1, 1, 'team1'],
    [1, 1, 1, 0, 'team1'],
    // WR2 (W-Final) → LR3 (last minor; natural)
    [2, 0, 3, 0, 'team1'],
  ],
  16: [
    // WR0 → LR0 (natural)
    [0, 0, 0, 0, 'team1'],
    [0, 1, 0, 0, 'team2'],
    [0, 2, 0, 1, 'team1'],
    [0, 3, 0, 1, 'team2'],
    [0, 4, 0, 2, 'team1'],
    [0, 5, 0, 2, 'team2'],
    [0, 6, 0, 3, 'team1'],
    [0, 7, 0, 3, 'team2'],
    // WR1 → LR1 (reverse_half_shift)
    [1, 0, 1, 1, 'team1'],
    [1, 1, 1, 0, 'team1'],
    [1, 2, 1, 3, 'team1'],
    [1, 3, 1, 2, 'team1'],
    // WR2 → LR3 (reverse)
    [2, 0, 3, 1, 'team1'],
    [2, 1, 3, 0, 'team1'],
    // WR3 (W-Final) → LR5 (last minor; natural)
    [3, 0, 5, 0, 'team1'],
  ],
  32: [
    // WR0 → LR0 (natural) — 16 entries
    [0, 0, 0, 0, 'team1'], [0, 1, 0, 0, 'team2'],
    [0, 2, 0, 1, 'team1'], [0, 3, 0, 1, 'team2'],
    [0, 4, 0, 2, 'team1'], [0, 5, 0, 2, 'team2'],
    [0, 6, 0, 3, 'team1'], [0, 7, 0, 3, 'team2'],
    [0, 8, 0, 4, 'team1'], [0, 9, 0, 4, 'team2'],
    [0, 10, 0, 5, 'team1'], [0, 11, 0, 5, 'team2'],
    [0, 12, 0, 6, 'team1'], [0, 13, 0, 6, 'team2'],
    [0, 14, 0, 7, 'team1'], [0, 15, 0, 7, 'team2'],
    // WR1 → LR1 (reverse) — 8 entries (k → 7-k)
    [1, 0, 1, 7, 'team1'],
    [1, 1, 1, 6, 'team1'],
    [1, 2, 1, 5, 'team1'],
    [1, 3, 1, 4, 'team1'],
    [1, 4, 1, 3, 'team1'],
    [1, 5, 1, 2, 'team1'],
    [1, 6, 1, 1, 'team1'],
    [1, 7, 1, 0, 'team1'],
    // WR2 → LR3 (half_shift) — 4 entries (k → (k+2) mod 4)
    [2, 0, 3, 2, 'team1'],
    [2, 1, 3, 3, 'team1'],
    [2, 2, 3, 0, 'team1'],
    [2, 3, 3, 1, 'team1'],
    // WR3 → LR5 (natural) — 2 entries
    [3, 0, 5, 0, 'team1'],
    [3, 1, 5, 1, 'team1'],
    // WR4 (W-Final) → LR7 (last minor; natural) — 1 entry
    [4, 0, 7, 0, 'team1'],
  ],
}

// ============================================================
// Pure helpers
// ============================================================

function log2(n) {
  return Math.log2(n)
}

/** Allowed sizes for double elim (4..32; 64 is too dense visually). */
export const DOUBLE_ELIM_SIZES = [4, 8, 16, 32]

/**
 * Number of LB rounds for a given size.
 *   L round count = 2 * log2(N) - 2
 * (4→2, 8→4, 16→6, 32→8 — matches the per-size table in the plan.)
 */
export function loserRoundCount(size) {
  return 2 * log2(size) - 2
}

/**
 * Number of matches in LB round R (0-indexed) for participant count N.
 *   LR(2j)   : N / 2^(j+2)   (consolidation / initial)
 *   LR(2j+1) : N / 2^(j+2)   (merge)
 */
export function loserMatchCount(size, loserRoundIdx) {
  const j = Math.floor(loserRoundIdx / 2)
  return size / Math.pow(2, j + 2)
}

/**
 * Where the loser of W-bracket match (winnerRound, winnerMatch) drops.
 *   r=0 (WR0): natural pairing into LR0.
 *   r>=1     : drops into LR(2r-1) at slot team1, position determined by
 *              the brackets-manager MINOR_ORDERINGS[size][r] permutation.
 *
 * Returns { loserRoundIdx, loserMatchIdx, slot }.
 */
export function loserDropTarget(size, winnerRoundIdx, winnerMatchIdx) {
  if (winnerRoundIdx === 0) {
    return {
      loserRoundIdx: 0,
      loserMatchIdx: Math.floor(winnerMatchIdx / 2),
      slot: winnerMatchIdx % 2 === 0 ? 'team1' : 'team2',
    }
  }
  const loserRoundIdx = 2 * winnerRoundIdx - 1
  const numLosers = size / Math.pow(2, winnerRoundIdx + 1)
  const orderingName = MINOR_ORDERINGS[size][winnerRoundIdx] || 'natural'
  const orderedIdx = ORDERINGS[orderingName](numLosers, winnerMatchIdx)
  return { loserRoundIdx, loserMatchIdx: orderedIdx, slot: 'team1' }
}

/**
 * Where the WINNER of an L-bracket match advances.
 *   LR0 → LR1 t2 (identity).
 *   LR(2j+1) merge → LR(2j+2) consolidation: pairs adjacent; team1 if even, team2 if odd.
 *   LR(2j+2) consol → LR(2j+3) merge: identity, slot t2.
 *   Last LR (= L-Final) winner → Grand Final t2.
 */
export function loserWinnerAdvance(size, loserRoundIdx, loserMatchIdx) {
  const lastIdx = loserRoundCount(size) - 1
  if (loserRoundIdx === lastIdx) {
    return { bracketSide: 'grand_final', roundIdx: 0, matchIdx: 0, slot: 'team2' }
  }
  if (loserRoundIdx === 0) {
    // Initial → first merge (slot t2).
    return { bracketSide: 'loser', roundIdx: 1, matchIdx: loserMatchIdx, slot: 'team2' }
  }
  // For LR >= 1: odd index = merge (advance to consol via pair-up);
  //              even index = consol (advance to next merge via identity slot t2).
  if (loserRoundIdx % 2 === 1) {
    return {
      bracketSide: 'loser',
      roundIdx: loserRoundIdx + 1,
      matchIdx: Math.floor(loserMatchIdx / 2),
      slot: loserMatchIdx % 2 === 0 ? 'team1' : 'team2',
    }
  }
  return {
    bracketSide: 'loser',
    roundIdx: loserRoundIdx + 1,
    matchIdx: loserMatchIdx,
    slot: 'team2',
  }
}

/**
 * Where the WINNER of a W-bracket match advances.
 *   Standard single-elim: WR_r M_k → WR_(r+1) M_(k/2), slot by parity.
 *   W-Final winner → Grand Final t1.
 */
export function winnerWinnerAdvance(size, winnerRoundIdx, winnerMatchIdx) {
  const lastWR = log2(size) - 1
  if (winnerRoundIdx === lastWR) {
    return { bracketSide: 'grand_final', roundIdx: 0, matchIdx: 0, slot: 'team1' }
  }
  return {
    bracketSide: 'winner',
    roundIdx: winnerRoundIdx + 1,
    matchIdx: Math.floor(winnerMatchIdx / 2),
    slot: winnerMatchIdx % 2 === 0 ? 'team1' : 'team2',
  }
}

// ============================================================
// generateDoubleElim(size)
//
// Returns the full match list for a fresh double-elim bracket:
//   { winnerRounds, loserRounds, grandFinal, grandFinalReset }
// Each round is { name, matches: [{ id, team1, team2, winnerId, ... }] }.
// The bracket_side / round_number / match_index triples are deterministic
// so the caller can flatMap them into DB INSERTs.
// ============================================================
let _matchIdSeq = 0
function mkMatch() {
  return {
    id: `de-${_matchIdSeq++}`,
    team1: null,
    team2: null,
    winnerId: null,
    nextMatchId: null,
  }
}

export function generateDoubleElim(size) {
  if (!DOUBLE_ELIM_SIZES.includes(size)) {
    throw new Error(`Double elim size must be one of ${DOUBLE_ELIM_SIZES.join(', ')}`)
  }
  _matchIdSeq = 0

  // Winner bracket — standard single-elim shape.
  const wRoundCount = log2(size)
  const winnerRounds = []
  for (let r = 0; r < wRoundCount; r++) {
    const count = size / Math.pow(2, r + 1)
    winnerRounds.push({
      name: r === wRoundCount - 1 ? "Winner's Final" : `WR${r + 1}`,
      matches: Array.from({ length: count }, mkMatch),
    })
  }

  // Loser bracket.
  const lRoundCount = loserRoundCount(size)
  const loserRounds = []
  for (let r = 0; r < lRoundCount; r++) {
    const count = loserMatchCount(size, r)
    loserRounds.push({
      name: r === lRoundCount - 1 ? "Loser's Final" : `LR${r + 1}`,
      matches: Array.from({ length: count }, mkMatch),
    })
  }

  const grandFinal = { name: 'Grand Final', matches: [mkMatch()] }
  const grandFinalReset = { name: 'Grand Final Reset', matches: [mkMatch()] }

  return { winnerRounds, loserRounds, grandFinal, grandFinalReset }
}

// ============================================================
// nextMatchTarget(side, roundIdx, matchIdx, winnerSlot, size)
//
// Single function used by the service to propagate any match result. Returns
// { winnerTarget, loserTarget } — each null OR
//   { bracketSide, roundIdx, matchIdx, slot }.
//
// SINGLE-ELIM call sites: pass side='winner' and size=teamSize; loserTarget
// will be null (because for type='single' there is no loser bracket) — the
// service skips the call entirely in that case.
// ============================================================
export function nextMatchTarget(side, roundIdx, matchIdx, winnerSlot, size) {
  const losingSlot = winnerSlot === 'team1' ? 'team2' : 'team1'
  // Identity of the loser is needed by the caller, but the TARGET (where the
  // loser is placed) only depends on side / round / matchIdx — the loser's
  // team object travels separately.
  void losingSlot

  if (side === 'winner') {
    const winnerTarget = winnerWinnerAdvance(size, roundIdx, matchIdx)
    const loserTarget = (() => {
      // Only place a loser if there's an L bracket — i.e. double-elim.
      if (size && DOUBLE_ELIM_SIZES.includes(size)) {
        const drop = loserDropTarget(size, roundIdx, matchIdx)
        return {
          bracketSide: 'loser',
          roundIdx: drop.loserRoundIdx,
          matchIdx: drop.loserMatchIdx,
          slot: drop.slot,
        }
      }
      return null
    })()
    return { winnerTarget, loserTarget }
  }

  if (side === 'loser') {
    return { winnerTarget: loserWinnerAdvance(size, roundIdx, matchIdx), loserTarget: null }
  }

  if (side === 'grand_final') {
    // GF: if W wins (slot team1), tournament over — no targets.
    //     if L wins (slot team2), Reset is populated by the caller (state
    //     machine) — we still return null targets because the placement of
    //     BOTH teams into Reset is special-cased by advanceWinnerAndLoser.
    return { winnerTarget: null, loserTarget: null }
  }

  if (side === 'grand_final_reset') {
    return { winnerTarget: null, loserTarget: null }
  }

  return { winnerTarget: null, loserTarget: null }
}

// ============================================================
// getDoubleElimChampionInfo(tournament)
//
// Returns { name, pathIds } for the champion of a double-elim tournament,
// or null if undecided. Stale-Reset rule (see plan):
//   - If GF.status === 'final' and W won → champion = GF.team1 (the W team).
//     Reset's teams may be populated from a previous L-win that was reverted;
//     they MUST be ignored.
//   - If GF.status === 'final' and L won and Reset.status === 'final' →
//     champion = whoever won Reset.
//   - Otherwise: no champion yet.
// ============================================================
export function getDoubleElimChampionInfo(tournament) {
  const gf = tournament?.grandFinal?.matches?.[0]
  if (!gf || gf.status !== 'final') return null
  const winnerSide = gf.winnerId === gf.team1?.id ? 'A' : gf.winnerId === gf.team2?.id ? 'B' : null
  if (!winnerSide) return null

  let champTeam = null
  if (winnerSide === 'A') {
    // W-champ won GF outright. Stale Reset (if any) is void.
    champTeam = gf.team1
  } else {
    // L-champ won GF → Reset is live. Champion = Reset winner.
    const reset = tournament?.grandFinalReset?.matches?.[0]
    if (!reset || reset.status !== 'final') return null
    const resetWinnerSide =
      reset.winnerId === reset.team1?.id ? 'A' : reset.winnerId === reset.team2?.id ? 'B' : null
    if (!resetWinnerSide) return null
    champTeam = resetWinnerSide === 'A' ? reset.team1 : reset.team2
  }
  if (!champTeam) return null

  const name = champTeam.name
  const pathIds = new Set()
  const visit = (m) => {
    if (!m) return
    const s = m.winnerId === m.team1?.id ? 'A' : m.winnerId === m.team2?.id ? 'B' : null
    if (!s) return
    const winTeam = s === 'A' ? m.team1 : m.team2
    if (winTeam?.name === name) pathIds.add(m.id)
  }
  for (const round of tournament.winnerRounds ?? []) round.matches.forEach(visit)
  for (const round of tournament.loserRounds ?? []) round.matches.forEach(visit)
  visit(gf)
  // Reset only counted as part of the path when it's live (W won GF outright
  // makes the stored Reset stale).
  if (winnerSide === 'B') {
    tournament?.grandFinalReset?.matches?.forEach(visit)
  }
  return { name, pathIds }
}
