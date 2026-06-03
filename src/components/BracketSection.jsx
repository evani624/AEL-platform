import { useRef, useState, useEffect } from 'react'
import MatchCard from './MatchCard'
import ChampionCard from './ChampionCard'
import { getMatchState, getWinnerSide } from '../utils/bracketUtils'

/**
 * One bracket-strip: rounds laid out in flex columns with an optional SVG
 * connector overlay measured from the live DOM. Used twice in double-elim
 * (winner + loser) and once in single-elim (the whole tournament).
 *
 * Props:
 *   rounds: [{ name, matches: [...] }]
 *   champPathIds: Set<matchId>. MUST be a stable reference across renders
 *     (memoize at the parent) — it's in the measure effect's dep array, and
 *     a fresh Set each render would re-measure on every render.
 *   showChampionAtLast: render <ChampionCard> over the last-round winner.
 *     true for single-elim; false for double-elim sections (champion is
 *     decided in the Grand Final panel, not here).
 *   connectors: draw SVG connector lines between adjacent rounds using the
 *     halving rule (round[r].match[k] → round[r+1].match[k/2]). true for
 *     single-elim and the W-bracket section (their topology is halving).
 *     false for the L-bracket section — LB has 1:1 minor-merge transitions
 *     that the halving rule mis-draws, so we skip lines entirely in this
 *     chunk rather than ship wrong-looking ones.
 *   isReadOnly, onSlotClick, onDeleteTeam: forwarded to MatchCard.
 *   lastRoundIndex: optional; defaults to last index.
 */
export default function BracketSection({
  rounds,
  champPathIds,
  showChampionAtLast = true,
  connectors = true,
  isReadOnly,
  onSlotClick,
  onDeleteTeam,
  lastRoundIndex,
}) {
  const wrapRef = useRef(null)
  const [conns, setConns] = useState([])
  const [size, setSize] = useState({ w: 0, h: 0 })

  useEffect(() => {
    if (!connectors) return undefined
    function measure() {
      if (!wrapRef.current) return
      const wrapBox = wrapRef.current.getBoundingClientRect()
      setSize({ w: wrapBox.width, h: wrapBox.height })

      const cards = wrapRef.current.querySelectorAll('[data-match-id]')
      const map = {}
      cards.forEach((c) => {
        const r = c.getBoundingClientRect()
        map[c.dataset.matchId] = {
          left: r.left - wrapBox.left,
          right: r.right - wrapBox.left,
          mid: r.top - wrapBox.top + r.height / 2,
        }
      })

      const lines = []
      rounds.forEach((round, ri) => {
        if (ri === rounds.length - 1) return
        const next = rounds[ri + 1]
        round.matches.forEach((m, mi) => {
          const target = next.matches[Math.floor(mi / 2)]
          if (!target) return
          const a = map[m.id]
          const b = map[target.id]
          if (!a || !b) return
          const gap = (b.left - a.right) / 2
          const x1 = a.right
          const x2 = a.right + gap
          const onChampPath = champPathIds.has(m.id) && champPathIds.has(target.id)
          const active = getMatchState(m) === 'done'
          lines.push({
            d: `M${x1} ${a.mid} H${x2} V${b.mid} H${b.left}`,
            active,
            onChampPath,
            key: `${m.id}->${target.id}`,
          })
        })
      })
      setConns(lines)
    }

    let rafId = 0
    const schedule = () => {
      if (rafId) return
      rafId = requestAnimationFrame(() => {
        rafId = 0
        measure()
      })
    }

    measure()
    const ro = new ResizeObserver(schedule)
    if (wrapRef.current) ro.observe(wrapRef.current)
    window.addEventListener('resize', schedule)
    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      ro.disconnect()
      window.removeEventListener('resize', schedule)
    }
  }, [rounds, champPathIds, connectors])

  if (!rounds?.length) return null

  const lastIdx = lastRoundIndex >= 0 ? lastRoundIndex : rounds.length - 1

  return (
    <div ref={wrapRef} className="bracket" style={{ position: 'relative' }}>
      {connectors && (
        <svg
          className="bracket-svg"
          xmlns="http://www.w3.org/2000/svg"
          width={size.w || '100%'}
          height={size.h || '100%'}
          viewBox={size.w && size.h ? `0 0 ${size.w} ${size.h}` : undefined}
        >
          <defs>
            <linearGradient id="conn-active" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(139,92,246,0.7)" />
              <stop offset="100%" stopColor="rgba(196,181,253,0.5)" />
            </linearGradient>
          </defs>
          {conns.map((c) => (
            <path
              key={c.key}
              d={c.d}
              fill="none"
              stroke={c.onChampPath ? 'url(#conn-active)' : c.active ? 'rgba(139,92,246,0.55)' : 'rgba(196,181,253,0.18)'}
              strokeWidth={c.onChampPath ? 2 : 1.2}
              strokeLinecap="round"
              style={c.onChampPath ? { filter: 'drop-shadow(0 0 6px rgba(139,92,246,0.6))' } : undefined}
            />
          ))}
        </svg>
      )}

      {rounds.map((round, ri) => {
        const isLast = ri === lastIdx
        return (
          <div className="round-col" key={ri}>
            <div className="round-col__head">
              <b>R{ri + 1}</b> · {round.name}
            </div>
            <div className="round-col__matches">
              {round.matches.map((m) => {
                const state = getMatchState(m)
                const winnerSide = getWinnerSide(m)
                const isChamp = showChampionAtLast && isLast && state === 'done' && Boolean(winnerSide)
                const champTeam = winnerSide === 'A' ? m.team1 : m.team2
                return (
                  <div key={m.id} style={{ position: 'relative', zIndex: 1 }}>
                    {isChamp && (
                      <ChampionCard team={champTeam} scoreA={m.team1Score} scoreB={m.team2Score} winner={winnerSide} />
                    )}
                    <div data-match-id={m.id}>
                      <MatchCard
                        match={m}
                        readonly={isReadOnly}
                        isFinal={isLast}
                        isChampionPath={champPathIds.has(m.id)}
                        onSlotClick={onSlotClick}
                        onDeleteTeam={onDeleteTeam}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
