import { useState } from 'react'
import { Check, AlertCircle, Crown } from 'lucide-react'
import Modal from './Modal'
import DateField from './DateField'
import TimeField from './TimeField'
import { colorHex } from '../constants/teamColors'

const STATES = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'final', label: 'Final' },
]

function ScoreSide({ team, score, setScore, bump, isWinner }) {
  return (
    <div
      style={{
        padding: '14px 12px',
        background: isWinner ? 'rgba(139,92,246,0.10)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${isWinner ? 'rgba(139,92,246,0.40)' : 'var(--line)'}`,
        borderRadius: 'var(--r-md)',
        transition: 'all 240ms var(--ease)',
        boxShadow: isWinner ? '0 0 24px -8px rgba(139,92,246,0.5)' : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span className="team-chip" style={{ '--c': colorHex(team?.color) }} />
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: team ? undefined : 'var(--text-mute)',
            fontStyle: team ? undefined : 'italic',
          }}
        >
          {team?.name || 'TBD'}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button type="button" className="icon-btn" onClick={() => bump(-1)}>
          −
        </button>
        <input
          inputMode="numeric"
          value={score}
          onChange={(e) => setScore(e.target.value.replace(/[^0-9]/g, ''))}
          className="field__input"
          style={{
            textAlign: 'center',
            fontFamily: 'var(--f-mono)',
            fontSize: 22,
            fontWeight: 700,
            padding: '8px 6px',
            color: isWinner ? 'var(--violet-ice)' : 'var(--ice)',
          }}
        />
        <button type="button" className="icon-btn" onClick={() => bump(1)}>
          +
        </button>
      </div>
    </div>
  )
}

export default function MatchResultModal({ isOpen, onClose, match, onConfirm, game }) {
  const [scoreA, setScoreA] = useState(match?.team1Score == null ? '' : String(match.team1Score))
  const [scoreB, setScoreB] = useState(match?.team2Score == null ? '' : String(match.team2Score))
  const [status, setStatus] = useState(() => {
    if (match?.winnerId) return 'final'
    return match?.status || 'upcoming'
  })
  // Optional schedule — independent of status/scores. HTML inputs want
  // YYYY-MM-DD for date and HH:MM for time.
  const [matchDate, setMatchDate] = useState(match?.matchDate || '')
  const [matchTime, setMatchTime] = useState(
    match?.matchTime ? String(match.matchTime).slice(0, 5) : ''
  )
  const [err, setErr] = useState('')

  if (!isOpen || !match) return null

  const a = match.team1
  const b = match.team2
  const isFinal = status === 'final'
  const teamsMissing = !a || !b

  const bump = (which, delta) => {
    if (which === 'A') setScoreA(String(Math.max(0, (parseInt(scoreA, 10) || 0) + delta)))
    else setScoreB(String(Math.max(0, (parseInt(scoreB, 10) || 0) + delta)))
    setErr('')
  }

  const sa = scoreA === '' ? null : parseInt(scoreA, 10)
  const sb = scoreB === '' ? null : parseInt(scoreB, 10)
  // Winner is only meaningful when both teams are present.
  const winner =
    isFinal && !teamsMissing && sa != null && sb != null && sa !== sb ? (sa > sb ? 'A' : 'B') : null

  const submit = () => {
    const schedule = { matchDate: matchDate || null, matchTime: matchTime || null }
    if (isFinal) {
      // Safety: can't advance a winner from an empty slot.
      if (teamsMissing) {
        setErr('Add teams first to record a final result')
        return
      }
      if (sa == null || sb == null || isNaN(sa) || isNaN(sb)) {
        setErr('Both scores required to mark as Final')
        return
      }
      if (sa === sb) {
        setErr('Single-elimination — pick a winner (no ties)')
        return
      }
      const winnerId = sa > sb ? a.id : b.id
      onConfirm?.({ status: 'final', winnerId, team1Score: sa, team2Score: sb, ...schedule })
    } else {
      // Upcoming / In progress — no winner required (works for empty matches too).
      onConfirm?.({ status, winnerId: null, team1Score: sa, team2Score: sb, ...schedule })
    }
    onClose?.()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      accent={`${game || 'Match'} · Record result`}
      title="Record match result"
      width={520}
      footer={
        <>
          <button className="btn btn--ghost btn--sm" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn--primary btn--sm"
            onClick={submit}
            disabled={isFinal && teamsMissing}
          >
            <Check size={13} />
            {isFinal ? 'Save & advance winner' : 'Save state'}
          </button>
        </>
      }
    >
      <div className="field">
        <label className="field__label">Match State</label>
        <div className="seg" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {STATES.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`seg__btn ${status === s.id ? 'is-active' : ''}`}
              onClick={() => {
                setStatus(s.id)
                setErr('')
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label className="field__label">Score</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'center' }}>
          <ScoreSide
            team={a}
            score={scoreA}
            setScore={(v) => {
              setScoreA(v)
              setErr('')
            }}
            bump={(d) => bump('A', d)}
            isWinner={winner === 'A'}
          />
          <div style={{ fontFamily: 'var(--f-mono)', fontSize: 18, color: 'var(--text-faint)' }}>vs</div>
          <ScoreSide
            team={b}
            score={scoreB}
            setScore={(v) => {
              setScoreB(v)
              setErr('')
            }}
            bump={(d) => bump('B', d)}
            isWinner={winner === 'B'}
          />
        </div>
        {err && (
          <div className="field__err" style={{ marginTop: 10 }}>
            <AlertCircle size={12} />
            {err}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <DateField label="Date (optional)" value={matchDate} onChange={setMatchDate} placeholder="Select date" />
        <TimeField label="Time (optional)" value={matchTime} onChange={setMatchTime} placeholder="Select time" />
      </div>

      {isFinal && winner && (
        <div
          style={{
            marginTop: 4,
            padding: '11px 14px',
            background: 'rgba(139,92,246,0.10)',
            border: '1px solid rgba(139,92,246,0.30)',
            borderRadius: 'var(--r-md)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <Crown size={14} style={{ color: 'var(--violet-ice)' }} />
          <span style={{ fontSize: 13 }}>
            <b style={{ color: 'var(--violet-ice)' }}>{(winner === 'A' ? a : b).name}</b>
            <span style={{ color: 'var(--text-dim)' }}> advances to the next round</span>
          </span>
        </div>
      )}

      {isFinal && teamsMissing && (
        <div
          style={{
            marginTop: 4,
            padding: '10px 13px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--r-md)',
            color: 'var(--text-dim)',
            fontSize: 12.5,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <AlertCircle size={12} style={{ color: 'var(--violet-ice)', flexShrink: 0 }} />
          Add teams first to record a final result. Date, time, and state can still be saved.
        </div>
      )}
    </Modal>
  )
}
