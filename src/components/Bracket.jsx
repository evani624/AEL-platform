import { useMemo } from 'react'
import BracketSection from './BracketSection'
import { getChampionInfo } from '../utils/bracketUtils'

/**
 * Single-elimination bracket. The actual rendering (flex columns + SVG
 * connectors + ChampionCard) lives in <BracketSection>, shared with
 * <DoubleEliminationBracket>'s two section instances.
 */
export default function Bracket({ tournament, isReadOnly, onSlotClick, onDeleteTeam, lastRoundIndex }) {
  // Memoize champPathIds so its identity is stable across renders that
  // don't change `tournament`. BracketSection's measure effect lists it as
  // a dep — a fresh Set every render would loop render → measure → render.
  const champPathIds = useMemo(
    () => getChampionInfo(tournament)?.pathIds ?? new Set(),
    [tournament]
  )

  if (!tournament?.rounds?.length) {
    return <div style={{ color: 'var(--text-mute)', padding: 40 }}>No bracket to display.</div>
  }

  return (
    <BracketSection
      rounds={tournament.rounds}
      champPathIds={champPathIds}
      showChampionAtLast={true}
      connectors={true}
      isReadOnly={isReadOnly}
      onSlotClick={onSlotClick}
      onDeleteTeam={onDeleteTeam}
      lastRoundIndex={lastRoundIndex}
    />
  )
}
