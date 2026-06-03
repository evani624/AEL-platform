import { useRef, useState, useEffect, useMemo } from 'react'
import BracketSection from './BracketSection'
import GrandFinalPanel from './GrandFinalPanel'
import { getChampionInfo, getMatchState } from '../utils/bracketUtils'

/**
 * Double-elimination renderer. Side-anchored Grand Final:
 *
 *   ┌── Winner's Bracket (sticky label) ──┐  ┌─────────┐
 *   │  W round columns                    │  │ GF [+Reset?]
 *   │  (connectors via BracketSection)    │  │ panel   │
 *   ├── Loser's Bracket (sticky label) ───┤  │ (vert   │
 *   │  L round columns                    │  │  centered)
 *   │  (connectors=false — see chunk c)   │  │         │
 *   └─────────────────────────────────────┘  └─────────┘
 *
 * Cross-section connectors (parent-level SVG overlay): W-Final → GF,
 * L-Final → GF, and GF → Reset (only when Reset is live). Drawn with the
 * same elbow style as BracketSection.
 *
 * Anti-loop defenses:
 *   - Effect deps are [tournament, champPathIds]; both are parent-memoized
 *     and only change on a real refetch (chunk-a contract).
 *   - setCrossSize / setCrossConns return the previous reference when the
 *     newly-measured value is value-equal, so React skips re-render and
 *     the effect does not re-fire.
 */
