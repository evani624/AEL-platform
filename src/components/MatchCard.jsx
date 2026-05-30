import { Plus, X, Crown } from 'lucide-react'
import { colorHex } from '../constants/teamColors'
import { getMatchState, getWinnerSide } from '../utils/bracketUtils'

// Compact eyebrow format: "APR 13", "9:00 PM", or "APR 13 · 9:00 PM"
function formatMatchWhen(date, time) {
  const parts = []
  if (date) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date)
    if (m) {
      const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
      const month = d.toLocaleString('en', { month: 'short' }).toUpperCase()
      parts.push(`${month} ${d.getDate()}`)
    }
  }
  if (time) {
    const tm = /^(\d{1,2}):(\d{2})/.exec(String(time))
    if (tm) {
      const h = Number(tm[1])
      const mm = tm[2]
      const period = h >= 12 ? 'PM' : 'AM'
      const h12 = ((h + 11) % 12) + 1
      parts.push(`${h12}:${mm} ${period}`)
    }
  }
  return parts.join(' · ')
}

function TeamRow({ team, score, seed, isWinner, isLoser, isTop, empty, readonly, onClick, onDelete }) {
  let cls = 'match__row'
  if (isWinner) cls += ' match__row--winner'
  if (isLoser) cls += ' match__row--loser'
  if (isTop) cls += ' match__row--top'
  if (empty) cls += ' match__row--empty'

  return (
    <div className={cls} onClick={onClick}>
      <span className="match__seed">{String(seed).padStart(2, '0')}</span>
      {team ? (
        <span className="match__team">
          <span className="team-chip" style={{ '--c': colorHex(team.color) }} />
          <span className="match__name" style={{ flex: 1, minWidth: 0 }}>{team.name}</span>
          {!readonly && onDelete && (
            <button
              type="button"
              className="icon-btn icon-btn--danger"
              data-delete-team
              onClick={(e) => { e.stopPropagation(); onDelete() }}
              style={{ width: 20, height: 20, flexShrink: 0 }}
              aria-label={`Remove ${team.name}`}
              title="Remove team"
            >
              <X size={12} />
            </button>
          )}
        </span>
      ) : (
        <span className="match__team">
          <span className="team-chip" />
          <span className="match__name">
            <Plus size={11} /> Add team
          </span>
        </span>
      )}
      <span className="match__score">{score == null ? '—' : score}</span>
    </div>
  )
}

/**
 * Single match card. State is derived (done / live / upcoming); winner glows
 * violet, loser dims. For the final card the winner floats to the top slot.
 */
export default function MatchCard({ match, readonly, isFinal, isChampionPath, onSlotClick, onDeleteTeam }) {
  const state = getMatchState(match)
  const winnerSide = getWinnerSide(match)
  // 'Soon' (not 'Upcoming') matches the sidebar SOON pill and keeps the head
  // row narrow so cards stay the same width whether a date is set or not.
  const stateLabel = state === 'live' ? 'Live' : state === 'done' ? 'Done' : 'Soon'
  const matchIndex = match._matchIndex ?? 0
  const round = (match._roundNumber ?? 0) + 1

  const clickRow = (which) => {
    if (readonly) return
    const team = which === 'A' ? match.team1 : match.team2
    if (!team) onSlotClick?.(match, which === 'A' ? 'team1' : 'team2')
    else onSlotClick?.(match, null)
  }
  const clickHead = () => {
    if (readonly) return
    if (match.team1 && match.team2) onSlotClick?.(match, null)
  }

  const swap = isFinal && state === 'done' && winnerSide === 'B'

  const rowA = (
    <TeamRow
      key="a"
      team={match.team1}
      score={match.team1Score}
      seed={matchIndex * 2 + 1}
      isWinner={state === 'done' && winnerSide === 'A'}
      isLoser={state === 'done' && winnerSide === 'B'}
      isTop={!swap}
      empty={!match.team1}
      readonly={readonly}
      onClick={() => clickRow('A')}
      onDelete={onDeleteTeam && match.team1 ? () => onDeleteTeam(match, 'team1') : undefined}
    />
  )
  const rowB = (
    <TeamRow
      key="b"
      team={match.team2}
      score={match.team2Score}
      seed={matchIndex * 2 + 2}
      isWinner={state === 'done' && winnerSide === 'B'}
      isLoser={state === 'done' && winnerSide === 'A'}
      isTop={swap}
      empty={!match.team2}
      readonly={readonly}
      onClick={() => clickRow('B')}
      onDelete={onDeleteTeam && match.team2 ? () => onDeleteTeam(match, 'team2') : undefined}
    />
  )

  const cls = ['match', `match--${state}`, isFinal ? 'match--final' : '', isChampionPath ? 'is-champion-path' : '']
    .filter(Boolean)
    .join(' ')

  const when = formatMatchWhen(match.matchDate, match.matchTime)

  return (
    <div className={cls}>
      <div className="match__head" onClick={clickHead}>
        <span className="match__state">
          <span className="dot" />
          {stateLabel}
        </span>
        {when && <span className="match__when">{when}</span>}
        {isFinal && state === 'done' ? (
          <span className="crown">
            <Crown size={11} /> CHAMPION
          </span>
        ) : (
          <span style={{ fontFamily: 'var(--f-mono)', fontSize: 9.5, color: 'var(--text-faint)' }}>
            R{round}·M{matchIndex + 1}
          </span>
        )}
      </div>
      {swap ? (
        <>
          {rowB}
          {rowA}
        </>
      ) : (
        <>
          {rowA}
          {rowB}
        </>
      )}
    </div>
  )
}
