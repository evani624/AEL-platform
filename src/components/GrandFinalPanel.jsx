import MatchCard from './MatchCard'
import ChampionCard from './ChampionCard'

/**
 * Grand Final + (conditionally) the Reset match.
 *
 * Stale-Reset rule (matches getDoubleElimChampionInfo in doubleElim.js):
 *   - Reset is rendered ONLY when GF.status === 'final' AND L-champ (team2)
 *     won GF. If a previous L-win was reverted and the GF now reads W-won,
 *     the Reset row may still have stale teams in the DB — we hide it
 *     entirely. The DB row stays around (no cascade clear).
 *
 * Champion crown placement:
 *   - W wins GF outright → crown over GF.
 *   - L wins GF + Reset is final → crown over Reset (winner of Reset).
 *   - Otherwise → no crown rendered.
 */
export default function GrandFinalPanel({
  grandFinal,
  grandFinalReset,
  champPathIds,
  isReadOnly,
  onSlotClick,
  onDeleteTeam,
}) {
  const gf = grandFinal?.matches?.[0]
  const reset = grandFinalReset?.matches?.[0]
  if (!gf) return null

  const gfWinnerSide =
    gf.winnerId === gf.team1?.id ? 'A' : gf.winnerId === gf.team2?.id ? 'B' : null
  const resetIsLive = gf.status === 'final' && gfWinnerSide === 'B'

  const resetWinnerSide =
    reset?.winnerId === reset?.team1?.id
      ? 'A'
      : reset?.winnerId === reset?.team2?.id
        ? 'B'
        : null
  const crownOverGf = gf.status === 'final' && gfWinnerSide === 'A'
  const crownOverReset = resetIsLive && reset?.status === 'final' && resetWinnerSide != null

  return (
    <div className="bracket de-grand-final-panel" style={{ position: 'relative' }}>
      <div className="round-col">
        <div className="round-col__head">
          <b>GF</b> · Grand Final
        </div>
        <div className="round-col__matches">
          <div style={{ position: 'relative', zIndex: 1 }}>
            {crownOverGf && (
              <ChampionCard
                team={gf.team1}
                scoreA={gf.team1Score}
                scoreB={gf.team2Score}
                winner="A"
              />
            )}
            <div data-match-id={gf.id}>
              <MatchCard
                match={gf}
                readonly={isReadOnly}
                isFinal={true}
                isChampionPath={champPathIds.has(gf.id)}
                onSlotClick={onSlotClick}
                onDeleteTeam={onDeleteTeam}
              />
            </div>
          </div>
        </div>
      </div>

      {resetIsLive && reset && (
        <div className="round-col">
          <div className="round-col__head">
            <b>GF</b> · Grand Final Reset
          </div>
          <div className="round-col__matches">
            <div style={{ position: 'relative', zIndex: 1 }}>
              {crownOverReset && (
                <ChampionCard
                  team={resetWinnerSide === 'A' ? reset.team1 : reset.team2}
                  scoreA={reset.team1Score}
                  scoreB={reset.team2Score}
                  winner={resetWinnerSide}
                />
              )}
              <div data-match-id={reset.id}>
                <MatchCard
                  match={reset}
                  readonly={isReadOnly}
                  isFinal={true}
                  isChampionPath={champPathIds.has(reset.id)}
                  onSlotClick={onSlotClick}
                  onDeleteTeam={onDeleteTeam}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