export default function DoubleEliminationBracket({
  tournament,
  isReadOnly,
  onSlotClick,
  onDeleteTeam,
}) {
  const champPathIds = useMemo(
    () => getChampionInfo(tournament)?.pathIds ?? new Set(),
    [tournament]
  )

  const wrapRef = useRef(null)
  const [crossConns, setCrossConns] = useState([])
  const [crossSize, setCrossSize] = useState({ w: 0, h: 0 })

  useEffect(() => {
    if (!wrapRef.current) return undefined

    const wRounds = tournament?.winnerRounds
    const lRounds = tournament?.loserRounds
    const wFinal = wRounds?.[wRounds.length - 1]?.matches?.[0] ?? null
    const lFinal = lRounds?.[lRounds.length - 1]?.matches?.[0] ?? null
    const gf = tournament?.grandFinal?.matches?.[0] ?? null
    const gfWinnerSide =
      gf?.winnerId === gf?.team1?.id ? 'A' :
      gf?.winnerId === gf?.team2?.id ? 'B' : null
    const resetIsLive = gf?.status === 'final' && gfWinnerSide === 'B'
    const reset = resetIsLive ? (tournament?.grandFinalReset?.matches?.[0] ?? null) : null

    function measure() {
      if (!wrapRef.current) return
      const wrapBox = wrapRef.current.getBoundingClientRect()
      const newSize = { w: wrapBox.width, h: wrapBox.height }
      setCrossSize((prev) =>
        prev.w === newSize.w && prev.h === newSize.h ? prev : newSize
      )

      const byId = (id) => {
        if (!id) return null
        const el = wrapRef.current.querySelector(`[data-match-id="${CSS.escape(id)}"]`)
        if (!el) return null
        const r = el.getBoundingClientRect()
        return {
          left: r.left - wrapBox.left,
          right: r.right - wrapBox.left,
          mid: r.top - wrapBox.top + r.height / 2,
        }
      }

      const wFC = byId(wFinal?.id)
      const lFC = byId(lFinal?.id)
      const gfC = byId(gf?.id)
      const resetC = byId(reset?.id)

      // Route the W-Final → GF and L-Final → GF vertical segments in the
      // clean strip 32px to the left of the GF card (instead of arbitrary
      // mid-space that crosses bracket content). Computed ONCE so both
      // elbows share the same midX and converge symmetrically into the GF.
      // Fall back to per-line midpoint if the clean strip would land inside
      // the source (rare — only when GF sits very close to the brackets).
      let finalsMidX = null
      if (gfC) {
        const clean = gfC.left - 32
        const maxSrcRight = Math.max(
          wFC?.right ?? -Infinity,
          lFC?.right ?? -Infinity
        )
        finalsMidX = Number.isFinite(maxSrcRight) && maxSrcRight + 16 > clean
          ? (maxSrcRight + gfC.left) / 2
          : clean
      }

      const lines = []
      function addLine(src, dst, srcMatch, dstMatch, key, midXOverride) {
        if (!src || !dst || !srcMatch || !dstMatch) return
        const midX = midXOverride != null ? midXOverride : (src.right + dst.left) / 2
        const d = `M${src.right} ${src.mid} H${midX} V${dst.mid} H${dst.left}`
        const onChampPath =
          champPathIds.has(srcMatch.id) && champPathIds.has(dstMatch.id)
        const active = getMatchState(srcMatch) === 'done'
        lines.push({ key, d, onChampPath, active })
      }
      addLine(wFC, gfC, wFinal, gf, 'w-final-to-gf', finalsMidX)
      addLine(lFC, gfC, lFinal, gf, 'l-final-to-gf', finalsMidX)
      addLine(gfC, resetC, gf, reset, 'gf-to-reset') // short direct elbow

      const linesKey = lines.map((l) => `${l.d}|${l.onChampPath}|${l.active}`).join('||')
      setCrossConns((prev) => {
        const prevKey = prev.map((l) => `${l.d}|${l.onChampPath}|${l.active}`).join('||')
        return prevKey === linesKey ? prev : lines
      })
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
    ro.observe(wrapRef.current)
    window.addEventListener('resize', schedule)
    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      ro.disconnect()
      window.removeEventListener('resize', schedule)
    }
  }, [tournament, champPathIds])

  if (!tournament?.winnerRounds?.length) {
    return <div style={{ color: 'var(--text-mute)', padding: 40 }}>No bracket to display.</div>
  }

  return (
    <div ref={wrapRef} className="de-bracket-grid">
      <svg
        className="de-cross-svg"
        xmlns="http://www.w3.org/2000/svg"
        width={crossSize.w || '100%'}
        height={crossSize.h || '100%'}
        viewBox={crossSize.w && crossSize.h ? `0 0 ${crossSize.w} ${crossSize.h}` : undefined}
      >
        <defs>
          <linearGradient id="de-cross-active" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(139,92,246,0.7)" />
            <stop offset="100%" stopColor="rgba(196,181,253,0.5)" />
          </linearGradient>
        </defs>
        {crossConns.map((c) => (
          <path
            key={c.key}
            d={c.d}
            fill="none"
            stroke={c.onChampPath ? 'url(#de-cross-active)' : c.active ? 'rgba(139,92,246,0.55)' : 'rgba(196,181,253,0.28)'}
            strokeWidth={c.onChampPath ? 2 : 1.2}
            strokeLinecap="round"
            style={c.onChampPath ? { filter: 'drop-shadow(0 0 6px rgba(139,92,246,0.6))' } : undefined}
          />
        ))}
      </svg>

      <div className="de-bracket-grid__left">
        <div className="de-section-label">Winner&rsquo;s Bracket</div>
        <BracketSection
          rounds={tournament.winnerRounds}
          champPathIds={champPathIds}
          showChampionAtLast={false}
          connectors={true}
          isReadOnly={isReadOnly}
          onSlotClick={onSlotClick}
          onDeleteTeam={onDeleteTeam}
        />
        <div className="de-section-divider" />
        <div className="de-section-label">Loser&rsquo;s Bracket</div>
        <BracketSection
          rounds={tournament.loserRounds}
          champPathIds={champPathIds}
          showChampionAtLast={false}
          connectors={false}
          isReadOnly={isReadOnly}
          onSlotClick={onSlotClick}
          onDeleteTeam={onDeleteTeam}
        />
      </div>

      <div className="de-bracket-grid__right">
        <GrandFinalPanel
          grandFinal={tournament.grandFinal}
          grandFinalReset={tournament.grandFinalReset}
          champPathIds={champPathIds}
          isReadOnly={isReadOnly}
          onSlotClick={onSlotClick}
          onDeleteTeam={onDeleteTeam}
        />
      </div>
    </div>
  )
}
