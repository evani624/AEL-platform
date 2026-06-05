import { useState } from 'react'
import { Plus, Trash2, Crown, Award, AlertCircle } from 'lucide-react'
import { computeRanks, topTieDetected } from '../utils/leaderboard'
import LeaderboardChampionCard from './LeaderboardChampionCard'
import { colorHex } from '../constants/teamColors'

/**
 * Leaderboard renderer: standings table (Rank | Team | Points | Actions)
 * with inline points editing, add/delete rows, and Mark-Final / Un-mark
 * controls. Public mode hides every admin control.
 *
 * Top-tie gating + auto-revert + warning banner arrive in chunk 3c.
 */
export default function LeaderboardScreen({
  tournament,
  isReadOnly,
  onAddEntry,
  onUpdateEntry,
  onDeleteEntry,
  onSetFinal,
}) {
  const entries = tournament?.entries ?? []
  const ranked = computeRanks(entries)
  const isFinal = !!tournament?.isFinal
  const topTie = topTieDetected(entries)
  // Suppress the warning banner while every team is still at 0 points
  // (start state — technically a tie but nagging). The Mark Final button
  // stays disabled on any top-tie regardless; its tooltip explains why.
  const hasAnyPoints = entries.some((e) => (e?.points ?? 0) > 0)
  const showTopTieWarning = topTie && hasAnyPoints

  const showChampion = isFinal && ranked.length > 0
  const colSpan = isReadOnly ? 3 : 4

  return (
    <div className="leaderboard">
      {showChampion && (
        <LeaderboardChampionCard
          team={{ name: ranked[0].name, color: ranked[0].color }}
        />
      )}

      <table className="leaderboard__table">
        <thead>
          <tr>
            <th className="leaderboard__th leaderboard__th--rank">Rank</th>
            <th className="leaderboard__th">Team</th>
            <th className="leaderboard__th leaderboard__th--points">Points</th>
            {!isReadOnly && (
              <th className="leaderboard__th leaderboard__th--actions" aria-label="Actions"></th>
            )}
          </tr>
        </thead>
        <tbody>
          {ranked.length === 0 ? (
            <tr>
              <td colSpan={colSpan} className="leaderboard__empty">
                {isReadOnly
                  ? 'No teams yet.'
                  : 'No teams yet. Click “Add Team” below to get started.'}
              </td>
            </tr>
          ) : (
            ranked.map((e) => (
              <LeaderboardRow
                key={e.id}
                entry={e}
                isReadOnly={isReadOnly}
                onUpdate={onUpdateEntry}
                onDelete={onDeleteEntry}
              />
            ))
          )}
        </tbody>
      </table>

      {!isReadOnly && (
        <>
          {showTopTieWarning && (
            <div className="leaderboard__warning" role="alert">
              <AlertCircle size={14} aria-hidden="true" />
              <span>Top rank is tied — adjust points to resolve before marking final.</span>
            </div>
          )}
          <div className="leaderboard__actions">
            <button className="btn btn--primary btn--sm" onClick={onAddEntry}>
              <Plus size={13} /> Add Team
            </button>
            {!isFinal ? (
              <button
                className="btn btn--ghost btn--sm"
                disabled={topTie}
                title={topTie ? 'Resolve the top-rank tie before marking final' : undefined}
                onClick={() => onSetFinal?.(true)}
              >
                <Crown size={13} /> Mark Tournament Final
              </button>
            ) : (
              <button
                className="btn btn--ghost btn--sm"
                onClick={() => onSetFinal?.(false)}
              >
                <Award size={13} /> Un-mark Final
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function LeaderboardRow({ entry, isReadOnly, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(entry.points))

  const commit = () => {
    // Empty / whitespace → treat as cancel (revert), not commit. Number('')
    // is 0 which would otherwise pass the integer check below and silently
    // zero a team's points when the field is cleared and blurred.
    if (draft.trim() === '') {
      setDraft(String(entry.points))
      setEditing(false)
      return
    }
    const n = Number(draft)
    if (!Number.isInteger(n) || n < 0) {
      setDraft(String(entry.points))
      setEditing(false)
      return
    }
    if (n !== entry.points) onUpdate?.(entry.id, { points: n })
    setEditing(false)
  }

  const cancel = () => {
    setDraft(String(entry.points))
    setEditing(false)
  }

  return (
    <tr className="leaderboard__row">
      <td className="leaderboard__rank">{entry.rank}</td>
      <td className="leaderboard__team">
        <div className="leaderboard__team-inner">
          <span className="team-chip" style={{ '--c': colorHex(entry.color) }} />
          <span className="leaderboard__name" title={entry.name}>{entry.name}</span>
        </div>
      </td>
      <td className="leaderboard__points">
        {!isReadOnly && editing ? (
          <input
            className="leaderboard__points-input"
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            value={draft}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit()
              if (e.key === 'Escape') cancel()
            }}
          />
        ) : !isReadOnly ? (
          <button
            type="button"
            className="leaderboard__points-btn"
            onClick={() => {
              setDraft(String(entry.points))
              setEditing(true)
            }}
            aria-label={`Edit points for ${entry.name}`}
          >
            {entry.points}
          </button>
        ) : (
          <span>{entry.points}</span>
        )}
      </td>
      {!isReadOnly && (
        <td className="leaderboard__actions-cell">
          <button
            type="button"
            className="btn btn--ghost btn--xs"
            onClick={() => {
              if (window.confirm(`Remove “${entry.name}” from the leaderboard?`)) {
                onDelete?.(entry.id)
              }
            }}
            aria-label={`Remove ${entry.name}`}
            title={`Remove ${entry.name}`}
          >
            <Trash2 size={11} />
          </button>
        </td>
      )}
    </tr>
  )
}
