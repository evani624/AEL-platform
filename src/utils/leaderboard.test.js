/*
 * Runnable verification for src/utils/leaderboard.js.
 *
 *   node src/utils/leaderboard.test.js
 *
 * Plain assert() — no test runner. Three groups of assertions:
 *
 *   1. computeRanks — standard competition ranking (1, 2, 2, 4) across the
 *      8 representative shapes: empty / single / two-distinct / two-tied-
 *      at-top / lower-rank-tie / all-tied / mixed / triple-tie-at-top.
 *
 *   2. topTieDetected — 5 scenarios confirming the gate only fires for
 *      ties at rank 1, never for lower-rank ties.
 *
 *   3. Alphabetical tiebreak (display) + getLeaderboardChampionInfo state
 *      machine (null when !isFinal, null when entries empty, top of
 *      computeRanks otherwise).
 */

import assert from 'node:assert/strict'
import process from 'node:process'
import {
  computeRanks,
  topTieDetected,
  getLeaderboardChampionInfo,
} from './leaderboard.js'

let passed = 0
let failed = 0
function check(label, fn) {
  try {
    fn()
    console.log(`  ✓ ${label}`)
    passed++
  } catch (err) {
    console.log(`  ✗ ${label}`)
    console.log(`    ${err.message}`)
    failed++
  }
}

const e = (name, points) => ({ id: name, name, points })

console.log('\n[1/3] computeRanks — standard competition ranking (1, 2, 2, 4)')

check('empty array → []', () => {
  assert.deepEqual(computeRanks([]), [])
})

check('single entry → rank 1', () => {
  const r = computeRanks([e('A', 10)])
  assert.equal(r.length, 1)
  assert.equal(r[0].rank, 1)
})

check('two distinct → 1, 2', () => {
  const r = computeRanks([e('A', 10), e('B', 5)])
  assert.deepEqual(
    r.map((x) => [x.name, x.rank]),
    [
      ['A', 1],
      ['B', 2],
    ]
  )
})

check('two tied at top → 1, 1 (top tie)', () => {
  const r = computeRanks([e('A', 10), e('B', 10)])
  assert.deepEqual(
    r.map((x) => x.rank),
    [1, 1]
  )
})

check('lower-rank tie → 1, 2, 2, 4 (skip 3 — standard competition)', () => {
  const r = computeRanks([e('A', 100), e('B', 50), e('C', 50), e('D', 10)])
  assert.deepEqual(
    r.map((x) => x.rank),
    [1, 2, 2, 4]
  )
})

check('all tied → 1, 1, 1', () => {
  const r = computeRanks([e('A', 10), e('B', 10), e('C', 10)])
  assert.deepEqual(
    r.map((x) => x.rank),
    [1, 1, 1]
  )
})

check('mixed: 100, 90, 90, 90, 50 → 1, 2, 2, 2, 5', () => {
  const r = computeRanks([
    e('A', 100),
    e('B', 90),
    e('C', 90),
    e('D', 90),
    e('E', 50),
  ])
  assert.deepEqual(
    r.map((x) => x.rank),
    [1, 2, 2, 2, 5]
  )
})

check('triple tie at top → 1, 1, 1, 4', () => {
  const r = computeRanks([e('A', 50), e('B', 50), e('C', 50), e('D', 10)])
  assert.deepEqual(
    r.map((x) => x.rank),
    [1, 1, 1, 4]
  )
})

console.log('\n[2/3] topTieDetected — gate is rank-1-only')

check('empty → false', () => {
  assert.equal(topTieDetected([]), false)
})

check('single entry → false (no tie possible)', () => {
  assert.equal(topTieDetected([e('A', 10)]), false)
})

check('two tied at top → true', () => {
  assert.equal(topTieDetected([e('A', 10), e('B', 10)]), true)
})

check('two distinct → false', () => {
  assert.equal(topTieDetected([e('A', 10), e('B', 5)]), false)
})

check('lower-rank tie only (1, 2, 2, 4) → false (top is unique)', () => {
  assert.equal(
    topTieDetected([e('A', 100), e('B', 50), e('C', 50), e('D', 10)]),
    false
  )
})

console.log('\n[3/3] Alphabetical tiebreak + getLeaderboardChampionInfo')

check('tied entries sort alphabetically on display', () => {
  const r = computeRanks([e('Charlie', 10), e('Alpha', 10), e('Bravo', 10)])
  assert.deepEqual(
    r.map((x) => x.name),
    ['Alpha', 'Bravo', 'Charlie']
  )
  assert.deepEqual(
    r.map((x) => x.rank),
    [1, 1, 1]
  )
})

check('champion null when !isFinal', () => {
  const t = { isFinal: false, entries: [e('A', 10), e('B', 5)] }
  assert.equal(getLeaderboardChampionInfo(t), null)
})

check('champion null when isFinal but entries empty', () => {
  const t = { isFinal: true, entries: [] }
  assert.equal(getLeaderboardChampionInfo(t), null)
})

check('champion = top of ranked when isFinal + entries non-empty', () => {
  const t = { isFinal: true, entries: [e('A', 5), e('B', 10), e('C', 8)] }
  const info = getLeaderboardChampionInfo(t)
  assert.equal(info.name, 'B')
  assert.equal(info.pathIds instanceof Set, true)
  assert.equal(info.pathIds.size, 0)
})

console.log(
  `\nRanking definition: https://en.wikipedia.org/wiki/Ranking#Standard_competition_ranking_(%221224%22_ranking)`
)
console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed === 0 ? 0 : 1)
